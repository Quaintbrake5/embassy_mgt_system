"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-correlation-id') }));
const mockPrisma = {
    user: { findUnique: jest.fn() },
    embassy: { findUnique: jest.fn() },
    serviceRequest: { findUnique: jest.fn() },
    appointment: { findUnique: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn((fn) => fn({
        appointment: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
    })),
    $disconnect: jest.fn(),
};
jest.mock('../../config/db.config', () => ({ prisma: mockPrisma }));
jest.mock('../../middleware/auth.middleware', () => ({
    authMiddleware: (req, _res, next) => {
        req.user = { userId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', email: 'test@example.com' };
        next();
    },
}));
jest.mock('../../middleware/audit.middleware', () => ({
    auditMiddleware: (_req, _res, next) => next(),
}));
jest.mock('../../middleware/error.middleware', () => ({
    errorMiddleware: (err, _req, res, _next) => {
        console.log("ERR:", JSON.stringify({ msg: err.message, d: err.details, code: err.code }));
        res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.message || 'Internal server error' } });
    },
    notFoundMiddleware: (_req, res) => {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
    },
}));
jest.mock('../../middleware/rbac.middleware', () => ({
    requirePermission: () => (_req, _res, next) => next(),
}));
jest.mock('../../middleware/validation.middleware', () => ({
    validate: () => (req, _res, next) => next(),
}));
jest.mock('../../services/otp.service', () => ({
    OTPService: jest.fn().mockImplementation(() => ({
        generateOtp: jest.fn().mockResolvedValue('123456'),
        verifyOtp: jest.fn().mockResolvedValue(true),
    })),
}));
describe('Appointment Routes Integration', () => {
    let app;
    beforeAll(async () => {
        app = (await Promise.resolve().then(() => __importStar(require('../../server')))).default;
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('GET /api/v1/appointments/slots', () => {
        it('should return available slots', async () => {
            mockPrisma.embassy.findUnique.mockResolvedValue({ id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Test', code: 'TST', country: 'Test', city: 'Test' });
            mockPrisma.appointment.findMany.mockResolvedValue([]);
            const res = await (0, supertest_1.default)(app)
                .get('/api/v1/appointments/slots?embassyId=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11&date=2026-08-01')
                .set('Authorization', 'Bearer test-token');
            expect(res.status).toBe(200);
            expect(res.body.data.slots).toHaveLength(16);
            expect(res.body.data.slots[0].time).toBe('09:00');
        });
    });
    describe('POST /api/v1/appointments/book', () => {
        it('should book an appointment', async () => {
            mockPrisma.serviceRequest.findUnique.mockResolvedValue({ id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', userId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', embassyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' });
            mockPrisma.$transaction.mockImplementation(async (fn) => fn({
                appointment: {
                    findFirst: jest.fn().mockResolvedValue(null),
                    create: jest.fn().mockResolvedValue({ id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', serviceRequestId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', userId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', embassyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', slotDate: new Date('2026-08-01'), slotTime: '10:00', status: 'BOOKED', qrCode: 'QR123', tokenNumber: 'TK-001', checkInAt: null, createdAt: new Date(), Updated: new Date(), user: null, embassy: null }),
                },
            }));
            mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const res = await (0, supertest_1.default)(app)
                .post('/api/v1/appointments/book')
                .send({ serviceRequestId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', embassyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', slotDate: '2026-08-01', slotTime: '10:00' })
                .set('Authorization', 'Bearer test-token');
            expect(res.status).toBe(201);
            expect(res.body.data.status).toBe('BOOKED');
        });
    });
    describe('GET /api/v1/appointments/my', () => {
        it('should return my appointments', async () => {
            mockPrisma.appointment.findMany.mockResolvedValue([{ id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', status: 'BOOKED', slotDate: new Date(), slotTime: '10:00', userId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', serviceRequestId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', embassyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', qrCode: null, checkInAt: null, tokenNumber: null, createdAt: new Date(), Updated: new Date(), user: null, embassy: null }]);
            mockPrisma.appointment.count.mockResolvedValue(1);
            const res = await (0, supertest_1.default)(app)
                .get('/api/v1/appointments/my')
                .set('Authorization', 'Bearer test-token');
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });
    });
    describe('PUT /api/v1/appointments/:id/cancel', () => {
        it('should cancel an appointment', async () => {
            mockPrisma.appointment.findUnique.mockResolvedValue({ id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', status: 'BOOKED', tokenNumber: 'TK-001', slotDate: new Date(), slotTime: '10:00', userId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', serviceRequestId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', embassyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', qrCode: null, checkInAt: null, completedAt: null, noShowAt: null, cancelledAt: null, cancellationReason: null, createdAt: new Date(), Updated: new Date(), user: null, embassy: null });
            mockPrisma.appointment.update.mockResolvedValue({ id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', status: 'CANCELLED' });
            mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const res = await (0, supertest_1.default)(app)
                .put('/api/v1/appointments/c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33/cancel')
                .set('Authorization', 'Bearer test-token');
            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('CANCELLED');
        });
    });
    describe('POST /api/v1/appointments/:id/checkin', () => {
        it('should check in with OTP', async () => {
            mockPrisma.appointment.findUnique.mockResolvedValue({ id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', status: 'BOOKED', userId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', tokenNumber: 'TK-001', slotDate: new Date(), slotTime: '10:00', serviceRequestId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', embassyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', qrCode: null, checkInAt: null, completedAt: null, noShowAt: null, cancelledAt: null, cancellationReason: null, createdAt: new Date(), Updated: new Date(), user: null, embassy: null });
            mockPrisma.appointment.update.mockResolvedValue({ id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', status: 'CHECKED_IN', checkInAt: new Date() });
            mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const res = await (0, supertest_1.default)(app)
                .post('/api/v1/appointments/c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33/checkin')
                .send({ otp: '123456' })
                .set('Authorization', 'Bearer test-token');
            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('CHECKED_IN');
        });
    });
    describe('GET /api/v1/appointments/queue', () => {
        it('should return queue', async () => {
            mockPrisma.appointment.findMany.mockResolvedValue([{ id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', status: 'CHECKED_IN', checkInAt: new Date(), slotDate: new Date(), slotTime: '10:00', userId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', serviceRequestId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', embassyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', qrCode: null, tokenNumber: null, createdAt: new Date(), Updated: new Date(), user: null, embassy: null }]);
            mockPrisma.appointment.count.mockResolvedValue(1);
            const res = await (0, supertest_1.default)(app)
                .get('/api/v1/appointments/queue?embassyId=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
                .set('Authorization', 'Bearer test-token');
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });
    });
    describe('POST /api/v1/appointments/queue/next', () => {
        it('should call next appointment', async () => {
            mockPrisma.appointment.findFirst.mockResolvedValue({ id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', status: 'CHECKED_IN', slotDate: new Date(), slotTime: '10:00', userId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', serviceRequestId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', embassyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', checkInAt: new Date(), qrCode: null, tokenNumber: null, createdAt: new Date(), Updated: new Date(), user: null, embassy: null });
            mockPrisma.appointment.update.mockResolvedValue({ id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', status: 'IN_PROGRESS' });
            const res = await (0, supertest_1.default)(app)
                .post('/api/v1/appointments/queue/next?embassyId=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
                .set('Authorization', 'Bearer test-token');
            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('IN_PROGRESS');
        });
    });
    describe('PUT /api/v1/appointments/:id/complete', () => {
        it('should complete an appointment', async () => {
            mockPrisma.appointment.findUnique.mockResolvedValue({ id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', status: 'IN_PROGRESS', slotDate: new Date(), slotTime: '10:00', userId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', serviceRequestId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', embassyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', checkInAt: new Date(), qrCode: null, tokenNumber: null, createdAt: new Date(), Updated: new Date(), user: null, embassy: null });
            mockPrisma.appointment.update.mockResolvedValue({ id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', status: 'COMPLETED' });
            const res = await (0, supertest_1.default)(app)
                .put('/api/v1/appointments/c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33/complete')
                .set('Authorization', 'Bearer test-token');
            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('COMPLETED');
        });
    });
    describe('PUT /api/v1/appointments/:id/no-show', () => {
        it('should mark no-show', async () => {
            const pastDate = new Date(Date.now() - 86400000);
            mockPrisma.appointment.findUnique.mockResolvedValue({ id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', status: 'BOOKED', slotDate: pastDate, slotTime: '10:00', userId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', serviceRequestId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', embassyId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', checkInAt: null, qrCode: null, tokenNumber: null, createdAt: new Date(), Updated: new Date(), user: null, embassy: null });
            mockPrisma.appointment.update.mockResolvedValue({ id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', status: 'NO_SHOW' });
            const res = await (0, supertest_1.default)(app)
                .put('/api/v1/appointments/c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33/no-show')
                .set('Authorization', 'Bearer test-token');
            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('NO_SHOW');
        });
    });
});
