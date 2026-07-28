import { EmbassyService } from '../../services/embassy.service';
import { mockPrisma } from '../helpers/mock-db';
import { createMockEmbassy, createMockDepartment } from '../helpers/factories';
import { NotFoundError, ConflictError } from '../../exceptions';

describe('EmbassyService', () => {
  let embassyService: EmbassyService;

  beforeEach(() => {
    jest.clearAllMocks();
    embassyService = new EmbassyService(mockPrisma as any);
  });

  describe('create', () => {
    const createDto = {
      name: 'Test Embassy', code: 'TEST',
      country: 'Test Country', city: 'Test City', address: '123 Test St',
    };

    it('should create embassy with audit log', async () => {
      const mockEmbassy = createMockEmbassy({ departments: [] });
      mockPrisma.embassy.findUnique.mockResolvedValue(null);
      mockPrisma.embassy.create.mockResolvedValue(mockEmbassy);
      const result = await embassyService.create(createDto, 'user-1');
      expect(result.code).toBe('TEST');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should skip audit log when no userId', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(null);
      mockPrisma.embassy.create.mockResolvedValue(createMockEmbassy({ departments: [] }));
      await embassyService.create(createDto);
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('should reject duplicate code', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      await expect(embassyService.create(createDto)).rejects.toThrow(ConflictError);
    });
  });

  describe('findById', () => {
    it('should return embassy with departments', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy({ departments: [createMockDepartment()] }));
      const result = await embassyService.findById('embassy-1');
      expect(result.departments).toHaveLength(1);
    });

    it('should throw NotFoundError', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(null);
      await expect(embassyService.findById('x')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findAll', () => {
    it('should paginate', async () => {
      mockPrisma.embassy.findMany.mockResolvedValue([createMockEmbassy({ departments: [] })]);
      mockPrisma.embassy.count.mockResolvedValue(1);
      const result = await embassyService.findAll(1, 10);
      expect(result.data).toHaveLength(1);
    });

    it('should handle empty', async () => {
      mockPrisma.embassy.findMany.mockResolvedValue([]);
      mockPrisma.embassy.count.mockResolvedValue(0);
      const result = await embassyService.findAll(1, 10);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update and audit', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      mockPrisma.embassy.update.mockResolvedValue(createMockEmbassy({ name: 'Updated', departments: [] }));
      const result = await embassyService.update('embassy-1', { name: 'Updated' }, 'user-1');
      expect(result.name).toBe('Updated');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should reject duplicate code', async () => {
      const existing = createMockEmbassy();
      mockPrisma.embassy.findUnique
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(createMockEmbassy({ id: 'embassy-2', code: 'NEWCODE' }));
      await expect(embassyService.update('embassy-1', { code: 'NEWCODE' })).rejects.toThrow(ConflictError);
    });

    it('should allow same code', async () => {
      const existing = createMockEmbassy({ departments: [] });
      mockPrisma.embassy.findUnique.mockResolvedValue(existing);
      mockPrisma.embassy.update.mockResolvedValue(existing);
      await embassyService.update('embassy-1', { code: 'TEST' });
      expect(mockPrisma.embassy.update).toHaveBeenCalled();
    });

    it('should throw NotFoundError', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(null);
      await expect(embassyService.update('x', { name: 'Test' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete with no dependents', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      for (const m of ['department', 'serviceRequest', 'appointment', 'visaApplication', 'emergencyCase']) {
        mockPrisma[m].count.mockResolvedValue(0);
      }
      await embassyService.delete('embassy-1', 'user-1');
      expect(mockPrisma.embassy.delete).toHaveBeenCalled();
    });

    it('should reject when departments exist', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      mockPrisma.department.count.mockResolvedValue(2);
      for (const m of ['serviceRequest', 'appointment', 'visaApplication', 'emergencyCase']) {
        mockPrisma[m].count.mockResolvedValue(0);
      }
      await expect(embassyService.delete('embassy-1')).rejects.toThrow(ConflictError);
    });

    it('should reject when appointments exist', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      for (const m of ['department', 'serviceRequest', 'visaApplication', 'emergencyCase']) {
        mockPrisma[m].count.mockResolvedValue(0);
      }
      mockPrisma.appointment.count.mockResolvedValue(1);
      await expect(embassyService.delete('embassy-1')).rejects.toThrow(ConflictError);
    });
  });

  describe('createDepartment', () => {
    const dto = { name: 'Visa', slug: 'visa' };
    it('should create department and audit', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      mockPrisma.department.findUnique.mockResolvedValue(null);
      mockPrisma.department.create.mockResolvedValue(createMockDepartment());
      const result = await embassyService.createDepartment('embassy-1', dto, 'user-1');
      expect(result.name).toBe('Consular Services');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should reject when embassy missing', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(null);
      await expect(embassyService.createDepartment('x', dto)).rejects.toThrow(NotFoundError);
    });

    it('should reject duplicate slug', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      mockPrisma.department.findUnique.mockResolvedValue(createMockDepartment());
      await expect(embassyService.createDepartment('embassy-1', dto)).rejects.toThrow(ConflictError);
    });
  });

  describe('findDepartments', () => {
    it('should list sorted', async () => {
      mockPrisma.department.findMany.mockResolvedValue([createMockDepartment()]);
      const result = await embassyService.findDepartments('embassy-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('updateDepartment', () => {
    it('should update and audit', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(createMockDepartment());
      mockPrisma.department.update.mockResolvedValue(createMockDepartment({ name: 'Updated' }));
      const result = await embassyService.updateDepartment('dept-1', { name: 'Updated' }, 'user-1');
      expect(result.name).toBe('Updated');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should reject duplicate slug', async () => {
      mockPrisma.department.findUnique
        .mockResolvedValueOnce(createMockDepartment())
        .mockResolvedValueOnce(createMockDepartment({ id: 'dept-2', slug: 'newslug' }));
      await expect(embassyService.updateDepartment('dept-1', { slug: 'newslug' })).rejects.toThrow(ConflictError);
    });

    it('should throw NotFoundError', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);
      await expect(embassyService.updateDepartment('x', { name: 'Test' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteDepartment', () => {
    it('should delete and audit', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(createMockDepartment());
      await embassyService.deleteDepartment('dept-1', 'user-1');
      expect(mockPrisma.department.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundError', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);
      await expect(embassyService.deleteDepartment('x')).rejects.toThrow(NotFoundError);
    });
  });
});
