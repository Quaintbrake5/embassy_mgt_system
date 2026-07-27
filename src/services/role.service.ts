import { PrismaClient } from '../generated/prisma/client';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsDto, RoleResponseDto, PaginatedRolesDto } from '../dto/role.dto';
import { ValidationError, NotFoundError, ConflictError } from '../exceptions';

export interface IRoleService {
  create(dto: CreateRoleDto): Promise<RoleResponseDto>;
  findById(roleId: string): Promise<RoleResponseDto>;
  findAll(page: number, limit: number): Promise<PaginatedRolesDto>;
  update(roleId: string, dto: UpdateRoleDto): Promise<RoleResponseDto>;
  delete(roleId: string): Promise<void>;
  assignPermissions(roleId: string, dto: AssignPermissionsDto): Promise<RoleResponseDto>;
}

export class RoleService implements IRoleService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(dto: CreateRoleDto): Promise<RoleResponseDto> {
    const existing = await this.prisma.role.findUnique({
      where: { slug: dto.slug.toLowerCase() },
    });
    if (existing) {
      throw new ConflictError('Role slug already exists');
    }

    const role = await this.prisma.role.create({
      data: {
        name: dto.name.trim(),
        slug: dto.slug.toLowerCase().trim(),
        description: dto.description?.trim(),
      },
    });

    return this.toResponse(role);
  }

  async findById(roleId: string): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    return this.toResponseWithPermissions(role);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<PaginatedRolesDto> {
    const skip = (page - 1) * limit;
    const take = limit;

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      }),
      this.prisma.role.count(),
    ]);

    return {
      data: roles.map(this.toResponseWithPermissions),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(roleId: string, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    const existing = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!existing) {
      throw new NotFoundError('Role not found');
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugExists = await this.prisma.role.findUnique({
        where: { slug: dto.slug.toLowerCase() },
      });
      if (slugExists) {
        throw new ConflictError('Role slug already exists');
      }
    }

    const role = await this.prisma.role.update({
      where: { id: roleId },
      data: {
        name: dto.name?.trim(),
        slug: dto.slug?.toLowerCase().trim(),
        description: dto.description?.trim(),
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return this.toResponseWithPermissions(role);
  }

  async delete(roleId: string): Promise<void> {
    const existing = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!existing) {
      throw new NotFoundError('Role not found');
    }

    const usersWithRole = await this.prisma.user.count({
      where: { roleId },
    });

    if (usersWithRole > 0) {
      throw new ConflictError('Cannot delete role assigned to users');
    }

    await this.prisma.role.delete({
      where: { id: roleId },
    });
  }

  async assignPermissions(roleId: string, dto: AssignPermissionsDto): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Verify all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: dto.permissionIds } },
    });

    if (permissions.length !== dto.permissionIds.length) {
      throw new NotFoundError('One or more permissions not found');
    }

    // Clear existing permissions
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Assign new permissions
    if (dto.permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      });
    }

    // Return updated role with permissions
    return this.findById(roleId);
  }

  private toResponse(role: any): RoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.Updated,
    };
  }

  private toResponseWithPermissions(role: any): RoleResponseDto {
    return {
      ...this.toResponse(role),
      permissions: role.rolePermissions?.map((rp: any) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        slug: rp.permission.slug,
        description: rp.permission.description,
        createdAt: rp.permission.createdAt,
        updatedAt: rp.permission.Updated,
      })) || [],
    };
  }
}