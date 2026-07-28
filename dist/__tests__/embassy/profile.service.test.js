"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const profile_service_1 = require("../../services/profile.service");
const client_1 = require("../../generated/prisma/client");
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
const exceptions_1 = require("../../exceptions");
function makePrismaError(code, message) {
    const err = new client_1.Prisma.PrismaClientKnownRequestError(message, { code, clientVersion: '7.9.0' });
    return err;
}
describe('ProfileService', () => {
    let profileService;
    beforeEach(() => {
        jest.clearAllMocks();
        profileService = new profile_service_1.ProfileService(mock_db_1.mockPrisma);
    });
    describe('createProfile', () => {
        const createDto = { gender: 'MALE', dateOfBirth: '1990-01-01', city: 'Test City', country: 'Test Country' };
        it('should create profile with audit log', async () => {
            mock_db_1.mockPrisma.profile.create.mockResolvedValue((0, factories_1.createMockProfile)());
            const result = await profileService.createProfile('user-1', createDto, 'user-1');
            expect(result.gender).toBe('MALE');
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalled();
        });
        it('should skip audit log when no requestingUserId', async () => {
            mock_db_1.mockPrisma.profile.create.mockResolvedValue((0, factories_1.createMockProfile)());
            await profileService.createProfile('user-1', createDto);
            expect(mock_db_1.mockPrisma.auditLog.create).not.toHaveBeenCalled();
        });
        it('should throw ConflictError for duplicate profile (P2002)', async () => {
            mock_db_1.mockPrisma.profile.create.mockRejectedValue(makePrismaError('P2002', 'Unique constraint'));
            await expect(profileService.createProfile('user-1', createDto)).rejects.toThrow(exceptions_1.ConflictError);
        });
        it('should rethrow non-P2002 errors', async () => {
            mock_db_1.mockPrisma.profile.create.mockRejectedValue(new Error('DB error'));
            await expect(profileService.createProfile('user-1', createDto)).rejects.toThrow('DB error');
        });
    });
    describe('getProfile', () => {
        it('should return profile', async () => {
            mock_db_1.mockPrisma.profile.findUnique.mockResolvedValue((0, factories_1.createMockProfile)());
            const result = await profileService.getProfile('user-1');
            expect(result.id).toBe('prof-1');
        });
        it('should throw NotFoundError', async () => {
            mock_db_1.mockPrisma.profile.findUnique.mockResolvedValue(null);
            await expect(profileService.getProfile('x')).rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
    describe('updateProfile', () => {
        it('should update with audit log', async () => {
            mock_db_1.mockPrisma.profile.update.mockResolvedValue((0, factories_1.createMockProfile)({ city: 'Updated', gender: 'FEMALE' }));
            const result = await profileService.updateProfile('prof-1', { city: 'Updated', gender: 'FEMALE' }, 'user-1');
            expect(result.city).toBe('Updated');
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalled();
        });
        it('should throw NotFoundError (P2025)', async () => {
            mock_db_1.mockPrisma.profile.update.mockRejectedValue(makePrismaError('P2025', 'Not found'));
            await expect(profileService.updateProfile('x', { city: 'New' })).rejects.toThrow(exceptions_1.NotFoundError);
        });
        it('should rethrow non-P2025 errors', async () => {
            mock_db_1.mockPrisma.profile.update.mockRejectedValue(new Error('DB error'));
            await expect(profileService.updateProfile('user-1', { city: 'New' })).rejects.toThrow('DB error');
        });
        it('should handle null fields', async () => {
            mock_db_1.mockPrisma.profile.update.mockResolvedValue((0, factories_1.createMockProfile)({ city: null, bio: null }));
            const result = await profileService.updateProfile('prof-1', { city: '', dateOfBirth: '' });
            expect(result.city).toBeNull();
        });
    });
    describe('deleteProfile (GDPR anonymization)', () => {
        it('should anonymize profile, user record, and audit', async () => {
            mock_db_1.mockPrisma.profile.update.mockResolvedValue((0, factories_1.createMockProfile)({ gender: 'PREFER_NOT_TO_SAY', dateOfBirth: null, city: null, country: null, postalCode: null, avatar: null, bio: null, state: null }));
            mock_db_1.mockPrisma.user.update.mockResolvedValue({
                userid: 'user-1',
                firstName: 'Anonymous',
                lastName: 'User',
                email: 'deleted-user-1@anonymous.ems',
                phone: null,
                passwordHash: '',
                status: 'INACTIVE',
            });
            await profileService.deleteProfile('user-1', 'user-1');
            expect(mock_db_1.mockPrisma.profile.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ gender: 'PREFER_NOT_TO_SAY' }) }));
            expect(mock_db_1.mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { userid: 'user-1' },
                data: expect.objectContaining({
                    firstName: 'Anonymous',
                    lastName: 'User',
                    status: 'INACTIVE',
                }),
            }));
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'ANONYMIZE', entity: 'Profile' }) }));
        });
        it('should throw NotFoundError (P2025)', async () => {
            mock_db_1.mockPrisma.profile.update.mockRejectedValue(makePrismaError('P2025', 'Not found'));
            await expect(profileService.deleteProfile('x')).rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
    describe('findProfileByOfficer', () => {
        it('should return profile and log access', async () => {
            mock_db_1.mockPrisma.profile.findUnique.mockResolvedValue((0, factories_1.createMockProfile)());
            const result = await profileService.findProfileByOfficer('user-1', 'officer-1');
            expect(result.id).toBe('prof-1');
            expect(mock_db_1.mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'VIEW', userId: 'officer-1' }) }));
        });
        it('should throw NotFoundError', async () => {
            mock_db_1.mockPrisma.profile.findUnique.mockResolvedValue(null);
            await expect(profileService.findProfileByOfficer('x', 'officer-1')).rejects.toThrow(exceptions_1.NotFoundError);
        });
    });
});
