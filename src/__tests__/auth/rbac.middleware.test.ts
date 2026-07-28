import { Request, Response, NextFunction } from 'express';
import { mockPrisma } from '../helpers/mock-db';
import { createMockUser, createMockRole, createMockPermission } from '../helpers/factories';
import { requirePermission, requireRole, requireAnyPermission, requireAllPermissions, getUserPermissions } from '../../middleware/rbac.middleware';
function mockReqRes(user?: any): { req: Request; res: Response; next: NextFunction } {
  const req = { user: user || null } as any;
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
  const next = jest.fn();
  return { req, res, next };
}
describe('RBAC Middleware', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  describe('requirePermission', () => {
    it('should call next() when user has the required permission', async () => {
      const { req, res, next } = mockReqRes({ userId: 'user-1', email: 'test@example.com' });
      const mockPerm = createMockPermission({ slug: 'user:read' });
      const mockRole = createMockRole({ rolePermissions: [{ permission: mockPerm }] });
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ role: mockRole }));
      await requirePermission('user:read')(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
    it('should return 403 when user does not have the required permission', async () => {
      const { req, res, next } = mockReqRes({ userId: 'user-1', email: 'test@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ role: createMockRole({ rolePermissions: [] }) }));
      await requirePermission('user:delete')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
    it('should return 401 when no user on request', async () => {
      const { req, res, next } = mockReqRes(null);
      await requirePermission('user:read')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
    it('should return 403 when user has no role assigned', async () => {
      const { req, res, next } = mockReqRes({ userId: 'user-1', email: 'test@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ role: null }));
      await requirePermission('user:read')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
  describe('requireRole', () => {
    it('should call next() when user has the required role', async () => {
      const { req, res, next } = mockReqRes({ userId: 'user-1', email: 'test@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ role: createMockRole({ slug: 'admin' }) }));
      await requireRole('admin')(req, res, next);
      expect(next).toHaveBeenCalled();
    });
    it('should return 403 when user has a different role', async () => {
      const { req, res, next } = mockReqRes({ userId: 'user-1', email: 'test@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ role: createMockRole({ slug: 'officer' }) }));
      await requireRole('admin')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
  describe('requireAnyPermission', () => {
    it('should call next() when user has any of the required permissions', async () => {
      const { req, res, next } = mockReqRes({ userId: 'user-1', email: 'test@example.com' });
      const mockPerm = createMockPermission({ slug: 'user:read' });
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ role: createMockRole({ rolePermissions: [{ permission: mockPerm }] }) }));
      await requireAnyPermission(['user:read', 'user:delete'])(req, res, next);
      expect(next).toHaveBeenCalled();
    });
    it('should return 403 when user has none of the required permissions', async () => {
      const { req, res, next } = mockReqRes({ userId: 'user-1', email: 'test@example.com' });
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ role: createMockRole({ rolePermissions: [] }) }));
      await requireAnyPermission(['user:read', 'user:delete'])(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
  describe('requireAllPermissions', () => {
    it('should call next() when user has all required permissions', async () => {
      const { req, res, next } = mockReqRes({ userId: 'user-1', email: 'test@example.com' });
      const mockPerm1 = createMockPermission({ slug: 'user:read' });
      const mockPerm2 = createMockPermission({ slug: 'user:write' });
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ role: createMockRole({ rolePermissions: [{ permission: mockPerm1 }, { permission: mockPerm2 }] }) }));
      await requireAllPermissions(['user:read', 'user:write'])(req, res, next);
      expect(next).toHaveBeenCalled();
    });
    it('should return 403 when user lacks any of the required permissions', async () => {
      const { req, res, next } = mockReqRes({ userId: 'user-1', email: 'test@example.com' });
      const mockPerm = createMockPermission({ slug: 'user:read' });
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ role: createMockRole({ rolePermissions: [{ permission: mockPerm }] }) }));
      await requireAllPermissions(['user:read', 'user:delete'])(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
  describe('getUserPermissions', () => {
    it('should return list of permission slugs for a user with role', async () => {
      const mockPerm1 = createMockPermission({ slug: 'user:read' });
      const mockPerm2 = createMockPermission({ slug: 'user:write' });
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ role: createMockRole({ rolePermissions: [{ permission: mockPerm1 }, { permission: mockPerm2 }] }) }));
      const result = await getUserPermissions('user-1');
      expect(result).toEqual(['user:read', 'user:write']);
    });
    it('should return empty array for user without role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ role: null }));
      const result = await getUserPermissions('user-1');
      expect(result).toEqual([]);
    });
  });
});
