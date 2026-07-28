"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const diplomatic_service_1 = require("../../services/diplomatic.service");
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
const exceptions_1 = require("../../exceptions");
jest.mock('../../utils/jwt.utilities', () => ({
    signAccessToken: jest.fn(() => 'mock-access-token'),
    signRefreshToken: jest.fn(() => 'mock-refresh-token'),
    verifyAccessToken: jest.fn(() => ({ userId: 'user-1', email: 'test@test.com' })),
    verifyRefreshToken: jest.fn(() => ({ userId: 'user-1' })),
}));
describe('DiplomaticService', () => {
    let service;
    beforeEach(() => {
        jest.clearAllMocks();
        service = new diplomatic_service_1.DiplomaticService(mock_db_1.mockPrisma);
    });
    describe('createPouch', () => {
        const createDto = {
            originEmbassyId: 'embassy-1',
            destinationEmbassyId: 'embassy-2',
            dispatchDate: '2026-06-15',
        };
        it('should create pouch with DP reference number', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValueOnce((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValueOnce((0, factories_1.createMockEmbassy)({ id: 'embassy-2', name: 'Dest Embassy', code: 'DEST' }));
            mock_db_1.mockPrisma.diplomaticPouch.create.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ pouchNumber: 'DP-TEST', dispatchDate: new Date('2026-06-15') }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.createPouch(createDto, 'user-1');
            expect(result.pouchNumber).toMatch(/^DP-/);
            expect(result.originEmbassyId).toBe('embassy-1');
            expect(result.destinationEmbassyId).toBe('embassy-2');
        });
        it('should throw NotFoundError if origin embassy does not exist', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue(null);
            await expect(service.createPouch(createDto, 'user-1'))
                .rejects.toThrow(exceptions_1.NotFoundError);
        });
        it('should throw NotFoundError if destination embassy does not exist', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValueOnce((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValueOnce(null);
            await expect(service.createPouch(createDto, 'user-1'))
                .rejects.toThrow(exceptions_1.NotFoundError);
        });
        it('should create audit log', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValueOnce((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValueOnce((0, factories_1.createMockEmbassy)({ id: 'embassy-2', name: 'Dest Embassy', code: 'DEST' }));
            mock_db_1.mockPrisma.diplomaticPouch.create.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ pouchNumber: 'DP-TEST', dispatchDate: new Date('2026-06-15') }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            await service.createPouch(createDto, 'user-1');
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    action: 'CREATE',
                    entity: 'DiplomaticPouch',
                }),
            });
        });
    });
    describe('findPouches', () => {
        it('should return paginated pouches', async () => {
            mock_db_1.mockPrisma.diplomaticPouch.findMany.mockResolvedValue([
                (0, factories_1.createMockDiplomaticPouch)({ pouchNumber: 'DP-001' }),
                (0, factories_1.createMockDiplomaticPouch)({ id: 'dp-2', pouchNumber: 'DP-002' }),
            ]);
            mock_db_1.mockPrisma.diplomaticPouch.count.mockResolvedValue(2);
            const result = await service.findPouches(1, 10);
            expect(result.data).toHaveLength(2);
            expect(result.meta.total).toBe(2);
        });
    });
    describe('findPouchById', () => {
        it('should return pouch by id', async () => {
            mock_db_1.mockPrisma.diplomaticPouch.findUnique.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ pouchNumber: 'DP-001' }));
            const result = await service.findPouchById('dp-1');
            expect(result.id).toBe('dp-1');
        });
        it('should throw NotFoundError for nonexistent pouch', async () => {
            mock_db_1.mockPrisma.diplomaticPouch.findUnique.mockResolvedValue(null);
            await expect(service.findPouchById('nonexistent'))
                .rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
    describe('handoffPouch', () => {
        const handoffDto = {
            handoffData: { handedOverBy: 'Officer A', handedOverTo: 'Officer B', notes: 'Transfer' },
            newStatus: 'IN_TRANSIT',
        };
        it('should handoff CREATED to IN_TRANSIT', async () => {
            mock_db_1.mockPrisma.diplomaticPouch.findUnique.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ id: 'dp-1', pouchNumber: 'DP-001', status: 'CREATED', chainOfCustody: [] }));
            mock_db_1.mockPrisma.diplomaticPouch.update.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ id: 'dp-1', pouchNumber: 'DP-001', status: 'IN_TRANSIT' }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.handoffPouch('dp-1', handoffDto, 'user-1');
            expect(result.status).toBe('IN_TRANSIT');
        });
        it('should handoff IN_TRANSIT to RECEIVED', async () => {
            const recvDto = { handoffData: { handedOverBy: 'Officer B', handedOverTo: 'Officer C', notes: 'Received' }, newStatus: 'RECEIVED' };
            mock_db_1.mockPrisma.diplomaticPouch.findUnique.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ id: 'dp-1', pouchNumber: 'DP-001', status: 'IN_TRANSIT', chainOfCustody: [] }));
            mock_db_1.mockPrisma.diplomaticPouch.update.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ id: 'dp-1', pouchNumber: 'DP-001', status: 'RECEIVED', receivedDate: new Date() }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.handoffPouch('dp-1', recvDto, 'user-1');
            expect(result.status).toBe('RECEIVED');
        });
        it('should handoff RECEIVED to CLOSED', async () => {
            const closeDto = { handoffData: { handedOverBy: 'Officer C', handedOverTo: 'Admin', notes: 'Closed' }, newStatus: 'CLOSED' };
            mock_db_1.mockPrisma.diplomaticPouch.findUnique.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ id: 'dp-1', pouchNumber: 'DP-001', status: 'RECEIVED', chainOfCustody: [] }));
            mock_db_1.mockPrisma.diplomaticPouch.update.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ id: 'dp-1', pouchNumber: 'DP-001', status: 'CLOSED' }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.handoffPouch('dp-1', closeDto, 'user-1');
            expect(result.status).toBe('CLOSED');
        });
        it('should reject CREATED to CLOSED', async () => {
            const badDto = { handoffData: { handedOverBy: 'Officer A', handedOverTo: 'Admin', notes: 'Skip' }, newStatus: 'CLOSED' };
            mock_db_1.mockPrisma.diplomaticPouch.findUnique.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ id: 'dp-1', pouchNumber: 'DP-001', status: 'CREATED', chainOfCustody: [] }));
            await expect(service.handoffPouch('dp-1', badDto, 'user-1'))
                .rejects.toThrow(exceptions_1.ValidationError);
        });
        it('should reject transitions from terminal CLOSED status', async () => {
            const badDto = { handoffData: { handedOverBy: 'Admin', handedOverTo: 'Officer', notes: 'Reopen' }, newStatus: 'IN_TRANSIT' };
            mock_db_1.mockPrisma.diplomaticPouch.findUnique.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ id: 'dp-1', pouchNumber: 'DP-001', status: 'CLOSED', chainOfCustody: [] }));
            await expect(service.handoffPouch('dp-1', badDto, 'user-1'))
                .rejects.toThrow(exceptions_1.ValidationError);
        });
        it('should reject transitions from LOST status', async () => {
            const badDto = { handoffData: { handedOverBy: 'Officer', handedOverTo: 'Admin', notes: 'Found' }, newStatus: 'CLOSED' };
            mock_db_1.mockPrisma.diplomaticPouch.findUnique.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ id: 'dp-1', pouchNumber: 'DP-001', status: 'LOST', chainOfCustody: [] }));
            await expect(service.handoffPouch('dp-1', badDto, 'user-1'))
                .rejects.toThrow(exceptions_1.ValidationError);
        });
        it('should append to chain of custody', async () => {
            const existingCustody = [{ handedOverBy: 'Initial', handedOverTo: 'Next', notes: 'Start', timestamp: '2026-01-01T00:00:00.000Z' }];
            mock_db_1.mockPrisma.diplomaticPouch.findUnique.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ id: 'dp-1', pouchNumber: 'DP-001', status: 'CREATED', chainOfCustody: existingCustody }));
            mock_db_1.mockPrisma.diplomaticPouch.update.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ id: 'dp-1', pouchNumber: 'DP-001', status: 'IN_TRANSIT' }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            await service.handoffPouch('dp-1', handoffDto, 'user-1');
            expect(mock_db_1.mockPrisma.diplomaticPouch.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    chainOfCustody: expect.arrayContaining([expect.objectContaining({ handedOverBy: 'Initial' })]),
                }),
            }));
        });
        it('should set receivedDate when status is RECEIVED', async () => {
            const recvDto = { handoffData: { handedOverBy: 'Officer B', handedOverTo: 'Officer C', notes: 'Received' }, newStatus: 'RECEIVED' };
            mock_db_1.mockPrisma.diplomaticPouch.findUnique.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ id: 'dp-1', pouchNumber: 'DP-001', status: 'IN_TRANSIT', chainOfCustody: [] }));
            mock_db_1.mockPrisma.diplomaticPouch.update.mockResolvedValue((0, factories_1.createMockDiplomaticPouch)({ id: 'dp-1', pouchNumber: 'DP-001', status: 'RECEIVED', receivedDate: new Date() }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            await service.handoffPouch('dp-1', recvDto, 'user-1');
            expect(mock_db_1.mockPrisma.diplomaticPouch.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ receivedDate: expect.any(Date) }),
            }));
        });
        it('should throw NotFoundError for nonexistent pouch', async () => {
            mock_db_1.mockPrisma.diplomaticPouch.findUnique.mockResolvedValue(null);
            await expect(service.handoffPouch('nonexistent', handoffDto, 'user-1'))
                .rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
    describe('createClearance', () => {
        const clearanceDto = { userId: 'user-2', clearanceLevel: 'LEVEL_3', expiresAt: '2027-01-01' };
        it('should create clearance successfully', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ userid: 'user-2' }));
            mock_db_1.mockPrisma.staffClearance.findUnique.mockResolvedValue(null);
            mock_db_1.mockPrisma.staffClearance.create.mockResolvedValue({
                id: 'clr-1', userId: 'user-2', clearanceLevel: 'LEVEL_3',
                issuedBy: 'user-1', issuedAt: new Date(), expiresAt: new Date('2027-01-01'),
                isActive: true, createdAt: new Date(), Updated: new Date(),
            });
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.createClearance(clearanceDto, 'user-1');
            expect(result.userId).toBe('user-2');
            expect(result.clearanceLevel).toBe('LEVEL_3');
        });
        it('should throw NotFoundError if user does not exist', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(null);
            await expect(service.createClearance(clearanceDto, 'user-1'))
                .rejects.toThrow(exceptions_1.NotFoundError);
        });
        it('should throw ConflictError for duplicate clearance', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ userid: 'user-2' }));
            mock_db_1.mockPrisma.staffClearance.findUnique.mockResolvedValue({ id: 'existing' });
            await expect(service.createClearance(clearanceDto, 'user-1'))
                .rejects.toThrow(exceptions_1.ConflictError);
        });
        it('should create audit log', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ userid: 'user-2' }));
            mock_db_1.mockPrisma.staffClearance.findUnique.mockResolvedValue(null);
            mock_db_1.mockPrisma.staffClearance.create.mockResolvedValue({
                id: 'clr-1', userId: 'user-2', clearanceLevel: 'LEVEL_3',
                issuedBy: 'user-1', issuedAt: new Date(), expiresAt: null,
                isActive: true, createdAt: new Date(), Updated: new Date(),
            });
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            await service.createClearance(clearanceDto, 'user-1');
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ action: 'CREATE', entity: 'StaffClearance' }),
            });
        });
    });
    describe('findClearances', () => {
        it('should return paginated clearances', async () => {
            mock_db_1.mockPrisma.staffClearance.findMany.mockResolvedValue([
                { id: 'clr-1', userId: 'user-2', clearanceLevel: 'LEVEL_3', issuedBy: 'user-1', issuedAt: new Date(), expiresAt: null, isActive: true, createdAt: new Date(), Updated: new Date() },
            ]);
            mock_db_1.mockPrisma.staffClearance.count.mockResolvedValue(1);
            const result = await service.findClearances(1, 10);
            expect(result.data).toHaveLength(1);
            expect(result.meta.total).toBe(1);
        });
    });
    describe('findClearanceById', () => {
        it('should return clearance by id', async () => {
            const clearance = { id: 'clr-1', userId: 'user-2', clearanceLevel: 'LEVEL_3', issuedBy: 'user-1', issuedAt: new Date(), expiresAt: null, isActive: true, createdAt: new Date(), Updated: new Date() };
            mock_db_1.mockPrisma.staffClearance.findUnique.mockResolvedValue(clearance);
            const result = await service.findClearanceById('clr-1');
            expect(result.id).toBe('clr-1');
        });
        it('should throw NotFoundError for nonexistent clearance', async () => {
            mock_db_1.mockPrisma.staffClearance.findUnique.mockResolvedValue(null);
            await expect(service.findClearanceById('nonexistent'))
                .rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
    describe('updateClearance', () => {
        it('should update clearance level', async () => {
            const existing = { id: 'clr-1', userId: 'user-2', clearanceLevel: 'LEVEL_2', issuedBy: 'user-1', issuedAt: new Date(), expiresAt: null, isActive: true, createdAt: new Date(), Updated: new Date() };
            const updated = { ...existing, clearanceLevel: 'LEVEL_4' };
            mock_db_1.mockPrisma.staffClearance.findUnique.mockResolvedValue(existing);
            mock_db_1.mockPrisma.staffClearance.update.mockResolvedValue(updated);
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.updateClearance('clr-1', { clearanceLevel: 'LEVEL_4' }, 'user-1');
            expect(result.clearanceLevel).toBe('LEVEL_4');
        });
        it('should update isActive flag', async () => {
            const existing = { id: 'clr-1', userId: 'user-2', clearanceLevel: 'LEVEL_3', issuedBy: 'user-1', issuedAt: new Date(), expiresAt: null, isActive: true, createdAt: new Date(), Updated: new Date() };
            const updated = { ...existing, isActive: false };
            mock_db_1.mockPrisma.staffClearance.findUnique.mockResolvedValue(existing);
            mock_db_1.mockPrisma.staffClearance.update.mockResolvedValue(updated);
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.updateClearance('clr-1', { isActive: false }, 'user-1');
            expect(result.isActive).toBe(false);
        });
        it('should create audit log', async () => {
            const existing = { id: 'clr-1', userId: 'user-2', clearanceLevel: 'LEVEL_3', issuedBy: 'user-1', issuedAt: new Date(), expiresAt: null, isActive: true, createdAt: new Date(), Updated: new Date() };
            mock_db_1.mockPrisma.staffClearance.findUnique.mockResolvedValue(existing);
            mock_db_1.mockPrisma.staffClearance.update.mockResolvedValue(existing);
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            await service.updateClearance('clr-1', { clearanceLevel: 'LEVEL_4' }, 'user-1');
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ action: 'UPDATE', entity: 'StaffClearance' }),
            });
        });
        it('should throw NotFoundError for nonexistent clearance', async () => {
            mock_db_1.mockPrisma.staffClearance.findUnique.mockResolvedValue(null);
            await expect(service.updateClearance('nonexistent', { clearanceLevel: 'LEVEL_4' }, 'user-1'))
                .rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
});
