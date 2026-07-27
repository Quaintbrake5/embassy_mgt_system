import { PrismaClient } from '../generated/prisma/client';
import { CreatePermissionDto, UpdatePermissionDto, PermissionResponseDto, PaginatedPermissionsDto } from '../dto/permission.dto';
import { ValidationError, NotFoundError, ConflictError } from '../exceptions';

export interface IPermissionService {
  create(dto: CreatePermissionDto): Promise<PermissionResponseDto>;
  findById(permissionId: string): Promise<PermissionResponseDto>;
  findAll(page: number, limit: number): Promise<PaginatedPermissionsDto>;
  update(permissionId: string, dto: UpdatePermissionDto): Promise<PermissionResponseDto>;
  delete(permissionId: string): Promise<void>;
}

export class PermissionService implements IPermissionService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(dto: CreatePermissionDto): Promise<PermissionResponseDto> {
    const existing = await this.prisma.permission.findUnique({
      where: { slug: dto.slug.toLowerCase() },
    });
    if (existing) {
      throw new ConflictError('Permission slug already exists');
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

  async findById(permissionId: string): Promise<PermissionResponseDto> {
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundError('Permission not found');
    }

    return this.toResponse(permission);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<PaginatedPermissionsDto> {
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

  async update(permissionId: string, dto: UpdatePermissionDto): Promise<PermissionResponseDto> {
    const existing = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!existing) {
      throw new NotFoundError('Permission not found');
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugExists = await this.prisma.permission.findUnique({
        where: { slug: dto.slug.toLowerCase() },
      });
      if (slugExists) {
        throw new ConflictError('Permission slug already exists');
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

  async delete(permissionId: string): Promise<void> {
    const existing = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!existing) {
      throw new NotFoundError('Permission not found');
    }

    // Check if permission is assigned to any roles
    const roleCount = await this.prisma.rolePermission.count({
      where: { permissionId },
    });

    if (roleCount > 0) {
      throw new ConflictError('Cannot delete permission assigned to roles');
    }

    await this.prisma.permission.delete({
      where: { id: permissionId },
    });
  }

  private toResponse(permission: any): PermissionResponseDto {
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