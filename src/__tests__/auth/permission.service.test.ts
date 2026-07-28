import { PermissionService } from '../../services/permission.service';
import { mockPrisma } from '../helpers/mock-db';
import { createMockPermission } from '../helpers/factories';
describe('PermissionService', () => {
  let service: PermissionService;
  beforeEach(() => {
    jest.clearAllMocks();
    service = new PermissionService(mockPrisma as any);
  });
  describe('findAll', () => {
    it('should return paginated permissions', async () => {
      mockPrisma.permission.findMany.mockResolvedValue([createMockPermission()]);
      mockPrisma.permission.count.mockResolvedValue(1);
      const result = await service.findAll(1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });
  describe('create', () => {
    it('should create permission successfully', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null);
      mockPrisma.permission.create.mockResolvedValue(createMockPermission());
      const result = await service.create({ name: 'Read Users', slug: 'user:read', description: 'Can read users' });
      expect(result.name).toBe('Read Users');
      expect(result.slug).toBe('user:read');
    });
    it('should reject duplicate slug', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(createMockPermission());
      await expect(service.create({ name: 'Read Users', slug: 'user:read' })).rejects.toThrow('Permission slug already exists');
    });
  });
  describe('findById', () => {
    it('should return permission when found', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(createMockPermission());
      const result = await service.findById('perm-1');
      expect(result.id).toBe('perm-1');
    });
    it('should throw NotFoundError when not found', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow('Permission not found');
    });
  });
  describe('update', () => {
    it('should update permission successfully', async () => {
      const mockPerm = createMockPermission();
      mockPrisma.permission.findUnique.mockResolvedValue(mockPerm);
      mockPrisma.permission.update.mockResolvedValue(mockPerm);
      const result = await service.update('perm-1', { name: 'Write Users' });
      expect(mockPrisma.permission.update).toHaveBeenCalled();
    });
    it('should throw NotFoundError when not found', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null);
      await expect(service.update('nonexistent', { name: 'New' })).rejects.toThrow('Permission not found');
    });
    it('should reject duplicate slug on update', async () => {
      const existing = createMockPermission({ slug: 'user:read' });
      mockPrisma.permission.findUnique.mockResolvedValueOnce(existing).mockResolvedValueOnce(createMockPermission({ slug: 'user:write' }));
      await expect(service.update('perm-1', { slug: 'user:write' })).rejects.toThrow('Permission slug already exists');
    });
  });
  describe('delete', () => {
    it('should delete permission successfully when not assigned to roles', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(createMockPermission());
      mockPrisma.rolePermission.count.mockResolvedValue(0);
      await service.delete('perm-1');
      expect(mockPrisma.permission.delete).toHaveBeenCalledWith({ where: { id: 'perm-1' } });
    });
    it('should throw NotFoundError when not found', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(null);
      await expect(service.delete('nonexistent')).rejects.toThrow('Permission not found');
    });
    it('should throw ConflictError when assigned to roles', async () => {
      mockPrisma.permission.findUnique.mockResolvedValue(createMockPermission());
      mockPrisma.rolePermission.count.mockResolvedValue(2);
      await expect(service.delete('perm-1')).rejects.toThrow('Cannot delete permission assigned to roles');
    });
  });
});
