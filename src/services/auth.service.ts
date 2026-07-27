import { PrismaClient } from '../generated/prisma/client';
import { RegisterDto, LoginDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto, AuthResponseDto } from '../dto/auth.dto';
import { AuthenticationError, ConflictError, NotFoundError, AuthorizationError } from '../exceptions';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.utilities';
import { hashPassword, comparePassword } from '../utils/bcrypt.utilities';
import { generateToken, hashToken } from '../utils/crypto.utilities';

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
  private resetTokens: Map<string, ResetTokenEntry> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.cleanupTimer = setInterval(() => this.evictExpiredTokens(), CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
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
    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingEmail) {
      throw new ConflictError('Email already registered');
    }

    // Check if phone already exists (if provided)
    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictError('Phone number already registered');
      }
    }

    // Hash password
    const passwordHash = await hashPassword(dto.password);

    // Create user
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
    // Generate tokens
    const accessToken = signAccessToken({ userId: user.userid, email: user.email, roleId });
    const refreshToken = signRefreshToken({ userId: user.userid });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.userid,
        expiresAt,
      },
    });

    // Create audit log
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
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { role: true },
    });

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Check password
    const isValid = await comparePassword(dto.password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Check user status
    if (user.status === 'SUSPENDED') {
      throw new AuthorizationError('Account suspended');
    }
    if (user.status === 'INACTIVE') {
      throw new AuthorizationError('Account inactive');
    }

    const roleId = user.roleId === null ? undefined : user.roleId;
    // Generate tokens
    const accessToken = signAccessToken({ userId: user.userid, email: user.email, roleId });
    const refreshToken = signRefreshToken({ userId: user.userid });

    // Store refresh token (revoke old ones)
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

    // Update last login
    await this.prisma.user.update({
      where: { userid: user.userid },
      data: { lastLoginAt: new Date() },
    });

    // Create audit log
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
    // Verify refresh token
    try {
      verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Check if token exists in DB and is not revoked
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { role: true } } },
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      throw new AuthenticationError('Refresh token revoked or expired');
    }

    const user = storedToken.user;

    // Check user status
    if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
      throw new AuthorizationError('Account suspended or inactive');
    }

    // Rotate refresh token (revoke old, create new)
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

    // Create audit log
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
    // Revoke all refresh tokens for user
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    // Create audit log
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

    // Verify current password
    const isValid = await comparePassword(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(dto.newPassword);

    // Update password
    await this.prisma.user.update({
      where: { userid: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Revoke all refresh tokens (force re-login)
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    // Create audit log
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

    if (this.resetTokens.size >= MAX_RESET_TOKENS) {
      const oldestKey = this.resetTokens.keys().next().value;
      if (oldestKey !== undefined) {
        this.resetTokens.delete(oldestKey);
      }
    }

    const token = generateToken(32);
    this.resetTokens.set(token, {
      userId: user.userid,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

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
    const entry = this.resetTokens.get(token);
    if (!entry || entry.expiresAt < new Date()) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    this.resetTokens.delete(token);

    const user = await this.prisma.user.findUnique({
      where: { userid: entry.userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const passwordHash = await hashPassword(newPassword);

    await this.prisma.user.update({
      where: { userid: entry.userId },
      data: { passwordHash },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: entry.userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: 'PASSWORD_RESET',
        entity: 'User',
        entityId: entry.userId,
        description: 'Password reset completed',
      },
    });

    return { message: 'Password reset successfully' };
  }
}