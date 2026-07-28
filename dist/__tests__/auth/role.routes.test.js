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
jest.mock('../../middleware/audit.middleware', () => ({
    auditMiddleware: (_req, _res, next) => next(),
}));
jest.mock('../../utils/jwt.utilities', () => ({ signAccessToken: jest.fn(() => 'mock-access-token'), signRefreshToken: jest.fn(() => 'mock-refresh-token'), verifyAccessToken: jest.fn(() => ({ userId: 'user-1', email: 'john@example.com' })), verifyRefreshToken: jest.fn(() => ({ userId: 'user-1' })) }));
jest.mock('../../utils/bcrypt.utilities', () => ({ hashPassword: jest.fn(() => 'hashed-password'), comparePassword: jest.fn(() => true) }));
jest.mock('../../utils/crypto.utilities', () => ({ generateToken: jest.fn(() => 'reset-token-123'), hashToken: jest.fn(() => 'hashed-reset-token') }));
const supertest_1 = __importDefault(require("supertest"));
const server_1 = __importDefault(require("../../server"));
describe('Role Routes', () => {
    beforeEach(() => { jest.clearAllMocks(); });
    describe('POST /api/v1/roles', () => {
        it('should create role and return 201', async () => {
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue(null);
            mock_db_1.mockPrisma.role.create.mockResolvedValue((0, factories_1.createMockRole)());
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/roles').send({ name: 'Officer', slug: 'officer' });
            expect(res.status).toBe(201);
        });
        it('should return 409 for duplicate slug', async () => {
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue((0, factories_1.createMockRole)());
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/roles').send({ name: 'Officer', slug: 'officer' });
            expect(res.status).toBe(409);
        });
    });
    describe('GET /api/v1/roles', () => {
        it('should return paginated roles', async () => {
            mock_db_1.mockPrisma.role.findMany.mockResolvedValue([]);
            mock_db_1.mockPrisma.role.count.mockResolvedValue(0);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/roles');
            expect(res.status).toBe(200);
        });
    });
    describe('GET /api/v1/roles/:id', () => {
        it('should return role by id', async () => {
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue((0, factories_1.createMockRole)({ rolePermissions: [{ permission: (0, factories_1.createMockPermission)() }] }));
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/roles/role-1');
            expect(res.status).toBe(200);
        });
        it('should return 404 for nonexistent role', async () => {
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/roles/nonexistent');
            expect(res.status).toBe(404);
        });
    });
    describe('PUT /api/v1/roles/:id', () => {
        it('should update role', async () => {
            const mockRole = (0, factories_1.createMockRole)({ rolePermissions: [] });
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue(mockRole);
            mock_db_1.mockPrisma.role.update.mockResolvedValue(mockRole);
            const res = await (0, supertest_1.default)(server_1.default).put('/api/v1/roles/role-1').send({ name: 'Senior Officer' });
            expect(res.status).toBe(200);
        });
    });
    describe('DELETE /api/v1/roles/:id', () => {
        it('should delete role with no users', async () => {
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue((0, factories_1.createMockRole)());
            mock_db_1.mockPrisma.user.count.mockResolvedValue(0);
            const res = await (0, supertest_1.default)(server_1.default).delete('/api/v1/roles/role-1');
            expect(res.status).toBe(200);
        });
        it('should return 409 if role has users', async () => {
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue((0, factories_1.createMockRole)());
            mock_db_1.mockPrisma.user.count.mockResolvedValue(2);
            const res = await (0, supertest_1.default)(server_1.default).delete('/api/v1/roles/role-1');
            expect(res.status).toBe(409);
        });
    });
    describe('POST /api/v1/roles/:id/permissions', () => {
        it('should assign permissions to role', async () => {
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue((0, factories_1.createMockRole)({ rolePermissions: [{ permission: (0, factories_1.createMockPermission)() }] }));
            mock_db_1.mockPrisma.permission.findMany.mockResolvedValue([(0, factories_1.createMockPermission)()]);
            mock_db_1.mockPrisma.rolePermission.deleteMany.mockResolvedValue({ count: 0 });
            mock_db_1.mockPrisma.rolePermission.createMany.mockResolvedValue({ count: 1 });
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/roles/role-1/permissions').send({ permissionIds: ['550e8400-e29b-41d4-a716-446655440000'] });
            expect(res.status).toBe(200);
        });
    });
});
