"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const role_service_1 = require("../../services/role.service");
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
describe('RoleService', () => {
    let service;
    beforeEach(() => { jest.clearAllMocks(); service = new role_service_1.RoleService(mock_db_1.mockPrisma); });
    describe('findAll', () => {
        it('should call database with pagination', async () => {
            mock_db_1.mockPrisma.role.findMany.mockResolvedValue([]);
            mock_db_1.mockPrisma.role.count.mockResolvedValue(0);
            const result = await service.findAll(1, 10);
            expect(result.meta.total).toBe(0);
            expect(result.meta.page).toBe(1);
            expect(mock_db_1.mockPrisma.role.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
        });
    });
    describe('create', () => {
        it('should create role successfully', async () => {
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue(null);
            mock_db_1.mockPrisma.role.create.mockResolvedValue((0, factories_1.createMockRole)());
            const result = await service.create({ name: 'Officer', slug: 'officer', description: 'Embassy officer' });
            expect(result.name).toBe('Officer');
        });
        it('should reject duplicate slug', async () => {
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue((0, factories_1.createMockRole)());
            await expect(service.create({ name: 'Officer', slug: 'officer' })).rejects.toThrow('Role slug already exists');
        });
    });
    describe('findById', () => {
        it('should return role with permissions when found', async () => {
            const mockRole = (0, factories_1.createMockRole)({ rolePermissions: [{ permission: (0, factories_1.createMockPermission)() }] });
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue(mockRole);
            const result = await service.findById('role-1');
            expect(result.id).toBe('role-1');
            expect(result.permissions).toBeDefined();
        });
        it('should throw NotFoundError when role not found', async () => {
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue(null);
            await expect(service.findById('nonexistent')).rejects.toThrow('Role not found');
        });
    });
    describe('update', () => {
        it('should update role successfully', async () => {
            const mockRole = (0, factories_1.createMockRole)({ rolePermissions: [] });
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue(mockRole);
            mock_db_1.mockPrisma.role.update.mockResolvedValue(mockRole);
            const result = await service.update('role-1', { name: 'Senior Officer' });
            expect(mock_db_1.mockPrisma.role.update).toHaveBeenCalled();
        });
        it('should throw NotFoundError when role not found', async () => {
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue(null);
            await expect(service.update('nonexistent', { name: 'New Name' })).rejects.toThrow('Role not found');
        });
        it('should reject duplicate slug on update', async () => {
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValueOnce((0, factories_1.createMockRole)({ slug: 'officer' })).mockResolvedValueOnce((0, factories_1.createMockRole)({ slug: 'admin' }));
            await expect(service.update('role-1', { slug: 'admin' })).rejects.toThrow('Role slug already exists');
        });
    });
    describe('delete', () => {
        it('should delete role successfully when no users assigned', async () => {
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue((0, factories_1.createMockRole)());
            mock_db_1.mockPrisma.user.count.mockResolvedValue(0);
            await service.delete('role-1');
            expect(mock_db_1.mockPrisma.role.delete).toHaveBeenCalledWith({ where: { id: 'role-1' } });
        });
        it('should throw NotFoundError when role not found', async () => {
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue(null);
            await expect(service.delete('nonexistent')).rejects.toThrow('Role not found');
        });
        it('should throw ConflictError when role has assigned users', async () => {
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue((0, factories_1.createMockRole)());
            mock_db_1.mockPrisma.user.count.mockResolvedValue(3);
            await expect(service.delete('role-1')).rejects.toThrow('Cannot delete role assigned to users');
        });
    });
    describe('assignPermissions', () => {
        it('should assign permissions to role successfully', async () => {
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue((0, factories_1.createMockRole)({ rolePermissions: [{ permission: (0, factories_1.createMockPermission)() }] }));
            mock_db_1.mockPrisma.permission.findMany.mockResolvedValue([(0, factories_1.createMockPermission)()]);
            mock_db_1.mockPrisma.rolePermission.deleteMany.mockResolvedValue({ count: 0 });
            mock_db_1.mockPrisma.rolePermission.createMany.mockResolvedValue({ count: 1 });
            const result = await service.assignPermissions('role-1', { permissionIds: ['perm-1'] });
            expect(mock_db_1.mockPrisma.rolePermission.createMany).toHaveBeenCalledWith({ data: [{ roleId: 'role-1', permissionId: 'perm-1' }] });
        });
        it('should throw NotFoundError when role not found', async () => {
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue(null);
            await expect(service.assignPermissions('nonexistent', { permissionIds: ['perm-1'] })).rejects.toThrow('Role not found');
        });
        it('should throw NotFoundError when a permission is not found', async () => {
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue((0, factories_1.createMockRole)());
            mock_db_1.mockPrisma.permission.findMany.mockResolvedValue([]);
            await expect(service.assignPermissions('role-1', { permissionIds: ['perm-1'] })).rejects.toThrow('One or more permissions not found');
        });
    });
});
