import { ProfileService } from '../../services/profile.service';
import { Prisma } from '../../generated/prisma/client';
import { mockPrisma } from '../helpers/mock-db';
import { createMockProfile } from '../helpers/factories';
import { NotFoundError, ConflictError } from '../../exceptions';

function makePrismaError(code: string, message: string): any {
  const err = new Prisma.PrismaClientKnownRequestError(message, { code, clientVersion: '7.9.0' });
  return err;
}

describe('ProfileService', () => {
  let profileService: ProfileService;

  beforeEach(() => {
    jest.clearAllMocks();
    profileService = new ProfileService(mockPrisma as any);
  });

  describe('createProfile', () => {
    const createDto = { gender: 'MALE', dateOfBirth: '1990-01-01', city: 'Test City', country: 'Test Country' };

    it('should create profile with audit log', async () => {
      mockPrisma.profile.create.mockResolvedValue(createMockProfile());
      const result = await profileService.createProfile('user-1', createDto, 'user-1');
      expect(result.gender).toBe('MALE');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should skip audit log when no requestingUserId', async () => {
      mockPrisma.profile.create.mockResolvedValue(createMockProfile());
      await profileService.createProfile('user-1', createDto);
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictError for duplicate profile (P2002)', async () => {
      mockPrisma.profile.create.mockRejectedValue(makePrismaError('P2002', 'Unique constraint'));
      await expect(profileService.createProfile('user-1', createDto)).rejects.toThrow(ConflictError);
    });

    it('should rethrow non-P2002 errors', async () => {
      mockPrisma.profile.create.mockRejectedValue(new Error('DB error'));
      await expect(profileService.createProfile('user-1', createDto)).rejects.toThrow('DB error');
    });
  });

  describe('getProfile', () => {
    it('should return profile', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(createMockProfile());
      const result = await profileService.getProfile('user-1');
      expect(result.id).toBe('prof-1');
    });

    it('should throw NotFoundError', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);
      await expect(profileService.getProfile('x')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateProfile', () => {
    it('should update with audit log', async () => {
      mockPrisma.profile.update.mockResolvedValue(createMockProfile({ city: 'Updated', gender: 'FEMALE' }));
      const result = await profileService.updateProfile('prof-1', { city: 'Updated', gender: 'FEMALE' }, 'user-1');
      expect(result.city).toBe('Updated');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw NotFoundError (P2025)', async () => {
      mockPrisma.profile.update.mockRejectedValue(makePrismaError('P2025', 'Not found'));
      await expect(profileService.updateProfile('x', { city: 'New' })).rejects.toThrow(NotFoundError);
    });

    it('should rethrow non-P2025 errors', async () => {
      mockPrisma.profile.update.mockRejectedValue(new Error('DB error'));
      await expect(profileService.updateProfile('user-1', { city: 'New' })).rejects.toThrow('DB error');
    });

    it('should handle null fields', async () => {
      mockPrisma.profile.update.mockResolvedValue(createMockProfile({ city: null, bio: null }));
      const result = await profileService.updateProfile('prof-1', { city: '', dateOfBirth: '' });
      expect(result.city).toBeNull();
    });
  });

describe('deleteProfile (GDPR anonymization)', () => {
    it('should anonymize profile, user record, and audit', async () => {
      mockPrisma.profile.update.mockResolvedValue(
        createMockProfile({ gender: 'PREFER_NOT_TO_SAY', dateOfBirth: null, city: null, country: null, postalCode: null, avatar: null, bio: null, state: null })
      );
      mockPrisma.user.update.mockResolvedValue({
        userid: 'user-1',
        firstName: 'Anonymous',
        lastName: 'User',
        email: 'deleted-user-1@anonymous.ems',
        phone: null,
        passwordHash: '',
        status: 'INACTIVE',
      });
      await profileService.deleteProfile('user-1', 'user-1');
      expect(mockPrisma.profile.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ gender: 'PREFER_NOT_TO_SAY' }) })
      );
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userid: 'user-1' },
          data: expect.objectContaining({
            firstName: 'Anonymous',
            lastName: 'User',
            status: 'INACTIVE',
          }),
        })
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'ANONYMIZE', entity: 'Profile' }) })
      );
    });

    it('should throw NotFoundError (P2025)', async () => {
      mockPrisma.profile.update.mockRejectedValue(makePrismaError('P2025', 'Not found'));
      await expect(profileService.deleteProfile('x')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findProfileByOfficer', () => {
    it('should return profile and log access', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(createMockProfile());
      const result = await profileService.findProfileByOfficer('user-1', 'officer-1');
      expect(result.id).toBe('prof-1');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'VIEW', userId: 'officer-1' }) })
      );
    });

    it('should throw NotFoundError', async () => {
      mockPrisma.profile.findUnique.mockResolvedValue(null);
      await expect(profileService.findProfileByOfficer('x', 'officer-1')).rejects.toThrow(NotFoundError);
    });
  });
});
