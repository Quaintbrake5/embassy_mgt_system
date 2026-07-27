"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionService = void 0;
const exceptions_1 = require("../exceptions");
class PermissionService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const existing = await this.prisma.permission.findUnique({
            where: { slug: dto.slug.toLowerCase() },
        });
        if (existing) {
            throw new exceptions_1.ConflictError('Permission slug already exists');
        }
        const permission = await this.prisma.permission.create({
            data: {
                name: dto.name.trim(),
                slug: dto.slug.toLowerCase().trim(),
                description: dto.description?.trim(),
            },
        });
        return this.toResponse(permission);
    }
    async findById(permissionId) {
        const permission = await this.prisma.permission.findUnique({
            where: { id: permissionId },
        });
        if (!permission) {
            throw new exceptions_1.NotFoundError('Permission not found');
        }
        return this.toResponse(permission);
    }
    async findAll(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const take = limit;
        const [permissions, total] = await Promise.all([
            this.prisma.permission.findMany({
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.permission.count(),
        ]);
        return {
            data: permissions.map(this.toResponse),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async update(permissionId, dto) {
        const existing = await this.prisma.permission.findUnique({
            where: { id: permissionId },
        });
        if (!existing) {
            throw new exceptions_1.NotFoundError('Permission not found');
        }
        if (dto.slug && dto.slug !== existing.slug) {
            const slugExists = await this.prisma.permission.findUnique({
                where: { slug: dto.slug.toLowerCase() },
            });
            if (slugExists) {
                throw new exceptions_1.ConflictError('Permission slug already exists');
            }
        }
        const permission = await this.prisma.permission.update({
            where: { id: permissionId },
            data: {
                name: dto.name?.trim(),
                slug: dto.slug?.toLowerCase().trim(),
                description: dto.description?.trim(),
            },
        });
        return this.toResponse(permission);
    }
    async delete(permissionId) {
        const existing = await this.prisma.permission.findUnique({
            where: { id: permissionId },
        });
        if (!existing) {
            throw new exceptions_1.NotFoundError('Permission not found');
        }
        // Check if permission is assigned to any roles
        const roleCount = await this.prisma.rolePermission.count({
            where: { permissionId },
        });
        if (roleCount > 0) {
            throw new exceptions_1.ConflictError('Cannot delete permission assigned to roles');
        }
        await this.prisma.permission.delete({
            where: { id: permissionId },
        });
    }
    toResponse(permission) {
        return {
            id: permission.id,
            name: permission.name,
            slug: permission.slug,
            description: permission.description,
            createdAt: permission.createdAt,
            updatedAt: permission.Updated,
        };
    }
}
exports.PermissionService = PermissionService;
