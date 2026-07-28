"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
jest.mock('../../middleware/auth.middleware', () => ({
    authMiddleware: (req, _res, next) => {
        req.user = { userId: 'admin-user', email: 'admin@test.com' };
        next();
    },
}));
jest.mock('../../middleware/rbac.middleware', () => ({
    requirePermission: () => (_req, _res, next) => next(),
    requireRole: () => (_req, _res, next) => next(),
    requireAnyPermission: () => (_req, _res, next) => next(),
    requireAllPermissions: () => (_req, _res, next) => next(),
    getUserPermissions: jest.fn().mockResolvedValue(['service-type:read', 'service-type:create', 'service-type:update', 'service-type:delete']),
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
describe('ServiceType Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('GET /api/v1/service-types', () => {
        it('should list service types', async () => {
            mock_db_1.mockPrisma.serviceType.findMany.mockResolvedValue([(0, factories_1.createMockServiceType)()]);
            mock_db_1.mockPrisma.serviceType.count.mockResolvedValue(1);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/service-types');
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });
    });
    describe('POST /api/v1/service-types', () => {
        it('should create service type', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue(null);
            mock_db_1.mockPrisma.serviceType.create.mockResolvedValue((0, factories_1.createMockServiceType)());
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/service-types')
                .send({ name: 'Passport Renewal', slug: 'passport-renewal', category: 'VISA', fee: 100, duration: 10 });
            expect(res.status).toBe(201);
        });
        it('should return 400 on invalid data', async () => {
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/service-types')
                .send({ name: '' });
            expect(res.status).toBe(400);
        });
        it('should return 409 on duplicate slug', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue((0, factories_1.createMockServiceType)());
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/service-types')
                .send({ name: 'Passport', slug: 'passport-renewal', category: 'VISA' });
            expect(res.status).toBe(409);
        });
    });
    describe('GET /api/v1/service-types/category/:category', () => {
        it('should filter by category', async () => {
            mock_db_1.mockPrisma.serviceType.findMany.mockResolvedValue([(0, factories_1.createMockServiceType)()]);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/service-types/category/DOCUMENT');
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });
    });
    describe('GET /api/v1/service-types/:id', () => {
        it('should get by id', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue((0, factories_1.createMockServiceType)());
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/service-types/st-1');
            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe('st-1');
        });
        it('should return 404 for missing', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/service-types/nonexistent');
            expect(res.status).toBe(404);
        });
    });
    describe('PUT /api/v1/service-types/:id', () => {
        it('should update', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue((0, factories_1.createMockServiceType)());
            mock_db_1.mockPrisma.serviceType.update.mockResolvedValue((0, factories_1.createMockServiceType)({ name: 'Updated' }));
            const res = await (0, supertest_1.default)(server_1.default)
                .put('/api/v1/service-types/st-1')
                .send({ name: 'Updated' });
            expect(res.status).toBe(200);
        });
    });
    describe('DELETE /api/v1/service-types/:id', () => {
        it('should delete with no requests', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue((0, factories_1.createMockServiceType)());
            mock_db_1.mockPrisma.serviceRequest.count.mockResolvedValue(0);
            const res = await (0, supertest_1.default)(server_1.default).delete('/api/v1/service-types/st-1');
            expect(res.status).toBe(200);
        });
        it('should return 409 when requests exist', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue((0, factories_1.createMockServiceType)());
            mock_db_1.mockPrisma.serviceRequest.count.mockResolvedValue(3);
            const res = await (0, supertest_1.default)(server_1.default).delete('/api/v1/service-types/st-1');
            expect(res.status).toBe(409);
        });
    });
});
