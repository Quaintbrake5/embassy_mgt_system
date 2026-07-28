import validator from 'validator';
import { PouchStatus, ClearanceLevel } from '../generated/prisma/enums';

const VALID_POUCH_STATUSES = Object.values(PouchStatus);
const VALID_CLEARANCE_LEVELS = Object.values(ClearanceLevel);

export class CreatePouchDto {
  originEmbassyId!: string;
  destinationEmbassyId!: string;
  dispatchDate?: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.originEmbassyId || typeof data.originEmbassyId !== 'string') {
      errors.push('Origin embassy ID is required');
    } else if (!validator.isUUID(data.originEmbassyId)) {
      errors.push('Origin embassy ID must be a valid UUID');
    }

    if (!data.destinationEmbassyId || typeof data.destinationEmbassyId !== 'string') {
      errors.push('Destination embassy ID is required');
    } else if (!validator.isUUID(data.destinationEmbassyId)) {
      errors.push('Destination embassy ID must be a valid UUID');
    }

    if (data.originEmbassyId && data.destinationEmbassyId && data.originEmbassyId === data.destinationEmbassyId) {
      errors.push('Origin and destination embassies must be different');
    }

    if (data.dispatchDate !== undefined && data.dispatchDate !== null && data.dispatchDate !== '') {
      if (typeof data.dispatchDate !== 'string') {
        errors.push('Dispatch date must be a string');
      } else if (isNaN(Date.parse(data.dispatchDate))) {
        errors.push('Dispatch date must be a valid date string');
      }
    }

    return errors;
  }

  static sanitize(data: any): CreatePouchDto {
    const dto = new CreatePouchDto();
    dto.originEmbassyId = data.originEmbassyId?.trim();
    dto.destinationEmbassyId = data.destinationEmbassyId?.trim();
    dto.dispatchDate = data.dispatchDate?.trim();
    return dto;
  }
}

export class UpdatePouchHandoffDto {
  handoffData!: {
    handedOverBy: string;
    handedOverTo: string;
    notes: string;
  };
  newStatus?: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.handoffData || typeof data.handoffData !== 'object' || Array.isArray(data.handoffData)) {
      errors.push('Handoff data is required and must be an object');
    } else {
      if (!data.handoffData.handedOverBy || typeof data.handoffData.handedOverBy !== 'string') {
        errors.push('Handed over by is required');
      }
      if (!data.handoffData.handedOverTo || typeof data.handoffData.handedOverTo !== 'string') {
        errors.push('Handed over to is required');
      }
      if (data.handoffData.notes !== undefined && data.handoffData.notes !== null) {
        if (typeof data.handoffData.notes !== 'string') {
          errors.push('Notes must be a string');
        }
      }
    }

    if (data.newStatus !== undefined && data.newStatus !== null && data.newStatus !== '') {
      if (typeof data.newStatus !== 'string') {
        errors.push('New status must be a string');
      } else if (!VALID_POUCH_STATUSES.includes(data.newStatus)) {
        errors.push(`New status must be one of: ${VALID_POUCH_STATUSES.join(', ')}`);
      }
    }

    return errors;
  }

  static sanitize(data: any): UpdatePouchHandoffDto {
    const dto = new UpdatePouchHandoffDto();
    dto.handoffData = {
      handedOverBy: data.handoffData?.handedOverBy?.trim(),
      handedOverTo: data.handoffData?.handedOverTo?.trim(),
      notes: data.handoffData?.notes?.trim(),
    };
    dto.newStatus = data.newStatus?.trim();
    return dto;
  }
}

export class CreateClearanceDto {
  userId!: string;
  clearanceLevel!: string;
  expiresAt?: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.userId || typeof data.userId !== 'string') {
      errors.push('User ID is required');
    } else if (!validator.isUUID(data.userId)) {
      errors.push('User ID must be a valid UUID');
    }

    if (!data.clearanceLevel || typeof data.clearanceLevel !== 'string') {
      errors.push('Clearance level is required');
    } else if (!VALID_CLEARANCE_LEVELS.includes(data.clearanceLevel)) {
      errors.push(`Clearance level must be one of: ${VALID_CLEARANCE_LEVELS.join(', ')}`);
    }

    if (data.expiresAt !== undefined && data.expiresAt !== null && data.expiresAt !== '') {
      if (typeof data.expiresAt !== 'string') {
        errors.push('Expires at must be a string');
      } else if (isNaN(Date.parse(data.expiresAt))) {
        errors.push('Expires at must be a valid date string');
      }
    }

    return errors;
  }

  static sanitize(data: any): CreateClearanceDto {
    const dto = new CreateClearanceDto();
    dto.userId = data.userId?.trim();
    dto.clearanceLevel = data.clearanceLevel?.trim();
    dto.expiresAt = data.expiresAt?.trim();
    return dto;
  }
}

export class UpdateClearanceDto {
  clearanceLevel?: string;
  expiresAt?: string;
  isActive?: boolean;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (data.clearanceLevel !== undefined) {
      if (typeof data.clearanceLevel !== 'string') {
        errors.push('Clearance level must be a string');
      } else if (!VALID_CLEARANCE_LEVELS.includes(data.clearanceLevel)) {
        errors.push(`Clearance level must be one of: ${VALID_CLEARANCE_LEVELS.join(', ')}`);
      }
    }

    if (data.expiresAt !== undefined && data.expiresAt !== null && data.expiresAt !== '') {
      if (typeof data.expiresAt !== 'string') {
        errors.push('Expires at must be a string');
      } else if (isNaN(Date.parse(data.expiresAt))) {
        errors.push('Expires at must be a valid date string');
      }
    }

    if (data.isActive !== undefined && data.isActive !== null) {
      if (typeof data.isActive !== 'boolean') {
        errors.push('isActive must be a boolean');
      }
    }

    return errors;
  }

  static sanitize(data: any): UpdateClearanceDto {
    const dto = new UpdateClearanceDto();
    if (data.clearanceLevel !== undefined) dto.clearanceLevel = data.clearanceLevel;
    if (data.expiresAt !== undefined) dto.expiresAt = data.expiresAt?.trim();
    if (data.isActive !== undefined) dto.isActive = data.isActive;
    return dto;
  }
}

export class PouchResponseDto {
  id!: string;
  pouchNumber!: string;
  originEmbassyId!: string;
  destinationEmbassyId!: string;
  status!: string;
  dispatchDate!: Date | null;
  receivedDate!: Date | null;
  chainOfCustody!: any;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ClearanceResponseDto {
  id!: string;
  userId!: string;
  clearanceLevel!: string;
  issuedBy!: string;
  issuedAt!: Date;
  expiresAt!: Date | null;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedPouchDto {
  data!: PouchResponseDto[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class PaginatedClearanceDto {
  data!: ClearanceResponseDto[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}