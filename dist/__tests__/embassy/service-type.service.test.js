"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const service_type_service_1 = require("../../services/service-type.service");
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
const exceptions_1 = require("../../exceptions");
describe('ServiceTypeService', () => {
    let serviceTypeService;
    beforeEach(() => {
        jest.clearAllMocks();
        serviceTypeService = new service_type_service_1.ServiceTypeService(mock_db_1.mockPrisma);
    });
    describe('create', () => {
        const createDto = { name: 'Passport Renewal', slug: 'passport-renewal', category: 'DOCUMENT', fee: 100, duration: 10, requiresAppointment: true };
        it('should create with audit log', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue(null);
            mock_db_1.mockPrisma.serviceType.create.mockResolvedValue((0, factories_1.createMockServiceType)());
            const result = await serviceTypeService.create(createDto, 'user-1');
            expect(result.name).toBe('Passport Renewal');
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalled();
        });
        it('should reject duplicate slug', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue((0, factories_1.createMockServiceType)());
            await expect(serviceTypeService.create(createDto)).rejects.toThrow(exceptions_1.ConflictError);
        });
        it('should default requiresAppointment to false', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue(null);
            mock_db_1.mockPrisma.serviceType.create.mockResolvedValue((0, factories_1.createMockServiceType)({ requiresAppointment: false }));
            const result = await serviceTypeService.create({ name: 'N', slug: 'n', category: 'DOCUMENT' });
            expect(result.requiresAppointment).toBe(false);
        });
    });
    describe('findById', () => {
        it('should return by id', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue((0, factories_1.createMockServiceType)());
            const result = await serviceTypeService.findById('st-1');
            expect(result.category).toBe('DOCUMENT');
        });
        it('should throw NotFoundError', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue(null);
            await expect(serviceTypeService.findById('x')).rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
    describe('findAll', () => {
        it('should paginate', async () => {
            mock_db_1.mockPrisma.serviceType.findMany.mockResolvedValue([(0, factories_1.createMockServiceType)()]);
            mock_db_1.mockPrisma.serviceType.count.mockResolvedValue(1);
            const result = await serviceTypeService.findAll(1, 10);
            expect(result.data).toHaveLength(1);
        });
    });
    describe('findByCategory', () => {
        it('should filter', async () => {
            mock_db_1.mockPrisma.serviceType.findMany.mockResolvedValue([(0, factories_1.createMockServiceType)({ category: 'DOCUMENT' })]);
            const result = await serviceTypeService.findByCategory('DOCUMENT');
            expect(result).toHaveLength(1);
        });
        it('should return empty for no matches', async () => {
            mock_db_1.mockPrisma.serviceType.findMany.mockResolvedValue([]);
            const result = await serviceTypeService.findByCategory('APPOINTMENT');
            expect(result).toHaveLength(0);
        });
    });
    describe('update', () => {
        it('should update and audit', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue((0, factories_1.createMockServiceType)());
            mock_db_1.mockPrisma.serviceType.update.mockResolvedValue((0, factories_1.createMockServiceType)({ name: 'Updated', fee: 150 }));
            const result = await serviceTypeService.update('st-1', { name: 'Updated', fee: 150 }, 'user-1');
            expect(result.name).toBe('Updated');
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalled();
        });
        it('should reject duplicate slug', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique
                .mockResolvedValueOnce((0, factories_1.createMockServiceType)())
                .mockResolvedValueOnce((0, factories_1.createMockServiceType)({ id: 'st-2', slug: 'new-slug' }));
            await expect(serviceTypeService.update('st-1', { slug: 'new-slug' })).rejects.toThrow(exceptions_1.ConflictError);
        });
        it('should allow same slug', async () => {
            const existing = (0, factories_1.createMockServiceType)();
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue(existing);
            mock_db_1.mockPrisma.serviceType.update.mockResolvedValue((0, factories_1.createMockServiceType)());
            await serviceTypeService.update('st-1', { slug: 'passport-renewal' });
            expect(mock_db_1.mockPrisma.serviceType.update).toHaveBeenCalled();
        });
        it('should throw NotFoundError', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue(null);
            await expect(serviceTypeService.update('x', { name: 'Test' })).rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
    describe('delete', () => {
        it('should delete with no requests', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue((0, factories_1.createMockServiceType)());
            mock_db_1.mockPrisma.serviceRequest.count.mockResolvedValue(0);
            await serviceTypeService.delete('st-1', 'user-1');
            expect(mock_db_1.mockPrisma.serviceType.delete).toHaveBeenCalled();
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalled();
        });
        it('should block delete when requests exist', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue((0, factories_1.createMockServiceType)());
            mock_db_1.mockPrisma.serviceRequest.count.mockResolvedValue(3);
            await expect(serviceTypeService.delete('st-1')).rejects.toThrow(exceptions_1.ConflictError);
        });
        it('should throw NotFoundError', async () => {
            mock_db_1.mockPrisma.serviceType.findUnique.mockResolvedValue(null);
            await expect(serviceTypeService.delete('x')).rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
});
