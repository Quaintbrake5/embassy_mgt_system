import { mockPrisma } from '../helpers/mock-db';
import { createMockUser, createMockEmbassy, createMockVisaApplication, createMockWatchlistEntry, createMockVerificationCheck } from '../helpers/factories';
import { VisaApplicationService } from '../../services/visa-application.service';

jest.mock('../../config/db.config', () => ({
  prisma: mockPrisma,
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'ABCD1234'),
  })),
}));

describe('VisaApplicationService', () => {
  let service: VisaApplicationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VisaApplicationService(mockPrisma as any);
  });

  describe('create', () => {
    it('should create a visa application with reference number', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      mockPrisma.visaApplication.create.mockResolvedValue(createMockVisaApplication({
        applicationNumber: 'VA-K8X91-ABCD1234',
        visaType: 'TOURIST',
        status: 'DRAFT',
      }));
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser());
      mockPrisma.watchlistEntry.findMany.mockResolvedValue([]);

      const result = await service.create('user-1', { visaType: 'TOURIST', embassyId: 'embassy-1' });

      expect(result.applicationNumber).toMatch(/^VA-/);
      expect(result.visaType).toBe('TOURIST');
      expect(result.status).toBe('DRAFT');
    });

    it('should throw NotFoundError for non-existent embassy', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(null);

      await expect(service.create('user-1', { visaType: 'TOURIST', embassyId: 'nonexistent' }))
        .rejects.toThrow('Embassy not found');
    });

    it('should create VerificationCheck when watchlist matches', async () => {
      const mockUser = createMockUser({ firstName: 'John', lastName: 'Doe' });
      const mockWatchlist = [createMockWatchlistEntry({ fullName: 'john doe', riskLevel: 'HIGH' })];
      const mockVisa = createMockVisaApplication({ id: 'visa-1' });

      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      mockPrisma.visaApplication.create.mockResolvedValue(mockVisa);
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.watchlistEntry.findMany.mockResolvedValue(mockWatchlist);
      mockPrisma.verificationCheck.create.mockResolvedValue(createMockVerificationCheck());

      await service.create('user-1', { visaType: 'TOURIST', embassyId: 'embassy-1' });

      expect(mockPrisma.verificationCheck.create).toHaveBeenCalledWith({
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
      mockPrisma.visaApplication.findUnique.mockResolvedValue(createMockVisaApplication());

      const result = await service.findById('visa-1');

      expect(result.id).toBe('visa-1');
      expect(result.status).toBe('UNDER_REVIEW');
    });

    it('should throw NotFoundError for missing application', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow('Visa application not found');
    });
  });

  describe('findByApplicationNumber', () => {
    it('should find by application number', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue(createMockVisaApplication({ applicationNumber: 'VA-12345-ABC' }));

      const result = await service.findByApplicationNumber('VA-12345-ABC');

      expect(result.applicationNumber).toBe('VA-12345-ABC');
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      mockPrisma.visaApplication.findMany.mockResolvedValue([createMockVisaApplication()]);
      mockPrisma.visaApplication.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by status and visaType', async () => {
      mockPrisma.visaApplication.findMany.mockResolvedValue([]);
      mockPrisma.visaApplication.count.mockResolvedValue(0);

      await service.findAll({ status: 'UNDER_REVIEW', visaType: 'TOURIST' });

      expect(mockPrisma.visaApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'UNDER_REVIEW', visaType: 'TOURIST' }),
        })
      );
    });
  });

  describe('submit', () => {
    it('should submit a DRAFT application', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue(
        createMockVisaApplication({ id: 'visa-1', status: 'DRAFT' })
      );
      mockPrisma.visaApplication.update.mockResolvedValue(
        createMockVisaApplication({ id: 'visa-1', status: 'SUBMITTED', submittedAt: new Date() })
      );
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.submit('visa-1', 'user-1');

      expect(result.status).toBe('SUBMITTED');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'SUBMIT',
            entity: 'VisaApplication',
          }),
        })
      );
    });

    it('should reject submit for non-DRAFT application', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue(
        createMockVisaApplication({ id: 'visa-1', status: 'UNDER_REVIEW' })
      );

      await expect(service.submit('visa-1', 'user-1')).rejects.toThrow(
        'Cannot submit application in status UNDER_REVIEW'
      );
    });

    it('should throw NotFoundError for missing application', async () => {
      mockPrisma.visaApplication.findUnique.mockResolvedValue(null);

      await expect(service.submit('nonexistent', 'user-1')).rejects.toThrow('Visa application not found');
    });
  });
});
