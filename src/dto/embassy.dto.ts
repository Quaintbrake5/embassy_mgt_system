import validator from 'validator';

export class CreateEmbassyDto {
  name!: string;
  code!: string;
  country!: string;
  city!: string;
  address!: string;
  phone?: string;
  email?: string;
  operatingHours?: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Embassy name is required');
    } else if (data.name.trim().length > 200) {
      errors.push('Embassy name must not exceed 200 characters');
    }

    if (!data.code || typeof data.code !== 'string') {
      errors.push('Embassy code is required');
    } else if (!/^[A-Z]{3,10}$/.test(data.code)) {
      errors.push('Embassy code must be 3-10 uppercase letters');
    }

    if (!data.country || typeof data.country !== 'string' || data.country.trim().length === 0) {
      errors.push('Country is required');
    } else if (data.country.trim().length > 100) {
      errors.push('Country must not exceed 100 characters');
    }

    if (!data.city || typeof data.city !== 'string' || data.city.trim().length === 0) {
      errors.push('City is required');
    } else if (data.city.trim().length > 100) {
      errors.push('City must not exceed 100 characters');
    }

    if (!data.address || typeof data.address !== 'string' || data.address.trim().length === 0) {
      errors.push('Address is required');
    } else if (data.address.trim().length > 300) {
      errors.push('Address must not exceed 300 characters');
    }

    if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
      if (typeof data.phone !== 'string') {
        errors.push('Phone must be a string');
      }
    }

    if (data.email !== undefined && data.email !== null && data.email !== '') {
      if (typeof data.email !== 'string') {
        errors.push('Email must be a string');
      } else if (!validator.isEmail(data.email)) {
        errors.push('Invalid email format');
      }
    }

    return errors;
  }

  static sanitize(data: any): CreateEmbassyDto {
    const dto = new CreateEmbassyDto();
    dto.name = data.name?.trim();
    dto.code = data.code?.trim().toUpperCase();
    dto.country = data.country?.trim();
    dto.city = data.city?.trim();
    dto.address = data.address?.trim();
    dto.phone = data.phone?.trim();
    dto.email = data.email?.trim().toLowerCase();
    dto.operatingHours = data.operatingHours?.trim();
    return dto;
  }
}

export class UpdateEmbassyDto {
  name?: string;
  code?: string;
  country?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  operatingHours?: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (data.name !== undefined) {
      if (typeof data.name !== 'string') {
        errors.push('Embassy name must be a string');
      } else if (data.name.trim().length < 2) {
        errors.push('Embassy name must be at least 2 characters');
      } else if (data.name.trim().length > 200) {
        errors.push('Embassy name must not exceed 200 characters');
      }
    }

    if (data.code !== undefined) {
      if (typeof data.code !== 'string') {
        errors.push('Embassy code must be a string');
      } else if (!/^[A-Z]{3,10}$/.test(data.code)) {
        errors.push('Embassy code must be 3-10 uppercase letters');
      }
    }

    if (data.country !== undefined) {
      if (typeof data.country !== 'string') {
        errors.push('Country must be a string');
      } else if (data.country.trim().length < 2) {
        errors.push('Country must be at least 2 characters');
      } else if (data.country.trim().length > 100) {
        errors.push('Country must not exceed 100 characters');
      }
    }

    if (data.city !== undefined) {
      if (typeof data.city !== 'string') {
        errors.push('City must be a string');
      } else if (data.city.trim().length < 2) {
        errors.push('City must be at least 2 characters');
      } else if (data.city.trim().length > 100) {
        errors.push('City must not exceed 100 characters');
      }
    }

    if (data.address !== undefined) {
      if (typeof data.address !== 'string') {
        errors.push('Address must be a string');
      } else if (data.address.trim().length < 5) {
        errors.push('Address must be at least 5 characters');
      } else if (data.address.trim().length > 300) {
        errors.push('Address must not exceed 300 characters');
      }
    }

