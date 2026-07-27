import { PrismaClient, Prisma } from '../generated/prisma/client';
import { CreateProfileDto, UpdateProfileDto, ProfileResponseDto } from '../dto/profile.dto';
import { NotFoundError, ConflictError } from '../exceptions';

export interface IProfileService {
  createProfile(userId: string, dto: CreateProfileDto, requestingUserId?: string): Promise<ProfileResponseDto>;
  getProfile(userId: string, requestingUserId?: string): Promise<ProfileResponseDto>;
  updateProfile(userId: string, dto: UpdateProfileDto, requestingUserId?: string): Promise<ProfileResponseDto>;
  deleteProfile(userId: string, requestingUserId?: string): Promise<void>;
  findProfileByOfficer(userId: string, officerId: string): Promise<ProfileResponseDto>;
}

export class ProfileService implements IProfileService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createProfile(userId: string, dto: CreateProfileDto, requestingUserId?: string): Promise<ProfileResponseDto> {
    let profile;
    try {
      profile = await this.prisma.profile.create({
        data: {
          id: userId,
          gender: dto.gender as any,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          avatar: dto.avatar,
          bio: dto.bio,
          city: dto.city,
          state: dto.state,
          country: dto.country,
          postalCode: dto.postalCode,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('Profile already exists for this user');
      }
      throw error;
    }

    if (requestingUserId) {
      await this.prisma.auditLog.create({
        data: {
          userId: requestingUserId,
          action: 'CREATE',
          entity: 'Profile',
          entityId: profile.id,
          description: `Created profile for user ${userId}`,
          metaData: { newValues: { gender: dto.gender } },
        },
      });
    }

    return this.toResponse(profile);
  }

  async getProfile(userId: string, requestingUserId?: string): Promise<ProfileResponseDto> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    return this.toResponse(profile);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, requestingUserId?: string): Promise<ProfileResponseDto> {
    let profile;
    try {
      profile = await this.prisma.profile.update({
        where: { id: userId },
        data: {
          gender: dto.gender !== undefined ? dto.gender as any : undefined,
          dateOfBirth: dto.dateOfBirth !== undefined ? (dto.dateOfBirth ? new Date(dto.dateOfBirth) : null) : undefined,
          avatar: dto.avatar !== undefined ? dto.avatar : undefined,
          bio: dto.bio !== undefined ? dto.bio : undefined,
          city: dto.city !== undefined ? dto.city : undefined,
          state: dto.state !== undefined ? dto.state : undefined,
          country: dto.country !== undefined ? dto.country : undefined,
          postalCode: dto.postalCode !== undefined ? dto.postalCode : undefined,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundError('Profile not found');
      }
      throw error;
    }

    if (requestingUserId) {
      await this.prisma.auditLog.create({
        data: {
          userId: requestingUserId,
          action: 'UPDATE',
          entity: 'Profile',
          entityId: profile.id,
          description: `Updated profile for user ${userId}`,
          metaData: {
            newValues: { gender: profile.gender },
          },
        },
      });
    }

    return this.toResponse(profile);
  }

  async deleteProfile(userId: string, requestingUserId?: string): Promise<void> {
    try {
      await this.prisma.profile.update({
        where: { id: userId },
        data: {
          gender: 'PREFER_NOT_TO_SAY' as any,
          dateOfBirth: null,
          avatar: null,
          bio: null,
          city: null,
          state: null,
          country: null,
          postalCode: null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundError('Profile not found');
      }
      throw error;
    }

    if (requestingUserId) {
      await this.prisma.auditLog.create({
        data: {
          userId: requestingUserId,
          action: 'ANONYMIZE',
          entity: 'Profile',
          entityId: userId,
          description: `GDPR anonymization of profile for user ${userId}`,
        },
      });
    }
  }

  async findProfileByOfficer(userId: string, officerId: string): Promise<ProfileResponseDto> {
    const profile = await this.getProfile(userId);

    await this.prisma.auditLog.create({
      data: {
        userId: officerId,
        action: 'VIEW',
        entity: 'Profile',
        entityId: userId,
        description: `Officer ${officerId} viewed profile of user ${userId}`,
      },
    });

    return profile;
  }

  private toResponse(profile: any): ProfileResponseDto {
    return {
      id: profile.id,
      gender: profile.gender,
      dateOfBirth: profile.dateOfBirth,
      avatar: profile.avatar,
      bio: profile.bio,
      city: profile.city,
      state: profile.state,
      country: profile.country,
      postalCode: profile.postalCode,
      createdAt: profile.createdAt,
      updatedAt: profile.Updated,
    };
  }
}