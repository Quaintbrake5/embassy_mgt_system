import { PrismaClient } from '../generated/prisma/client';
import { NotFoundError } from '../exceptions';

const EXPORT_MAX_LIMIT = 10000;

export interface IAuditService {
  log(data: {
    userId: string;
    action: string;
    entity: string;
    entityId: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
    metaData?: any;
    oldValues?: any;
    newValues?: any;
  }): Promise<void>;
  findAll(params: {
    userId?: string;
    entity?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    data: any[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>;
  findById(id: string): Promise<any>;
  exportLogs(params: { startDate?: Date; endDate?: Date; entity?: string }): Promise<any[]>;
}

export class AuditService implements IAuditService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async log(data: {
    userId: string;
    action: string;
    entity: string;
    entityId: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
    metaData?: any;
    oldValues?: any;
    newValues?: any;
  }): Promise<void> {
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

  async findAll(params: {
    userId?: string;
    entity?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    data: any[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.userId) where.userId = params.userId;
    if (params.entity) where.entity = params.entity;
    if (params.action) where.action = params.action;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
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

  async findById(id: string): Promise<any> {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: { userid: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!log) {
      throw new NotFoundError('Audit log not found');
    }

    return log;
  }

  async exportLogs(params: {
    startDate?: Date;
    endDate?: Date;
    entity?: string;
  }): Promise<any[]> {
    const where: any = {};

    if (params.entity) where.entity = params.entity;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
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