import { PrismaClient } from '../generated/prisma/client';
import { hashPassword } from '../utils/bcrypt.utilities';
import { CreateUserDto, UpdateUserDto, UserResponseDto, PaginatedUsersDto } from '../dto/user.dto';
import { ValidationError, NotFoundError, ConflictError } from '../exceptions';

export interface IUserService {
  create(dto: CreateUserDto): Promise<UserResponseDto>;
  findById(userId: string): Promise<UserResponseDto>;
  findAll(page: number, limit: number): Promise<PaginatedUsersDto>;
  update(userId: string, dto: UpdateUserDto): Promise<UserResponseDto>;
  delete(userId: string): Promise<void>;
  getProfile(userId: string): Promise<any>;
  changeStatus(userId: string, status: string): Promise<UserResponseDto>;
  updateProfile(userId: string, dto: UpdateUserDto): Promise<UserResponseDto>;
  assignRole(userId: string, roleId: string): Promise<UserResponseDto>;
}

export class UserService implements IUserService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingEmail) {
      throw new ConflictError('Email already registered');
    }

    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictError('Phone number already registered');
      }
    }

    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });
      if (!role) {
        throw new NotFoundError('Role not found');
      }
    }

    const passwordHash = await hashPassword(dto.password);

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

  async findById(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { userid: userId },
      include: {
        role: true,
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.toResponse(user);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<PaginatedUsersDto> {
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

  async update(userId: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findUnique({
      where: { userid: userId },
    });

    if (!existing) {
      throw new NotFoundError('User not found');
    }

    // Check email uniqueness if changing
    if (dto.email && dto.email !== existing.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
      if (emailExists) {
        throw new ConflictError('Email already in use');
      }
    }

    // Check phone uniqueness if changing
    if (dto.phone && dto.phone !== existing.phone) {
      const phoneExists = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (phoneExists) {
        throw new ConflictError('Phone number already in use');
      }
    }

    // Check role exists if provided
    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });
      if (!role) {
        throw new NotFoundError('Role not found');
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

  async delete(userId: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { userid: userId },
    });

    if (!existing) {
      throw new NotFoundError('User not found');
    }

    await this.prisma.user.delete({
      where: { userid: userId },
    });
  }

  async getProfile(userId: string): Promise<any> {
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

  async changeStatus(userId: string, status: string): Promise<UserResponseDto> {
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
      data: { status: status as any },
      include: {
        role: true,
        profile: true,
      },
    });

    return this.toResponse(user);
  }

  async updateProfile(userId: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findUnique({
      where: { userid: userId },
    });

    if (!existing) {
      throw new NotFoundError('User not found');
    }

    // Strip status and roleId from dto - user cannot change their own status or role
    const { status, roleId, ...updateData } = dto;

    // Check email uniqueness if changing
    if (updateData.email && updateData.email !== existing.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateData.email.toLowerCase() },
      });
      if (emailExists) {
        throw new ConflictError('Email already in use');
      }
    }

    // Check phone uniqueness if changing
    if (updateData.phone && updateData.phone !== existing.phone) {
      const phoneExists = await this.prisma.user.findUnique({
        where: { phone: updateData.phone },
      });
      if (phoneExists) {
        throw new ConflictError('Phone number already in use');
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

  async assignRole(userId: string, roleId: string): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findUnique({
      where: { userid: userId },
    });

    if (!existing) {
      throw new NotFoundError('User not found');
    }

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
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

  private toResponse(user: any): UserResponseDto {
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