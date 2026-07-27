import { PrismaClient } from '../generated/prisma/client';
import {
  CreateServiceTypeDto, UpdateServiceTypeDto, ServiceTypeResponseDto, PaginatedServiceTypesDto,
} from '../dto/service-type.dto';
import { NotFoundError, ConflictError } from '../exceptions';

export interface IServiceTypeService {
  create(dto: CreateServiceTypeDto, userId?: string): Promise<ServiceTypeResponseDto>;
  findById(serviceTypeId: string): Promise<ServiceTypeResponseDto>;
  findAll(page: number, limit: number): Promise<PaginatedServiceTypesDto>;
  findByCategory(category: string): Promise<ServiceTypeResponseDto[]>;
  update(serviceTypeId: string, dto: UpdateServiceTypeDto, userId?: string): Promise<ServiceTypeResponseDto>;
  delete(serviceTypeId: string, userId?: string): Promise<void>;
}

export class ServiceTypeService implements IServiceTypeService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(dto: CreateServiceTypeDto, userId?: string): Promise<ServiceTypeResponseDto> {
    const existing = await this.prisma.serviceType.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictError('Service type slug already exists');
    }

    const serviceType = await this.prisma.serviceType.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        category: dto.category as any,
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

  async findById(serviceTypeId: string): Promise<ServiceTypeResponseDto> {
    const serviceType = await this.prisma.serviceType.findUnique({
      where: { id: serviceTypeId },
    });

    if (!serviceType) {
      throw new NotFoundError('Service type not found');
    }

    return this.toResponse(serviceType);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<PaginatedServiceTypesDto> {
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

  async findByCategory(category: string): Promise<ServiceTypeResponseDto[]> {
    const items = await this.prisma.serviceType.findMany({
      where: { category: category as any },
      orderBy: { name: 'asc' },
    });

    return items.map(this.toResponse);
  }

  async update(serviceTypeId: string, dto: UpdateServiceTypeDto, userId?: string): Promise<ServiceTypeResponseDto> {
    const existing = await this.prisma.serviceType.findUnique({
      where: { id: serviceTypeId },
    });

    if (!existing) {
      throw new NotFoundError('Service type not found');
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugExists = await this.prisma.serviceType.findUnique({
        where: { slug: dto.slug },
      });
      if (slugExists) {
        throw new ConflictError('Service type slug already exists');
      }
    }

    const serviceType = await this.prisma.serviceType.update({
      where: { id: serviceTypeId },
      data: {
        name: dto.name,
        slug: dto.slug,
        category: dto.category as any,
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

  async delete(serviceTypeId: string, userId?: string): Promise<void> {
    const existing = await this.prisma.serviceType.findUnique({
      where: { id: serviceTypeId },
    });

    if (!existing) {
      throw new NotFoundError('Service type not found');
    }

    const requestsCount = await this.prisma.serviceRequest.count({
      where: { serviceTypeId },
    });

    if (requestsCount > 0) {
      throw new ConflictError('Cannot delete service type with existing service requests');
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

  private toResponse(item: any): ServiceTypeResponseDto {
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