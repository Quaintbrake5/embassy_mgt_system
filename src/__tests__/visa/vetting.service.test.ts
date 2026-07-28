import { mockPrisma } from '../helpers/mock-db';
import { createMockUser, createMockVisaApplication, createMockWatchlistEntry, createMockVerificationCheck } from '../helpers/factories';
import { VettingService } from '../../services/vetting.service';

jest.mock('../../config/db.config', () => ({
  prisma: mockPrisma,
}));

describe('VettingService', () => {
  let service: VettingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VettingService(mockPrisma as any);
  });

  describe('runVetting', () => {
    it('should perform watchlist matching and return CLEARED when no matches', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue({
        ...createMockVisaApplication(),
        user: { userid: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      });
      mockPrisma.watchlistEntry.findMany.mockResolvedValue([]);
      mockPrisma.verificationCheck.create.mockResolvedValue(
        createMockVerificationCheck({ status: 'CLEARED', checkType: 'WATCHLIST', result: { matched: false } })
      );

      const result = await service.runVetting('visa-1');

      expect(result.overallRisk).toBe('LOW');
      expect(result.checks).toHaveLength(1);
      expect(result.checks[0].status).toBe('CLEARED');
    });

    it('should FLAG and create checks for watchlist matches', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue({
        ...createMockVisaApplication(),
        user: { userid: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      });
      mockPrisma.watchlistEntry.findMany.mockResolvedValue([
        createMockWatchlistEntry({ fullName: 'John Doe', riskLevel: 'HIGH' }),
      ]);
      mockPrisma.verificationCheck.create.mockResolvedValue(
        createMockVerificationCheck({ status: 'FLAGGED', result: { matched: true, watchlistEntryId: 'wl-1', riskLevel: 'HIGH' } })
      );

      const result = await service.runVetting('visa-1');

      expect(result.checks).toHaveLength(1);
      expect(result.overallRisk).toBe('HIGH');
    });

    it('should escalate to CRITICAL risk for multiple high-risk matches', async () => {
      const user = { userid: 'user-1', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' };
      mockPrisma.visaApplication.findUnique.mockResolvedValue({
        ...createMockVisaApplication(),
        user,
      });
      mockPrisma.watchlistEntry.findMany.mockResolvedValue([
        createMockWatchlistEntry({ fullName: 'Jane Smith', riskLevel: 'CRITICAL' }),
        createMockWatchlistEntry({ fullName: 'Jane Smith', riskLevel: 'HIGH' }),
      ]);
      mockPrisma.verificationCheck.create.mockResolvedValue(
        createMockVerificationCheck({ status: 'FLAGGED', result: { matched: true, riskLevel: 'CRITICAL' } })
      );

      const result = await service.runVetting('visa-1');

      expect(result.overallRisk).toBe('CRITICAL');
    });

    it('should use Promise.all for parallel watchlist checks', async () => {
      const user = { userid: 'user-1', firstName: 'Bob', lastName: 'Smith', email: 'bob@example.com' };
      mockPrisma.visaApplication.findUnique.mockResolvedValue({
        ...createMockVisaApplication(),
        user,
      });
      mockPrisma.watchlistEntry.findMany.mockResolvedValue([
        createMockWatchlistEntry({ fullName: 'Bob Smith', riskLevel: 'MEDIUM' }),
        createMockWatchlistEntry({ fullName: 'Bob Smith', riskLevel: 'LOW' }),
      ]);
      mockPrisma.verificationCheck.create.mockResolvedValue(
        createMockVerificationCheck({ status: 'FLAGGED' })
      );

      const createSpy = jest.spyOn(mockPrisma.verificationCheck, 'create');

      await service.runVetting('visa-1');

      expect(createSpy).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundError for non-existent application', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue(null);

      await expect(service.runVetting('nonexistent')).rejects.toThrow('Visa application not found');
    });

    it('should match by name and document number', async () => {
      const user = { userid: 'user-1', firstName: 'Alert', lastName: 'Person', email: 'alert@example.com' };
      mockPrisma.visaApplication.findUnique.mockResolvedValue({
        ...createMockVisaApplication(),
        user,
      });
      mockPrisma.watchlistEntry.findMany.mockResolvedValue([
        createMockWatchlistEntry({ fullName: 'Alert Person', documentNumber: 'AB123456', riskLevel: 'HIGH' }),
      ]);
      mockPrisma.verificationCheck.create.mockResolvedValue(
        createMockVerificationCheck({ status: 'FLAGGED' })
      );

      const result = await service.runVetting('visa-1');

      expect(result.overallRisk).toBe('HIGH');
      expect(mockPrisma.watchlistEntry.findMany).toHaveBeenCalled();
    });
  });

  describe('getVettingResults', () => {
    it('should return existing vetting results', async () => {
      mockPrisma.verificationCheck.findMany.mockResolvedValue([
        createMockVerificationCheck({ status: 'CLEARED', result: { matched: false } }),
      ]);

      const result = await service.getVettingResults('visa-1');

      expect(result.applicationId).toBe('visa-1');
      expect(result.checks).toHaveLength(1);
    });
  });

  describe('updateCheckStatus', () => {
    it('should update verification check status', async () => {
      mockPrisma.verificationCheck.findUnique.mockResolvedValue(
        createMockVerificationCheck({ id: 'vc-1' })
      );
      mockPrisma.verificationCheck.update.mockResolvedValue(
        createMockVerificationCheck({ id: 'vc-1', status: 'CLEARED', checkedBy: 'officer-1' })
      );

      const result = await service.updateCheckStatus('vc-1', 'CLEARED', 'officer-1');

      expect(result.status).toBe('CLEARED');
    });

    it('should throw NotFoundError for missing check', async () => {
      mockPrisma.verificationCheck.findUnique.mockResolvedValue(null);

      await expect(service.updateCheckStatus('nonexistent', 'CLEARED', 'officer-1'))
        .rejects.toThrow('Verification check not found');
    });
  });
});
