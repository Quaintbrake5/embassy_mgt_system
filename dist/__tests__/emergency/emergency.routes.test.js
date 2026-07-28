"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mockPrisma = {
    user: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    embassy: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    auditLog: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), count: jest.fn() },
    emergencyCase: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    diplomaticPouch: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    staffClearance: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    $transaction: jest.fn((fn) => fn(mockPrisma)),
    $disconnect: jest.fn(),
};
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-correlation-id') }));
jest.mock('../../config/db.config', () => ({ prisma: mockPrisma }));
jest.mock('../../middleware/auth.middleware', () => ({
    authMiddleware: (req, _res, next) => {
        req.user = { userId: 'test-user', email: 'test@example.com', roleId: 'role-1' };
        next();
    },
}));
jest.mock('../../middleware/rbac.middleware', () => ({
    requirePermission: jest.fn(() => (_req, _res, next) => next()),
    requireRole: jest.fn(() => (_req, _res, next) => next()),
    requireAnyPermission: jest.fn(() => (_req, _res, next) => next()),
    requireAllPermissions: jest.fn(() => (_req, _res, next) => next()),
    getUserPermissions: jest.fn(() => []),
}));
jest.mock('../../middleware/audit.middleware', () => ({
    auditMiddleware: (_req, _res, next) => next(),
}));
jest.mock('../../middleware/error.middleware', () => ({
    errorMiddleware: (err, _req, res, _next) => {
        const status = err.statusCode || 500;
        const code = err.constructor?.name?.replace('Error', '')?.toUpperCase() || 'INTERNAL_ERROR';
        res.status(status).json({
            success: false,
            error: { code, message: err.message, details: err.details },
        });
    },
    notFoundMiddleware: (_req, res) => {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
    },
}));
const factories_1 = require("../helpers/factories");
const server_1 = __importDefault(require("../../server"));
describe('Emergency Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('POST /api/v1/emergency/cases', () => {
        it('should create emergency case and return 201', async () => {
            mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            mockPrisma.emergencyCase.create.mockResolvedValue((0, factories_1.createMockEmergencyCase)({
                referenceNumber: 'EC-TEST', caseType: 'EVACUATION',
                description: 'Evacuation needed | Zone A', urgency: 'HIGH',
                status: 'OPEN', embassyId: '550e8400-e29b-41d4-a716-446655440001', resolvedAt: null,
            }));
            mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/emergency/cases')
                .send({ caseType: 'EVACUATION', description: 'Evacuation needed', urgency: 'HIGH', location: 'Zone A', embassyId: '550e8400-e29b-41d4-a716-446655440001' });
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.referenceNumber).toMatch(/^EC-/);
        });
        it('should return 400 for missing required fields', async () => {
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/emergency/cases')
                .send({ description: 'Missing caseType and embassyId' });
            expect(res.status).toBe(400);
        });
    });
    describe('GET /api/v1/emergency/cases', () => {
        it('should return paginated cases', async () => {
            mockPrisma.emergencyCase.findMany.mockResolvedValue([
                (0, factories_1.createMockEmergencyCase)({ referenceNumber: 'EC-001', caseType: 'EVACUATION', description: null, resolvedAt: null }),
            ]);
            mockPrisma.emergencyCase.count.mockResolvedValue(1);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/emergency/cases');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
        });
    });
    describe('GET /api/v1/emergency/cases/:id', () => {
        it('should return case by id', async () => {
            mockPrisma.emergencyCase.findUnique.mockResolvedValue((0, factories_1.createMockEmergencyCase)({ referenceNumber: 'EC-001', caseType: 'EVACUATION', description: null, resolvedAt: null }));
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/emergency/cases/ec-1');
            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe('ec-1');
        });
        it('should return 404 for nonexistent case', async () => {
            mockPrisma.emergencyCase.findUnique.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/emergency/cases/nonexistent');
            expect(res.status).toBe(404);
        });
    });
    describe('PUT /api/v1/emergency/cases/:id/status', () => {
        it('should update case status', async () => {
            const mockCase = (0, factories_1.createMockEmergencyCase)({
                referenceNumber: 'EC-001', caseType: 'EVACUATION',
                description: null, resolvedAt: null, status: 'OPEN',
            });
            mockPrisma.emergencyCase.findUnique.mockResolvedValue(mockCase);
            mockPrisma.emergencyCase.update.mockResolvedValue({ ...mockCase, status: 'IN_PROGRESS' });
            mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const res = await (0, supertest_1.default)(server_1.default)
                .put('/api/v1/emergency/cases/ec-1/status')
                .send({ status: 'IN_PROGRESS' });
            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('IN_PROGRESS');
        });
        it('should return 400 for invalid status value', async () => {
            const res = await (0, supertest_1.default)(server_1.default)
                .put('/api/v1/emergency/cases/ec-1/status')
                .send({ status: 'INVALID_STATUS' });
            expect(res.status).toBe(400);
        });
    });
    describe('POST /api/v1/emergency/alerts', () => {
        it('should broadcast alert and return 201', async () => {
            mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/emergency/alerts')
                .send({ message: 'Evacuate immediately', embassyId: '550e8400-e29b-41d4-a716-446655440001', urgency: 'CRITICAL' });
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });
        it('should return 400 for missing message', async () => {
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/emergency/alerts')
                .send({ embassyId: '550e8400-e29b-41d4-a716-446655440001', urgency: 'CRITICAL' });
            expect(res.status).toBe(400);
        });
    });
    describe('GET /api/v1/emergency/evacuation-list', () => {
        it('should return evacuation list sorted by urgency', async () => {
            mockPrisma.emergencyCase.findMany.mockResolvedValue([
                (0, factories_1.createMockEmergencyCase)({
                    id: 'ec-1', referenceNumber: 'EC-001', caseType: 'EVACUATION',
                    description: null, resolvedAt: null, urgency: 'LOW', status: 'OPEN',
                }),
                (0, factories_1.createMockEmergencyCase)({
                    id: 'ec-2', referenceNumber: 'EC-002', caseType: 'EVACUATION',
                    description: null, resolvedAt: null, urgency: 'CRITICAL', status: 'OPEN',
                }),
            ]);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/emergency/evacuation-list?embassyId=550e8400-e29b-41d4-a716-446655440001');
            expect(res.status).toBe(200);
            expect(res.body.data[0].urgency).toBe('CRITICAL');
        });
        it('should return 400 without embassyId', async () => {
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/emergency/evacuation-list');
            expect(res.status).toBe(400);
        });
    });
});
