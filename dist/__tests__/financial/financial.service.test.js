"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const financial_service_1 = require("../../services/financial.service");
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
const exceptions_1 = require("../../exceptions");
jest.mock('../../utils/jwt.utilities', () => ({
    signAccessToken: jest.fn(() => 'mock-access-token'),
    signRefreshToken: jest.fn(() => 'mock-refresh-token'),
    verifyAccessToken: jest.fn(() => ({ userId: 'user-1', email: 'test@test.com' })),
    verifyRefreshToken: jest.fn(() => ({ userId: 'user-1' })),
}));
describe('FinancialService', () => {
    let service;
    beforeEach(() => {
        jest.clearAllMocks();
        service = new financial_service_1.FinancialService(mock_db_1.mockPrisma);
    });
    describe('recordTransaction', () => {
        it('should record a transaction with serviceRequestId', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({ id: 'sr-1' }));
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ userid: 'payer-1' }));
            mock_db_1.mockPrisma.payment.create.mockResolvedValue((0, factories_1.createMockPayment)({ id: 'pay-new', serviceRequestId: 'sr-1', userId: 'payer-1', status: 'PENDING' }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.recordTransaction({
                serviceRequestId: 'sr-1', amount: 100, currency: 'USD', userId: 'payer-1',
            }, 'admin-1');
            expect(result.status).toBe('PENDING');
            expect(result.amount).toBe(100);
            expect(mock_db_1.mockPrisma.payment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amount: 100, currency: 'USD' }) }));
        });
        it('should record a transaction with visaApplicationId', async () => {
            mock_db_1.mockPrisma.visaApplication.findUnique.mockResolvedValue((0, factories_1.createMockVisaApplication)({ id: 'visa-1' }));
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ userid: 'payer-1' }));
            mock_db_1.mockPrisma.payment.create.mockResolvedValue((0, factories_1.createMockPayment)({ id: 'pay-new', serviceRequestId: null, visaApplicationId: 'visa-1', userId: 'payer-1', status: 'PENDING', amount: 200 }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.recordTransaction({
                visaApplicationId: 'visa-1', amount: 200, currency: 'EUR', userId: 'payer-1',
            }, 'admin-1');
            expect(result.status).toBe('PENDING');
            expect(result.amount).toBe(200);
        });
        it('should throw NotFoundError when serviceRequestId references non-existent request', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue(null);
            await expect(service.recordTransaction({
                serviceRequestId: 'invalid', amount: 100, currency: 'USD', userId: 'payer-1',
            }, 'admin-1')).rejects.toThrow(exceptions_1.NotFoundError);
        });
        it('should throw NotFoundError when visaApplicationId references non-existent application', async () => {
            mock_db_1.mockPrisma.visaApplication.findUnique.mockResolvedValue(null);
            await expect(service.recordTransaction({
                visaApplicationId: 'invalid', amount: 100, currency: 'USD', userId: 'payer-1',
            }, 'admin-1')).rejects.toThrow(exceptions_1.NotFoundError);
        });
        it('should throw NotFoundError when payer user does not exist', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({ id: 'sr-1' }));
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(null);
            await expect(service.recordTransaction({
                serviceRequestId: 'sr-1', amount: 100, currency: 'USD', userId: 'nonexistent',
            }, 'admin-1')).rejects.toThrow('User not found');
        });
    });
    describe('findTransactions', () => {
        it('should return paginated transactions', async () => {
            mock_db_1.mockPrisma.payment.findMany.mockResolvedValue([(0, factories_1.createMockPayment)({ id: 'pay-1' })]);
            mock_db_1.mockPrisma.payment.count.mockResolvedValue(1);
            const result = await service.findTransactions(1, 10);
            expect(result.data).toHaveLength(1);
            expect(result.meta.total).toBe(1);
        });
    });
    describe('findTransactionById', () => {
        it('should return transaction by id', async () => {
            mock_db_1.mockPrisma.payment.findUnique.mockResolvedValue((0, factories_1.createMockPayment)({ id: 'pay-1' }));
            const result = await service.findTransactionById('pay-1');
            expect(result.id).toBe('pay-1');
        });
        it('should throw NotFoundError when not found', async () => {
            mock_db_1.mockPrisma.payment.findUnique.mockResolvedValue(null);
            await expect(service.findTransactionById('invalid')).rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
    describe('getDailyReconciliation', () => {
        it('should group COMPLETED and flag FAILED as discrepancy', async () => {
            mock_db_1.mockPrisma.payment.findMany.mockResolvedValue([
                (0, factories_1.createMockPayment)({ id: 'pay-1', amount: 100, status: 'COMPLETED', createdAt: new Date('2026-01-15T10:00:00Z') }),
                (0, factories_1.createMockPayment)({ id: 'pay-2', amount: 50, status: 'COMPLETED', createdAt: new Date('2026-01-15T11:00:00Z') }),
                (0, factories_1.createMockPayment)({ id: 'pay-3', amount: 25, status: 'FAILED', createdAt: new Date('2026-01-15T12:00:00Z') }),
                (0, factories_1.createMockPayment)({ id: 'pay-4', amount: 75, status: 'PENDING', createdAt: new Date('2026-01-15T13:00:00Z') }),
            ]);
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.getDailyReconciliation('2026-01-15', 'auditor-1');
            expect(result.totalCollections).toBe(150);
            expect(result.totalTransactions).toBe(4);
            expect(result.discrepancyCount).toBe(1);
            expect(result.paymentsByStatus).toEqual({ COMPLETED: 2, FAILED: 1, PENDING: 1 });
        });
        it('should return zero collections when no transactions', async () => {
            mock_db_1.mockPrisma.payment.findMany.mockResolvedValue([]);
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.getDailyReconciliation('2026-01-15', 'auditor-1');
            expect(result.totalCollections).toBe(0);
            expect(result.totalTransactions).toBe(0);
            expect(result.discrepancyCount).toBe(0);
        });
    });
    describe('getMonthlyReport', () => {
        it('should group by service type, currency, and officer', async () => {
            const basePayment = (0, factories_1.createMockPayment)({
                id: 'pay-1', amount: 100, currency: 'USD', status: 'COMPLETED', userId: 'officer-1',
                createdAt: new Date('2026-01-10T10:00:00Z'),
            });
            mock_db_1.mockPrisma.payment.findMany.mockResolvedValue([
                { ...basePayment, serviceRequest: { serviceType: { name: 'Passport Renewal', category: 'DOCUMENT' } } },
                { ...(0, factories_1.createMockPayment)({ id: 'pay-2', amount: 50, currency: 'EUR', status: 'COMPLETED', userId: 'officer-2', createdAt: new Date('2026-01-15T10:00:00Z') }), serviceRequest: { serviceType: { name: 'Passport Renewal', category: 'DOCUMENT' } } },
            ]);
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.getMonthlyReport(2026, 1, 'admin-1');
            expect(result.totalCollections).toBe(150);
            expect(result.totalTransactions).toBe(2);
            expect(result.byService['Passport Renewal'].count).toBe(2);
            expect(result.byCurrency['USD'].count).toBe(1);
            expect(result.byCurrency['EUR'].count).toBe(1);
            expect(result.byOfficer['officer-1'].count).toBe(1);
            expect(result.byOfficer['officer-2'].count).toBe(1);
        });
    });
});
