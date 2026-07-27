import validator from 'validator';
import { DocumentType } from '../generated/prisma/enums';

const VALID_DOCUMENT_TYPES = Object.values(DocumentType);

interface FieldRules {
  required?: boolean;
  maxLength?: number;
  isURL?: boolean;
  isUUID?: boolean;
  enumValues?: string[];
}

function validateField(data: any, field: string, rules: FieldRules): string | null {
  const value = data[field];

  if (rules.required) {
    if (!value || typeof value !== 'string') {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }
  }

  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    return `${field.charAt(0).toUpperCase() + field.slice(1)} must be a string`;
  }

  if (rules.isUUID && !validator.isUUID(value)) {
    return `${field.charAt(0).toUpperCase() + field.slice(1)} must be a valid UUID`;
  }
  if (rules.isURL && !validator.isURL(value)) {
    return `${field.charAt(0).toUpperCase() + field.slice(1)} must be a valid URL`;
  }
  if (rules.enumValues && !rules.enumValues.includes(value)) {
    return `${field.charAt(0).toUpperCase() + field.slice(1)} must be one of: ${rules.enumValues.join(', ')}`;
  }
  if (rules.maxLength && value.trim().length > rules.maxLength) {
    return `${field.charAt(0).toUpperCase() + field.slice(1)} must not exceed ${rules.maxLength} characters`;
  }

  return null;
}

export class CreateVisaDocumentDto {
  visaApplicationId?: string;
  serviceRequestId?: string;
  documentType!: string;
  fileName!: string;
  fileHash?: string;
  fileUrl?: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    const visaAppErr = validateField(data, 'visaApplicationId', { isUUID: true });
    if (visaAppErr) errors.push(visaAppErr);

    const srvReqErr = validateField(data, 'serviceRequestId', { isUUID: true });
    if (srvReqErr) errors.push(srvReqErr);

    const docTypeErr = validateField(data, 'documentType', { required: true, enumValues: VALID_DOCUMENT_TYPES });
    if (docTypeErr) errors.push(docTypeErr);

    const fileNameErr = validateField(data, 'fileName', { required: true, maxLength: 255 });
    if (fileNameErr) errors.push(fileNameErr);

    const fileHashErr = validateField(data, 'fileHash', { maxLength: 64 });
    if (fileHashErr) errors.push(fileHashErr);

    const fileUrlErr = validateField(data, 'fileUrl', { isURL: true });
    if (fileUrlErr) errors.push(fileUrlErr);

    return errors;
  }

  static sanitize(data: any): CreateVisaDocumentDto {
    const dto = new CreateVisaDocumentDto();
    dto.visaApplicationId = data.visaApplicationId;
    dto.serviceRequestId = data.serviceRequestId;
    dto.documentType = data.documentType;
    dto.fileName = data.fileName?.trim();
    dto.fileHash = data.fileHash?.trim();
    dto.fileUrl = data.fileUrl?.trim();
    return dto;
  }
}

export class UpdateVisaDocumentDto {
  documentType?: string;
  fileName?: string;
  fileUrl?: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    const docTypeErr = validateField(data, 'documentType', { enumValues: VALID_DOCUMENT_TYPES });
    if (docTypeErr) errors.push(docTypeErr);

    const fileNameErr = validateField(data, 'fileName', { maxLength: 255 });
    if (fileNameErr) errors.push(fileNameErr);

    const fileUrlErr = validateField(data, 'fileUrl', { isURL: true });
    if (fileUrlErr) errors.push(fileUrlErr);

    return errors;
  }

  static sanitize(data: any): UpdateVisaDocumentDto {
    const dto = new UpdateVisaDocumentDto();
    dto.documentType = data.documentType;
    dto.fileName = data.fileName?.trim();
    dto.fileUrl = data.fileUrl?.trim();
    return dto;
  }
}

export class VisaDocumentResponseDto {
  id!: string;
  visaApplicationId?: string | null;
  serviceRequestId?: string | null;
  documentType!: string;
  fileName!: string;
  fileHash?: string | null;
  fileUrl?: string | null;
  uploadedAt!: Date;
  createdAt!: Date;
}