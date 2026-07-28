"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const bcrypt_utilities_1 = require("../utils/bcrypt.utilities");
const exceptions_1 = require("../exceptions");
class UserService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const existingEmail = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });
        if (existingEmail) {
            throw new exceptions_1.ConflictError('Email already registered');
        }
        if (dto.phone) {
            const existingPhone = await this.prisma.user.findUnique({
                where: { phone: dto.phone },
            });
            if (existingPhone) {
                throw new exceptions_1.ConflictError('Phone number already registered');
            }
        }
        if (dto.roleId) {
            const role = await this.prisma.role.findUnique({
                where: { id: dto.roleId },
            });
            if (!role) {
                throw new exceptions_1.NotFoundError('Role not found');
            }
        }
        const passwordHash = await (0, bcrypt_utilities_1.hashPassword)(dto.password);
        const user = await this.prisma.user.create({
            data: {
                firstName: dto.firstName.trim(),
                lastName: dto.lastName.trim(),
                email: dto.email.toLowerCase().trim(),
                phone: dto.phone?.trim(),
                passwordHash,
                emailVerified: false,
                status: dto.status || 'PENDING',
                roleId: dto.roleId,
            },
            include: {
                role: true,
                profile: true,
            },
        });
        return this.toResponse(user);
    }
    async findById(userId) {
        const user = await this.prisma.user.findUnique({
            where: { userid: userId },
            include: {
                role: true,
                profile: true,
            },
        });
        if (!user) {
            throw new exceptions_1.NotFoundError('User not found');
        }
        return this.toResponse(user);
    }
    async findAll(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const take = limit;
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    role: true,
                    profile: true,
                },
            }),
            this.prisma.user.count(),
        ]);
        return {
            data: users.map(this.toResponse),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async update(userId, dto) {
        const existing = await this.prisma.user.findUnique({
            where: { userid: userId },
        });
        if (!existing) {
            throw new exceptions_1.NotFoundError('User not found');
        }
        // Check email uniqueness if changing
        if (dto.email && dto.email !== existing.email) {
            const emailExists = await this.prisma.user.findUnique({
                where: { email: dto.email.toLowerCase() },
            });
            if (emailExists) {
                throw new exceptions_1.ConflictError('Email already in use');
            }
        }
        // Check phone uniqueness if changing
        if (dto.phone && dto.phone !== existing.phone) {
            const phoneExists = await this.prisma.user.findUnique({
                where: { phone: dto.phone },
            });
            if (phoneExists) {
                throw new exceptions_1.ConflictError('Phone number already in use');
            }
        }
        // Check role exists if provided
        if (dto.roleId) {
            const role = await this.prisma.role.findUnique({
                where: { id: dto.roleId },
            });
            if (!role) {
                throw new exceptions_1.NotFoundError('Role not found');
            }
        }
        const user = await this.prisma.user.update({
            where: { userid: userId },
            data: {
                firstName: dto.firstName?.trim(),
                lastName: dto.lastName?.trim(),
                email: dto.email?.toLowerCase().trim(),
                phone: dto.phone?.trim(),
                roleId: dto.roleId,
                status: dto.status,
            },
            include: {
                role: true,
                profile: true,
            },
        });
        return this.toResponse(user);
    }
    async delete(userId) {
        const existing = await this.prisma.user.findUnique({
            where: { userid: userId },
        });
        if (!existing) {
            throw new exceptions_1.NotFoundError('User not found');
        }
        await this.prisma.user.delete({
            where: { userid: userId },
        });
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { userid: userId },
            include: { profile: true, role: true },
        });
        if (!user) {
            throw new Error('User not found');
        }
        return {
            user: this.toResponse(user),
            profile: user.profile,
        };
    }
    async changeStatus(userId, status) {
        const validStatuses = ['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'];
        if (!validStatuses.includes(status)) {
            throw new Error('Invalid status');
        }
        const existing = await this.prisma.user.findUnique({
            where: { userid: userId },
        });
        if (!existing) {
            throw new Error('User not found');
        }
        const user = await this.prisma.user.update({
            where: { userid: userId },
            data: { status: status },
            include: {
                role: true,
                profile: true,
            },
        });
        return this.toResponse(user);
    }
    async updateProfile(userId, dto) {
        const existing = await this.prisma.user.findUnique({
            where: { userid: userId },
        });
        if (!existing) {
            throw new exceptions_1.NotFoundError('User not found');
        }
        // Strip status and roleId from dto - user cannot change their own status or role
        const { status, roleId, ...updateData } = dto;
        // Check email uniqueness if changing
        if (updateData.email && updateData.email !== existing.email) {
            const emailExists = await this.prisma.user.findUnique({
                where: { email: updateData.email.toLowerCase() },
            });
            if (emailExists) {
                throw new exceptions_1.ConflictError('Email already in use');
            }
        }
        // Check phone uniqueness if changing
        if (updateData.phone && updateData.phone !== existing.phone) {
            const phoneExists = await this.prisma.user.findUnique({
                where: { phone: updateData.phone },
            });
            if (phoneExists) {
                throw new exceptions_1.ConflictError('Phone number already in use');
            }
        }
        const user = await this.prisma.user.update({
            where: { userid: userId },
            data: {
                firstName: updateData.firstName?.trim(),
                lastName: updateData.lastName?.trim(),
                email: updateData.email?.toLowerCase().trim(),
                phone: updateData.phone?.trim(),
            },
            include: {
                role: true,
                profile: true,
            },
        });
        return this.toResponse(user);
    }
    async assignRole(userId, roleId) {
        const existing = await this.prisma.user.findUnique({
            where: { userid: userId },
        });
        if (!existing) {
            throw new exceptions_1.NotFoundError('User not found');
        }
        const role = await this.prisma.role.findUnique({
            where: { id: roleId },
        });
        if (!role) {
            throw new exceptions_1.NotFoundError('Role not found');
        }
        const user = await this.prisma.user.update({
            where: { userid: userId },
            data: { roleId },
            include: {
                role: true,
                profile: true,
            },
        });
        return this.toResponse(user);
    }
    toResponse(user) {
        return {
            userid: user.userid,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            roleId: user.roleId,
            role: user.role ? {
                id: user.role.id,
                name: user.role.name,
                slug: user.role.slug,
            } : undefined,
            emailVerified: user.emailVerified,
            lastLoginAt: user.lastLoginAt,
            status: user.status,
            createdAt: user.createdAt,
            updatedAt: user.Updated,
            profile: user.profile,
        };
    }
}
exports.UserService = UserService;
