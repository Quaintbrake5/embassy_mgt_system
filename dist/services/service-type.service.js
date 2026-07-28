"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceTypeService = void 0;
const exceptions_1 = require("../exceptions");
class ServiceTypeService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, userId) {
        const existing = await this.prisma.serviceType.findUnique({
            where: { slug: dto.slug },
        });
        if (existing) {
            throw new exceptions_1.ConflictError('Service type slug already exists');
        }
        const serviceType = await this.prisma.serviceType.create({
            data: {
                name: dto.name,
                slug: dto.slug,
                category: dto.category,
                description: dto.description,
                fee: dto.fee,
                duration: dto.duration,
                requiresAppointment: dto.requiresAppointment ?? false,
            },
        });
        if (userId) {
            await this.prisma.auditLog.create({
                data: {
                    userId,
                    action: 'CREATE',
                    entity: 'ServiceType',
                    entityId: serviceType.id,
                    description: `Created service type: ${serviceType.name}`,
                    metaData: { newValues: { name: serviceType.name, slug: serviceType.slug } },
                },
            });
        }
        return this.toResponse(serviceType);
    }
    async findById(serviceTypeId) {
        const serviceType = await this.prisma.serviceType.findUnique({
            where: { id: serviceTypeId },
        });
        if (!serviceType) {
            throw new exceptions_1.NotFoundError('Service type not found');
        }
        return this.toResponse(serviceType);
    }
    async findAll(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const take = limit;
        const [items, total] = await Promise.all([
            this.prisma.serviceType.findMany({
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.serviceType.count(),
        ]);
        return {
            data: items.map(this.toResponse),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async findByCategory(category) {
        const items = await this.prisma.serviceType.findMany({
            where: { category: category },
            orderBy: { name: 'asc' },
        });
        return items.map(this.toResponse);
    }
    async update(serviceTypeId, dto, userId) {
        const existing = await this.prisma.serviceType.findUnique({
            where: { id: serviceTypeId },
        });
        if (!existing) {
            throw new exceptions_1.NotFoundError('Service type not found');
        }
        if (dto.slug && dto.slug !== existing.slug) {
            const slugExists = await this.prisma.serviceType.findUnique({
                where: { slug: dto.slug },
            });
            if (slugExists) {
                throw new exceptions_1.ConflictError('Service type slug already exists');
            }
        }
        const serviceType = await this.prisma.serviceType.update({
            where: { id: serviceTypeId },
            data: {
                name: dto.name,
                slug: dto.slug,
                category: dto.category,
                description: dto.description,
                fee: dto.fee,
                duration: dto.duration,
                requiresAppointment: dto.requiresAppointment,
            },
        });
        if (userId) {
            await this.prisma.auditLog.create({
                data: {
                    userId,
                    action: 'UPDATE',
                    entity: 'ServiceType',
                    entityId: serviceType.id,
                    description: `Updated service type: ${serviceType.name}`,
                    metaData: {
                        oldValues: { name: existing.name, slug: existing.slug },
                        newValues: { name: serviceType.name, slug: serviceType.slug },
                    },
                },
            });
        }
        return this.toResponse(serviceType);
    }
    async delete(serviceTypeId, userId) {
        const existing = await this.prisma.serviceType.findUnique({
            where: { id: serviceTypeId },
        });
        if (!existing) {
            throw new exceptions_1.NotFoundError('Service type not found');
        }
        const requestsCount = await this.prisma.serviceRequest.count({
            where: { serviceTypeId },
        });
        if (requestsCount > 0) {
            throw new exceptions_1.ConflictError('Cannot delete service type with existing service requests');
        }
        await this.prisma.serviceType.delete({
            where: { id: serviceTypeId },
        });
        if (userId) {
            await this.prisma.auditLog.create({
                data: {
                    userId,
                    action: 'DELETE',
                    entity: 'ServiceType',
                    entityId: serviceTypeId,
                    description: `Deleted service type: ${existing.name}`,
                },
            });
        }
    }
    toResponse(item) {
        return {
            id: item.id,
            name: item.name,
            slug: item.slug,
            category: item.category,
            description: item.description,
            fee: item.fee ? Number(item.fee) : undefined,
            duration: item.duration,
            requiresAppointment: item.requiresAppointment,
            createdAt: item.createdAt,
            updatedAt: item.Updated,
        };
    }
}
exports.ServiceTypeService = ServiceTypeService;
