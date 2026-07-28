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
const adminRole = {
    id: 'role-admin',
    name: 'Admin',
    slug: 'admin',
    description: 'Administrator',
    createdAt: new Date('2026-01-01'),
    Updated: new Date('2026-01-01'),
    rolePermissions: [
        { permission: { slug: 'user:read', name: 'Read Users' } },
        { permission: { slug: 'user:create', name: 'Create Users' } },
        { permission: { slug: 'user:update', name: 'Update Users' } },
        { permission: { slug: 'user:delete', name: 'Delete Users' } },
    ],
};
const adminUser = (0, factories_1.createMockUser)({ roleId: 'role-admin', role: adminRole });
jest.mock('../../middleware/audit.middleware', () => ({
    auditMiddleware: (_req, _res, next) => next(),
}));
jest.mock('../../utils/jwt.utilities', () => ({ signAccessToken: jest.fn(() => 'mock-access-token'), signRefreshToken: jest.fn(() => 'mock-refresh-token'), verifyAccessToken: jest.fn(() => ({ userId: 'user-1', email: 'john@example.com' })), verifyRefreshToken: jest.fn(() => ({ userId: 'user-1' })) }));
jest.mock('../../utils/bcrypt.utilities', () => ({ hashPassword: jest.fn(() => 'hashed-password'), comparePassword: jest.fn(() => true) }));
jest.mock('../../utils/crypto.utilities', () => ({ generateToken: jest.fn(() => 'reset-token-123'), hashToken: jest.fn(() => 'hashed-reset-token') }));
const supertest_1 = __importDefault(require("supertest"));
const server_1 = __importDefault(require("../../server"));
describe('User Routes', () => {
    beforeEach(() => { jest.clearAllMocks(); });
    describe('GET /api/v1/users/me', () => {
        it('should return user profile', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ role: null, profile: null }));
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/users/me');
            expect(res.status).toBe(200);
        });
    });
    describe('PUT /api/v1/users/me', () => {
        it('should update own profile', async () => {
            const mockUser = (0, factories_1.createMockUser)({ role: null, profile: null });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mock_db_1.mockPrisma.user.update.mockResolvedValue(mockUser);
            const res = await (0, supertest_1.default)(server_1.default).put('/api/v1/users/me').send({ firstName: 'Jane' });
            expect(res.status).toBe(200);
        });
    });
    describe('GET /api/v1/users/:id', () => {
        it('should return user by id', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(adminUser);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/users/user-1');
            expect(res.status).toBe(200);
        });
        it('should return 404 for nonexistent user', async () => {
            mock_db_1.mockPrisma.user.findUnique
                .mockResolvedValueOnce(adminUser)
                .mockResolvedValueOnce(null);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/users/nonexistent');
            expect(res.status).toBe(404);
        });
    });
    describe('PUT /api/v1/users/:id', () => {
        it('should update user by id', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(adminUser);
            mock_db_1.mockPrisma.user.update.mockResolvedValue(adminUser);
            const res = await (0, supertest_1.default)(server_1.default).put('/api/v1/users/user-1').send({ firstName: 'Jane' });
            expect(res.status).toBe(200);
        });
    });
    describe('PATCH /api/v1/users/:id/status', () => {
        it('should update user status', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(adminUser);
            mock_db_1.mockPrisma.user.update.mockResolvedValue({ ...adminUser, status: 'SUSPENDED' });
            const res = await (0, supertest_1.default)(server_1.default).patch('/api/v1/users/user-1/status').send({ status: 'SUSPENDED' });
            expect(res.status).toBe(200);
        });
    });
    describe('PUT /api/v1/users/:id/role', () => {
        it('should assign role to user', async () => {
            const mockRole = (0, factories_1.createMockRole)();
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(adminUser);
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue(mockRole);
            mock_db_1.mockPrisma.user.update.mockResolvedValue({ ...adminUser, roleId: 'role-1', role: mockRole });
            const res = await (0, supertest_1.default)(server_1.default).put('/api/v1/users/user-1/role').send({ roleId: 'role-1' });
            expect(res.status).toBe(200);
        });
    });
    describe('DELETE /api/v1/users/:id', () => {
        it('should delete user', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(adminUser);
            const res = await (0, supertest_1.default)(server_1.default).delete('/api/v1/users/user-1');
            expect(res.status).toBe(200);
        });
        it('should return 404 for nonexistent user', async () => {
            mock_db_1.mockPrisma.user.findUnique
                .mockResolvedValueOnce(adminUser)
                .mockResolvedValueOnce(null);
            const res = await (0, supertest_1.default)(server_1.default).delete('/api/v1/users/nonexistent');
            expect(res.status).toBe(404);
        });
    });
});
