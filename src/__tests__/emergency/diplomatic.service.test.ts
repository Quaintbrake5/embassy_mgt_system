import { DiplomaticService } from '../../services/diplomatic.service';
import { mockPrisma } from '../helpers/mock-db';
import { createMockDiplomaticPouch, createMockEmbassy, createMockUser } from '../helpers/factories';
import { NotFoundError, ConflictError, ValidationError } from '../../exceptions';

jest.mock('../../utils/jwt.utilities', () => ({
  signAccessToken: jest.fn(() => 'mock-access-token'),
  signRefreshToken: jest.fn(() => 'mock-refresh-token'),
  verifyAccessToken: jest.fn(() => ({ userId: 'user-1', email: 'test@test.com' })),
  verifyRefreshToken: jest.fn(() => ({ userId: 'user-1' })),
}));
describe('DiplomaticService', () => {
  let service: DiplomaticService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DiplomaticService(mockPrisma as any);
  });

  describe('createPouch', () => {
    const createDto = {
      originEmbassyId: 'embassy-1',
      destinationEmbassyId: 'embassy-2',
      dispatchDate: '2026-06-15',
    };

    it('should create pouch with DP reference number', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValueOnce(createMockEmbassy());
      mockPrisma.embassy.findUnique.mockResolvedValueOnce(
        createMockEmbassy({ id: 'embassy-2', name: 'Dest Embassy', code: 'DEST' })
      );
      mockPrisma.diplomaticPouch.create.mockResolvedValue(
        createMockDiplomaticPouch({ pouchNumber: 'DP-TEST', dispatchDate: new Date('2026-06-15') })
      );
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.createPouch(createDto, 'user-1');

      expect(result.pouchNumber).toMatch(/^DP-/);
      expect(result.originEmbassyId).toBe('embassy-1');
      expect(result.destinationEmbassyId).toBe('embassy-2');
    });

    it('should throw NotFoundError if origin embassy does not exist', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValue(null);

      await expect(service.createPouch(createDto, 'user-1'))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if destination embassy does not exist', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValueOnce(createMockEmbassy());
      mockPrisma.embassy.findUnique.mockResolvedValueOnce(null);

      await expect(service.createPouch(createDto, 'user-1'))
        .rejects.toThrow(NotFoundError);
    });

    it('should create audit log', async () => {
      mockPrisma.embassy.findUnique.mockResolvedValueOnce(createMockEmbassy());
      mockPrisma.embassy.findUnique.mockResolvedValueOnce(
        createMockEmbassy({ id: 'embassy-2', name: 'Dest Embassy', code: 'DEST' })
      );
      mockPrisma.diplomaticPouch.create.mockResolvedValue(
        createMockDiplomaticPouch({ pouchNumber: 'DP-TEST', dispatchDate: new Date('2026-06-15') })
      );
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.createPouch(createDto, 'user-1');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'CREATE',
          entity: 'DiplomaticPouch',
        }),
      });
    });
  });
  describe('findPouches', () => {
    it('should return paginated pouches', async () => {
      mockPrisma.diplomaticPouch.findMany.mockResolvedValue([
        createMockDiplomaticPouch({ pouchNumber: 'DP-001' }),
        createMockDiplomaticPouch({ id: 'dp-2', pouchNumber: 'DP-002' }),
      ]);
      mockPrisma.diplomaticPouch.count.mockResolvedValue(2);

      const result = await service.findPouches(1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('findPouchById', () => {
    it('should return pouch by id', async () => {
      mockPrisma.diplomaticPouch.findUnique.mockResolvedValue(
        createMockDiplomaticPouch({ pouchNumber: 'DP-001' })
      );

      const result = await service.findPouchById('dp-1');

      expect(result.id).toBe('dp-1');
    });

    it('should throw NotFoundError for nonexistent pouch', async () => {
      mockPrisma.diplomaticPouch.findUnique.mockResolvedValue(null);

      await expect(service.findPouchById('nonexistent'))
        .rejects.toThrow(NotFoundError);
    });
  });
  describe('handoffPouch', () => {
    const handoffDto = {
      handoffData: { handedOverBy: 'Officer A', handedOverTo: 'Officer B', notes: 'Transfer' },
      newStatus: 'IN_TRANSIT',
    };

    it('should handoff CREATED to IN_TRANSIT', async () => {
      mockPrisma.diplomaticPouch.findUnique.mockResolvedValue(
        createMockDiplomaticPouch({ id: 'dp-1', pouchNumber: 'DP-001', status: 'CREATED', chainOfCustody: [] })
      );
      mockPrisma.diplomaticPouch.update.mockResolvedValue(
        createMockDiplomaticPouch({ id: 'dp-1', pouchNumber: 'DP-001', status: 'IN_TRANSIT' })
      );
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.handoffPouch('dp-1', handoffDto, 'user-1');

      expect(result.status).toBe('IN_TRANSIT');
    });

    it('should handoff IN_TRANSIT to RECEIVED', async () => {
      const recvDto = { handoffData: { handedOverBy: 'Officer B', handedOverTo: 'Officer C', notes: 'Received' }, newStatus: 'RECEIVED' };
      mockPrisma.diplomaticPouch.findUnique.mockResolvedValue(
        createMockDiplomaticPouch({ id: 'dp-1', pouchNumber: 'DP-001', status: 'IN_TRANSIT', chainOfCustody: [] })
      );
      mockPrisma.diplomaticPouch.update.mockResolvedValue(
        createMockDiplomaticPouch({ id: 'dp-1', pouchNumber: 'DP-001', status: 'RECEIVED', receivedDate: new Date() })
      );
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.handoffPouch('dp-1', recvDto, 'user-1');

      expect(result.status).toBe('RECEIVED');
    });

    it('should handoff RECEIVED to CLOSED', async () => {
      const closeDto = { handoffData: { handedOverBy: 'Officer C', handedOverTo: 'Admin', notes: 'Closed' }, newStatus: 'CLOSED' };
      mockPrisma.diplomaticPouch.findUnique.mockResolvedValue(
        createMockDiplomaticPouch({ id: 'dp-1', pouchNumber: 'DP-001', status: 'RECEIVED', chainOfCustody: [] })
      );
      mockPrisma.diplomaticPouch.update.mockResolvedValue(
        createMockDiplomaticPouch({ id: 'dp-1', pouchNumber: 'DP-001', status: 'CLOSED' })
      );
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.handoffPouch('dp-1', closeDto, 'user-1');

      expect(result.status).toBe('CLOSED');
    });

    it('should reject CREATED to CLOSED', async () => {
      const badDto = { handoffData: { handedOverBy: 'Officer A', handedOverTo: 'Admin', notes: 'Skip' }, newStatus: 'CLOSED' };
      mockPrisma.diplomaticPouch.findUnique.mockResolvedValue(
        createMockDiplomaticPouch({ id: 'dp-1', pouchNumber: 'DP-001', status: 'CREATED', chainOfCustody: [] })
      );

      await expect(service.handoffPouch('dp-1', badDto, 'user-1'))
        .rejects.toThrow(ValidationError);
    });

    it('should reject transitions from terminal CLOSED status', async () => {
      const badDto = { handoffData: { handedOverBy: 'Admin', handedOverTo: 'Officer', notes: 'Reopen' }, newStatus: 'IN_TRANSIT' };
      mockPrisma.diplomaticPouch.findUnique.mockResolvedValue(
        createMockDiplomaticPouch({ id: 'dp-1', pouchNumber: 'DP-001', status: 'CLOSED', chainOfCustody: [] })
      );

      await expect(service.handoffPouch('dp-1', badDto, 'user-1'))
        .rejects.toThrow(ValidationError);
    });

    it('should reject transitions from LOST status', async () => {
      const badDto = { handoffData: { handedOverBy: 'Officer', handedOverTo: 'Admin', notes: 'Found' }, newStatus: 'CLOSED' };
      mockPrisma.diplomaticPouch.findUnique.mockResolvedValue(
        createMockDiplomaticPouch({ id: 'dp-1', pouchNumber: 'DP-001', status: 'LOST', chainOfCustody: [] })
      );

      await expect(service.handoffPouch('dp-1', badDto, 'user-1'))
        .rejects.toThrow(ValidationError);
    });

    it('should append to chain of custody', async () => {
      const existingCustody = [{ handedOverBy: 'Initial', handedOverTo: 'Next', notes: 'Start', timestamp: '2026-01-01T00:00:00.000Z' }];
      mockPrisma.diplomaticPouch.findUnique.mockResolvedValue(
        createMockDiplomaticPouch({ id: 'dp-1', pouchNumber: 'DP-001', status: 'CREATED', chainOfCustody: existingCustody })
      );
      mockPrisma.diplomaticPouch.update.mockResolvedValue(
        createMockDiplomaticPouch({ id: 'dp-1', pouchNumber: 'DP-001', status: 'IN_TRANSIT' })
      );
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.handoffPouch('dp-1', handoffDto, 'user-1');

      expect(mockPrisma.diplomaticPouch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            chainOfCustody: expect.arrayContaining([expect.objectContaining({ handedOverBy: 'Initial' })]),
          }),
        })
      );
    });

    it('should set receivedDate when status is RECEIVED', async () => {
      const recvDto = { handoffData: { handedOverBy: 'Officer B', handedOverTo: 'Officer C', notes: 'Received' }, newStatus: 'RECEIVED' };
      mockPrisma.diplomaticPouch.findUnique.mockResolvedValue(
        createMockDiplomaticPouch({ id: 'dp-1', pouchNumber: 'DP-001', status: 'IN_TRANSIT', chainOfCustody: [] })
      );
      mockPrisma.diplomaticPouch.update.mockResolvedValue(
        createMockDiplomaticPouch({ id: 'dp-1', pouchNumber: 'DP-001', status: 'RECEIVED', receivedDate: new Date() })
      );
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.handoffPouch('dp-1', recvDto, 'user-1');

      expect(mockPrisma.diplomaticPouch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ receivedDate: expect.any(Date) }),
        })
      );
    });

    it('should throw NotFoundError for nonexistent pouch', async () => {
      mockPrisma.diplomaticPouch.findUnique.mockResolvedValue(null);

      await expect(service.handoffPouch('nonexistent', handoffDto, 'user-1'))
        .rejects.toThrow(NotFoundError);
    });
  });
  describe('createClearance', () => {
    const clearanceDto = { userId: 'user-2', clearanceLevel: 'LEVEL_3', expiresAt: '2027-01-01' };

    it('should create clearance successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ userid: 'user-2' }));
      mockPrisma.staffClearance.findUnique.mockResolvedValue(null);
      mockPrisma.staffClearance.create.mockResolvedValue({
        id: 'clr-1', userId: 'user-2', clearanceLevel: 'LEVEL_3',
        issuedBy: 'user-1', issuedAt: new Date(), expiresAt: new Date('2027-01-01'),
        isActive: true, createdAt: new Date(), Updated: new Date(),
      });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.createClearance(clearanceDto, 'user-1');

      expect(result.userId).toBe('user-2');
      expect(result.clearanceLevel).toBe('LEVEL_3');
    });

    it('should throw NotFoundError if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.createClearance(clearanceDto, 'user-1'))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError for duplicate clearance', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ userid: 'user-2' }));
      mockPrisma.staffClearance.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.createClearance(clearanceDto, 'user-1'))
        .rejects.toThrow(ConflictError);
    });

    it('should create audit log', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ userid: 'user-2' }));
      mockPrisma.staffClearance.findUnique.mockResolvedValue(null);
      mockPrisma.staffClearance.create.mockResolvedValue({
        id: 'clr-1', userId: 'user-2', clearanceLevel: 'LEVEL_3',
        issuedBy: 'user-1', issuedAt: new Date(), expiresAt: null,
        isActive: true, createdAt: new Date(), Updated: new Date(),
      });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.createClearance(clearanceDto, 'user-1');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'CREATE', entity: 'StaffClearance' }),
      });
    });
  });
  describe('findClearances', () => {
    it('should return paginated clearances', async () => {
      mockPrisma.staffClearance.findMany.mockResolvedValue([
        { id: 'clr-1', userId: 'user-2', clearanceLevel: 'LEVEL_3', issuedBy: 'user-1', issuedAt: new Date(), expiresAt: null, isActive: true, createdAt: new Date(), Updated: new Date() },
      ]);
      mockPrisma.staffClearance.count.mockResolvedValue(1);

      const result = await service.findClearances(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findClearanceById', () => {
    it('should return clearance by id', async () => {
      const clearance = { id: 'clr-1', userId: 'user-2', clearanceLevel: 'LEVEL_3', issuedBy: 'user-1', issuedAt: new Date(), expiresAt: null, isActive: true, createdAt: new Date(), Updated: new Date() };
      mockPrisma.staffClearance.findUnique.mockResolvedValue(clearance);

      const result = await service.findClearanceById('clr-1');

      expect(result.id).toBe('clr-1');
    });

    it('should throw NotFoundError for nonexistent clearance', async () => {
      mockPrisma.staffClearance.findUnique.mockResolvedValue(null);

      await expect(service.findClearanceById('nonexistent'))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('updateClearance', () => {
    it('should update clearance level', async () => {
      const existing = { id: 'clr-1', userId: 'user-2', clearanceLevel: 'LEVEL_2', issuedBy: 'user-1', issuedAt: new Date(), expiresAt: null, isActive: true, createdAt: new Date(), Updated: new Date() };
      const updated = { ...existing, clearanceLevel: 'LEVEL_4' };
      mockPrisma.staffClearance.findUnique.mockResolvedValue(existing);
      mockPrisma.staffClearance.update.mockResolvedValue(updated);
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.updateClearance('clr-1', { clearanceLevel: 'LEVEL_4' }, 'user-1');

      expect(result.clearanceLevel).toBe('LEVEL_4');
    });

    it('should update isActive flag', async () => {
      const existing = { id: 'clr-1', userId: 'user-2', clearanceLevel: 'LEVEL_3', issuedBy: 'user-1', issuedAt: new Date(), expiresAt: null, isActive: true, createdAt: new Date(), Updated: new Date() };
      const updated = { ...existing, isActive: false };
      mockPrisma.staffClearance.findUnique.mockResolvedValue(existing);
      mockPrisma.staffClearance.update.mockResolvedValue(updated);
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.updateClearance('clr-1', { isActive: false }, 'user-1');

      expect(result.isActive).toBe(false);
    });

    it('should create audit log', async () => {
      const existing = { id: 'clr-1', userId: 'user-2', clearanceLevel: 'LEVEL_3', issuedBy: 'user-1', issuedAt: new Date(), expiresAt: null, isActive: true, createdAt: new Date(), Updated: new Date() };
      mockPrisma.staffClearance.findUnique.mockResolvedValue(existing);
      mockPrisma.staffClearance.update.mockResolvedValue(existing);
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.updateClearance('clr-1', { clearanceLevel: 'LEVEL_4' }, 'user-1');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'UPDATE', entity: 'StaffClearance' }),
      });
    });

    it('should throw NotFoundError for nonexistent clearance', async () => {
      mockPrisma.staffClearance.findUnique.mockResolvedValue(null);

      await expect(service.updateClearance('nonexistent', { clearanceLevel: 'LEVEL_4' }, 'user-1'))
        .rejects.toThrow(NotFoundError);
    });
  });
});
