import { UserService } from '../../services/user.service';
import { mockPrisma } from '../helpers/mock-db';
import { createMockUser, createMockRole, createMockProfile } from '../helpers/factories';
jest.mock('../../utils/bcrypt.utilities', () => ({ hashPassword: jest.fn(() => 'hashed-password'), comparePassword: jest.fn(() => true) }));
describe('UserService', () => {
  let service: UserService;
  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserService(mockPrisma as any);
  });
  describe('getProfile', () => {
    it('should return user profile with role and profile', async () => {
      const mockUser = createMockUser({ role: null, profile: null });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.getProfile('user-1');
      expect(result.user.email).toBe('john@example.com');
      expect(result.profile).toBeNull();
    });
    it('should throw error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('nonexistent')).rejects.toThrow('User not found');
    });
  });
  describe('updateProfile', () => {
    it('should update user profile without status or roleId', async () => {
      const mockUser = createMockUser({ role: null, profile: null });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      const result = await service.updateProfile('user-1', { firstName: 'Jane' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ firstName: 'Jane' }) }));
      expect(mockPrisma.user.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: expect.any(String) }) }));
    });
    it('should throw NotFoundError when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.updateProfile('nonexistent', { firstName: 'Jane' })).rejects.toThrow('User not found');
    });
    it('should throw ConflictError when email already in use', async () => {
      const mockUser = createMockUser({ email: 'old@example.com', role: null, profile: null });
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(createMockUser({ email: 'taken@example.com' }));
      await expect(service.updateProfile('user-1', { email: 'taken@example.com' })).rejects.toThrow('Email already in use');
    });
  });
  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = createMockUser({ role: null, profile: null });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.findById('user-1');
      expect(result.email).toBe('john@example.com');
    });
    it('should throw NotFoundError when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow('User not found');
    });
  });
  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const mockUser = createMockUser({ role: null, profile: null });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      const result = await service.update('user-1', { firstName: 'Jane' });
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
    it('should throw NotFoundError when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.update('nonexistent', { firstName: 'Jane' })).rejects.toThrow('User not found');
    });
    it('should reject duplicate email', async () => {
      const mockUser = createMockUser({ email: 'old@example.com', role: null, profile: null });
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(createMockUser({ email: 'taken@example.com' }));
      await expect(service.update('user-1', { email: 'taken@example.com' })).rejects.toThrow('Email already in use');
    });
  });
  describe('assignRole', () => {
    it('should assign role to user successfully', async () => {
      const mockUser = createMockUser({ role: null, profile: null });
      const mockRole = createMockRole();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.role.findUnique.mockResolvedValue(mockRole);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, roleId: 'role-1', role: mockRole });
      const result = await service.assignRole('user-1', 'role-1');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { roleId: 'role-1' } }));
    });
    it('should throw NotFoundError when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.assignRole('nonexistent', 'role-1')).rejects.toThrow('User not found');
    });
    it('should throw NotFoundError when role not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(createMockUser({ role: null, profile: null }));
      mockPrisma.role.findUnique.mockResolvedValue(null);
      await expect(service.assignRole('user-1', 'nonexistent')).rejects.toThrow('Role not found');
    });
  });
  describe('updateUserStatus', () => {
    it('should change status successfully', async () => {
      const mockUser = createMockUser({ role: null, profile: null });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, status: 'SUSPENDED' });
      const result = await service.changeStatus('user-1', 'SUSPENDED');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'SUSPENDED' } }));
    });
    it('should throw error for invalid status', async () => {
      await expect(service.changeStatus('user-1', 'INVALID')).rejects.toThrow('Invalid status');
    });
    it('should throw error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.changeStatus('nonexistent', 'ACTIVE')).rejects.toThrow('User not found');
    });
  });
  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      await service.delete('user-1');
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { userid: 'user-1' } });
    });
    it('should throw NotFoundError when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.delete('nonexistent')).rejects.toThrow('User not found');
    });
  });
  describe('findAll', () => {
    it('should return paginated users', async () => {
      const mockUser = createMockUser({ role: null, profile: null });
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      mockPrisma.user.count.mockResolvedValue(1);
      const result = await service.findAll(1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });
  });
});
