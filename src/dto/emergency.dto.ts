import validator from 'validator';
import { UrgencyLevel, CaseStatus } from '../generated/prisma/enums';

const VALID_URGENCIES = Object.values(UrgencyLevel);
const VALID_STATUSES = Object.values(CaseStatus);

export class CreateEmergencyCaseDto {
  caseType!: string;
  description?: string;
  urgency!: string;
  location?: string;
  embassyId!: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.caseType || typeof data.caseType !== 'string') {
      errors.push('Case type is required');
    }

    if (data.description !== undefined && typeof data.description !== 'string') {
      errors.push('Description must be a string');
    }

    if (data.urgency && !VALID_URGENCIES.includes(data.urgency)) {
      errors.push(`Urgency must be one of: ${VALID_URGENCIES.join(', ')}`);
    }

    if (data.location !== undefined && typeof data.location !== 'string') {
      errors.push('Location must be a string');
    }

    if (!data.embassyId || typeof data.embassyId !== 'string') {
      errors.push('Embassy ID is required');
    } else if (!validator.isUUID(data.embassyId)) {
      errors.push('Embassy ID must be a valid UUID');
    }

    return errors;
  }

  static sanitize(data: any): CreateEmergencyCaseDto {
    const dto = new CreateEmergencyCaseDto();
    dto.caseType = data.caseType?.trim();
    dto.description = data.description?.trim();
    dto.urgency = data.urgency?.trim() || 'MEDIUM';
    dto.location = data.location?.trim();
    dto.embassyId = data.embassyId?.trim();
    return dto;
  }
}

export class UpdateEmergencyCaseStatusDto {
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

  static sanitize(data: any): UpdateEmergencyCaseStatusDto {
    const dto = new UpdateEmergencyCaseStatusDto();
    dto.status = data.status?.trim();
    return dto;
  }
}

export class AlertBroadcastDto {
  message!: string;
  embassyId!: string;
  urgency!: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.message || typeof data.message !== 'string') {
      errors.push('Message is required');
    }

    if (!data.embassyId || typeof data.embassyId !== 'string') {
      errors.push('Embassy ID is required');
    } else if (!validator.isUUID(data.embassyId)) {
      errors.push('Embassy ID must be a valid UUID');
    }

    if (!data.urgency || !VALID_URGENCIES.includes(data.urgency)) {
      errors.push(`Urgency must be one of: ${VALID_URGENCIES.join(', ')}`);
    }

    return errors;
  }

  static sanitize(data: any): AlertBroadcastDto {
    const dto = new AlertBroadcastDto();
    dto.message = data.message?.trim();
    dto.embassyId = data.embassyId?.trim();
    dto.urgency = data.urgency?.trim();
    return dto;
  }
}

export class EmergencyCaseResponseDto {
  id!: string;
  referenceNumber!: string;
  caseType!: string;
  description?: string | null;
  urgency!: string;
  status!: string;
  resolvedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedEmergencyDto {
  data!: EmergencyCaseResponseDto[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}