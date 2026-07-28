"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
const client_1 = require("../generated/prisma/client");
const exceptions_1 = require("../exceptions");
class ProfileService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createProfile(userId, dto, requestingUserId) {
        let profile;
        try {
            profile = await this.prisma.profile.create({
                data: {
                    id: userId,
                    gender: dto.gender,
                    dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
                    avatar: dto.avatar,
                    bio: dto.bio,
                    city: dto.city,
                    state: dto.state,
                    country: dto.country,
                    postalCode: dto.postalCode,
                },
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new exceptions_1.ConflictError('Profile already exists for this user');
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
    async getProfile(userId, requestingUserId) {
        const profile = await this.prisma.profile.findUnique({
            where: { id: userId },
        });
        if (!profile) {
            throw new exceptions_1.NotFoundError('Profile not found');
        }
        return this.toResponse(profile);
    }
    async updateProfile(userId, dto, requestingUserId) {
        let profile;
        try {
            profile = await this.prisma.profile.update({
                where: { id: userId },
                data: {
                    gender: dto.gender !== undefined ? dto.gender : undefined,
                    dateOfBirth: dto.dateOfBirth !== undefined ? (dto.dateOfBirth ? new Date(dto.dateOfBirth) : null) : undefined,
                    avatar: dto.avatar !== undefined ? dto.avatar : undefined,
                    bio: dto.bio !== undefined ? dto.bio : undefined,
                    city: dto.city !== undefined ? dto.city : undefined,
                    state: dto.state !== undefined ? dto.state : undefined,
                    country: dto.country !== undefined ? dto.country : undefined,
                    postalCode: dto.postalCode !== undefined ? dto.postalCode : undefined,
                },
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new exceptions_1.NotFoundError('Profile not found');
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
    async deleteProfile(userId, requestingUserId) {
        try {
            await this.prisma.profile.update({
                where: { id: userId },
                data: {
                    gender: 'PREFER_NOT_TO_SAY',
                    dateOfBirth: null,
                    avatar: null,
                    bio: null,
                    city: null,
                    state: null,
                    country: null,
                    postalCode: null,
                },
            });
            const anonEmail = `deleted-${userId}@anonymous.ems`;
            await this.prisma.user.update({
                where: { userid: userId },
                data: {
                    firstName: 'Anonymous',
                    lastName: 'User',
                    email: anonEmail,
                    phone: null,
                    passwordHash: '',
                    status: 'INACTIVE',
                },
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                throw new exceptions_1.NotFoundError('Profile not found');
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
                    description: `GDPR anonymization of profile and user record for user ${userId}`,
                },
            });
        }
    }
    async findProfileByOfficer(userId, officerId) {
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
    toResponse(profile) {
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
exports.ProfileService = ProfileService;
