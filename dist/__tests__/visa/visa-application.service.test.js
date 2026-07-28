"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
const visa_application_service_1 = require("../../services/visa-application.service");
jest.mock('../../config/db.config', () => ({
    prisma: mock_db_1.mockPrisma,
}));
jest.mock('crypto', () => ({
    randomBytes: jest.fn(() => ({
        toString: jest.fn(() => 'ABCD1234'),
    })),
}));
describe('VisaApplicationService', () => {
    let service;
    beforeEach(() => {
        jest.clearAllMocks();
        service = new visa_application_service_1.VisaApplicationService(mock_db_1.mockPrisma);
    });
    describe('create', () => {
        it('should create a visa application with reference number', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.visaApplication.create.mockResolvedValue((0, factories_1.createMockVisaApplication)({
                applicationNumber: 'VA-K8X91-ABCD1234',
                visaType: 'TOURIST',
                status: 'DRAFT',
            }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)());
            mock_db_1.mockPrisma.watchlistEntry.findMany.mockResolvedValue([]);
            const result = await service.create('user-1', { visaType: 'TOURIST', embassyId: 'embassy-1' });
            expect(result.applicationNumber).toMatch(/^VA-/);
            expect(result.visaType).toBe('TOURIST');
            expect(result.status).toBe('DRAFT');
        });
        it('should throw NotFoundError for non-existent embassy', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue(null);
            await expect(service.create('user-1', { visaType: 'TOURIST', embassyId: 'nonexistent' }))
                .rejects.toThrow('Embassy not found');
        });
        it('should create VerificationCheck when watchlist matches', async () => {
            const mockUser = (0, factories_1.createMockUser)({ firstName: 'John', lastName: 'Doe' });
            const mockWatchlist = [(0, factories_1.createMockWatchlistEntry)({ fullName: 'john doe', riskLevel: 'HIGH' })];
            const mockVisa = (0, factories_1.createMockVisaApplication)({ id: 'visa-1' });
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.visaApplication.create.mockResolvedValue(mockVisa);
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mock_db_1.mockPrisma.watchlistEntry.findMany.mockResolvedValue(mockWatchlist);
            mock_db_1.mockPrisma.verificationCheck.create.mockResolvedValue((0, factories_1.createMockVerificationCheck)());
            await service.create('user-1', { visaType: 'TOURIST', embassyId: 'embassy-1' });
            expect(mock_db_1.mockPrisma.verificationCheck.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    visaApplicationId: 'visa-1',
                    checkType: 'WATCHLIST',
                    status: 'PENDING',
                }),
            });
        });
    });
    describe('findById', () => {
        it('should return visa application by id', async () => {
            mock_db_1.mockPrisma.visaApplication.findUnique.mockResolvedValue((0, factories_1.createMockVisaApplication)());
            const result = await service.findById('visa-1');
            expect(result.id).toBe('visa-1');
            expect(result.status).toBe('UNDER_REVIEW');
        });
        it('should throw NotFoundError for missing application', async () => {
            mock_db_1.mockPrisma.visaApplication.findUnique.mockResolvedValue(null);
            await expect(service.findById('nonexistent')).rejects.toThrow('Visa application not found');
        });
    });
    describe('findByApplicationNumber', () => {
        it('should find by application number', async () => {
            mock_db_1.mockPrisma.visaApplication.findUnique.mockResolvedValue((0, factories_1.createMockVisaApplication)({ applicationNumber: 'VA-12345-ABC' }));
            const result = await service.findByApplicationNumber('VA-12345-ABC');
            expect(result.applicationNumber).toBe('VA-12345-ABC');
        });
    });
    describe('findAll', () => {
        it('should return paginated results', async () => {
            mock_db_1.mockPrisma.visaApplication.findMany.mockResolvedValue([(0, factories_1.createMockVisaApplication)()]);
            mock_db_1.mockPrisma.visaApplication.count.mockResolvedValue(1);
            const result = await service.findAll({ page: 1, limit: 10 });
            expect(result.data).toHaveLength(1);
            expect(result.meta.total).toBe(1);
            expect(result.meta.page).toBe(1);
        });
        it('should filter by status and visaType', async () => {
            mock_db_1.mockPrisma.visaApplication.findMany.mockResolvedValue([]);
            mock_db_1.mockPrisma.visaApplication.count.mockResolvedValue(0);
            await service.findAll({ status: 'UNDER_REVIEW', visaType: 'TOURIST' });
            expect(mock_db_1.mockPrisma.visaApplication.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ status: 'UNDER_REVIEW', visaType: 'TOURIST' }),
            }));
        });
    });
    describe('submit', () => {
        it('should submit a DRAFT application', async () => {
            mock_db_1.mockPrisma.visaApplication.findUnique.mockResolvedValue((0, factories_1.createMockVisaApplication)({ id: 'visa-1', status: 'DRAFT' }));
            mock_db_1.mockPrisma.visaApplication.update.mockResolvedValue((0, factories_1.createMockVisaApplication)({ id: 'visa-1', status: 'SUBMITTED', submittedAt: new Date() }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.submit('visa-1', 'user-1');
            expect(result.status).toBe('SUBMITTED');
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    action: 'SUBMIT',
                    entity: 'VisaApplication',
                }),
            }));
        });
        it('should reject submit for non-DRAFT application', async () => {
            mock_db_1.mockPrisma.visaApplication.findUnique.mockResolvedValue((0, factories_1.createMockVisaApplication)({ id: 'visa-1', status: 'UNDER_REVIEW' }));
            await expect(service.submit('visa-1', 'user-1')).rejects.toThrow('Cannot submit application in status UNDER_REVIEW');
        });
        it('should throw NotFoundError for missing application', async () => {
            mock_db_1.mockPrisma.visaApplication.findUnique.mockResolvedValue(null);
            await expect(service.submit('nonexistent', 'user-1')).rejects.toThrow('Visa application not found');
        });
    });
});
