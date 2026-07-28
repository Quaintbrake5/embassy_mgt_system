"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const client_1 = require("../../generated/prisma/client");
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
jest.mock('../../middleware/auth.middleware', () => ({
    authMiddleware: (req, _res, next) => {
        req.user = { userId: 'test-user', email: 'user@test.com' };
        next();
    },
}));
jest.mock('../../middleware/rbac.middleware', () => ({
    requirePermission: () => (_req, _res, next) => next(),
    requireRole: () => (_req, _res, next) => next(),
    requireAnyPermission: () => (_req, _res, next) => next(),
    requireAllPermissions: () => (_req, _res, next) => next(),
    getUserPermissions: jest.fn().mockResolvedValue(['profile:create', 'profile:read']),
}));
jest.mock('../../middleware/error.middleware', () => ({
    errorMiddleware: (err, _req, res, _next) => {
        res.status(err.statusCode || 500).json({
            success: false,
            error: { message: err.message || 'Internal server error', details: err.details },
        });
    },
    notFoundMiddleware: (_req, res) => {
        res.status(404).json({ success: false, error: { message: 'Route not found' } });
    },
}));
jest.mock('uuid', () => ({ v4: () => 'test-correlation-id' }));
const server_1 = __importDefault(require("../../server"));
describe('Profile Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('POST /api/v1/profile', () => {
        it('should create profile', async () => {
            mock_db_1.mockPrisma.profile.create.mockResolvedValue((0, factories_1.createMockProfile)());
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/profile')
                .send({ gender: 'MALE', dateOfBirth: '1990-01-01' });
            expect(res.status).toBe(201);
            expect(res.body.data.gender).toBe('MALE');
        });
        it('should return 400 on invalid gender', async () => {
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/profile')
                .send({ gender: 'INVALID' });
            expect(res.status).toBe(400);
        });
        it('should return 409 on duplicate', async () => {
            const prismaError = new client_1.Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (userId)', { code: 'P2002', clientVersion: '7.9.0' });
            mock_db_1.mockPrisma.profile.create.mockRejectedValue(prismaError);
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/profile')
                .send({ gender: 'MALE', dateOfBirth: '1990-01-01' });
            expect(res.status).toBe(409);
        });
    });
    describe('GET /api/v1/profile/me', () => {
        it('should get own profile', async () => {
            mock_db_1.mockPrisma.profile.findUnique.mockResolvedValue((0, factories_1.createMockProfile)());
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/profile/me');
            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe('prof-1');
        });
        it('should return 404 when no profile', async () => {
            mock_db_1.mockPrisma.profile.findUnique.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/profile/me');
            expect(res.status).toBe(404);
        });
    });
    describe('PUT /api/v1/profile/me', () => {
        it('should update profile', async () => {
            mock_db_1.mockPrisma.profile.update.mockResolvedValue((0, factories_1.createMockProfile)({ city: 'New City', gender: 'FEMALE' }));
            const res = await (0, supertest_1.default)(server_1.default)
                .put('/api/v1/profile/me')
                .send({ gender: 'FEMALE', city: 'New City' });
            expect(res.status).toBe(200);
            expect(res.body.data.city).toBe('New City');
        });
    });
    describe('DELETE /api/v1/profile/me (GDPR)', () => {
        it('should anonymize profile data', async () => {
            mock_db_1.mockPrisma.profile.update.mockResolvedValue((0, factories_1.createMockProfile)({
                gender: 'PREFER_NOT_TO_SAY',
                dateOfBirth: null,
                city: null,
                country: null,
                avatar: null,
                bio: null,
                state: null,
                postalCode: null,
            }));
            const res = await (0, supertest_1.default)(server_1.default).delete('/api/v1/profile/me');
            expect(res.status).toBe(200);
            expect(res.body.message).toContain('GDPR');
            expect(mock_db_1.mockPrisma.profile.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ gender: 'PREFER_NOT_TO_SAY' }),
            }));
        });
    });
    describe('GET /api/v1/profile/:id (officer)', () => {
        it('should get profile by officer', async () => {
            mock_db_1.mockPrisma.profile.findUnique.mockResolvedValue((0, factories_1.createMockProfile)());
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/profile/user-1');
            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe('prof-1');
        });
        it('should return 404 for missing profile', async () => {
            mock_db_1.mockPrisma.profile.findUnique.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/profile/nonexistent');
            expect(res.status).toBe(404);
        });
    });
});
