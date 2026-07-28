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
    visaApplication: { findUnique: jest.fn() },
    serviceRequest: { findUnique: jest.fn() },
    visaDocument: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), delete: jest.fn(), count: jest.fn() },
    auditLog: { create: jest.fn() },
    $disconnect: jest.fn(),
};
jest.mock('../../config/db.config', () => ({ prisma: mockPrisma }));
jest.mock('../../middleware/auth.middleware', () => ({
    authMiddleware: (req, _res, next) => {
        req.user = { userId: 'test-user', email: 'test@example.com' };
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
describe('Visa Document Routes Integration', () => {
    let app;
    beforeAll(async () => {
        app = (await Promise.resolve().then(() => __importStar(require('../../server')))).default;
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('POST /api/v1/visa/documents', () => {
        it('should create a visa document', async () => {
            mockPrisma.visaApplication.findUnique.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440000' });
            mockPrisma.visaDocument.create.mockResolvedValue({
                id: '660e8400-e29b-41d4-a716-446655440001', visaApplicationId: '550e8400-e29b-41d4-a716-446655440000', serviceRequestId: null,
                documentType: 'PASSPORT', fileName: 'passport.pdf', fileHash: 'abc', fileUrl: 'https://example.com/doc.pdf',
                uploadedAt: new Date(), createdAt: new Date(),
            });
            mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const res = await (0, supertest_1.default)(app)
                .post('/api/v1/visa/documents')
                .send({ visaApplicationId: '550e8400-e29b-41d4-a716-446655440000', documentType: 'PASSPORT', fileName: 'passport.pdf', fileUrl: 'https://example.com/doc.pdf' })
                .set('Authorization', 'Bearer test-token');
            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.documentType).toBe('PASSPORT');
        });
    });
    describe('GET /api/v1/visa/documents/application/:visaApplicationId', () => {
        it('should return documents for an application', async () => {
            mockPrisma.visaDocument.findMany.mockResolvedValue([
                { id: '660e8400-e29b-41d4-a716-446655440001', visaApplicationId: '550e8400-e29b-41d4-a716-446655440000', documentType: 'PASSPORT', fileName: 'passport.pdf', uploadedAt: new Date(), createdAt: new Date() },
            ]);
            const res = await (0, supertest_1.default)(app)
                .get('/api/v1/visa/documents/application/550e8400-e29b-41d4-a716-446655440000')
                .set('Authorization', 'Bearer test-token');
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
        });
    });
    describe('GET /api/v1/visa/documents/:id', () => {
        it('should return a single document', async () => {
            mockPrisma.visaDocument.findUnique.mockResolvedValue({
                id: '660e8400-e29b-41d4-a716-446655440001', visaApplicationId: '550e8400-e29b-41d4-a716-446655440000', documentType: 'PASSPORT', fileName: 'passport.pdf', uploadedAt: new Date(), createdAt: new Date(),
            });
            const res = await (0, supertest_1.default)(app)
                .get('/api/v1/visa/documents/660e8400-e29b-41d4-a716-446655440001')
                .set('Authorization', 'Bearer test-token');
            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe('660e8400-e29b-41d4-a716-446655440001');
        });
    });
    describe('DELETE /api/v1/visa/documents/:id', () => {
        it('should delete a document', async () => {
            mockPrisma.visaDocument.delete.mockResolvedValue({ id: '660e8400-e29b-41d4-a716-446655440001', documentType: 'PASSPORT', fileName: 'passport.pdf', createdAt: new Date() });
            mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const res = await (0, supertest_1.default)(app)
                .delete('/api/v1/visa/documents/660e8400-e29b-41d4-a716-446655440001')
                .set('Authorization', 'Bearer test-token');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
