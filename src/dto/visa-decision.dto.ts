import validator from 'validator';
import { DecisionType } from '../generated/prisma/enums';

const VALID_DECISIONS = Object.values(DecisionType);

export class CreateVisaDecisionDto {
  decision!: string;
  remarks?: string;
  rationale?: string;
  secondaryOfficerId?: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.decision || typeof data.decision !== 'string') {
      errors.push('Decision is required');
    } else if (!VALID_DECISIONS.includes(data.decision)) {
      errors.push(`Decision must be one of: ${VALID_DECISIONS.join(', ')}`);
    }

    if (data.remarks !== undefined && typeof data.remarks !== 'string') {
      errors.push('Remarks must be a string');
    }

    if (data.rationale !== undefined && typeof data.rationale !== 'string') {
      errors.push('Rationale must be a string');
    }

    if (data.secondaryOfficerId !== undefined && data.secondaryOfficerId !== null) {
      if (typeof data.secondaryOfficerId !== 'string' || !validator.isUUID(data.secondaryOfficerId)) {
        errors.push('Secondary officer ID must be a valid UUID');
      }
    }

    return errors;
  }

  static sanitize(data: any): CreateVisaDecisionDto {
    const dto = new CreateVisaDecisionDto();
    dto.decision = data.decision?.trim();
    dto.remarks = data.remarks?.trim();
    dto.rationale = data.rationale?.trim();
    dto.secondaryOfficerId = data.secondaryOfficerId?.trim();
    return dto;
  }
}

export class VisaDecisionResponseDto {
  id!: string;
  visaApplicationId!: string;
  officerId!: string;
  secondaryOfficerId?: string;
  decision!: string;
  remarks?: string;
  rationale?: string;
  decidedAt!: Date;
  createdAt!: Date;
  officer?: {
    userid: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  secondaryOfficer?: {
    userid: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}