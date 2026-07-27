import validator from 'validator';

export class CreatePermissionDto {
  name!: string;
  slug!: string;
  description?: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.name || typeof data.name !== 'string') {
      errors.push('Permission name is required');
    } else if (data.name.trim().length < 2) {
      errors.push('Permission name must be at least 2 characters');
    } else if (data.name.trim().length > 100) {
      errors.push('Permission name must not exceed 100 characters');
    }

    if (!data.slug || typeof data.slug !== 'string') {
      errors.push('Permission slug is required');
    } else if (!/^[a-z0-9:_.-]+$/.test(data.slug)) {
      errors.push('Permission slug must follow resource:action format (e.g., user:create)');
    } else if (data.slug.length > 100) {
      errors.push('Permission slug must not exceed 100 characters');
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

  static sanitize(data: any): CreatePermissionDto {
    const dto = new CreatePermissionDto();
    dto.name = data.name?.trim();
    dto.slug = data.slug?.trim().toLowerCase();
    dto.description = data.description?.trim();
    return dto;
  }
}

export class UpdatePermissionDto {
  name?: string;
  slug?: string;
  description?: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (data.name !== undefined) {
      if (typeof data.name !== 'string') {
        errors.push('Permission name must be a string');
      } else if (data.name.trim().length < 2) {
        errors.push('Permission name must be at least 2 characters');
      } else if (data.name.trim().length > 100) {
        errors.push('Permission name must not exceed 100 characters');
      }
    }

    if (data.slug !== undefined) {
      if (typeof data.slug !== 'string') {
        errors.push('Permission slug must be a string');
      } else if (!/^[a-z0-9:_.-]+$/.test(data.slug)) {
        errors.push('Permission slug must follow resource:action format (e.g., user:create)');
      } else if (data.slug.length > 100) {
        errors.push('Permission slug must not exceed 100 characters');
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

  static sanitize(data: any): UpdatePermissionDto {
    const dto = new UpdatePermissionDto();
    if (data.name !== undefined) dto.name = data.name.trim();
    if (data.slug !== undefined) dto.slug = data.slug.trim().toLowerCase();
    if (data.description !== undefined) dto.description = data.description.trim();
    return dto;
  }
}

export class PermissionResponseDto {
  id!: string;
  name!: string;
  slug!: string;
  description?: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedPermissionsDto {
  data!: PermissionResponseDto[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}