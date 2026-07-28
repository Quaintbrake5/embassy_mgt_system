jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-correlation-id') }));
import { mockPrisma } from '../helpers/mock-db';
import { createMockPermission, createMockUser } from '../helpers/factories';

jest.mock('../../middleware/auth.middleware', () => ({
  authMiddleware: (req: any, _res: any, next: any) => { req.user = { userId: 'user-1', email: 'john@example.com' }; next(); },
}));

const adminUser = createMockUser({
  roleId: 'role-admin',
  role: {
    id: 'role-admin',
    name: 'Admin',
    slug: 'admin',
    description: 'Administrator',
    createdAt: new Date('2026-01-01'),
    Updated: new Date('2026-01-01'),
    rolePermissions: [
      { permission: { slug: 'permission:create', name: 'Create Permission' } },
      { permission: { slug: 'permission:read', name: 'Read Permission' } },
      { permission: { slug: 'permission:update', name: 'Update Permission' } },
      { permission: { slug: 'permission:delete', name: 'Delete Permission' } },
    ],
  },
});
jest.mock('../../middleware/audit.middleware', () => ({
  auditMiddleware: (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../../utils/jwt.utilities', () => ({ signAccessToken: jest.fn(() => 'mock-access-token'), signRefreshToken: jest.fn(() => 'mock-refresh-token'), verifyAccessToken: jest.fn(() => ({ userId: 'user-1', email: 'john@example.com' })), verifyRefreshToken: jest.fn(() => ({ userId: 'user-1' })) }));
jest.mock('../../utils/bcrypt.utilities', () => ({ hashPassword: jest.fn(() => 'hashed-password'), comparePassword: jest.fn(() => true) }));
jest.mock('../../utils/crypto.utilities', () => ({ generateToken: jest.fn(() => 'reset-token-123'), hashToken: jest.fn(() => 'hashed-reset-token') }));

import request from 'supertest';
import app from '../../server';
describe('Permission Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(adminUser);
  });
  describe('POST /api/v1/permissions', () => {
    it('should create permission and return 201', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null);
      mockPrisma.permission.create.mockResolvedValue(createMockPermission());
      const res = await request(app).post('/api/v1/permissions').send({ name: 'Read Users', slug: 'user:read' });
      expect(res.status).toBe(201);
    });
    it('should return 409 for duplicate slug', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(createMockPermission());
      const res = await request(app).post('/api/v1/permissions').send({ name: 'Read Users', slug: 'user:read' });
      expect(res.status).toBe(409);
    });
  });
  describe('GET /api/v1/permissions', () => {
    it('should return paginated permissions', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([]);
      mockPrisma.permission.count.mockResolvedValue(0);
      const res = await request(app).get('/api/v1/permissions');
      expect(res.status).toBe(200);
    });
  });
  describe('GET /api/v1/permissions/:id', () => {
    it('should return permission by id', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(createMockPermission());
      const res = await request(app).get('/api/v1/permissions/perm-1');
      expect(res.status).toBe(200);
    });
    it('should return 404 for nonexistent permission', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null);
      const res = await request(app).get('/api/v1/permissions/nonexistent');
      expect(res.status).toBe(404);
    });
  });
  describe('PUT /api/v1/permissions/:id', () => {
    it('should update permission', async () => {
      const mockPerm = createMockPermission();
      mockPrisma.permission.findUnique.mockResolvedValue(mockPerm);
      mockPrisma.permission.update.mockResolvedValue(mockPerm);
      const res = await request(app).put('/api/v1/permissions/perm-1').send({ name: 'Write Users' });
      expect(res.status).toBe(200);
    });
  });
  describe('DELETE /api/v1/permissions/:id', () => {
    it('should delete permission', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(createMockPermission());
      mockPrisma.rolePermission.count.mockResolvedValue(0);
      const res = await request(app).delete('/api/v1/permissions/perm-1');
      expect(res.status).toBe(200);
    });
    it('should return 409 if assigned to roles', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(createMockPermission());
      mockPrisma.rolePermission.count.mockResolvedValue(1);
      const res = await request(app).delete('/api/v1/permissions/perm-1');
      expect(res.status).toBe(409);
    });
  });
});

