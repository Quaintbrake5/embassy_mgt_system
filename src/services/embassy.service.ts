import { PrismaClient } from '../generated/prisma/client';
import {
  CreateEmbassyDto, UpdateEmbassyDto, EmbassyResponseDto, PaginatedEmbassiesDto,
  CreateDepartmentDto, UpdateDepartmentDto, DepartmentResponseDto,
} from '../dto/embassy.dto';
import { NotFoundError, ConflictError } from '../exceptions';

export interface IEmbassyService {
  create(dto: CreateEmbassyDto, userId?: string): Promise<EmbassyResponseDto>;
  findById(embassyId: string): Promise<EmbassyResponseDto>;
  findAll(page: number, limit: number): Promise<PaginatedEmbassiesDto>;
  update(embassyId: string, dto: UpdateEmbassyDto, userId?: string): Promise<EmbassyResponseDto>;
  delete(embassyId: string, userId?: string): Promise<void>;
  createDepartment(embassyId: string, dto: CreateDepartmentDto, userId?: string): Promise<DepartmentResponseDto>;
  findDepartments(embassyId: string): Promise<DepartmentResponseDto[]>;
  updateDepartment(departmentId: string, dto: UpdateDepartmentDto, userId?: string): Promise<DepartmentResponseDto>;
  deleteDepartment(departmentId: string, userId?: string): Promise<void>;
}

