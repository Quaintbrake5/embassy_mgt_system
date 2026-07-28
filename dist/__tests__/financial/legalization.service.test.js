"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const legalization_service_1 = require("../../services/legalization.service");
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
const exceptions_1 = require("../../exceptions");
jest.mock('../../utils/jwt.utilities', () => ({
    signAccessToken: jest.fn(() => 'mock-access-token'),
    signRefreshToken: jest.fn(() => 'mock-refresh-token'),
    verifyAccessToken: jest.fn(() => ({ userId: 'user-1', email: 'test@test.com' })),
    verifyRefreshToken: jest.fn(() => ({ userId: 'user-1' })),
}));
describe('LegalizationService', () => {
    let service;
    beforeEach(() => {
        jest.clearAllMocks();
        service = new legalization_service_1.LegalizationService(mock_db_1.mockPrisma);
    });
    describe('create', () => {
        it('should create a legalization request with SR reference number', async () => {
            const st = (0, factories_1.createMockServiceType)({ id: 'st-legal', category: 'DOCUMENT_LEGALIZATION' });
            const emb = (0, factories_1.createMockEmbassy)({ id: 'emb-1' });
            const created = (0, factories_1.createMockServiceRequest)({
                id: 'sr-new', referenceNumber: 'SR-TEST-ABC',
                serviceTypeId: 'st-legal', embassyId: 'emb-1', status: 'SUBMITTED',
                details: { documentType: 'Birth Certificate', destinationCountry: 'France', urgency: 'NORMAL' },
            });
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue(st);
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue(emb);
            mock_db_1.mockPrisma.serviceRequest.create.mockResolvedValue(created);
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.create({
                documentType: 'Birth Certificate', destinationCountry: 'France', urgency: 'NORMAL',
                serviceTypeId: 'st-legal', embassyId: 'emb-1',
            }, 'user-1');
            expect(result.referenceNumber).toMatch(/^SR-/);
            expect(result.documentType).toBe('Birth Certificate');
            expect(result.status).toBe('SUBMITTED');
        });
        it('should throw NotFoundError when service type not found', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue(null);
            await expect(service.create({
                documentType: 'Doc', destinationCountry: 'FR', urgency: 'NORMAL',
                serviceTypeId: 'invalid', embassyId: 'emb-1',
            }, 'user-1')).rejects.toThrow(exceptions_1.NotFoundError);
        });
        it('should throw ValidationError when service type is not DOCUMENT_LEGALIZATION', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue((0, factories_1.createMockServiceType)({ category: 'VISA' }));
            await expect(service.create({
                documentType: 'Doc', destinationCountry: 'FR', urgency: 'NORMAL',
                serviceTypeId: 'st-1', embassyId: 'emb-1',
            }, 'user-1')).rejects.toThrow(exceptions_1.ValidationError);
        });
        it('should throw NotFoundError when embassy not found', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue((0, factories_1.createMockServiceType)({ id: 'st-legal', category: 'DOCUMENT_LEGALIZATION' }));
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue(null);
            await expect(service.create({
                documentType: 'Doc', destinationCountry: 'FR', urgency: 'NORMAL',
                serviceTypeId: 'st-legal', embassyId: 'invalid',
            }, 'user-1')).rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
    describe('findAll', () => {
        it('should return paginated results filtering by legalization typeId', async () => {
            mock_db_1.mockPrisma.serviceType.findMany.mockResolvedValue([(0, factories_1.createMockServiceType)({ id: 'st-legal', category: 'DOCUMENT_LEGALIZATION' })]);
            mock_db_1.mockPrisma.serviceRequest.findMany.mockResolvedValue([
                (0, factories_1.createMockServiceRequest)({ id: 'sr-1', serviceTypeId: 'st-legal', details: { documentType: 'Doc', destinationCountry: 'FR' } }),
            ]);
            mock_db_1.mockPrisma.serviceRequest.count.mockResolvedValue(1);
            const result = await service.findAll(1, 10);
            expect(result.data).toHaveLength(1);
            expect(result.meta.total).toBe(1);
        });
        it('should return empty list when no legalization types exist', async () => {
            mock_db_1.mockPrisma.serviceType.findMany.mockResolvedValue([]);
            const result = await service.findAll(1, 10);
            expect(result.data).toHaveLength(0);
            expect(result.meta.total).toBe(0);
        });
    });
    describe('findById', () => {
        it('should return legalization request', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({ id: 'sr-1', details: { documentType: 'BC', destinationCountry: 'FR' }, serviceType: { id: 'st-legal', name: 'L', slug: 'l', category: 'DOCUMENT_LEGALIZATION' } }));
            const result = await service.findById('sr-1');
            expect(result.id).toBe('sr-1');
        });
        it('should throw NotFoundError', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue(null);
            await expect(service.findById('invalid')).rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
    describe('process', () => {
        it('should allow VERIFY on SUBMITTED', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({ id: 'sr-1', status: 'SUBMITTED', details: {} }));
            mock_db_1.mockPrisma.serviceRequest.update.mockResolvedValue((0, factories_1.createMockServiceRequest)({ id: 'sr-1', status: 'IN_PROGRESS', details: { verifiedAt: '2026-01-01T00:00:00Z', verifiedBy: 'user-1' } }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.process('sr-1', { action: 'VERIFY' }, 'user-1');
            expect(result.status).toBe('IN_PROGRESS');
        });
        it('should reject VERIFY on IN_PROGRESS', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({ id: 'sr-1', status: 'IN_PROGRESS', details: {} }));
            await expect(service.process('sr-1', { action: 'VERIFY' }, 'user-1')).rejects.toThrow(exceptions_1.ValidationError);
        });
        it('should reject COMPLETE without sealInfo', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({ id: 'sr-1', status: 'IN_PROGRESS', details: {} }));
            await expect(service.process('sr-1', { action: 'COMPLETE' }, 'user-1')).rejects.toThrow('must be sealed before completing');
        });
        it('should reject ROUTE_APOSTILLE without sealInfo', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({ id: 'sr-1', status: 'IN_PROGRESS', details: {} }));
            await expect(service.process('sr-1', { action: 'ROUTE_APOSTILLE' }, 'user-1')).rejects.toThrow('must be sealed before routing');
        });
        it('should reject ROUTE_LEGALIZATION without sealInfo', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({ id: 'sr-1', status: 'IN_PROGRESS', details: {} }));
            await expect(service.process('sr-1', { action: 'ROUTE_LEGALIZATION' }, 'user-1')).rejects.toThrow('must be sealed before routing');
        });
        it('should reject duplicate hague routing', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({ id: 'sr-1', status: 'IN_PROGRESS', details: { sealInfo: {}, hagueRouting: 'APOSTILLE' } }));
            await expect(service.process('sr-1', { action: 'ROUTE_APOSTILLE' }, 'user-1')).rejects.toThrow('Hague routing already assigned');
        });
        it('should reject SEAL on COMPLETED request', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({ id: 'sr-1', status: 'COMPLETED', details: {} }));
            await expect(service.process('sr-1', { action: 'SEAL' }, 'user-1')).rejects.toThrow(exceptions_1.ValidationError);
        });
        it('should throw NotFoundError when request missing', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue(null);
            await expect(service.process('invalid', { action: 'VERIFY' }, 'user-1')).rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
});
