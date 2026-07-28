import { AuditService } from '../services/audit.service';

const mockPrisma = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock('../config/db.config', () => ({
  prisma: mockPrisma,
}));

describe('AuditService', () => {
  let auditService: AuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    auditService = new AuditService(mockPrisma as any);
  });

  describe('log', () => {
    it('should create audit log entry', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await auditService.log({
        userId: 'user-1',
        action: 'CREATE',
        entity: 'User',
        entityId: 'user-1',
        description: 'CREATE User',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'CREATE',
          entity: 'User',
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { id: 'log-1', action: 'CREATE', entity: 'User' },
      ]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await auditService.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by entity type', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await auditService.findAll({ entity: 'User' });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entity: 'User' }),
        })
      );
    });

    it('should filter by date range', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      await auditService.findAll({ startDate, endDate });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: startDate, lte: endDate },
          }),
        })
      );
    });
  });

  describe('findById', () => {
    it('should return audit log by id', async () => {
      mockPrisma.auditLog.findUnique.mockResolvedValue({
        id: 'log-1',
        action: 'CREATE',
        entity: 'User',
      });

      const result = await auditService.findById('log-1');

      expect(result.id).toBe('log-1');
    });

    it('should throw NotFoundError for missing log', async () => {
      mockPrisma.auditLog.findUnique.mockResolvedValue(null);

      await expect(auditService.findById('nonexistent'))
        .rejects.toThrow('Audit log not found');
    });
  });

  describe('exportLogs', () => {
    it('should export all matching logs without pagination', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { id: 'log-1', action: 'CREATE' },
        { id: 'log-2', action: 'UPDATE' },
      ]);

      const result = await auditService.exportLogs({ entity: 'User' });

      expect(result).toHaveLength(2);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({ skip: expect.any(Number), take: expect.any(Number) })
      );
    });
  });

  describe('purgeOldLogs', () => {
    it('should delete logs older than default 7-year retention', async () => {
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 5 });

      const deleted = await auditService.purgeOldLogs();

      expect(deleted).toBe(5);
      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ createdAt: expect.objectContaining({ lt: expect.any(Date) }) }),
        })
      );
    });

    it('should honor custom retention days', async () => {
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 0 });

      await auditService.purgeOldLogs(90);

      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalled();
    });
  });
});