    if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
      if (typeof data.phone !== 'string') {
        errors.push('Phone must be a string');
      }
    }

    if (data.email !== undefined && data.email !== null && data.email !== '') {
      if (typeof data.email !== 'string') {
        errors.push('Email must be a string');
      } else if (!validator.isEmail(data.email)) {
        errors.push('Invalid email format');
      }
    }

    return errors;
  }

  static sanitize(data: any): UpdateEmbassyDto {
    const dto = new UpdateEmbassyDto();
    if (data.name !== undefined) dto.name = data.name.trim();
    if (data.code !== undefined) dto.code = data.code.trim().toUpperCase();
    if (data.country !== undefined) dto.country = data.country.trim();
    if (data.city !== undefined) dto.city = data.city.trim();
    if (data.address !== undefined) dto.address = data.address.trim();
    if (data.phone !== undefined) dto.phone = data.phone?.trim();
    if (data.email !== undefined) dto.email = data.email?.trim().toLowerCase();
    if (data.operatingHours !== undefined) dto.operatingHours = data.operatingHours?.trim();
    return dto;
  }
}

export class EmbassyResponseDto {
  id!: string;
  name!: string;
  code!: string;
  country!: string;
  city!: string;
  address!: string;
  phone?: string;
  email?: string;
  operatingHours?: string;
  departments?: DepartmentResponseDto[];
  createdAt!: Date;
  updatedAt!: Date;
}

export class DepartmentResponseDto {
  id!: string;
  name!: string;
  slug!: string;
  description?: string;
  embassyId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class CreateDepartmentDto {
  name!: string;
  slug!: string;
  description?: string;
  embassyId?: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Department name is required');
    } else if (data.name.trim().length > 100) {
      errors.push('Department name must not exceed 100 characters');
    }

    if (!data.slug || typeof data.slug !== 'string') {
      errors.push('Department slug is required');
    } else if (!/^[a-z0-9_-]+$/.test(data.slug)) {
      errors.push('Department slug must contain only lowercase letters, numbers, underscores, and hyphens');
    } else if (data.slug.length > 50) {
      errors.push('Department slug must not exceed 50 characters');
    }

    if (data.embassyId !== undefined && data.embassyId !== null && data.embassyId !== '') {
      if (typeof data.embassyId !== 'string') {
        errors.push('Embassy ID must be a string');
      } else if (!validator.isUUID(data.embassyId)) {
        errors.push('Embassy ID must be a valid UUID');
      }
    }

    return errors;
  }

  static sanitize(data: any): CreateDepartmentDto {
    const dto = new CreateDepartmentDto();
    dto.name = data.name?.trim();
    dto.slug = data.slug?.trim().toLowerCase();
    dto.description = data.description?.trim();
    dto.embassyId = data.embassyId?.trim();
    return dto;
  }
}

export class UpdateDepartmentDto {
  name?: string;
  slug?: string;
  description?: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (data.name !== undefined) {
      if (typeof data.name !== 'string') {
        errors.push('Department name must be a string');
      } else if (data.name.trim().length < 2) {
        errors.push('Department name must be at least 2 characters');
      } else if (data.name.trim().length > 100) {
        errors.push('Department name must not exceed 100 characters');
      }
    }

    if (data.slug !== undefined) {
      if (typeof data.slug !== 'string') {
        errors.push('Department slug must be a string');
      } else if (!/^[a-z0-9_-]+$/.test(data.slug)) {
        errors.push('Department slug must contain only lowercase letters, numbers, underscores, and hyphens');
      } else if (data.slug.length > 50) {
        errors.push('Department slug must not exceed 50 characters');
      }
    }

    return errors;
  }

  static sanitize(data: any): UpdateDepartmentDto {
    const dto = new UpdateDepartmentDto();
    if (data.name !== undefined) dto.name = data.name.trim();
    if (data.slug !== undefined) dto.slug = data.slug.trim().toLowerCase();
    if (data.description !== undefined) dto.description = data.description?.trim();
    return dto;
  }
}

export class PaginatedEmbassiesDto {
  data!: EmbassyResponseDto[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}