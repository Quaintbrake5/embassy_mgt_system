import crypto from 'crypto';
import { ServiceRequestService } from '../../services/service-request.service';
import { mockPrisma } from '../helpers/mock-db';
import { createMockServiceType, createMockEmbassy, createMockServiceRequest } from '../helpers/factories';
import { NotFoundError, ValidationError } from '../../exceptions';

describe('ServiceRequestService', () => {
  let service: ServiceRequestService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ServiceRequestService(mockPrisma as any);
  });

  describe('create', () => {
    const dto = { serviceTypeId: 'st-1', embassyId: 'embassy-1' };

    it('should create with reference number and audit log', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
      jest.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from("a1b2c3d4e5f6a7b8", "hex") as any);
      mockPrisma.serviceType.findUnique.mockResolvedValue(createMockServiceType({ fee: 0 }));
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      mockPrisma.serviceRequest.create.mockResolvedValue(
        createMockServiceRequest({ referenceNumber: 'SR-KF12OJ-A1B2C3D4E5F6A7B8', status: 'DRAFT' })
      );
      const result = await service.create('user-1', dto);
      expect(result.referenceNumber).toMatch(/^SR-/);
      expect(result.status).toBe('DRAFT');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
      jest.restoreAllMocks();
    });

    it('should create payment when fee > 0', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(createMockServiceType({ fee: { toNumber: () => 100 } }));
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      mockPrisma.serviceRequest.create.mockResolvedValue(createMockServiceRequest({ status: 'DRAFT' }));
      await service.create('user-1', dto);
      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', currency: 'USD' }) })
      );
    });

    it('should skip payment when fee is 0', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(createMockServiceType({ fee: 0 }));
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      mockPrisma.serviceRequest.create.mockResolvedValue(createMockServiceRequest({ status: 'DRAFT' }));
      await service.create('user-1', dto);
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('should skip payment when fee is undefined', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(createMockServiceType({ fee: undefined }));
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      mockPrisma.serviceRequest.create.mockResolvedValue(createMockServiceRequest({ status: 'DRAFT' }));
      await service.create('user-1', dto);
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('should throw when service type missing', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(null);
      await expect(service.create('user-1', dto)).rejects.toThrow(NotFoundError);
    });

    it('should throw when embassy missing', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(createMockServiceType({ fee: 0 }));
      mockPrisma.embassy.findUnique.mockResolvedValue(null);
      await expect(service.create('user-1', dto)).rejects.toThrow(NotFoundError);
    });
  });

  describe('findById', () => {
    it('should return with includes', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(
        createMockServiceRequest({
          user: { userid: 'u1', firstName: 'J', lastName: 'D', email: 'j@t.com' },
          serviceType: { id: 'st-1', name: 'P', slug: 'p', category: 'DOCUMENT' },
          embassy: { id: 'e1', name: 'E', code: 'E1', country: 'C', city: 'Ct' },
          payments: [],
        })
      );
      const result = await service.findById('sr-1');
      expect(result.user).toBeDefined();
      expect(result.serviceType).toBeDefined();
    });

    it('should throw NotFoundError', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(null);
      await expect(service.findById('x')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findAll', () => {
    it('should filter and paginate', async () => {
      mockPrisma.serviceRequest.findMany.mockResolvedValue([createMockServiceRequest()]);
      mockPrisma.serviceRequest.count.mockResolvedValue(1);
      const result = await service.findAll({ userId: 'u1', page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status and embassy', async () => {
      mockPrisma.serviceRequest.findMany.mockResolvedValue([]);
      mockPrisma.serviceRequest.count.mockResolvedValue(0);
      await service.findAll({ status: 'SUBMITTED', embassyId: 'e1' });
      expect(mockPrisma.serviceRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'SUBMITTED', embassyId: 'e1' }) })
      );
    });
  });

  describe('updateStatus', () => {
    it.each([
      ['DRAFT', 'SUBMITTED'],
      ['DRAFT', 'CANCELLED'],
      ['SUBMITTED', 'IN_PROGRESS'],
      ['SUBMITTED', 'CANCELLED'],
      ['IN_PROGRESS', 'COMPLETED'],
      ['IN_PROGRESS', 'CLOSED'],
      ['IN_PROGRESS', 'CANCELLED'],
      ['COMPLETED', 'CLOSED'],
    ])('should allow %s -> %s', async (from, to) => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(createMockServiceRequest({ status: from }));
      mockPrisma.serviceRequest.update.mockResolvedValue(createMockServiceRequest({ status: to }));
      const result = await service.updateStatus('sr-1', { status: to });
      expect(result.status).toBe(to);
    });

    it('should set submittedAt on DRAFT -> SUBMITTED', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(createMockServiceRequest({ status: 'DRAFT' }));
      mockPrisma.serviceRequest.update.mockResolvedValue(createMockServiceRequest({ status: 'SUBMITTED' }));
      await service.updateStatus('sr-1', { status: 'SUBMITTED' });
      expect(mockPrisma.serviceRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ submittedAt: expect.any(Date) }) })
      );
    });

    it('should create audit log on status change', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(createMockServiceRequest({ status: 'DRAFT' }));
      mockPrisma.serviceRequest.update.mockResolvedValue(createMockServiceRequest({ status: 'SUBMITTED' }));
      await service.updateStatus('sr-1', { status: 'SUBMITTED' }, 'user-1');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'UPDATE_STATUS', entity: 'ServiceRequest' }) })
      );
    });

    it.each([
      ['DRAFT', 'COMPLETED'],
      ['DRAFT', 'IN_PROGRESS'],
      ['DRAFT', 'CLOSED'],
      ['SUBMITTED', 'DRAFT'],
      ['SUBMITTED', 'COMPLETED'],
      ['SUBMITTED', 'CLOSED'],
      ['IN_PROGRESS', 'DRAFT'],
      ['IN_PROGRESS', 'SUBMITTED'],
      ['COMPLETED', 'SUBMITTED'],
      ['COMPLETED', 'IN_PROGRESS'],
      ['COMPLETED', 'CANCELLED'],
      ['CLOSED', 'DRAFT'],
      ['CLOSED', 'SUBMITTED'],
      ['CLOSED', 'IN_PROGRESS'],
      ['CLOSED', 'COMPLETED'],
      ['CLOSED', 'CANCELLED'],
      ['CANCELLED', 'DRAFT'],
      ['CANCELLED', 'SUBMITTED'],
      ['CANCELLED', 'IN_PROGRESS'],
      ['CANCELLED', 'COMPLETED'],
      ['CANCELLED', 'CLOSED'],
    ])('should reject %s -> %s', async (from, to) => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(createMockServiceRequest({ status: from }));
      const err = await service.updateStatus('sr-1', { status: to }).catch(e => e);
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.message).toContain('Cannot transition');
    });

    it('should throw NotFoundError for missing request', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValue(null);
      await expect(service.updateStatus('x', { status: 'SUBMITTED' })).rejects.toThrow(NotFoundError);
    });
  });
});

