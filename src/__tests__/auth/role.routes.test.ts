jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-correlation-id') }));
import { mockPrisma } from '../helpers/mock-db';
import { createMockRole, createMockPermission } from '../helpers/factories';

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
describe('Role Routes', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  describe('POST /api/v1/roles', () => {
    it('should create role and return 201', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);
      mockPrisma.role.create.mockResolvedValue(createMockRole());
      const res = await request(app).post('/api/v1/roles').send({ name: 'Officer', slug: 'officer' });
      expect(res.status).toBe(201);
    });
    it('should return 409 for duplicate slug', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(createMockRole());
      const res = await request(app).post('/api/v1/roles').send({ name: 'Officer', slug: 'officer' });
      expect(res.status).toBe(409);
    });
  });
  describe('GET /api/v1/roles', () => {
    it('should return paginated roles', async () => {
      mockPrisma.role.findMany.mockResolvedValue([]);
      mockPrisma.role.count.mockResolvedValue(0);
      const res = await request(app).get('/api/v1/roles');
      expect(res.status).toBe(200);
    });
  });
  describe('GET /api/v1/roles/:id', () => {
    it('should return role by id', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(createMockRole({ rolePermissions: [{ permission: createMockPermission() }] }));
      const res = await request(app).get('/api/v1/roles/role-1');
      expect(res.status).toBe(200);
    });
    it('should return 404 for nonexistent role', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);
      const res = await request(app).get('/api/v1/roles/nonexistent');
      expect(res.status).toBe(404);
    });
  });
  describe('PUT /api/v1/roles/:id', () => {
    it('should update role', async () => {
      const mockRole = createMockRole({ rolePermissions: [] });
      mockPrisma.role.findUnique.mockResolvedValue(mockRole);
      mockPrisma.role.update.mockResolvedValue(mockRole);
      const res = await request(app).put('/api/v1/roles/role-1').send({ name: 'Senior Officer' });
      expect(res.status).toBe(200);
    });
  });
  describe('DELETE /api/v1/roles/:id', () => {
    it('should delete role with no users', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(createMockRole());
      mockPrisma.user.count.mockResolvedValue(0);
      const res = await request(app).delete('/api/v1/roles/role-1');
      expect(res.status).toBe(200);
    });
    it('should return 409 if role has users', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(createMockRole());
      mockPrisma.user.count.mockResolvedValue(2);
      const res = await request(app).delete('/api/v1/roles/role-1');
      expect(res.status).toBe(409);
    });
  });
  describe('POST /api/v1/roles/:id/permissions', () => {
    it('should assign permissions to role', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(createMockRole({ rolePermissions: [{ permission: createMockPermission() }] }));
      mockPrisma.permission.findMany.mockResolvedValue([createMockPermission()]);
      mockPrisma.rolePermission.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.rolePermission.createMany.mockResolvedValue({ count: 1 });
      const res = await request(app).post('/api/v1/roles/role-1/permissions').send({ permissionIds: ['550e8400-e29b-41d4-a716-446655440000'] });
      expect(res.status).toBe(200);
    });
  });
});


