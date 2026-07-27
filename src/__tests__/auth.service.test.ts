import { AuthService } from '../services/auth.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    updateMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

jest.mock('../config/db.config', () => ({
  prisma: mockPrisma,
}));

jest.mock('../utils/jwt.utilities', () => ({
  signAccessToken: jest.fn(() => 'mock-access-token'),
  signRefreshToken: jest.fn(() => 'mock-refresh-token'),
  verifyRefreshToken: jest.fn(() => ({ userId: 'user-1' })),
}));

jest.mock('../utils/bcrypt.utilities', () => ({
  hashPassword: jest.fn(() => 'hashed-password'),
  comparePassword: jest.fn(() => true),
}));

jest.mock('../utils/crypto.utilities', () => ({
  generateToken: jest.fn(() => 'reset-token-123'),
  hashToken: jest.fn(() => 'hashed-reset-token'),
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService(mockPrisma as any);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        userid: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: null,
        passwordHash: 'hashed',
        status: 'PENDING',
        emailVerified: false,
        roleId: null,
        createdAt: new Date(),
        Updated: new Date(),
      });

      const result = await authService.register({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'StrongP@ss1',
      });

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.user.email).toBe('john@example.com');
      expect(result.user.status).toBe('PENDING');
    });

    it('should reject duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ userid: 'existing' });

      await expect(authService.register({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'StrongP@ss1',
      })).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        userid: 'user-1',
        email: 'john@example.com',
        passwordHash: 'hashed',
        status: 'ACTIVE',
        roleId: null,
        firstName: 'John',
        lastName: 'Doe',
        phone: null,
        emailVerified: false,
        lastLoginAt: null,
      });

      const result = await authService.login({
        email: 'john@example.com',
        password: 'StrongP@ss1',
      });

      expect(result.accessToken).toBe('mock-access-token');
    });

    it('should reject suspended accounts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        userid: 'user-1',
        email: 'john@example.com',
        passwordHash: 'hashed',
        status: 'SUSPENDED',
      });

      await expect(authService.login({
        email: 'john@example.com',
        password: 'StrongP@ss1',
      })).rejects.toThrow('Account suspended');
    });
  });

  describe('forgotPassword', () => {
    it('should generate reset token for existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        userid: 'user-1',
        email: 'john@example.com',
      });

      const result = await authService.forgotPassword('john@example.com');

      expect(result.token).toBeDefined();
      expect(result.message).toContain('reset link');
    });

    it('should return success even for non-existent email (prevent enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await authService.forgotPassword('nonexistent@example.com');

      expect(result.message).toContain('reset link');
      expect(result.token).toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        userid: 'user-1',
        email: 'john@example.com',
      });

      const token = (await authService.forgotPassword('john@example.com')).token!;

      const result = await authService.resetPassword(token, 'NewStr0ng!Pass');

      expect(result.message).toContain('reset successfully');
    });

    it('should reject invalid token', async () => {
      await expect(authService.resetPassword('invalid-token', 'NewStr0ng!Pass'))
        .rejects.toThrow('Invalid or expired reset token');
    });
  });
});