export class EmbassyService implements IEmbassyService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(dto: CreateEmbassyDto, userId?: string): Promise<EmbassyResponseDto> {
    const existing = await this.prisma.embassy.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictError('Embassy code already exists');
    }

    const embassy = await this.prisma.embassy.create({
      data: {
        name: dto.name,
        code: dto.code,
        country: dto.country,
        city: dto.city,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        operatingHours: dto.operatingHours,
      },
      include: { departments: true },
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          entity: 'Embassy',
          entityId: embassy.id,
          description: `Created embassy: ${embassy.name} (${embassy.code})`,
          metaData: { newValues: { name: embassy.name, code: embassy.code, country: embassy.country } },
        },
      });
    }

    return this.toResponse(embassy);
  }

  async findById(embassyId: string): Promise<EmbassyResponseDto> {
    const embassy = await this.prisma.embassy.findUnique({
      where: { id: embassyId },
      include: { departments: true },
    });

    if (!embassy) {
      throw new NotFoundError('Embassy not found');
    }

    return this.toResponse(embassy);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<PaginatedEmbassiesDto> {
    const skip = (page - 1) * limit;
    const take = limit;

    const [embassies, total] = await Promise.all([
      this.prisma.embassy.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.embassy.count(),
    ]);

    return {
      data: embassies.map(e => this.toResponse({ ...e, departments: [] })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(embassyId: string, dto: UpdateEmbassyDto, userId?: string): Promise<EmbassyResponseDto> {
    const existing = await this.prisma.embassy.findUnique({
      where: { id: embassyId },
    });

    if (!existing) {
      throw new NotFoundError('Embassy not found');
    }

    if (dto.code && dto.code !== existing.code) {
      const codeExists = await this.prisma.embassy.findUnique({
        where: { code: dto.code },
      });
      if (codeExists) {
        throw new ConflictError('Embassy code already exists');
      }
    }

    const embassy = await this.prisma.embassy.update({
      where: { id: embassyId },
      data: {
        name: dto.name,
        code: dto.code,
        country: dto.country,
        city: dto.city,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        operatingHours: dto.operatingHours,
      },
      include: { departments: true },
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          entity: 'Embassy',
          entityId: embassy.id,
          description: `Updated embassy: ${embassy.name}`,
          metaData: {
            oldValues: { name: existing.name, code: existing.code },
            newValues: { name: embassy.name, code: embassy.code },
          },
        },
      });
    }

    return this.toResponse(embassy);
  }

  async delete(embassyId: string, userId?: string): Promise<void> {
    const existing = await this.prisma.embassy.findUnique({
      where: { id: embassyId },
    });

    if (!existing) {
      throw new NotFoundError('Embassy not found');
    }

    const dependentCounts = await Promise.all([
      this.prisma.department.count({ where: { embassyId } }),
      this.prisma.serviceRequest.count({ where: { embassyId } }),
      this.prisma.appointment.count({ where: { embassyId } }),
      this.prisma.visaApplication.count({ where: { embassyId } }),
      this.prisma.emergencyCase.count({ where: { embassyId } }),
    ]);

    const totalDependents = dependentCounts.reduce((a, b) => a + b, 0);
    if (totalDependents > 0) {
      throw new ConflictError(
        `Cannot delete embassy with ${totalDependents} active dependent records (departments, service requests, appointments, visa applications, emergency cases)`
      );
    }

    await this.prisma.embassy.delete({
      where: { id: embassyId },
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'DELETE',
          entity: 'Embassy',
          entityId: embassyId,
          description: `Deleted embassy: ${existing.name} (${existing.code})`,
        },
      });
    }
  }

  async createDepartment(embassyId: string, dto: CreateDepartmentDto, userId?: string): Promise<DepartmentResponseDto> {
    const embassy = await this.prisma.embassy.findUnique({
      where: { id: embassyId },
    });

    if (!embassy) {
      throw new NotFoundError('Embassy not found');
    }

    const existing = await this.prisma.department.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictError('Department slug already exists');
    }

    const department = await this.prisma.department.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        embassyId,
      },
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          entity: 'Department',
          entityId: department.id,
          description: `Created department: ${department.name} in embassy ${embassy.name}`,
          metaData: { newValues: { name: department.name, slug: department.slug } },
        },
      });
    }

    return this.toDepartmentResponse(department);
  }

  async findDepartments(embassyId: string): Promise<DepartmentResponseDto[]> {
    const departments = await this.prisma.department.findMany({
      where: { embassyId },
      orderBy: { name: 'asc' },
    });

    return departments.map(this.toDepartmentResponse);
  }

  async updateDepartment(departmentId: string, dto: UpdateDepartmentDto, userId?: string): Promise<DepartmentResponseDto> {
    const existing = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!existing) {
      throw new NotFoundError('Department not found');
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugExists = await this.prisma.department.findUnique({
        where: { slug: dto.slug },
      });
      if (slugExists) {
        throw new ConflictError('Department slug already exists');
      }
    }

    const department = await this.prisma.department.update({
      where: { id: departmentId },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
      },
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          entity: 'Department',
          entityId: department.id,
          description: `Updated department: ${department.name}`,
          metaData: {
            oldValues: { name: existing.name, slug: existing.slug },
            newValues: { name: department.name, slug: department.slug },
          },
        },
      });
    }

    return this.toDepartmentResponse(department);
  }

  async deleteDepartment(departmentId: string, userId?: string): Promise<void> {
    const existing = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!existing) {
      throw new NotFoundError('Department not found');
    }

    await this.prisma.department.delete({
      where: { id: departmentId },
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'DELETE',
          entity: 'Department',
          entityId: departmentId,
          description: `Deleted department: ${existing.name}`,
        },
      });
    }
  }

  private toResponse(embassy: any): EmbassyResponseDto {
    return {
      id: embassy.id,
      name: embassy.name,
      code: embassy.code,
      country: embassy.country,
      city: embassy.city,
      address: embassy.address,
      phone: embassy.phone,
      email: embassy.email,
      operatingHours: embassy.operatingHours,
      departments: embassy.departments?.map(this.toDepartmentResponse),
      createdAt: embassy.createdAt,
      updatedAt: embassy.Updated,
    };
  }

  private toDepartmentResponse(dept: any): DepartmentResponseDto {
    return {
      id: dept.id,
      name: dept.name,
      slug: dept.slug,
      description: dept.description,
      embassyId: dept.embassyId,
      createdAt: dept.createdAt,
      updatedAt: dept.Updated,
    };
  }
}