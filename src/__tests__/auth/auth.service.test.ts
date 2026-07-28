import { AuthService } from '../../services/auth.service';
import { createMockUser, createMockRefreshToken } from '../helpers/factories';

const mockPrisma = {
  user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
  refreshToken: { create: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  auditLog: { create: jest.fn() },
  role: { findUnique: jest.fn() },
  permission: { findMany: jest.fn() },
  rolePermission: { deleteMany: jest.fn(), createMany: jest.fn() },
};

jest.mock('../../config/db.config', () => ({ prisma: mockPrisma }));
jest.mock('../../utils/jwt.utilities', () => ({
  signAccessToken: jest.fn(() => 'mock-access-token'),
  signRefreshToken: jest.fn(() => 'mock-refresh-token'),
  verifyRefreshToken: jest.fn(() => ({ userId: 'user-1' })),
  verifyAccessToken: jest.fn(() => ({ userId: 'user-1', email: 'john@example.com' })),
}));
jest.mock('../../utils/bcrypt.utilities', () => ({
  hashPassword: jest.fn(() => 'hashed-password'),
  comparePassword: jest.fn(() => true),
}));
jest.mock('../../utils/crypto.utilities', () => ({
  generateToken: jest.fn(() => 'reset-token-123'),
  hashToken: jest.fn(() => 'hashed-reset-token'),
}));

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(mockPrisma as any);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(createMockUser({ status: 'PENDING' }));
      const result = await service.register({ firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'StrongP@ss1' });
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.user.email).toBe('john@example.com');
      expect(result.user.status).toBe('PENDING');
    });

    it('should reject duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser());
      await expect(service.register({ firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'StrongP@ss1' })).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ status: 'ACTIVE', role: null }));
      const result = await service.login({ email: 'john@example.com', password: 'StrongP@ss1' });
      expect(result.accessToken).toBe('mock-access-token');
    });

    it('should reject invalid email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'wrong@example.com', password: 'StrongP@ss1' })).rejects.toThrow('Invalid credentials');
    });

    it('should reject wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ status: 'ACTIVE', role: null }));
      require('../../utils/bcrypt.utilities').comparePassword.mockImplementationOnce(() => false);
      await expect(service.login({ email: 'john@example.com', password: 'WrongP@ss1' })).rejects.toThrow('Invalid credentials');
    });

    it('should reject suspended account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ status: 'SUSPENDED', role: null }));
      await expect(service.login({ email: 'john@example.com', password: 'StrongP@ss1' })).rejects.toThrow('Account suspended');
    });

    it('should reject inactive account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ status: 'INACTIVE', role: null }));
      await expect(service.login({ email: 'john@example.com', password: 'StrongP@ss1' })).rejects.toThrow('Account inactive');
    });
  });

  describe('refresh', () => {
    it('should refresh token successfully', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(createMockRefreshToken({ isRevoked: false, expiresAt: new Date(Date.now() + 86400000), user: { ...createMockUser({ status: 'ACTIVE', role: null }), role: null } }));
      const result = await service.refresh('valid-token');
      expect(result.accessToken).toBe('mock-access-token');
    });

    it('should reject invalid refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('invalid-token')).rejects.toThrow('Refresh token revoked or expired');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      await service.logout('user-1');
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser());
      await service.changePassword('user-1', { currentPassword: 'OldP@ss1', newPassword: 'NewP@ss1' });
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should reject wrong current password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser());
      require('../../utils/bcrypt.utilities').comparePassword.mockImplementationOnce(() => false);
      await expect(service.changePassword('user-1', { currentPassword: 'WrongP@ss1', newPassword: 'NewP@ss1' })).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('forgotPassword', () => {
    it('should generate reset token for existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser());
      const result = await service.forgotPassword('john@example.com');
      expect(result.token).toBeDefined();
      expect(result.message).toContain('reset link');
    });

    it('should return success even for non-existent email (prevent enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.forgotPassword('nonexistent@example.com');
      expect(result.message).toContain('reset link');
      expect(result.token).toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser());
      const token = (await service.forgotPassword('john@example.com')).token!;
      const result = await service.resetPassword(token, 'NewStr0ng!Pass');
      expect(result.message).toContain('reset successfully');
    });

    it('should reject invalid token', async () => {
      await expect(service.resetPassword('invalid-token', 'NewStr0ng!Pass')).rejects.toThrow('Invalid or expired reset token');
    });
  });
});
