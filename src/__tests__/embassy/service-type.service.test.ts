import { ServiceTypeService } from '../../services/service-type.service';
import { mockPrisma } from '../helpers/mock-db';
import { createMockServiceType } from '../helpers/factories';
import { NotFoundError, ConflictError } from '../../exceptions';

describe('ServiceTypeService', () => {
  let serviceTypeService: ServiceTypeService;

  beforeEach(() => {
    jest.clearAllMocks();
    serviceTypeService = new ServiceTypeService(mockPrisma as any);
  });

  describe('create', () => {
    const createDto = { name: 'Passport Renewal', slug: 'passport-renewal', category: 'DOCUMENT', fee: 100, duration: 10, requiresAppointment: true };

    it('should create with audit log', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(null);
      mockPrisma.serviceType.create.mockResolvedValue(createMockServiceType());
      const result = await serviceTypeService.create(createDto, 'user-1');
      expect(result.name).toBe('Passport Renewal');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should reject duplicate slug', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(createMockServiceType());
      await expect(serviceTypeService.create(createDto)).rejects.toThrow(ConflictError);
    });

    it('should default requiresAppointment to false', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(null);
      mockPrisma.serviceType.create.mockResolvedValue(createMockServiceType({ requiresAppointment: false }));
      const result = await serviceTypeService.create({ name: 'N', slug: 'n', category: 'DOCUMENT' });
      expect(result.requiresAppointment).toBe(false);
    });
  });

  describe('findById', () => {
    it('should return by id', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(createMockServiceType());
      const result = await serviceTypeService.findById('st-1');
      expect(result.category).toBe('DOCUMENT');
    });

    it('should throw NotFoundError', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(null);
      await expect(serviceTypeService.findById('x')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findAll', () => {
    it('should paginate', async () => {
      mockPrisma.serviceType.findMany.mockResolvedValue([createMockServiceType()]);
      mockPrisma.serviceType.count.mockResolvedValue(1);
      const result = await serviceTypeService.findAll(1, 10);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findByCategory', () => {
    it('should filter', async () => {
      mockPrisma.serviceType.findMany.mockResolvedValue([createMockServiceType({ category: 'DOCUMENT' })]);
      const result = await serviceTypeService.findByCategory('DOCUMENT');
      expect(result).toHaveLength(1);
    });

    it('should return empty for no matches', async () => {
      mockPrisma.serviceType.findMany.mockResolvedValue([]);
      const result = await serviceTypeService.findByCategory('APPOINTMENT');
      expect(result).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update and audit', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(createMockServiceType());
      mockPrisma.serviceType.update.mockResolvedValue(createMockServiceType({ name: 'Updated', fee: 150 }));
      const result = await serviceTypeService.update('st-1', { name: 'Updated', fee: 150 }, 'user-1');
      expect(result.name).toBe('Updated');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should reject duplicate slug', async () => {
      mockPrisma.serviceType.findUnique
        .mockResolvedValueOnce(createMockServiceType())
        .mockResolvedValueOnce(createMockServiceType({ id: 'st-2', slug: 'new-slug' }));
      await expect(serviceTypeService.update('st-1', { slug: 'new-slug' })).rejects.toThrow(ConflictError);
    });

    it('should allow same slug', async () => {
      const existing = createMockServiceType();
      mockPrisma.serviceType.findUnique.mockResolvedValue(existing);
      mockPrisma.serviceType.update.mockResolvedValue(createMockServiceType());
      await serviceTypeService.update('st-1', { slug: 'passport-renewal' });
      expect(mockPrisma.serviceType.update).toHaveBeenCalled();
    });

    it('should throw NotFoundError', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(null);
      await expect(serviceTypeService.update('x', { name: 'Test' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete with no requests', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(createMockServiceType());
      mockPrisma.serviceRequest.count.mockResolvedValue(0);
      await serviceTypeService.delete('st-1', 'user-1');
      expect(mockPrisma.serviceType.delete).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should block delete when requests exist', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(createMockServiceType());
      mockPrisma.serviceRequest.count.mockResolvedValue(3);
      await expect(serviceTypeService.delete('st-1')).rejects.toThrow(ConflictError);
    });

    it('should throw NotFoundError', async () => {
      mockPrisma.serviceType.findUnique.mockResolvedValue(null);
      await expect(serviceTypeService.delete('x')).rejects.toThrow(NotFoundError);
    });
  });
});
