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
jest.mock('../../utils/jwt.utilities', () => ({ signAccessToken: jest.fn(() => 'mock-access-token'), signRefreshToken: jest.fn(() => 'mock-refresh-token'), verifyRefreshToken: jest.fn(() => ({ userId: 'user-1' })), verifyAccessToken: jest.fn(() => ({ userId: 'user-1', email: 'john@example.com' })) }));
jest.mock('../../utils/bcrypt.utilities', () => ({ hashPassword: jest.fn(() => 'hashed'), comparePassword: jest.fn(() => true) }));
jest.mock('../../utils/crypto.utilities', () => ({ generateToken: jest.fn(() => 'reset-token-123'), hashToken: jest.fn(() => 'hashed-reset-token') }));
const supertest_1 = __importDefault(require("supertest"));
const server_1 = __importDefault(require("../../server"));
describe('Auth Routes', () => {
    beforeEach(() => { jest.clearAllMocks(); });
    describe('POST /api/v1/auth/register', () => {
        it('should register a new user and return 201', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(null);
            mock_db_1.mockPrisma.user.create.mockResolvedValue((0, factories_1.createMockUser)({ phone: null, roleId: null, passwordHash: 'hashed', status: 'PENDING' }));
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/auth/register').send({ firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'StrongP@ss1' });
            expect(res.status).toBe(201);
        });
        it('should return 400 for invalid input', async () => {
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/auth/register').send({ firstName: '' });
            expect(res.status).toBe(400);
        });
        it('should return 409 for duplicate email', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)());
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/auth/register').send({ firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'StrongP@ss1' });
            expect(res.status).toBe(409);
        });
    });
    describe('POST /api/v1/auth/login', () => {
        it('should login successfully and return 200', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ roleId: null, status: 'ACTIVE', role: null }));
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/auth/login').send({ email: 'john@example.com', password: 'StrongP@ss1' });
            expect(res.status).toBe(200);
        });
        it('should return 401 for invalid credentials', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/auth/login').send({ email: 'wrong@example.com', password: 'WrongP@ss1' });
            expect(res.status).toBe(401);
        });
        it('should return 403 for suspended account', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ status: 'SUSPENDED', role: null }));
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/auth/login').send({ email: 'john@example.com', password: 'StrongP@ss1' });
            expect(res.status).toBe(403);
        });
    });
    describe('POST /api/v1/auth/refresh', () => {
        it('should refresh token and return 200', async () => {
            const mockUser = (0, factories_1.createMockUser)({ roleId: null, status: 'ACTIVE' });
            mock_db_1.mockPrisma.refreshToken.findUnique.mockResolvedValue((0, factories_1.createMockRefreshToken)({ isRevoked: false, expiresAt: new Date(Date.now() + 86400000), user: { ...mockUser, role: null } }));
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/auth/refresh').send({ refreshToken: 'valid-token' });
            expect(res.status).toBe(200);
        });
        it('should return 401 for invalid refresh token', async () => {
            mock_db_1.mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/auth/refresh').send({ refreshToken: 'invalid-token' });
            expect(res.status).toBe(401);
        });
    });
    describe('POST /api/v1/auth/logout', () => {
        it('should logout and return 200', async () => {
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/auth/logout');
            expect(res.status).toBe(200);
        });
    });
    describe('POST /api/v1/auth/change-password', () => {
        it('should change password and return 200', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)());
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/auth/change-password').send({ currentPassword: 'OldP@ss1', newPassword: 'NewP@ss1' });
            expect(res.status).toBe(200);
        });
        it('should return 401 for wrong current password', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)());
            require('../../utils/bcrypt.utilities').comparePassword.mockReturnValue(false);
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/auth/change-password').send({ currentPassword: 'WrongP@ss1', newPassword: 'NewP@ss1' });
            expect(res.status).toBe(401);
        });
    });
    describe('POST /api/v1/auth/forgot-password', () => {
        it('should send reset token for existing email', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)());
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/auth/forgot-password').send({ email: 'john@example.com' });
            expect(res.status).toBe(200);
        });
    });
    describe('POST /api/v1/auth/reset-password', () => {
        it('should reset password with valid token', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)());
            const forgotRes = await (0, supertest_1.default)(server_1.default).post('/api/v1/auth/forgot-password').send({ email: 'john@example.com' });
            const token = forgotRes.body.data.token;
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/auth/reset-password').send({ token, newPassword: 'NewStr0ng!Pass' });
            expect(res.status).toBe(200);
        });
        it('should return 401 for invalid token', async () => {
            const res = await (0, supertest_1.default)(server_1.default).post('/api/v1/auth/reset-password').send({ token: 'invalid', newPassword: 'NewStr0ng!Pass' });
            expect(res.status).toBe(401);
        });
    });
});
