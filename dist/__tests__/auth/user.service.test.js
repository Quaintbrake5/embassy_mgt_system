"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_service_1 = require("../../services/user.service");
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
jest.mock('../../utils/bcrypt.utilities', () => ({ hashPassword: jest.fn(() => 'hashed-password'), comparePassword: jest.fn(() => true) }));
describe('UserService', () => {
    let service;
    beforeEach(() => {
        jest.clearAllMocks();
        service = new user_service_1.UserService(mock_db_1.mockPrisma);
    });
    describe('getProfile', () => {
        it('should return user profile with role and profile', async () => {
            const mockUser = (0, factories_1.createMockUser)({ role: null, profile: null });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            const result = await service.getProfile('user-1');
            expect(result.user.email).toBe('john@example.com');
            expect(result.profile).toBeNull();
        });
        it('should throw error when user not found', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(null);
            await expect(service.getProfile('nonexistent')).rejects.toThrow('User not found');
        });
    });
    describe('updateProfile', () => {
        it('should update user profile without status or roleId', async () => {
            const mockUser = (0, factories_1.createMockUser)({ role: null, profile: null });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mock_db_1.mockPrisma.user.update.mockResolvedValue(mockUser);
            const result = await service.updateProfile('user-1', { firstName: 'Jane' });
            expect(mock_db_1.mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ firstName: 'Jane' }) }));
            expect(mock_db_1.mockPrisma.user.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: expect.any(String) }) }));
        });
        it('should throw NotFoundError when user not found', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(null);
            await expect(service.updateProfile('nonexistent', { firstName: 'Jane' })).rejects.toThrow('User not found');
        });
        it('should throw ConflictError when email already in use', async () => {
            const mockUser = (0, factories_1.createMockUser)({ email: 'old@example.com', role: null, profile: null });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser).mockResolvedValueOnce((0, factories_1.createMockUser)({ email: 'taken@example.com' }));
            await expect(service.updateProfile('user-1', { email: 'taken@example.com' })).rejects.toThrow('Email already in use');
        });
    });
    describe('getUserById', () => {
        it('should return user when found', async () => {
            const mockUser = (0, factories_1.createMockUser)({ role: null, profile: null });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            const result = await service.findById('user-1');
            expect(result.email).toBe('john@example.com');
        });
        it('should throw NotFoundError when user not found', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(null);
            await expect(service.findById('nonexistent')).rejects.toThrow('User not found');
        });
    });
    describe('updateUser', () => {
        it('should update user successfully', async () => {
            const mockUser = (0, factories_1.createMockUser)({ role: null, profile: null });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mock_db_1.mockPrisma.user.update.mockResolvedValue(mockUser);
            const result = await service.update('user-1', { firstName: 'Jane' });
            expect(mock_db_1.mockPrisma.user.update).toHaveBeenCalled();
        });
        it('should throw NotFoundError when user not found', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(null);
            await expect(service.update('nonexistent', { firstName: 'Jane' })).rejects.toThrow('User not found');
        });
        it('should reject duplicate email', async () => {
            const mockUser = (0, factories_1.createMockUser)({ email: 'old@example.com', role: null, profile: null });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser).mockResolvedValueOnce((0, factories_1.createMockUser)({ email: 'taken@example.com' }));
            await expect(service.update('user-1', { email: 'taken@example.com' })).rejects.toThrow('Email already in use');
        });
    });
    describe('assignRole', () => {
        it('should assign role to user successfully', async () => {
            const mockUser = (0, factories_1.createMockUser)({ role: null, profile: null });
            const mockRole = (0, factories_1.createMockRole)();
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue(mockRole);
            mock_db_1.mockPrisma.user.update.mockResolvedValue({ ...mockUser, roleId: 'role-1', role: mockRole });
            const result = await service.assignRole('user-1', 'role-1');
            expect(mock_db_1.mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { roleId: 'role-1' } }));
        });
        it('should throw NotFoundError when user not found', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(null);
            await expect(service.assignRole('nonexistent', 'role-1')).rejects.toThrow('User not found');
        });
        it('should throw NotFoundError when role not found', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue((0, factories_1.createMockUser)({ role: null, profile: null }));
            mock_db_1.mockPrisma.role.findUnique.mockResolvedValue(null);
            await expect(service.assignRole('user-1', 'nonexistent')).rejects.toThrow('Role not found');
        });
    });
    describe('updateUserStatus', () => {
        it('should change status successfully', async () => {
            const mockUser = (0, factories_1.createMockUser)({ role: null, profile: null });
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mock_db_1.mockPrisma.user.update.mockResolvedValue({ ...mockUser, status: 'SUSPENDED' });
            const result = await service.changeStatus('user-1', 'SUSPENDED');
            expect(mock_db_1.mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'SUSPENDED' } }));
        });
        it('should throw error for invalid status', async () => {
            await expect(service.changeStatus('user-1', 'INVALID')).rejects.toThrow('Invalid status');
        });
        it('should throw error when user not found', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(null);
            await expect(service.changeStatus('nonexistent', 'ACTIVE')).rejects.toThrow('User not found');
        });
    });
    describe('deleteUser', () => {
        it('should delete user successfully', async () => {
            const mockUser = (0, factories_1.createMockUser)();
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            await service.delete('user-1');
            expect(mock_db_1.mockPrisma.user.delete).toHaveBeenCalledWith({ where: { userid: 'user-1' } });
        });
        it('should throw NotFoundError when user not found', async () => {
            mock_db_1.mockPrisma.user.findUnique.mockResolvedValue(null);
            await expect(service.delete('nonexistent')).rejects.toThrow('User not found');
        });
    });
    describe('findAll', () => {
        it('should return paginated users', async () => {
            const mockUser = (0, factories_1.createMockUser)({ role: null, profile: null });
            mock_db_1.mockPrisma.user.findMany.mockResolvedValue([mockUser]);
            mock_db_1.mockPrisma.user.count.mockResolvedValue(1);
            const result = await service.findAll(1, 10);
            expect(result.data).toHaveLength(1);
            expect(result.meta.total).toBe(1);
            expect(result.meta.page).toBe(1);
        });
    });
});
