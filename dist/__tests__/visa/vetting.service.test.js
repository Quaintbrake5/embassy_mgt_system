"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
const vetting_service_1 = require("../../services/vetting.service");
jest.mock('../../config/db.config', () => ({
    prisma: mock_db_1.mockPrisma,
}));
describe('VettingService', () => {
    let service;
    beforeEach(() => {
        jest.clearAllMocks();
        service = new vetting_service_1.VettingService(mock_db_1.mockPrisma);
    });
    describe('runVetting', () => {
        it('should perform watchlist matching and return CLEARED when no matches', async () => {
            mock_db_1.mockPrisma.visaApplication.findUnique.mockResolvedValue({
                ...(0, factories_1.createMockVisaApplication)(),
                user: { userid: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
            });
            mock_db_1.mockPrisma.watchlistEntry.findMany.mockResolvedValue([]);
            mock_db_1.mockPrisma.verificationCheck.create.mockResolvedValue((0, factories_1.createMockVerificationCheck)({ status: 'CLEARED', checkType: 'WATCHLIST', result: { matched: false } }));
            const result = await service.runVetting('visa-1');
            expect(result.overallRisk).toBe('LOW');
            expect(result.checks).toHaveLength(1);
            expect(result.checks[0].status).toBe('CLEARED');
        });
        it('should FLAG and create checks for watchlist matches', async () => {
            mock_db_1.mockPrisma.visaApplication.findUnique.mockResolvedValue({
                ...(0, factories_1.createMockVisaApplication)(),
                user: { userid: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
            });
            mock_db_1.mockPrisma.watchlistEntry.findMany.mockResolvedValue([
                (0, factories_1.createMockWatchlistEntry)({ fullName: 'John Doe', riskLevel: 'HIGH' }),
            ]);
            mock_db_1.mockPrisma.verificationCheck.create.mockResolvedValue((0, factories_1.createMockVerificationCheck)({ status: 'FLAGGED', result: { matched: true, watchlistEntryId: 'wl-1', riskLevel: 'HIGH' } }));
            const result = await service.runVetting('visa-1');
            expect(result.checks).toHaveLength(1);
            expect(result.overallRisk).toBe('HIGH');
        });
        it('should escalate to CRITICAL risk for multiple high-risk matches', async () => {
            const user = { userid: 'user-1', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' };
            mock_db_1.mockPrisma.visaApplication.findUnique.mockResolvedValue({
                ...(0, factories_1.createMockVisaApplication)(),
                user,
            });
            mock_db_1.mockPrisma.watchlistEntry.findMany.mockResolvedValue([
                (0, factories_1.createMockWatchlistEntry)({ fullName: 'Jane Smith', riskLevel: 'CRITICAL' }),
                (0, factories_1.createMockWatchlistEntry)({ fullName: 'Jane Smith', riskLevel: 'HIGH' }),
            ]);
            mock_db_1.mockPrisma.verificationCheck.create.mockResolvedValue((0, factories_1.createMockVerificationCheck)({ status: 'FLAGGED', result: { matched: true, riskLevel: 'CRITICAL' } }));
            const result = await service.runVetting('visa-1');
            expect(result.overallRisk).toBe('CRITICAL');
        });
        it('should use Promise.all for parallel watchlist checks', async () => {
            const user = { userid: 'user-1', firstName: 'Bob', lastName: 'Smith', email: 'bob@example.com' };
            mock_db_1.mockPrisma.visaApplication.findUnique.mockResolvedValue({
                ...(0, factories_1.createMockVisaApplication)(),
                user,
            });
            mock_db_1.mockPrisma.watchlistEntry.findMany.mockResolvedValue([
                (0, factories_1.createMockWatchlistEntry)({ fullName: 'Bob Smith', riskLevel: 'MEDIUM' }),
                (0, factories_1.createMockWatchlistEntry)({ fullName: 'Bob Smith', riskLevel: 'LOW' }),
            ]);
            mock_db_1.mockPrisma.verificationCheck.create.mockResolvedValue((0, factories_1.createMockVerificationCheck)({ status: 'FLAGGED' }));
            const createSpy = jest.spyOn(mock_db_1.mockPrisma.verificationCheck, 'create');
            await service.runVetting('visa-1');
            expect(createSpy).toHaveBeenCalledTimes(2);
        });
        it('should throw NotFoundError for non-existent application', async () => {
            mock_db_1.mockPrisma.visaApplication.findUnique.mockResolvedValue(null);
            await expect(service.runVetting('nonexistent')).rejects.toThrow('Visa application not found');
        });
        it('should match by name and document number', async () => {
            const user = { userid: 'user-1', firstName: 'Alert', lastName: 'Person', email: 'alert@example.com' };
            mock_db_1.mockPrisma.visaApplication.findUnique.mockResolvedValue({
                ...(0, factories_1.createMockVisaApplication)(),
                user,
            });
            mock_db_1.mockPrisma.watchlistEntry.findMany.mockResolvedValue([
                (0, factories_1.createMockWatchlistEntry)({ fullName: 'Alert Person', documentNumber: 'AB123456', riskLevel: 'HIGH' }),
            ]);
            mock_db_1.mockPrisma.verificationCheck.create.mockResolvedValue((0, factories_1.createMockVerificationCheck)({ status: 'FLAGGED' }));
            const result = await service.runVetting('visa-1');
            expect(result.overallRisk).toBe('HIGH');
            expect(mock_db_1.mockPrisma.watchlistEntry.findMany).toHaveBeenCalled();
        });
    });
    describe('getVettingResults', () => {
        it('should return existing vetting results', async () => {
            mock_db_1.mockPrisma.verificationCheck.findMany.mockResolvedValue([
                (0, factories_1.createMockVerificationCheck)({ status: 'CLEARED', result: { matched: false } }),
            ]);
            const result = await service.getVettingResults('visa-1');
            expect(result.applicationId).toBe('visa-1');
            expect(result.checks).toHaveLength(1);
        });
    });
    describe('updateCheckStatus', () => {
        it('should update verification check status', async () => {
            mock_db_1.mockPrisma.verificationCheck.findUnique.mockResolvedValue((0, factories_1.createMockVerificationCheck)({ id: 'vc-1' }));
            mock_db_1.mockPrisma.verificationCheck.update.mockResolvedValue((0, factories_1.createMockVerificationCheck)({ id: 'vc-1', status: 'CLEARED', checkedBy: 'officer-1' }));
            const result = await service.updateCheckStatus('vc-1', 'CLEARED', 'officer-1');
            expect(result.status).toBe('CLEARED');
        });
        it('should throw NotFoundError for missing check', async () => {
            mock_db_1.mockPrisma.verificationCheck.findUnique.mockResolvedValue(null);
            await expect(service.updateCheckStatus('nonexistent', 'CLEARED', 'officer-1'))
                .rejects.toThrow('Verification check not found');
        });
    });
});
