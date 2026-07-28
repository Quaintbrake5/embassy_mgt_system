import { EmergencyService } from '../../services/emergency.service';
import { mockPrisma } from '../helpers/mock-db';
import { createMockEmergencyCase, createMockEmbassy } from '../helpers/factories';
import { NotFoundError } from '../../exceptions';

jest.mock('../../utils/jwt.utilities', () => ({
  signAccessToken: jest.fn(() => 'mock-access-token'),
  signRefreshToken: jest.fn(() => 'mock-refresh-token'),
  verifyAccessToken: jest.fn(() => ({ userId: 'user-1', email: 'test@test.com' })),
  verifyRefreshToken: jest.fn(() => ({ userId: 'user-1' })),
}));
describe('EmergencyService', () => {
  let service: EmergencyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmergencyService(mockPrisma as any);
  });

  describe('createCase', () => {
    const createDto = {
      caseType: 'EVACUATION',
      description: 'Evacuation needed',
      urgency: 'HIGH',
      location: 'Zone A',
      embassyId: 'embassy-1',
    };

    it('should create case with EC reference number', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      mockPrisma.emergencyCase.create.mockResolvedValue(
        createMockEmergencyCase({
          referenceNumber: 'EC-TEST',
          caseType: 'EVACUATION',
          description: 'Evacuation needed | Zone A',
          urgency: 'HIGH',
          status: 'OPEN',
          embassyId: 'embassy-1',
          resolvedAt: null,
        })
      );
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.createCase(createDto, 'user-1');

      expect(result.referenceNumber).toMatch(/^EC-/);
      expect(result.caseType).toBe('EVACUATION');
      expect(result.status).toBe('OPEN');
    });

    it('should combine description and location with pipe', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      mockPrisma.emergencyCase.create.mockResolvedValue(
        createMockEmergencyCase({
          referenceNumber: 'EC-TEST',
          caseType: 'EVACUATION',
          description: 'Test | Location',
          urgency: 'HIGH',
          status: 'OPEN',
          embassyId: 'embassy-1',
          resolvedAt: null,
        })
      );
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.createCase(createDto, 'user-1');

      expect(result.description).toContain(' | ');
    });

    it('should throw NotFoundError if embassy does not exist', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(null);

      await expect(service.createCase(createDto, 'user-1'))
        .rejects.toThrow(NotFoundError);
    });

    it('should create audit log on case creation', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(createMockEmbassy());
      mockPrisma.emergencyCase.create.mockResolvedValue(
        createMockEmergencyCase({
          referenceNumber: 'EC-TEST',
          caseType: 'EVACUATION',
          description: 'Evacuation needed | Zone A',
          urgency: 'HIGH',
          status: 'OPEN',
          embassyId: 'embassy-1',
          resolvedAt: null,
        })
      );
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.createCase(createDto, 'user-1');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'CREATE',
          entity: 'EmergencyCase',
        }),
      });
    });
  });
  describe('findAll', () => {
    it('should return paginated results', async () => {
      mockPrisma.emergencyCase.findMany.mockResolvedValue([
        createMockEmergencyCase({ referenceNumber: 'EC-001', caseType: 'EVACUATION', description: null, resolvedAt: null }),
        createMockEmergencyCase({ id: 'ec-2', referenceNumber: 'EC-002', caseType: 'MEDICAL', description: null, resolvedAt: null }),
      ]);
      mockPrisma.emergencyCase.count.mockResolvedValue(2);

      const result = await service.findAll(1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });

    it('should default to page 1 and limit 10', async () => {
      mockPrisma.emergencyCase.findMany.mockResolvedValue([]);
      mockPrisma.emergencyCase.count.mockResolvedValue(0);

      await service.findAll();

      expect(mockPrisma.emergencyCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 })
      );
    });
  });

  describe('findById', () => {
    it('should return case by id', async () => {
      mockPrisma.emergencyCase.findUnique.mockResolvedValue(
        createMockEmergencyCase({ referenceNumber: 'EC-001', caseType: 'EVACUATION', description: null, resolvedAt: null })
      );

      const result = await service.findById('ec-1');

      expect(result.id).toBe('ec-1');
    });

    it('should throw NotFoundError for nonexistent case', async () => {
      mockPrisma.emergencyCase.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent'))
        .rejects.toThrow(NotFoundError);
    });
  });
  describe('updateStatus', () => {
    it('should update status successfully', async () => {
      const mockCase = createMockEmergencyCase({
        referenceNumber: 'EC-001', caseType: 'EVACUATION',
        description: null, resolvedAt: null, status: 'OPEN',
      });
      mockPrisma.emergencyCase.findUnique.mockResolvedValue(mockCase);
      mockPrisma.emergencyCase.update.mockResolvedValue({ ...mockCase, status: 'IN_PROGRESS' });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.updateStatus('ec-1', 'IN_PROGRESS', 'user-1');

      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should set resolvedAt when status is RESOLVED', async () => {
      const mockCase = createMockEmergencyCase({
        referenceNumber: 'EC-001', caseType: 'EVACUATION',
        description: null, resolvedAt: null, status: 'IN_PROGRESS',
      });
      mockPrisma.emergencyCase.findUnique.mockResolvedValue(mockCase);
      mockPrisma.emergencyCase.update.mockResolvedValue({
        ...mockCase, status: 'RESOLVED', resolvedAt: new Date(),
      });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.updateStatus('ec-1', 'RESOLVED', 'user-1');

      expect(result.status).toBe('RESOLVED');
      expect(mockPrisma.emergencyCase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
        })
      );
    });

    it('should create audit log on status update', async () => {
      const mockCase = createMockEmergencyCase({
        referenceNumber: 'EC-001', caseType: 'EVACUATION',
        description: null, resolvedAt: null, status: 'OPEN',
      });
      mockPrisma.emergencyCase.findUnique.mockResolvedValue(mockCase);
      mockPrisma.emergencyCase.update.mockResolvedValue({ ...mockCase, status: 'RESOLVED' });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.updateStatus('ec-1', 'RESOLVED', 'user-1');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'UPDATE', entity: 'EmergencyCase', entityId: 'ec-1' }),
      });
    });

    it('should throw NotFoundError for nonexistent case', async () => {
      mockPrisma.emergencyCase.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus('nonexistent', 'RESOLVED', 'user-1'))
        .rejects.toThrow(NotFoundError);
    });
  });
  describe('getEvacuationList', () => {
    it('should return cases sorted by urgency CRITICAL first', async () => {
      const low = createMockEmergencyCase({
        id: 'ec-low', referenceNumber: 'EC-LOW', caseType: 'EVACUATION',
        description: null, resolvedAt: null, urgency: 'LOW', status: 'OPEN',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      const critical = createMockEmergencyCase({
        id: 'ec-crit', referenceNumber: 'EC-CRIT', caseType: 'EVACUATION',
        description: null, resolvedAt: null, urgency: 'CRITICAL', status: 'OPEN',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      const high = createMockEmergencyCase({
        id: 'ec-high', referenceNumber: 'EC-HIGH', caseType: 'EVACUATION',
        description: null, resolvedAt: null, urgency: 'HIGH', status: 'OPEN',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });

      mockPrisma.emergencyCase.findMany.mockResolvedValue([low, critical, high]);

      const result = await service.getEvacuationList('embassy-1');

      expect(result[0].urgency).toBe('CRITICAL');
      expect(result[1].urgency).toBe('HIGH');
      expect(result[2].urgency).toBe('LOW');
    });

    it('should sort by createdAt within same urgency', async () => {
      const older = createMockEmergencyCase({
        id: 'ec-1', referenceNumber: 'EC-1', caseType: 'EVACUATION',
        description: null, resolvedAt: null, urgency: 'HIGH', status: 'OPEN',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      const newer = createMockEmergencyCase({
        id: 'ec-2', referenceNumber: 'EC-2', caseType: 'EVACUATION',
        description: null, resolvedAt: null, urgency: 'HIGH', status: 'OPEN',
        createdAt: new Date('2026-01-02T00:00:00Z'),
      });

      mockPrisma.emergencyCase.findMany.mockResolvedValue([newer, older]);

      const result = await service.getEvacuationList('embassy-1');

      expect(result[0].createdAt.getTime()).toBeLessThanOrEqual(result[1].createdAt.getTime());
    });

    it('should only return OPEN and IN_PROGRESS cases', async () => {
      mockPrisma.emergencyCase.findMany.mockResolvedValue([]);

      await service.getEvacuationList('embassy-1');

      expect(mockPrisma.emergencyCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            embassyId: 'embassy-1',
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          }),
        })
      );
    });
  });

  describe('broadcastAlert', () => {
    it('should create audit log entry', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.broadcastAlert(
        { message: 'Evacuation alert', embassyId: 'embassy-1', urgency: 'CRITICAL' },
        'user-1'
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'BROADCAST', entity: 'Alert' }),
      });
    });
  });
});
