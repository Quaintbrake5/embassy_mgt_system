import { PrismaClient } from '../generated/prisma/client';
import { RegisterDto, LoginDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto, AuthResponseDto } from '../dto/auth.dto';
import { AuthenticationError, ConflictError, NotFoundError, AuthorizationError } from '../exceptions';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.utilities';
import { hashPassword, comparePassword } from '../utils/bcrypt.utilities';
import { generateToken, hashToken } from '../utils/crypto.utilities';
import Redis from 'ioredis';

interface ResetTokenEntry {
  userId: string;
  expiresAt: Date;
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_RESET_TOKENS = 10000;

export interface IAuthService {
  register(dto: RegisterDto): Promise<AuthResponseDto>;
  login(dto: LoginDto): Promise<AuthResponseDto>;
  refresh(refreshToken: string): Promise<AuthResponseDto>;
  logout(userId: string): Promise<void>;
  changePassword(userId: string, dto: ChangePasswordDto): Promise<void>;
  forgotPassword(email: string): Promise<{ message: string; token?: string }>;
  resetPassword(token: string, newPassword: string): Promise<{ message: string }>;
}

export class AuthService implements IAuthService {
  private prisma: PrismaClient;
  private redis: Redis | null;
  private resetTokens: Map<string, ResetTokenEntry> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(prisma: PrismaClient, redisClient?: Redis | null) {
    this.prisma = prisma;
    this.redis = redisClient || null;
    if (!this.redisAvailable()) {
      this.cleanupTimer = setInterval(() => this.evictExpiredTokens(), CLEANUP_INTERVAL_MS);
      this.cleanupTimer.unref();
    }
  }

  private redisAvailable(): boolean {
    return this.redis !== null && this.redis.status === 'ready';
  }

  private evictExpiredTokens(): void {
    const now = Date.now();
    for (const [key, entry] of this.resetTokens) {
      if (entry.expiresAt.getTime() <= now) {
        this.resetTokens.delete(key);
      }
    }
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingEmail) {
      throw new ConflictError('Email already registered');
    }

    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictError('Phone number already registered');
      }
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone?.trim(),
        passwordHash,
        emailVerified: false,
        status: 'PENDING',
      },
    });

    const roleId = user.roleId === null ? undefined : user.roleId;
    const accessToken = signAccessToken({ userId: user.userid, email: user.email, roleId });
    const refreshToken = signRefreshToken({ userId: user.userid });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.userid,
        expiresAt,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.userid,
        action: 'REGISTER',
        entity: 'User',
        entityId: user.userid,
        description: 'User registered',
        ipAddress: null,
        userAgent: null,
        metaData: { email: user.email },
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        userid: user.userid,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone ?? undefined,
        roleId,
        status: user.status,
        emailVerified: user.emailVerified,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { role: true },
    });

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    const isValid = await comparePassword(dto.password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    if (user.status === 'SUSPENDED') {
      throw new AuthorizationError('Account suspended');
    }
    if (user.status === 'INACTIVE') {
      throw new AuthorizationError('Account inactive');
    }

    const roleId = user.roleId === null ? undefined : user.roleId;
    const accessToken = signAccessToken({ userId: user.userid, email: user.email, roleId });
    const refreshToken = signRefreshToken({ userId: user.userid });

    await this.prisma.refreshToken.updateMany({
      where: { userId: user.userid, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.userid,
        expiresAt,
      },
    });

    await this.prisma.user.update({
      where: { userid: user.userid },
      data: { lastLoginAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.userid,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.userid,
        description: 'User logged in',
        ipAddress: null,
        userAgent: null,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        userid: user.userid,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone ?? undefined,
        roleId,
        status: user.status,
        emailVerified: user.emailVerified,
      },
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    try {
      verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new AuthenticationError('Invalid refresh token');
    }

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { role: true } } },
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      throw new AuthenticationError('Refresh token revoked or expired');
    }

    const user = storedToken.user;

    if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
      throw new AuthorizationError('Account suspended or inactive');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    const newAccessToken = signAccessToken({ userId: user.userid, email: user.email, roleId: user.roleId ?? undefined });
    const newRefreshToken = signRefreshToken({ userId: user.userid });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.userid,
        expiresAt,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.userid,
        action: 'TOKEN_REFRESH',
        entity: 'User',
        entityId: user.userid,
        description: 'Access token refreshed',
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        userid: user.userid,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone ?? undefined,
        roleId: user.roleId !== null ? user.roleId : undefined,
        status: user.status,
        emailVerified: user.emailVerified,
      },
    };
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'LOGOUT',
        entity: 'User',
        entityId: userId,
        description: 'User logged out',
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { userid: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValid = await comparePassword(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const newPasswordHash = await hashPassword(dto.newPassword);

    await this.prisma.user.update({
      where: { userid: userId },
      data: { passwordHash: newPasswordHash },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PASSWORD_CHANGE',
        entity: 'User',
        entityId: userId,
        description: 'Password changed',
      },
    });
  }

  async forgotPassword(email: string): Promise<{ message: string; token?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const token = generateToken(32);

    if (this.redisAvailable()) {
      await this.redis!.setex(`reset:${token}`, RESET_TOKEN_TTL_MS / 1000, user.userid);
    } else {
      if (this.resetTokens.size >= MAX_RESET_TOKENS) {
        const oldestKey = this.resetTokens.keys().next().value;
        if (oldestKey !== undefined) {
          this.resetTokens.delete(oldestKey);
        }
      }

      this.resetTokens.set(token, {
        userId: user.userid,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      });
    }

    await this.prisma.auditLog.create({
      data: {
        userId: user.userid,
        action: 'PASSWORD_RESET_REQUEST',
        entity: 'User',
        entityId: user.userid,
        description: 'Password reset requested',
      },
    });

    return {
      message: 'If the email exists, a reset link has been sent',
      token,
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    let userId: string | null = null;

    if (this.redisAvailable()) {
      userId = await this.redis!.get(`reset:${token}`);
      if (!userId) {
        throw new AuthenticationError('Invalid or expired reset token');
      }
      await this.redis!.del(`reset:${token}`);
    } else {
      const entry = this.resetTokens.get(token);
      if (!entry || entry.expiresAt < new Date()) {
        throw new AuthenticationError('Invalid or expired reset token');
      }
      userId = entry.userId;
      this.resetTokens.delete(token);
    }

    const user = await this.prisma.user.findUnique({
      where: { userid: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const passwordHash = await hashPassword(newPassword);

    await this.prisma.user.update({
      where: { userid: userId },
      data: { passwordHash },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PASSWORD_RESET',
        entity: 'User',
        entityId: userId,
        description: 'Password reset completed',
      },
    });

    return { message: 'Password reset successfully' };
  }
}
