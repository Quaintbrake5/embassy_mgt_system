import validator from 'validator';
import { ServiceCategory } from '../generated/prisma/enums';

const VALID_CATEGORIES = Object.values(ServiceCategory);

export class CreateServiceTypeDto {
  name!: string;
  slug!: string;
  category!: string;
  description?: string;
  fee?: number;
  duration?: number;
  requiresAppointment?: boolean;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Service type name is required');
    } else if (data.name.trim().length > 100) {
      errors.push('Service type name must not exceed 100 characters');
    }

    if (!data.slug || typeof data.slug !== 'string') {
      errors.push('Service type slug is required');
    } else if (!/^[a-z0-9_-]+$/.test(data.slug)) {
      errors.push('Service type slug must contain only lowercase letters, numbers, underscores, and hyphens');
    } else if (data.slug.length > 50) {
      errors.push('Service type slug must not exceed 50 characters');
    }

    if (data.category !== undefined) {
      if (typeof data.category !== 'string') {
        errors.push('Category must be a string');
      } else if (!VALID_CATEGORIES.includes(data.category)) {
        errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
      }
    } else {
      errors.push('Category is required');
    }

    if (data.description !== undefined && data.description !== null && data.description !== '') {
      if (typeof data.description !== 'string') {
        errors.push('Description must be a string');
      } else if (data.description.length > 500) {
        errors.push('Description must not exceed 500 characters');
      }
    }

    if (data.fee !== undefined && data.fee !== null) {
      if (typeof data.fee !== 'number' || data.fee < 0) {
        errors.push('Fee must be a non-negative number');
      }
    }

    if (data.duration !== undefined && data.duration !== null) {
      if (typeof data.duration !== 'number' || data.duration < 1) {
        errors.push('Duration must be a positive number');
      }
    }

    return errors;
  }

  static sanitize(data: any): CreateServiceTypeDto {
    const dto = new CreateServiceTypeDto();
    dto.name = data.name?.trim();
    dto.slug = data.slug?.trim().toLowerCase();
    dto.category = data.category;
    dto.description = data.description?.trim();
    dto.fee = data.fee !== undefined ? Number(data.fee) : undefined;
    dto.duration = data.duration !== undefined ? Number(data.duration) : undefined;
    dto.requiresAppointment = data.requiresAppointment === true;
    return dto;
  }
}

export class UpdateServiceTypeDto {
  name?: string;
  slug?: string;
  category?: string;
  description?: string;
  fee?: number;
  duration?: number;
  requiresAppointment?: boolean;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (data.name !== undefined) {
      if (typeof data.name !== 'string') {
        errors.push('Service type name must be a string');
      } else if (data.name.trim().length < 2) {
        errors.push('Service type name must be at least 2 characters');
      } else if (data.name.trim().length > 100) {
        errors.push('Service type name must not exceed 100 characters');
      }
    }

    if (data.slug !== undefined) {
      if (typeof data.slug !== 'string') {
        errors.push('Service type slug must be a string');
      } else if (!/^[a-z0-9_-]+$/.test(data.slug)) {
        errors.push('Service type slug must contain only lowercase letters, numbers, underscores, and hyphens');
      } else if (data.slug.length > 50) {
        errors.push('Service type slug must not exceed 50 characters');
      }
    }

    if (data.category !== undefined) {
      if (typeof data.category !== 'string') {
        errors.push('Category must be a string');
      } else if (!VALID_CATEGORIES.includes(data.category)) {
        errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
      }
    }

    if (data.fee !== undefined && data.fee !== null) {
      if (typeof data.fee !== 'number' || data.fee < 0) {
        errors.push('Fee must be a non-negative number');
      }
    }

    if (data.duration !== undefined && data.duration !== null) {
      if (typeof data.duration !== 'number' || data.duration < 1) {
        errors.push('Duration must be a positive number');
      }
    }

    return errors;
  }

  static sanitize(data: any): UpdateServiceTypeDto {
    const dto = new UpdateServiceTypeDto();
    if (data.name !== undefined) dto.name = data.name.trim();
    if (data.slug !== undefined) dto.slug = data.slug.trim().toLowerCase();
    if (data.category !== undefined) dto.category = data.category;
    if (data.description !== undefined) dto.description = data.description?.trim();
    if (data.fee !== undefined) dto.fee = Number(data.fee);
    if (data.duration !== undefined) dto.duration = Number(data.duration);
    if (data.requiresAppointment !== undefined) dto.requiresAppointment = data.requiresAppointment;
    return dto;
  }
}

export class ServiceTypeResponseDto {
  id!: string;
  name!: string;
  slug!: string;
  category!: string;
  description?: string;
  fee?: number;
  duration?: number;
  requiresAppointment!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedServiceTypesDto {
  data!: ServiceTypeResponseDto[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}