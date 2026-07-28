"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const crypto_1 = __importDefault(require("crypto"));
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
    getUserPermissions: jest.fn().mockResolvedValue(['service-request:read-all', 'service-request:create', 'service-request:read', 'service-request:update']),
}));
jest.mock('../../middleware/embassy.middleware', () => ({
    resolveEmbassyContext: (_req, _res, next) => next(),
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
describe('ServiceRequest Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('POST /api/v1/service-requests', () => {
        it('should create a service request', async () => {
            jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
            jest.spyOn(crypto_1.default, 'randomBytes').mockReturnValue(Buffer.from("a1b2c3d4e5f6a7b8", "hex"));
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue((0, factories_1.createMockServiceType)({ fee: 0 }));
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.serviceRequest.create.mockResolvedValue((0, factories_1.createMockServiceRequest)({ referenceNumber: 'SR-KF12OJ-A1B2C3D4E5F6A7B8', status: 'DRAFT' }));
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/service-requests')
                .send({ serviceTypeId: '550e8400-e29b-41d4-a716-446655440000', embassyId: '550e8400-e29b-41d4-a716-446655440001' });
            expect(res.status).toBe(201);
            expect(res.body.data.referenceNumber).toMatch(/^SR-/);
            jest.restoreAllMocks();
        });
        it('should return 400 on invalid data', async () => {
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/service-requests')
                .send({});
            expect(res.status).toBe(400);
        });
    });
    describe('GET /api/v1/service-requests', () => {
        it('should list service requests', async () => {
            mock_db_1.mockPrisma.serviceRequest.findMany.mockResolvedValue([(0, factories_1.createMockServiceRequest)()]);
            mock_db_1.mockPrisma.serviceRequest.count.mockResolvedValue(1);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/service-requests');
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });
        it('should filter by status query param', async () => {
            mock_db_1.mockPrisma.serviceRequest.findMany.mockResolvedValue([]);
            mock_db_1.mockPrisma.serviceRequest.count.mockResolvedValue(0);
            await (0, supertest_1.default)(server_1.default).get('/api/v1/service-requests?status=SUBMITTED');
            expect(mock_db_1.mockPrisma.serviceRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'SUBMITTED' }) }));
        });
    });
    describe('GET /api/v1/service-requests/:id', () => {
        it('should get by id', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({
                user: { userid: 'u1', firstName: 'J', lastName: 'D', email: 'j@t.com' },
                serviceType: { id: 'st-1', name: 'P', slug: 'p', category: 'VISA' },
                embassy: { id: 'e1', name: 'E', code: 'E1', country: 'C', city: 'Ct' },
                payments: [],
            }));
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/service-requests/sr-1');
            expect(res.status).toBe(200);
            expect(res.body.data.referenceNumber).toBe('SR-TEST-123');
        });
        it('should return 404 for missing', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/service-requests/nonexistent');
            expect(res.status).toBe(404);
        });
    });
    describe('PUT /api/v1/service-requests/:id/status', () => {
        it('should update status', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({ status: 'DRAFT' }));
            mock_db_1.mockPrisma.serviceRequest.update.mockResolvedValue((0, factories_1.createMockServiceRequest)({ status: 'SUBMITTED', submittedAt: new Date() }));
            const res = await (0, supertest_1.default)(server_1.default)
                .put('/api/v1/service-requests/sr-1/status')
                .send({ status: 'SUBMITTED' });
            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('SUBMITTED');
        });
        it('should return 400 for invalid status', async () => {
            const res = await (0, supertest_1.default)(server_1.default)
                .put('/api/v1/service-requests/sr-1/status')
                .send({ status: 'INVALID' });
            expect(res.status).toBe(400);
        });
        it('should return 400 for invalid transition', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({ status: 'DRAFT' }));
            const res = await (0, supertest_1.default)(server_1.default)
                .put('/api/v1/service-requests/sr-1/status')
                .send({ status: 'COMPLETED' });
            expect(res.status).toBe(400);
        });
    });
});
