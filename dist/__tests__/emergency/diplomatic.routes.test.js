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
describe('Diplomatic Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('POST /api/v1/diplomatic/pouches', () => {
        it('should create pouch and return 201', async () => {
            mockPrisma.embassy.findUnique.mockResolvedValueOnce((0, factories_1.createMockEmbassy)());
            mockPrisma.embassy.findUnique.mockResolvedValueOnce((0, factories_1.createMockEmbassy)({ id: '550e8400-e29b-41d4-a716-446655440005', name: 'Dest Embassy', code: 'DEST' }));
            mockPrisma.diplomaticPouch.create.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ pouchNumber: 'DP-TEST', dispatchDate: new Date('2026-06-15') }));
            mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/diplomatic/pouches')
                .send({ originEmbassyId: '550e8400-e29b-41d4-a716-446655440001', destinationEmbassyId: '550e8400-e29b-41d4-a716-446655440005', dispatchDate: '2026-06-15' });
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.pouchNumber).toMatch(/^DP-/);
        });
        it('should return 400 for same origin and destination', async () => {
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/diplomatic/pouches')
                .send({ originEmbassyId: '550e8400-e29b-41d4-a716-446655440001', destinationEmbassyId: '550e8400-e29b-41d4-a716-446655440001' });
            expect(res.status).toBe(400);
        });
        it('should return 400 for missing required fields', async () => {
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/diplomatic/pouches')
                .send({});
            expect(res.status).toBe(400);
        });
    });
    describe('GET /api/v1/diplomatic/pouches', () => {
        it('should return paginated pouches', async () => {
            mockPrisma.diplomaticPouch.findMany.mockResolvedValue([
                (0, factories_1.createMockDiplomaticPouch)({ pouchNumber: 'DP-001' }),
            ]);
            mockPrisma.diplomaticPouch.count.mockResolvedValue(1);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/diplomatic/pouches');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(1);
        });
    });
    describe('GET /api/v1/diplomatic/pouches/:id', () => {
        it('should return pouch by id', async () => {
            mockPrisma.diplomaticPouch.findUnique.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ pouchNumber: 'DP-001' }));
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/diplomatic/pouches/dp-1');
            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe('dp-1');
        });
        it('should return 404 for nonexistent pouch', async () => {
            mockPrisma.diplomaticPouch.findUnique.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/diplomatic/pouches/nonexistent');
            expect(res.status).toBe(404);
        });
    });
    describe('PUT /api/v1/diplomatic/pouches/:id/handoff', () => {
        it('should handoff pouch successfully', async () => {
            mockPrisma.diplomaticPouch.findUnique.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ id: 'dp-1', pouchNumber: 'DP-001', status: 'CREATED', chainOfCustody: [] }));
            mockPrisma.diplomaticPouch.update.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ id: 'dp-1', pouchNumber: 'DP-001', status: 'IN_TRANSIT' }));
            mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const res = await (0, supertest_1.default)(server_1.default)
                .put('/api/v1/diplomatic/pouches/dp-1/handoff')
                .send({ handoffData: { handedOverBy: 'Officer A', handedOverTo: 'Officer B', notes: 'Transfer' }, newStatus: 'IN_TRANSIT' });
            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('IN_TRANSIT');
        });
        it('should return 400 for invalid transition', async () => {
            mockPrisma.diplomaticPouch.findUnique.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ id: 'dp-1', pouchNumber: 'DP-001', status: 'CREATED', chainOfCustody: [] }));
            const res = await (0, supertest_1.default)(server_1.default)
                .put('/api/v1/diplomatic/pouches/dp-1/handoff')
                .send({ handoffData: { handedOverBy: 'Officer A', handedOverTo: 'Admin', notes: 'Skip' }, newStatus: 'CLOSED' });
            expect(res.status).toBe(400);
        });
        it('should return 400 for missing handoff data', async () => {
            const res = await (0, supertest_1.default)(server_1.default)
                .put('/api/v1/diplomatic/pouches/dp-1/handoff')
                .send({ newStatus: 'IN_TRANSIT' });
            expect(res.status).toBe(400);
        });
    });
    describe('POST /api/v1/diplomatic/clearances', () => {
        it('should create clearance and return 201', async () => {
            mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ userid: '550e8400-e29b-41d4-a716-446655440003' }));
            mockPrisma.staffClearance.findUnique.mockResolvedValue(null);
            mockPrisma.staffClearance.create.mockResolvedValue({
                id: 'clr-1', userId: '550e8400-e29b-41d4-a716-446655440003', clearanceLevel: 'LEVEL_3',
                issuedBy: 'test-user', issuedAt: new Date(), expiresAt: new Date('2027-01-01'),
                isActive: true, createdAt: new Date(), Updated: new Date(),
            });
            mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/diplomatic/clearances')
                .send({ userId: '550e8400-e29b-41d4-a716-446655440003', clearanceLevel: 'LEVEL_3', expiresAt: '2027-01-01' });
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.clearanceLevel).toBe('LEVEL_3');
        });
        it('should return 400 for missing clearance level', async () => {
            const res = await (0, supertest_1.default)(server_1.default)
                .post('/api/v1/diplomatic/clearances')
                .send({ userId: '550e8400-e29b-41d4-a716-446655440003' });
            expect(res.status).toBe(400);
        });
    });
    describe('GET /api/v1/diplomatic/clearances', () => {
        it('should return paginated clearances', async () => {
            mockPrisma.staffClearance.findMany.mockResolvedValue([
                { id: 'clr-1', userId: '550e8400-e29b-41d4-a716-446655440003', clearanceLevel: 'LEVEL_3', issuedBy: 'test-user', issuedAt: new Date(), expiresAt: null, isActive: true, createdAt: new Date(), Updated: new Date() },
            ]);
            mockPrisma.staffClearance.count.mockResolvedValue(1);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/diplomatic/clearances');
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });
    });
    describe('GET /api/v1/diplomatic/clearances/:id', () => {
        it('should return clearance by id', async () => {
            const clearance = { id: 'clr-1', userId: '550e8400-e29b-41d4-a716-446655440003', clearanceLevel: 'LEVEL_3', issuedBy: 'test-user', issuedAt: new Date(), expiresAt: null, isActive: true, createdAt: new Date(), Updated: new Date() };
            mockPrisma.staffClearance.findUnique.mockResolvedValue(clearance);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/diplomatic/clearances/clr-1');
            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe('clr-1');
        });
        it('should return 404 for nonexistent clearance', async () => {
            mockPrisma.staffClearance.findUnique.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(server_1.default).get('/api/v1/diplomatic/clearances/nonexistent');
            expect(res.status).toBe(404);
        });
    });
    describe('PUT /api/v1/diplomatic/clearances/:id', () => {
        it('should update clearance', async () => {
            const existing = { id: 'clr-1', userId: '550e8400-e29b-41d4-a716-446655440003', clearanceLevel: 'LEVEL_2', issuedBy: 'test-user', issuedAt: new Date(), expiresAt: null, isActive: true, createdAt: new Date(), Updated: new Date() };
            mockPrisma.staffClearance.findUnique.mockResolvedValue(existing);
            mockPrisma.staffClearance.update.mockResolvedValue({ ...existing, clearanceLevel: 'LEVEL_4' });
            mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const res = await (0, supertest_1.default)(server_1.default)
                .put('/api/v1/diplomatic/clearances/clr-1')
                .send({ clearanceLevel: 'LEVEL_4' });
            expect(res.status).toBe(200);
            expect(res.body.data.clearanceLevel).toBe('LEVEL_4');
        });
        it('should return 404 for nonexistent clearance', async () => {
            mockPrisma.staffClearance.findUnique.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(server_1.default)
                .put('/api/v1/diplomatic/clearances/nonexistent')
                .send({ clearanceLevel: 'LEVEL_4' });
            expect(res.status).toBe(404);
        });
    });
});
