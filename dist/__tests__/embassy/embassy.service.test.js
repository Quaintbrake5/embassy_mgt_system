"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const embassy_service_1 = require("../../services/embassy.service");
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
const exceptions_1 = require("../../exceptions");
describe('EmbassyService', () => {
    let embassyService;
    beforeEach(() => {
        jest.clearAllMocks();
        embassyService = new embassy_service_1.EmbassyService(mock_db_1.mockPrisma);
    });
    describe('create', () => {
        const createDto = {
            name: 'Test Embassy', code: 'TEST',
            country: 'Test Country', city: 'Test City', address: '123 Test St',
        };
        it('should create embassy with audit log', async () => {
            const mockEmbassy = (0, factories_1.createMockEmbassy)({ departments: [] });
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue(null);
            mock_db_1.mockPrisma.embassy.create.mockResolvedValue(mockEmbassy);
            const result = await embassyService.create(createDto, 'user-1');
            expect(result.code).toBe('TEST');
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalled();
        });
        it('should skip audit log when no userId', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue(null);
            mock_db_1.mockPrisma.embassy.create.mockResolvedValue((0, factories_1.createMockEmbassy)({ departments: [] }));
            await embassyService.create(createDto);
            expect(mock_db_1.mockPrisma.auditLog.create).not.toHaveBeenCalled();
        });
        it('should reject duplicate code', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            await expect(embassyService.create(createDto)).rejects.toThrow(exceptions_1.ConflictError);
        });
    });
    describe('findById', () => {
        it('should return embassy with departments', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)({ departments: [(0, factories_1.createMockDepartment)()] }));
            const result = await embassyService.findById('embassy-1');
            expect(result.departments).toHaveLength(1);
        });
        it('should throw NotFoundError', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue(null);
            await expect(embassyService.findById('x')).rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
    describe('findAll', () => {
        it('should paginate', async () => {
            mock_db_1.mockPrisma.embassy.findMany.mockResolvedValue([(0, factories_1.createMockEmbassy)({ departments: [] })]);
            mock_db_1.mockPrisma.embassy.count.mockResolvedValue(1);
            const result = await embassyService.findAll(1, 10);
            expect(result.data).toHaveLength(1);
        });
        it('should handle empty', async () => {
            mock_db_1.mockPrisma.embassy.findMany.mockResolvedValue([]);
            mock_db_1.mockPrisma.embassy.count.mockResolvedValue(0);
            const result = await embassyService.findAll(1, 10);
            expect(result.data).toHaveLength(0);
        });
    });
    describe('update', () => {
        it('should update and audit', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.embassy.update.mockResolvedValue((0, factories_1.createMockEmbassy)({ name: 'Updated', departments: [] }));
            const result = await embassyService.update('embassy-1', { name: 'Updated' }, 'user-1');
            expect(result.name).toBe('Updated');
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalled();
        });
        it('should reject duplicate code', async () => {
            const existing = (0, factories_1.createMockEmbassy)();
            mock_db_1.mockPrisma.embassy.findUnique
                .mockResolvedValueOnce(existing)
                .mockResolvedValueOnce((0, factories_1.createMockEmbassy)({ id: 'embassy-2', code: 'NEWCODE' }));
            await expect(embassyService.update('embassy-1', { code: 'NEWCODE' })).rejects.toThrow(exceptions_1.ConflictError);
        });
        it('should allow same code', async () => {
            const existing = (0, factories_1.createMockEmbassy)({ departments: [] });
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue(existing);
            mock_db_1.mockPrisma.embassy.update.mockResolvedValue(existing);
            await embassyService.update('embassy-1', { code: 'TEST' });
            expect(mock_db_1.mockPrisma.embassy.update).toHaveBeenCalled();
        });
        it('should throw NotFoundError', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue(null);
            await expect(embassyService.update('x', { name: 'Test' })).rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
    describe('delete', () => {
        it('should delete with no dependents', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            for (const m of ['department', 'serviceRequest', 'appointment', 'visaApplication', 'emergencyCase']) {
                mock_db_1.mockPrisma[m].count.mockResolvedValue(0);
            }
            await embassyService.delete('embassy-1', 'user-1');
            expect(mock_db_1.mockPrisma.embassy.delete).toHaveBeenCalled();
        });
        it('should reject when departments exist', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.department.count.mockResolvedValue(2);
            for (const m of ['serviceRequest', 'appointment', 'visaApplication', 'emergencyCase']) {
                mock_db_1.mockPrisma[m].count.mockResolvedValue(0);
            }
            await expect(embassyService.delete('embassy-1')).rejects.toThrow(exceptions_1.ConflictError);
        });
        it('should reject when appointments exist', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            for (const m of ['department', 'serviceRequest', 'visaApplication', 'emergencyCase']) {
                mock_db_1.mockPrisma[m].count.mockResolvedValue(0);
            }
            mock_db_1.mockPrisma.appointment.count.mockResolvedValue(1);
            await expect(embassyService.delete('embassy-1')).rejects.toThrow(exceptions_1.ConflictError);
        });
    });
    describe('createDepartment', () => {
        const dto = { name: 'Visa', slug: 'visa' };
        it('should create department and audit', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.department.findUnique.mockResolvedValue(null);
            mock_db_1.mockPrisma.department.create.mockResolvedValue((0, factories_1.createMockDepartment)());
            const result = await embassyService.createDepartment('embassy-1', dto, 'user-1');
            expect(result.name).toBe('Consular Services');
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalled();
        });
        it('should reject when embassy missing', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue(null);
            await expect(embassyService.createDepartment('x', dto)).rejects.toThrow(exceptions_1.NotFoundError);
        });
        it('should reject duplicate slug', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.department.findUnique.mockResolvedValue((0, factories_1.createMockDepartment)());
            await expect(embassyService.createDepartment('embassy-1', dto)).rejects.toThrow(exceptions_1.ConflictError);
        });
    });
    describe('findDepartments', () => {
        it('should list sorted', async () => {
            mock_db_1.mockPrisma.department.findMany.mockResolvedValue([(0, factories_1.createMockDepartment)()]);
            const result = await embassyService.findDepartments('embassy-1');
            expect(result).toHaveLength(1);
        });
    });
    describe('updateDepartment', () => {
        it('should update and audit', async () => {
            mock_db_1.mockPrisma.department.findUnique.mockResolvedValue((0, factories_1.createMockDepartment)());
            mock_db_1.mockPrisma.department.update.mockResolvedValue((0, factories_1.createMockDepartment)({ name: 'Updated' }));
            const result = await embassyService.updateDepartment('dept-1', { name: 'Updated' }, 'user-1');
            expect(result.name).toBe('Updated');
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalled();
        });
        it('should reject duplicate slug', async () => {
            mock_db_1.mockPrisma.department.findUnique
                .mockResolvedValueOnce((0, factories_1.createMockDepartment)())
                .mockResolvedValueOnce((0, factories_1.createMockDepartment)({ id: 'dept-2', slug: 'newslug' }));
            await expect(embassyService.updateDepartment('dept-1', { slug: 'newslug' })).rejects.toThrow(exceptions_1.ConflictError);
        });
        it('should throw NotFoundError', async () => {
            mock_db_1.mockPrisma.department.findUnique.mockResolvedValue(null);
            await expect(embassyService.updateDepartment('x', { name: 'Test' })).rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
    describe('deleteDepartment', () => {
        it('should delete and audit', async () => {
            mock_db_1.mockPrisma.department.findUnique.mockResolvedValue((0, factories_1.createMockDepartment)());
            await embassyService.deleteDepartment('dept-1', 'user-1');
            expect(mock_db_1.mockPrisma.department.delete).toHaveBeenCalled();
        });
        it('should throw NotFoundError', async () => {
            mock_db_1.mockPrisma.department.findUnique.mockResolvedValue(null);
            await expect(embassyService.deleteDepartment('x')).rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
});
