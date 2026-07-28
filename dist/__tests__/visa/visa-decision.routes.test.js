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
    visaApplication: { findUnique: jest.fn(), update: jest.fn() },
    visaDecision: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn((fn) => fn({
        visaDecision: { create: jest.fn() },
        visaApplication: { update: jest.fn() },
    })),
    $disconnect: jest.fn(),
};
jest.mock('../../config/db.config', () => ({ prisma: mockPrisma }));
jest.mock('../../middleware/auth.middleware', () => ({
    authMiddleware: (req, _res, next) => {
        req.user = { userId: 'test-officer', email: 'officer@embassy.com' };
        next();
    },
}));
jest.mock('../../middleware/audit.middleware', () => ({
    auditMiddleware: (_req, _res, next) => next(),
}));
jest.mock('../../middleware/error.middleware', () => ({
    errorMiddleware: (err, _req, res, _next) => {
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
describe('Visa Decision Routes Integration', () => {
    let app;
    beforeAll(async () => {
        app = (await Promise.resolve().then(() => __importStar(require('../../server')))).default;
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('POST /api/v1/visa/decisions/applications/:id/decision', () => {
        it('should create a decision', async () => {
            mockPrisma.visaApplication.findUnique.mockResolvedValue({ id: 'visa-1', applicationNumber: 'VA-001', status: 'UNDER_REVIEW' });
            mockPrisma.$transaction.mockImplementation(async (fn) => fn({
                visaDecision: { create: jest.fn().mockResolvedValue({ id: 'dec-1', visaApplicationId: 'visa-1', officerId: 'test-officer', decision: 'APPROVE', remarks: null, rationale: 'All good', decidedAt: new Date(), createdAt: new Date(), officer: { userid: 'test-officer', firstName: 'Test', lastName: 'Officer', email: 'officer@embassy.com' }, secondaryOfficer: null }) },
                visaApplication: { update: jest.fn().mockResolvedValue({}) },
            }));
            mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const res = await (0, supertest_1.default)(app)
                .post('/api/v1/visa/decisions/applications/visa-1/decision')
                .send({ decision: 'APPROVE', rationale: 'All good' })
                .set('Authorization', 'Bearer test-token');
            expect(res.status).toBe(201);
            expect(res.body.data.decision).toBe('APPROVE');
        });
    });
    describe('GET /api/v1/visa/decisions/applications/:id/decision', () => {
        it('should return decision for an application', async () => {
            mockPrisma.visaDecision.findUnique.mockResolvedValue({
                id: 'dec-1', visaApplicationId: 'visa-1', officerId: 'test-officer', decision: 'APPROVE', decidedAt: new Date(), createdAt: new Date(),
                officer: { userid: 'test-officer', firstName: 'Test', lastName: 'Officer', email: 'officer@embassy.com' },
                secondaryOfficer: null,
            });
            const res = await (0, supertest_1.default)(app)
                .get('/api/v1/visa/decisions/applications/visa-1/decision')
                .set('Authorization', 'Bearer test-token');
            expect(res.status).toBe(200);
            expect(res.body.data.decision).toBe('APPROVE');
        });
    });
    describe('GET /api/v1/visa/decisions/decisions/officer/me', () => {
        it('should return my decisions', async () => {
            mockPrisma.visaDecision.findMany.mockResolvedValue([
                { id: 'dec-1', visaApplicationId: 'visa-1', officerId: 'test-officer', decision: 'APPROVE', decidedAt: new Date(), createdAt: new Date(), officer: null, secondaryOfficer: null },
            ]);
            mockPrisma.visaDecision.count.mockResolvedValue(1);
            const res = await (0, supertest_1.default)(app)
                .get('/api/v1/visa/decisions/decisions/officer/me')
                .set('Authorization', 'Bearer test-token');
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });
    });
});
