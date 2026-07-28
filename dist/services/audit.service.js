"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const exceptions_1 = require("../exceptions");
const EXPORT_MAX_LIMIT = 10000;
const DEFAULT_RETENTION_DAYS = 2555;
class AuditService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(data) {
        await this.prisma.auditLog.create({
            data: {
                userId: data.userId,
                action: data.action,
                entity: data.entity,
                entityId: data.entityId,
                description: data.description,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                metaData: {
                    ...data.metaData,
                    oldValues: data.oldValues,
                    newValues: data.newValues,
                },
            },
        });
    }
    async findAll(params) {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (params.userId)
            where.userId = params.userId;
        if (params.entity)
            where.entity = params.entity;
        if (params.action)
            where.action = params.action;
        if (params.startDate || params.endDate) {
            where.createdAt = {};
            if (params.startDate)
                where.createdAt.gte = params.startDate;
            if (params.endDate)
                where.createdAt.lte = params.endDate;
        }
        const [data, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { userid: true, firstName: true, lastName: true, email: true },
                    },
                },
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findById(id) {
        const log = await this.prisma.auditLog.findUnique({
            where: { id },
            include: {
                user: {
                    select: { userid: true, firstName: true, lastName: true, email: true },
                },
            },
        });
        if (!log) {
            throw new exceptions_1.NotFoundError('Audit log not found');
        }
        return log;
    }
    async purgeOldLogs(retentionDays = DEFAULT_RETENTION_DAYS) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - retentionDays);
        const result = await this.prisma.auditLog.deleteMany({
            where: { createdAt: { lt: cutoff } },
        });
        return result.count;
    }
    async exportLogs(params) {
        const where = {};
        if (params.entity)
            where.entity = params.entity;
        if (params.startDate || params.endDate) {
            where.createdAt = {};
            if (params.startDate)
                where.createdAt.gte = params.startDate;
            if (params.endDate)
                where.createdAt.lte = params.endDate;
        }
        return this.prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: EXPORT_MAX_LIMIT,
            include: {
                user: {
                    select: { userid: true, firstName: true, lastName: true, email: true },
                },
            },
        });
    }
}
exports.AuditService = AuditService;
