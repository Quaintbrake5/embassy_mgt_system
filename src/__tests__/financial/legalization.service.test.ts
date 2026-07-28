import { LegalizationService } from '../../services/legalization.service';
import { mockPrisma } from '../helpers/mock-db';
import { createMockServiceType, createMockServiceRequest, createMockEmbassy } from '../helpers/factories';
import { NotFoundError, ValidationError } from '../../exceptions';

jest.mock('../../utils/jwt.utilities', () => ({
  signAccessToken: jest.fn(() => 'mock-access-token'),
  signRefreshToken: jest.fn(() => 'mock-refresh-token'),
  verifyAccessToken: jest.fn(() => ({ userId: 'user-1', email: 'test@test.com' })),
  verifyRefreshToken: jest.fn(() => ({ userId: 'user-1' })),
}));

describe('LegalizationService', () => {
  let service: LegalizationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LegalizationService(mockPrisma as any);
  });

  describe('create', () => {
    it('should create a legalization request with SR reference number', async () => {
      const st = createMockServiceType({ id: 'st-legal', category: 'DOCUMENT_LEGALIZATION' });
      const emb = createMockEmbassy({ id: 'emb-1' });
      const created = createMockServiceRequest({
        id: 'sr-new', referenceNumber: 'SR-TEST-ABC',
        serviceTypeId: 'st-legal', embassyId: 'emb-1', status: 'SUBMITTED',
        details: { documentType: 'Birth Certificate', destinationCountry: 'France', urgency: 'NORMAL' },
      });
      mockPrisma.serviceType.findUnique.mockResolvedValue(st);
      mockPrisma.embassy.findUnique.mockResolvedValue(emb);
      mockPrisma.serviceRequest.create.mockResolvedValue(created);
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.create({
        documentType: 'Birth Certificate', destinationCountry: 'France', urgency: 'NORMAL',
        serviceTypeId: 'st-legal', embassyId: 'emb-1',
      }, 'user-1');

      expect(result.referenceNumber).toMatch(/^SR-/);
      expect(result.documentType).toBe('Birth Certificate');
      expect(result.status).toBe('SUBMITTED');
    });

    it('should throw NotFoundError when service type not found', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(null);
      await expect(service.create({
        documentType: 'Doc', destinationCountry: 'FR', urgency: 'NORMAL',
        serviceTypeId: 'invalid', embassyId: 'emb-1',
      }, 'user-1')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when service type is not DOCUMENT_LEGALIZATION', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(createMockServiceType({ category: 'VISA' }));
      await expect(service.create({
        documentType: 'Doc', destinationCountry: 'FR', urgency: 'NORMAL',
        serviceTypeId: 'st-1', embassyId: 'emb-1',
      }, 'user-1')).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when embassy not found', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(createMockServiceType({ id: 'st-legal', category: 'DOCUMENT_LEGALIZATION' }));
      mockPrisma.embassy.findUnique.mockResolvedValue(null);
      await expect(service.create({
        documentType: 'Doc', destinationCountry: 'FR', urgency: 'NORMAL',
        serviceTypeId: 'st-legal', embassyId: 'invalid',
      }, 'user-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findAll', () => {
    it('should return paginated results filtering by legalization typeId', async () => {
      mockPrisma.serviceType.findMany.mockResolvedValue([createMockServiceType({ id: 'st-legal', category: 'DOCUMENT_LEGALIZATION' })]);
      mockPrisma.serviceRequest.findMany.mockResolvedValue([
        createMockServiceRequest({ id: 'sr-1', serviceTypeId: 'st-legal', details: { documentType: 'Doc', destinationCountry: 'FR' } }),
      ]);
      mockPrisma.serviceRequest.count.mockResolvedValue(1);
      const result = await service.findAll(1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should return empty list when no legalization types exist', async () => {
      mockPrisma.serviceType.findMany.mockResolvedValue([]);
      const result = await service.findAll(1, 10);
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findById', () => {
    it('should return legalization request', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(
        createMockServiceRequest({ id: 'sr-1', details: { documentType: 'BC', destinationCountry: 'FR' }, serviceType: { id: 'st-legal', name: 'L', slug: 'l', category: 'DOCUMENT_LEGALIZATION' } })
      );
      const result = await service.findById('sr-1');
      expect(result.id).toBe('sr-1');
    });

    it('should throw NotFoundError', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(null);
      await expect(service.findById('invalid')).rejects.toThrow(NotFoundError);
    });
  });

  describe('process', () => {
    it('should allow VERIFY on SUBMITTED', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(createMockServiceRequest({ id: 'sr-1', status: 'SUBMITTED', details: {} }));
      mockPrisma.serviceRequest.update.mockResolvedValue(createMockServiceRequest({ id: 'sr-1', status: 'IN_PROGRESS', details: { verifiedAt: '2026-01-01T00:00:00Z', verifiedBy: 'user-1' } }));
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
      const result = await service.process('sr-1', { action: 'VERIFY' }, 'user-1');
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should reject VERIFY on IN_PROGRESS', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(createMockServiceRequest({ id: 'sr-1', status: 'IN_PROGRESS', details: {} }));
      await expect(service.process('sr-1', { action: 'VERIFY' }, 'user-1')).rejects.toThrow(ValidationError);
    });

    it('should reject COMPLETE without sealInfo', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(createMockServiceRequest({ id: 'sr-1', status: 'IN_PROGRESS', details: {} }));
      await expect(service.process('sr-1', { action: 'COMPLETE' }, 'user-1')).rejects.toThrow('must be sealed before completing');
    });

    it('should reject ROUTE_APOSTILLE without sealInfo', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(createMockServiceRequest({ id: 'sr-1', status: 'IN_PROGRESS', details: {} }));
      await expect(service.process('sr-1', { action: 'ROUTE_APOSTILLE' }, 'user-1')).rejects.toThrow('must be sealed before routing');
    });

    it('should reject ROUTE_LEGALIZATION without sealInfo', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(createMockServiceRequest({ id: 'sr-1', status: 'IN_PROGRESS', details: {} }));
      await expect(service.process('sr-1', { action: 'ROUTE_LEGALIZATION' }, 'user-1')).rejects.toThrow('must be sealed before routing');
    });

    it('should reject duplicate hague routing', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(createMockServiceRequest({ id: 'sr-1', status: 'IN_PROGRESS', details: { sealInfo: {}, hagueRouting: 'APOSTILLE' } }));
      await expect(service.process('sr-1', { action: 'ROUTE_APOSTILLE' }, 'user-1')).rejects.toThrow('Hague routing already assigned');
    });

    it('should reject SEAL on COMPLETED request', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(createMockServiceRequest({ id: 'sr-1', status: 'COMPLETED', details: {} }));
      await expect(service.process('sr-1', { action: 'SEAL' }, 'user-1')).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when request missing', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(null);
      await expect(service.process('invalid', { action: 'VERIFY' }, 'user-1')).rejects.toThrow(NotFoundError);
    });
  });
});
