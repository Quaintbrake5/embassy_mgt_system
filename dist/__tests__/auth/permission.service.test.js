"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const permission_service_1 = require("../../services/permission.service");
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
describe('PermissionService', () => {
    let service;
    beforeEach(() => {
        jest.clearAllMocks();
        service = new permission_service_1.PermissionService(mock_db_1.mockPrisma);
    });
    describe('findAll', () => {
        it('should return paginated permissions', async () => {
            mock_db_1.mockPrisma.permission.findMany.mockResolvedValue([(0, factories_1.createMockPermission)()]);
            mock_db_1.mockPrisma.permission.count.mockResolvedValue(1);
            const result = await service.findAll(1, 10);
            expect(result.data).toHaveLength(1);
            expect(result.meta.total).toBe(1);
        });
    });
    describe('create', () => {
        it('should create permission successfully', async () => {
            mock_db_1.mockPrisma.permission.findUnique.mockResolvedValue(null);
            mock_db_1.mockPrisma.permission.create.mockResolvedValue((0, factories_1.createMockPermission)());
            const result = await service.create({ name: 'Read Users', slug: 'user:read', description: 'Can read users' });
            expect(result.name).toBe('Read Users');
            expect(result.slug).toBe('user:read');
        });
        it('should reject duplicate slug', async () => {
            mock_db_1.mockPrisma.permission.findUnique.mockResolvedValue((0, factories_1.createMockPermission)());
            await expect(service.create({ name: 'Read Users', slug: 'user:read' })).rejects.toThrow('Permission slug already exists');
        });
    });
    describe('findById', () => {
        it('should return permission when found', async () => {
            mock_db_1.mockPrisma.permission.findUnique.mockResolvedValue((0, factories_1.createMockPermission)());
            const result = await service.findById('perm-1');
            expect(result.id).toBe('perm-1');
        });
        it('should throw NotFoundError when not found', async () => {
            mock_db_1.mockPrisma.permission.findUnique.mockResolvedValue(null);
            await expect(service.findById('nonexistent')).rejects.toThrow('Permission not found');
        });
    });
    describe('update', () => {
        it('should update permission successfully', async () => {
            const mockPerm = (0, factories_1.createMockPermission)();
            mock_db_1.mockPrisma.permission.findUnique.mockResolvedValue(mockPerm);
            mock_db_1.mockPrisma.permission.update.mockResolvedValue(mockPerm);
            const result = await service.update('perm-1', { name: 'Write Users' });
            expect(mock_db_1.mockPrisma.permission.update).toHaveBeenCalled();
        });
        it('should throw NotFoundError when not found', async () => {
            mock_db_1.mockPrisma.permission.findUnique.mockResolvedValue(null);
            await expect(service.update('nonexistent', { name: 'New' })).rejects.toThrow('Permission not found');
        });
        it('should reject duplicate slug on update', async () => {
            const existing = (0, factories_1.createMockPermission)({ slug: 'user:read' });
            mock_db_1.mockPrisma.permission.findUnique.mockResolvedValueOnce(existing).mockResolvedValueOnce((0, factories_1.createMockPermission)({ slug: 'user:write' }));
            await expect(service.update('perm-1', { slug: 'user:write' })).rejects.toThrow('Permission slug already exists');
        });
    });
    describe('delete', () => {
        it('should delete permission successfully when not assigned to roles', async () => {
            mock_db_1.mockPrisma.permission.findUnique.mockResolvedValue((0, factories_1.createMockPermission)());
            mock_db_1.mockPrisma.rolePermission.count.mockResolvedValue(0);
            await service.delete('perm-1');
            expect(mock_db_1.mockPrisma.permission.delete).toHaveBeenCalledWith({ where: { id: 'perm-1' } });
        });
        it('should throw NotFoundError when not found', async () => {
            mock_db_1.mockPrisma.permission.findUnique.mockResolvedValue(null);
            await expect(service.delete('nonexistent')).rejects.toThrow('Permission not found');
        });
        it('should throw ConflictError when assigned to roles', async () => {
            mock_db_1.mockPrisma.permission.findUnique.mockResolvedValue((0, factories_1.createMockPermission)());
            mock_db_1.mockPrisma.rolePermission.count.mockResolvedValue(2);
            await expect(service.delete('perm-1')).rejects.toThrow('Cannot delete permission assigned to roles');
        });
    });
});
