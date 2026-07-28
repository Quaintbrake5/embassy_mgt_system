"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-correlation-id') }));
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
jest.mock('../../middleware/auth.middleware', () => ({
    authMiddleware: (req, _res, next) => { req.user = { userId: 'user-1', email: 'john@example.com' }; next(); },
}));
const adminUser = (0, factories_1.createMockUser)({
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
    auditMiddleware: (_req, _res, next) => next(),
}));
jest.mock('../../utils/jwt.utilities', () => ({ signAccessToken: jest.fn(() => 'mock-access-token'), signRefreshToken: jest.fn(() => 'mock-refresh-token'), verifyAccessToken: jest.fn(() => ({ userId: 'user-1', email: 'john@example.com' })), verifyRefreshToken: jest.fn(() => ({ userId: 'user-1' })) }));
jest.mock('../../utils/bcrypt.utilities', () => ({ hashPassword: jest.fn(() => 'hashed-password'), comparePassword: jest.fn(() => true) }));
jest.mock('../../utils/crypto.utilities', () => ({ generateToken: jest.fn(() => 'reset-token-123'), hashToken: jest.fn(() => 'hashed-reset-token') }));
const supertest_1 = __importDefault(require("supertest"));
const server_1 = __importDefault(require("../../server"));
describe('Permission Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(adminUser);
    });
    describe('POST /api/v1/permissions', () => {
        it('should create permission and return 201', async () => {
            mock_db_1.mockPrisma.permission.findUnique.mockResolvedValue(null);
            mock_db_1.mockPrisma.permission.create.mockResolvedValue((0, factories_1.createMockPermission)());
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/permissions').send({ name: 'Read Users', slug: 'user:read' });
            expect(res.status).toBe(201);
        });
        it('should return 409 for duplicate slug', async () => {
            mock_db_1.mockPrisma.permission.findUnique.mockResolvedValue((0, factories_1.createMockPermission)());
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/permissions').send({ name: 'Read Users', slug: 'user:read' });
            expect(res.status).toBe(409);
        });
    });
    describe('GET /api/v1/permissions', () => {
        it('should return paginated permissions', async () => {
            mock_db_1.mockPrisma.permission.findMany.mockResolvedValue([]);
            mock_db_1.mockPrisma.permission.count.mockResolvedValue(0);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/permissions');
            expect(res.status).toBe(200);
        });
    });
    describe('GET /api/v1/permissions/:id', () => {
        it('should return permission by id', async () => {
            mock_db_1.mockPrisma.permission.findUnique.mockResolvedValue((0, factories_1.createMockPermission)());
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/permissions/perm-1');
            expect(res.status).toBe(200);
        });
        it('should return 404 for nonexistent permission', async () => {
            mock_db_1.mockPrisma.permission.findUnique.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/permissions/nonexistent');
            expect(res.status).toBe(404);
        });
    });
    describe('PUT /api/v1/permissions/:id', () => {
        it('should update permission', async () => {
            const mockPerm = (0, factories_1.createMockPermission)();
            mock_db_1.mockPrisma.permission.findUnique.mockResolvedValue(mockPerm);
            mock_db_1.mockPrisma.permission.update.mockResolvedValue(mockPerm);
            const res = await (0, supertest_1.default)(server_1.default).put('/api/v1/permissions/perm-1').send({ name: 'Write Users' });
            expect(res.status).toBe(200);
        });
    });
    describe('DELETE /api/v1/permissions/:id', () => {
        it('should delete permission', async () => {
            mock_db_1.mockPrisma.permission.findUnique.mockResolvedValue((0, factories_1.createMockPermission)());
            mock_db_1.mockPrisma.rolePermission.count.mockResolvedValue(0);
            const res = await (0, supertest_1.default)(server_1.default).delete('/api/v1/permissions/perm-1');
            expect(res.status).toBe(200);
        });
        it('should return 409 if assigned to roles', async () => {
            mock_db_1.mockPrisma.permission.findUnique.mockResolvedValue((0, factories_1.createMockPermission)());
            mock_db_1.mockPrisma.rolePermission.count.mockResolvedValue(1);
            const res = await (0, supertest_1.default)(server_1.default).delete('/api/v1/permissions/perm-1');
            expect(res.status).toBe(409);
        });
    });
});
