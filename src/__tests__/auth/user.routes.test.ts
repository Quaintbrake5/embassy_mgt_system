jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-correlation-id') }));
import { mockPrisma } from '../helpers/mock-db';
import { createMockUser, createMockRole } from '../helpers/factories';

jest.mock('../../middleware/auth.middleware', () => ({
  authMiddleware: (req: any, _res: any, next: any) => { req.user = { userId: 'user-1', email: 'john@example.com' }; next(); },
}));
jest.mock('../../middleware/audit.middleware', () => ({
  auditMiddleware: (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../../utils/jwt.utilities', () => ({ signAccessToken: jest.fn(() => 'mock-access-token'), signRefreshToken: jest.fn(() => 'mock-refresh-token'), verifyAccessToken: jest.fn(() => ({ userId: 'user-1', email: 'john@example.com' })), verifyRefreshToken: jest.fn(() => ({ userId: 'user-1' })) }));
jest.mock('../../utils/bcrypt.utilities', () => ({ hashPassword: jest.fn(() => 'hashed-password'), comparePassword: jest.fn(() => true) }));
jest.mock('../../utils/crypto.utilities', () => ({ generateToken: jest.fn(() => 'reset-token-123'), hashToken: jest.fn(() => 'hashed-reset-token') }));

import request from 'supertest';
import app from '../../server';
describe('User Routes', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  describe('GET /api/v1/users/me', () => {
    it('should return user profile', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ role: null, profile: null }));
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(200);
    });
  });
  describe('PUT /api/v1/users/me', () => {
    it('should update own profile', async () => {
      const mockUser = createMockUser({ role: null, profile: null });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      const res = await request(app).put('/api/v1/users/me').send({ firstName: 'Jane' });
      expect(res.status).toBe(200);
    });
  });
  describe('GET /api/v1/users/:id', () => {
    it('should return user by id', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ role: null, profile: null }));
      const res = await request(app).get('/api/v1/users/user-1');
      expect(res.status).toBe(200);
    });
    it('should return 404 for nonexistent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = await request(app).get('/api/v1/users/nonexistent');
      expect(res.status).toBe(404);
    });
  });
  describe('PUT /api/v1/users/:id', () => {
    it('should update user by id', async () => {
      const mockUser = createMockUser({ role: null, profile: null });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      const res = await request(app).put('/api/v1/users/user-1').send({ firstName: 'Jane' });
      expect(res.status).toBe(200);
    });
  });
  describe('PATCH /api/v1/users/:id/status', () => {
    it('should update user status', async () => {
      const mockUser = createMockUser({ role: null, profile: null });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, status: 'SUSPENDED' });
      const res = await request(app).patch('/api/v1/users/user-1/status').send({ status: 'SUSPENDED' });
      expect(res.status).toBe(200);
    });
  });
  describe('PUT /api/v1/users/:id/role', () => {
    it('should assign role to user', async () => {
      const mockUser = createMockUser({ role: null, profile: null });
      const mockRole = createMockRole();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.role.findUnique.mockResolvedValue(mockRole);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, roleId: 'role-1', role: mockRole });
      const res = await request(app).put('/api/v1/users/user-1/role').send({ roleId: 'role-1' });
      expect(res.status).toBe(200);
    });
  });
  describe('DELETE /api/v1/users/:id', () => {
    it('should delete user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser());
      const res = await request(app).delete('/api/v1/users/user-1');
      expect(res.status).toBe(200);
    });
    it('should return 404 for nonexistent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = await request(app).delete('/api/v1/users/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});

