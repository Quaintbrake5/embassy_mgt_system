import validator from 'validator';

export class CreateRoleDto {
  name!: string;
  slug!: string;
  description?: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.name || typeof data.name !== 'string') {
      errors.push('Role name is required');
    } else if (data.name.trim().length < 2) {
      errors.push('Role name must be at least 2 characters');
    } else if (data.name.trim().length > 100) {
      errors.push('Role name must not exceed 100 characters');
    }

    if (!data.slug || typeof data.slug !== 'string') {
      errors.push('Role slug is required');
    } else if (!/^[a-z0-9_-]+$/.test(data.slug)) {
      errors.push('Role slug must contain only lowercase letters, numbers, underscores, and hyphens');
    } else if (data.slug.length > 50) {
      errors.push('Role slug must not exceed 50 characters');
    }

    if (data.description !== undefined && data.description !== null && data.description !== '') {
      if (typeof data.description !== 'string') {
        errors.push('Description must be a string');
      } else if (data.description.length > 500) {
        errors.push('Description must not exceed 500 characters');
      }
    }

    return errors;
  }

  static sanitize(data: any): CreateRoleDto {
    const dto = new CreateRoleDto();
    dto.name = data.name?.trim();
    dto.slug = data.slug?.trim().toLowerCase();
    dto.description = data.description?.trim();
    return dto;
  }
}

export class UpdateRoleDto {
  name?: string;
  slug?: string;
  description?: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (data.name !== undefined) {
      if (typeof data.name !== 'string') {
        errors.push('Role name must be a string');
      } else if (data.name.trim().length < 2) {
        errors.push('Role name must be at least 2 characters');
      } else if (data.name.trim().length > 100) {
        errors.push('Role name must not exceed 100 characters');
      }
    }

    if (data.slug !== undefined) {
      if (typeof data.slug !== 'string') {
        errors.push('Role slug must be a string');
      } else if (!/^[a-z0-9_-]+$/.test(data.slug)) {
        errors.push('Role slug must contain only lowercase letters, numbers, underscores, and hyphens');
      } else if (data.slug.length > 50) {
        errors.push('Role slug must not exceed 50 characters');
      }
    }

    if (data.description !== undefined && data.description !== null && data.description !== '') {
      if (typeof data.description !== 'string') {
        errors.push('Description must be a string');
      } else if (data.description.length > 500) {
        errors.push('Description must not exceed 500 characters');
      }
    }

    return errors;
  }

  static sanitize(data: any): UpdateRoleDto {
    const dto = new UpdateRoleDto();
    if (data.name !== undefined) dto.name = data.name.trim();
    if (data.slug !== undefined) dto.slug = data.slug.trim().toLowerCase();
    if (data.description !== undefined) dto.description = data.description.trim();
    return dto;
  }
}

export class AssignPermissionsDto {
  permissionIds!: string[];

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.permissionIds || !Array.isArray(data.permissionIds)) {
      errors.push('Permission IDs must be an array');
    } else {
      data.permissionIds.forEach((id: any, index: number) => {
        if (typeof id !== 'string') {
          errors.push(`Permission ID at index ${index} must be a string`);
        } else if (!validator.isUUID(id)) {
          errors.push(`Permission ID at index ${index} must be a valid UUID`);
        }
      });
    }

    return errors;
  }

  static sanitize(data: any): AssignPermissionsDto {
    const dto = new AssignPermissionsDto();
    dto.permissionIds = data.permissionIds?.filter((id: string) => typeof id === 'string' && validator.isUUID(id));
    return dto;
  }
}

export class RoleResponseDto {
  id!: string;
  name!: string;
  slug!: string;
  description?: string;
  createdAt!: Date;
  updatedAt!: Date;
  permissions?: PermissionResponseDto[];
}

export class PaginatedRolesDto {
  data!: RoleResponseDto[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class PermissionResponseDto {
  id!: string;
  name!: string;
  slug!: string;
  description?: string;
  createdAt!: Date;
  updatedAt!: Date;
}