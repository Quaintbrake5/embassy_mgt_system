import validator from 'validator';
import { VisaType } from '../generated/prisma/enums';

const VALID_VISA_TYPES = Object.values(VisaType);

export class CreateVisaApplicationDto {
  visaType!: string;
  embassyId!: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.visaType || typeof data.visaType !== 'string') {
      errors.push('Visa type is required');
    } else if (!VALID_VISA_TYPES.includes(data.visaType as any)) {
      errors.push(`Visa type must be one of: ${VALID_VISA_TYPES.join(', ')}`);
    }

    if (!data.embassyId || typeof data.embassyId !== 'string') {
      errors.push('Embassy ID is required');
    } else if (!validator.isUUID(data.embassyId)) {
      errors.push('Embassy ID must be a valid UUID');
    }

    return errors;
  }

  static sanitize(data: any): CreateVisaApplicationDto {
    const dto = new CreateVisaApplicationDto();
    dto.visaType = data.visaType?.trim();
    dto.embassyId = data.embassyId?.trim();
    return dto;
  }
}

export class VisaApplicationResponseDto {
  id!: string;
  applicationNumber!: string;
  userId!: string;
  visaType!: string;
  embassyId!: string;
  status!: string;
  submittedAt!: Date;
  decisionAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  user?: {
    userid: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  embassy?: {
    id: string;
    name: string;
    code: string;
    country: string;
    city: string;
  };
  documents?: {
    id: string;
    documentType: string;
    fileName: string;
    status: string;
    uploadedAt: Date;
  }[];
  decision?: {
    id: string;
    decisionType: string;
    reason?: string;
    decidedAt: Date;
  } | null;
  payments?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
  }[];
  verificationChecks?: {
    id: string;
    checkType: string;
    status: string;
    result?: any;
    checkedAt?: Date;
  }[];
}

export class PaginatedVisaApplicationsDto {
  data!: VisaApplicationResponseDto[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}