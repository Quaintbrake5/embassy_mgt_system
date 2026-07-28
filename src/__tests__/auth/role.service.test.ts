import { RoleService } from '../../services/role.service';
import { mockPrisma } from '../helpers/mock-db';
import { createMockRole, createMockPermission } from '../helpers/factories';
describe('RoleService', () => {
  let service: RoleService;
  beforeEach(() => { jest.clearAllMocks(); service = new RoleService(mockPrisma as any); });
  describe('findAll', () => {
    it('should call database with pagination', async () => {
      mockPrisma.role.findMany.mockResolvedValue([]);
      mockPrisma.role.count.mockResolvedValue(0);
      const result = await service.findAll(1, 10);
      expect(result.meta.total).toBe(0);
      expect(result.meta.page).toBe(1);
      expect(mockPrisma.role.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
    });
  });
  describe('create', () => {
    it('should create role successfully', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);
      mockPrisma.role.create.mockResolvedValue(createMockRole());
      const result = await service.create({ name: 'Officer', slug: 'officer', description: 'Embassy officer' });
      expect(result.name).toBe('Officer');
    });
    it('should reject duplicate slug', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(createMockRole());
      await expect(service.create({ name: 'Officer', slug: 'officer' })).rejects.toThrow('Role slug already exists');
    });
  });
  describe('findById', () => {
    it('should return role with permissions when found', async () => {
      const mockRole = createMockRole({ rolePermissions: [{ permission: createMockPermission() }] });
      mockPrisma.role.findUnique.mockResolvedValue(mockRole);
      const result = await service.findById('role-1');
      expect(result.id).toBe('role-1');
      expect(result.permissions).toBeDefined();
    });
    it('should throw NotFoundError when role not found', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow('Role not found');
    });
  });
  describe('update', () => {
    it('should update role successfully', async () => {
      const mockRole = createMockRole({ rolePermissions: [] });
      mockPrisma.role.findUnique.mockResolvedValue(mockRole);
      mockPrisma.role.update.mockResolvedValue(mockRole);
      const result = await service.update('role-1', { name: 'Senior Officer' });
      expect(mockPrisma.role.update).toHaveBeenCalled();
    });
    it('should throw NotFoundError when role not found', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);
      await expect(service.update('nonexistent', { name: 'New Name' })).rejects.toThrow('Role not found');
    });
    it('should reject duplicate slug on update', async () => {
      mockPrisma.role.findUnique.mockResolvedValueOnce(createMockRole({ slug: 'officer' })).mockResolvedValueOnce(createMockRole({ slug: 'admin' }));
      await expect(service.update('role-1', { slug: 'admin' })).rejects.toThrow('Role slug already exists');
    });
  });
  describe('delete', () => {
    it('should delete role successfully when no users assigned', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(createMockRole());
      mockPrisma.user.count.mockResolvedValue(0);
      await service.delete('role-1');
      expect(mockPrisma.role.delete).toHaveBeenCalledWith({ where: { id: 'role-1' } });
    });
    it('should throw NotFoundError when role not found', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);
      await expect(service.delete('nonexistent')).rejects.toThrow('Role not found');
    });
    it('should throw ConflictError when role has assigned users', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(createMockRole());
      mockPrisma.user.count.mockResolvedValue(3);
      await expect(service.delete('role-1')).rejects.toThrow('Cannot delete role assigned to users');
    });
  });
  describe('assignPermissions', () => {
    it('should assign permissions to role successfully', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(createMockRole({ rolePermissions: [{ permission: createMockPermission() }] }));
      mockPrisma.permission.findMany.mockResolvedValue([createMockPermission()]);
      mockPrisma.rolePermission.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.rolePermission.createMany.mockResolvedValue({ count: 1 });
      const result = await service.assignPermissions('role-1', { permissionIds: ['perm-1'] });
      expect(mockPrisma.rolePermission.createMany).toHaveBeenCalledWith({ data: [{ roleId: 'role-1', permissionId: 'perm-1' }] });
    });
    it('should throw NotFoundError when role not found', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);
      await expect(service.assignPermissions('nonexistent', { permissionIds: ['perm-1'] })).rejects.toThrow('Role not found');
    });
    it('should throw NotFoundError when a permission is not found', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(createMockRole());
      mockPrisma.permission.findMany.mockResolvedValue([]);
      await expect(service.assignPermissions('role-1', { permissionIds: ['perm-1'] })).rejects.toThrow('One or more permissions not found');
    });
  });
});
