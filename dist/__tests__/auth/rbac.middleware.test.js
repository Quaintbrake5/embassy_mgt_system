"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
function mockReqRes(user) {
    const req = { user: user || null };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    const next = jest.fn();
    return { req, res, next };
}
describe('RBAC Middleware', () => {
    beforeEach(() => { jest.clearAllMocks(); });
    describe('requirePermission', () => {
        it('should call next() when user has the required permission', async () => {
            const { req, res, next } = mockReqRes({ userId: 'user-1', email: 'test@example.com' });
            const mockPerm = (0, factories_1.createMockPermission)({ slug: 'user:read' });
            const mockRole = (0, factories_1.createMockRole)({ rolePermissions: [{ permission: mockPerm }] });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ role: mockRole }));
            await (0, rbac_middleware_1.requirePermission)('user:read')(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
        it('should return 403 when user does not have the required permission', async () => {
            const { req, res, next } = mockReqRes({ userId: 'user-1', email: 'test@example.com' });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ role: (0, factories_1.createMockRole)({ rolePermissions: [] }) }));
            await (0, rbac_middleware_1.requirePermission)('user:delete')(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
        it('should return 401 when no user on request', async () => {
            const { req, res, next } = mockReqRes(null);
            await (0, rbac_middleware_1.requirePermission)('user:read')(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });
        it('should return 403 when user has no role assigned', async () => {
            const { req, res, next } = mockReqRes({ userId: 'user-1', email: 'test@example.com' });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ role: null }));
            await (0, rbac_middleware_1.requirePermission)('user:read')(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });
    describe('requireRole', () => {
        it('should call next() when user has the required role', async () => {
            const { req, res, next } = mockReqRes({ userId: 'user-1', email: 'test@example.com' });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ role: (0, factories_1.createMockRole)({ slug: 'admin' }) }));
            await (0, rbac_middleware_1.requireRole)('admin')(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('should return 403 when user has a different role', async () => {
            const { req, res, next } = mockReqRes({ userId: 'user-1', email: 'test@example.com' });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ role: (0, factories_1.createMockRole)({ slug: 'officer' }) }));
            await (0, rbac_middleware_1.requireRole)('admin')(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });
    describe('requireAnyPermission', () => {
        it('should call next() when user has any of the required permissions', async () => {
            const { req, res, next } = mockReqRes({ userId: 'user-1', email: 'test@example.com' });
            const mockPerm = (0, factories_1.createMockPermission)({ slug: 'user:read' });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ role: (0, factories_1.createMockRole)({ rolePermissions: [{ permission: mockPerm }] }) }));
            await (0, rbac_middleware_1.requireAnyPermission)(['user:read', 'user:delete'])(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('should return 403 when user has none of the required permissions', async () => {
            const { req, res, next } = mockReqRes({ userId: 'user-1', email: 'test@example.com' });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ role: (0, factories_1.createMockRole)({ rolePermissions: [] }) }));
            await (0, rbac_middleware_1.requireAnyPermission)(['user:read', 'user:delete'])(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });
    describe('requireAllPermissions', () => {
        it('should call next() when user has all required permissions', async () => {
            const { req, res, next } = mockReqRes({ userId: 'user-1', email: 'test@example.com' });
            const mockPerm1 = (0, factories_1.createMockPermission)({ slug: 'user:read' });
            const mockPerm2 = (0, factories_1.createMockPermission)({ slug: 'user:write' });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ role: (0, factories_1.createMockRole)({ rolePermissions: [{ permission: mockPerm1 }, { permission: mockPerm2 }] }) }));
            await (0, rbac_middleware_1.requireAllPermissions)(['user:read', 'user:write'])(req, res, next);
            expect(next).toHaveBeenCalled();
        });
        it('should return 403 when user lacks any of the required permissions', async () => {
            const { req, res, next } = mockReqRes({ userId: 'user-1', email: 'test@example.com' });
            const mockPerm = (0, factories_1.createMockPermission)({ slug: 'user:read' });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ role: (0, factories_1.createMockRole)({ rolePermissions: [{ permission: mockPerm }] }) }));
            await (0, rbac_middleware_1.requireAllPermissions)(['user:read', 'user:delete'])(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });
    describe('getUserPermissions', () => {
        it('should return list of permission slugs for a user with role', async () => {
            const mockPerm1 = (0, factories_1.createMockPermission)({ slug: 'user:read' });
            const mockPerm2 = (0, factories_1.createMockPermission)({ slug: 'user:write' });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ role: (0, factories_1.createMockRole)({ rolePermissions: [{ permission: mockPerm1 }, { permission: mockPerm2 }] }) }));
            const result = await (0, rbac_middleware_1.getUserPermissions)('user-1');
            expect(result).toEqual(['user:read', 'user:write']);
        });
        it('should return empty array for user without role', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ role: null }));
            const result = await (0, rbac_middleware_1.getUserPermissions)('user-1');
            expect(result).toEqual([]);
        });
    });
});
