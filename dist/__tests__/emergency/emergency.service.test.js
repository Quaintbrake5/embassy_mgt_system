"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emergency_service_1 = require("../../services/emergency.service");
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
const exceptions_1 = require("../../exceptions");
jest.mock('../../utils/jwt.utilities', () => ({
    signAccessToken: jest.fn(() => 'mock-access-token'),
    signRefreshToken: jest.fn(() => 'mock-refresh-token'),
    verifyAccessToken: jest.fn(() => ({ userId: 'user-1', email: 'test@test.com' })),
    verifyRefreshToken: jest.fn(() => ({ userId: 'user-1' })),
}));
describe('EmergencyService', () => {
    let service;
    beforeEach(() => {
        jest.clearAllMocks();
        service = new emergency_service_1.EmergencyService(mock_db_1.mockPrisma);
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
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.emergencyCase.create.mockResolvedValue((0, factories_1.createMockEmergencyCase)({
                referenceNumber: 'EC-TEST',
                caseType: 'EVACUATION',
                description: 'Evacuation needed | Zone A',
                urgency: 'HIGH',
                status: 'OPEN',
                embassyId: 'embassy-1',
                resolvedAt: null,
            }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.createCase(createDto, 'user-1');
            expect(result.referenceNumber).toMatch(/^EC-/);
            expect(result.caseType).toBe('EVACUATION');
            expect(result.status).toBe('OPEN');
        });
        it('should combine description and location with pipe', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.emergencyCase.create.mockResolvedValue((0, factories_1.createMockEmergencyCase)({
                referenceNumber: 'EC-TEST',
                caseType: 'EVACUATION',
                description: 'Test | Location',
                urgency: 'HIGH',
                status: 'OPEN',
                embassyId: 'embassy-1',
                resolvedAt: null,
            }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.createCase(createDto, 'user-1');
            expect(result.description).toContain(' | ');
        });
        it('should throw NotFoundError if embassy does not exist', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue(null);
            await expect(service.createCase(createDto, 'user-1'))
                .rejects.toThrow(exceptions_1.NotFoundError);
        });
        it('should create audit log on case creation', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.emergencyCase.create.mockResolvedValue((0, factories_1.createMockEmergencyCase)({
                referenceNumber: 'EC-TEST',
                caseType: 'EVACUATION',
                description: 'Evacuation needed | Zone A',
                urgency: 'HIGH',
                status: 'OPEN',
                embassyId: 'embassy-1',
                resolvedAt: null,
            }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            await service.createCase(createDto, 'user-1');
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    action: 'CREATE',
                    entity: 'EmergencyCase',
                }),
            });
        });
    });
    describe('findAll', () => {
        it('should return paginated results', async () => {
            mock_db_1.mockPrisma.emergencyCase.findMany.mockResolvedValue([
                (0, factories_1.createMockEmergencyCase)({ referenceNumber: 'EC-001', caseType: 'EVACUATION', description: null, resolvedAt: null }),
                (0, factories_1.createMockEmergencyCase)({ id: 'ec-2', referenceNumber: 'EC-002', caseType: 'MEDICAL', description: null, resolvedAt: null }),
            ]);
            mock_db_1.mockPrisma.emergencyCase.count.mockResolvedValue(2);
            const result = await service.findAll(1, 10);
            expect(result.data).toHaveLength(2);
            expect(result.meta.total).toBe(2);
            expect(result.meta.page).toBe(1);
        });
        it('should default to page 1 and limit 10', async () => {
            mock_db_1.mockPrisma.emergencyCase.findMany.mockResolvedValue([]);
            mock_db_1.mockPrisma.emergencyCase.count.mockResolvedValue(0);
            await service.findAll();
            expect(mock_db_1.mockPrisma.emergencyCase.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
        });
    });
    describe('findById', () => {
        it('should return case by id', async () => {
            mock_db_1.mockPrisma.emergencyCase.findUnique.mockResolvedValue((0, factories_1.createMockEmergencyCase)({ referenceNumber: 'EC-001', caseType: 'EVACUATION', description: null, resolvedAt: null }));
            const result = await service.findById('ec-1');
            expect(result.id).toBe('ec-1');
        });
        it('should throw NotFoundError for nonexistent case', async () => {
            mock_db_1.mockPrisma.emergencyCase.findUnique.mockResolvedValue(null);
            await expect(service.findById('nonexistent'))
                .rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
    describe('updateStatus', () => {
        it('should update status successfully', async () => {
            const mockCase = (0, factories_1.createMockEmergencyCase)({
                referenceNumber: 'EC-001', caseType: 'EVACUATION',
                description: null, resolvedAt: null, status: 'OPEN',
            });
            mock_db_1.mockPrisma.emergencyCase.findUnique.mockResolvedValue(mockCase);
            mock_db_1.mockPrisma.emergencyCase.update.mockResolvedValue({ ...mockCase, status: 'IN_PROGRESS' });
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.updateStatus('ec-1', 'IN_PROGRESS', 'user-1');
            expect(result.status).toBe('IN_PROGRESS');
        });
        it('should set resolvedAt when status is RESOLVED', async () => {
            const mockCase = (0, factories_1.createMockEmergencyCase)({
                referenceNumber: 'EC-001', caseType: 'EVACUATION',
                description: null, resolvedAt: null, status: 'IN_PROGRESS',
            });
            mock_db_1.mockPrisma.emergencyCase.findUnique.mockResolvedValue(mockCase);
            mock_db_1.mockPrisma.emergencyCase.update.mockResolvedValue({
                ...mockCase, status: 'RESOLVED', resolvedAt: new Date(),
            });
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.updateStatus('ec-1', 'RESOLVED', 'user-1');
            expect(result.status).toBe('RESOLVED');
            expect(mock_db_1.mockPrisma.emergencyCase.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
            }));
        });
        it('should create audit log on status update', async () => {
            const mockCase = (0, factories_1.createMockEmergencyCase)({
                referenceNumber: 'EC-001', caseType: 'EVACUATION',
                description: null, resolvedAt: null, status: 'OPEN',
            });
            mock_db_1.mockPrisma.emergencyCase.findUnique.mockResolvedValue(mockCase);
            mock_db_1.mockPrisma.emergencyCase.update.mockResolvedValue({ ...mockCase, status: 'RESOLVED' });
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            await service.updateStatus('ec-1', 'RESOLVED', 'user-1');
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ action: 'UPDATE', entity: 'EmergencyCase', entityId: 'ec-1' }),
            });
        });
        it('should throw NotFoundError for nonexistent case', async () => {
            mock_db_1.mockPrisma.emergencyCase.findUnique.mockResolvedValue(null);
            await expect(service.updateStatus('nonexistent', 'RESOLVED', 'user-1'))
                .rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
    describe('getEvacuationList', () => {
        it('should return cases sorted by urgency CRITICAL first', async () => {
            const low = (0, factories_1.createMockEmergencyCase)({
                id: 'ec-low', referenceNumber: 'EC-LOW', caseType: 'EVACUATION',
                description: null, resolvedAt: null, urgency: 'LOW', status: 'OPEN',
                createdAt: new Date('2026-01-01T00:00:00Z'),
            });
            const critical = (0, factories_1.createMockEmergencyCase)({
                id: 'ec-crit', referenceNumber: 'EC-CRIT', caseType: 'EVACUATION',
                description: null, resolvedAt: null, urgency: 'CRITICAL', status: 'OPEN',
                createdAt: new Date('2026-01-01T00:00:00Z'),
            });
            const high = (0, factories_1.createMockEmergencyCase)({
                id: 'ec-high', referenceNumber: 'EC-HIGH', caseType: 'EVACUATION',
                description: null, resolvedAt: null, urgency: 'HIGH', status: 'OPEN',
                createdAt: new Date('2026-01-01T00:00:00Z'),
            });
            mock_db_1.mockPrisma.emergencyCase.findMany.mockResolvedValue([low, critical, high]);
            const result = await service.getEvacuationList('embassy-1');
            expect(result[0].urgency).toBe('CRITICAL');
            expect(result[1].urgency).toBe('HIGH');
            expect(result[2].urgency).toBe('LOW');
        });
        it('should sort by createdAt within same urgency', async () => {
            const older = (0, factories_1.createMockEmergencyCase)({
                id: 'ec-1', referenceNumber: 'EC-1', caseType: 'EVACUATION',
                description: null, resolvedAt: null, urgency: 'HIGH', status: 'OPEN',
                createdAt: new Date('2026-01-01T00:00:00Z'),
            });
            const newer = (0, factories_1.createMockEmergencyCase)({
                id: 'ec-2', referenceNumber: 'EC-2', caseType: 'EVACUATION',
                description: null, resolvedAt: null, urgency: 'HIGH', status: 'OPEN',
                createdAt: new Date('2026-01-02T00:00:00Z'),
            });
            mock_db_1.mockPrisma.emergencyCase.findMany.mockResolvedValue([newer, older]);
            const result = await service.getEvacuationList('embassy-1');
            expect(result[0].createdAt.getTime()).toBeLessThanOrEqual(result[1].createdAt.getTime());
        });
        it('should only return OPEN and IN_PROGRESS cases', async () => {
            mock_db_1.mockPrisma.emergencyCase.findMany.mockResolvedValue([]);
            await service.getEvacuationList('embassy-1');
            expect(mock_db_1.mockPrisma.emergencyCase.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    embassyId: 'embassy-1',
                    status: { in: ['OPEN', 'IN_PROGRESS'] },
                }),
            }));
        });
    });
    describe('broadcastAlert', () => {
        it('should create audit log entry', async () => {
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            await service.broadcastAlert({ message: 'Evacuation alert', embassyId: 'embassy-1', urgency: 'CRITICAL' }, 'user-1');
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ action: 'BROADCAST', entity: 'Alert' }),
            });
        });
    });
});
