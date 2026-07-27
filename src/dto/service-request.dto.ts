import validator from 'validator';
import { RequestStatus } from '../generated/prisma/enums';

const VALID_STATUSES = Object.values(RequestStatus);

export class CreateServiceRequestDto {
  serviceTypeId!: string;
  embassyId!: string;
  details?: Record<string, any>;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.serviceTypeId || typeof data.serviceTypeId !== 'string') {
      errors.push('Service type ID is required');
    } else if (!validator.isUUID(data.serviceTypeId)) {
      errors.push('Service type ID must be a valid UUID');
    }

    if (!data.embassyId || typeof data.embassyId !== 'string') {
      errors.push('Embassy ID is required');
    } else if (!validator.isUUID(data.embassyId)) {
      errors.push('Embassy ID must be a valid UUID');
    }

    if (data.details !== undefined) {
      if (typeof data.details !== 'object' || Array.isArray(data.details)) {
        errors.push('Details must be an object');
      }
    }

    return errors;
  }

  static sanitize(data: any): CreateServiceRequestDto {
    const dto = new CreateServiceRequestDto();
    dto.serviceTypeId = data.serviceTypeId?.trim();
    dto.embassyId = data.embassyId?.trim();
    dto.details = data.details || {};
    return dto;
  }
}

export class UpdateServiceRequestStatusDto {
  status!: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.status || typeof data.status !== 'string') {
      errors.push('Status is required');
    } else if (!VALID_STATUSES.includes(data.status)) {
      errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    return errors;
  }

  static sanitize(data: any): UpdateServiceRequestStatusDto {
    const dto = new UpdateServiceRequestStatusDto();
    dto.status = data.status;
    return dto;
  }
}

export class ServiceRequestResponseDto {
  id!: string;
  referenceNumber!: string;
  userId!: string;
  serviceTypeId!: string;
  embassyId!: string;
  status!: string;
  details?: any;
  submittedAt!: Date;
  createdAt!: Date;
  updatedAt!: Date;
  user?: {
    userid: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  serviceType?: {
    id: string;
    name: string;
    slug: string;
    category: string;
  };
  embassy?: {
    id: string;
    name: string;
    code: string;
    country: string;
    city: string;
  };
  payments?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
  }[];
}

export class PaginatedServiceRequestsDto {
  data!: ServiceRequestResponseDto[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}