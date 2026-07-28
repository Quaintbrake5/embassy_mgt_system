"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisaDocumentResponseDto = exports.UpdateVisaDocumentDto = exports.CreateVisaDocumentDto = void 0;
const validator_1 = __importDefault(require("validator"));
const enums_1 = require("../generated/prisma/enums");
const VALID_DOCUMENT_TYPES = Object.values(enums_1.DocumentType);
function validateField(data, field, rules) {
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
    if (rules.isUUID && !validator_1.default.isUUID(value)) {
        return `${field.charAt(0).toUpperCase() + field.slice(1)} must be a valid UUID`;
    }
    if (rules.isURL && !validator_1.default.isURL(value)) {
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
class CreateVisaDocumentDto {
    static validate(data) {
        const errors = [];
        const visaAppErr = validateField(data, 'visaApplicationId', { isUUID: true });
        if (visaAppErr)
            errors.push(visaAppErr);
        const srvReqErr = validateField(data, 'serviceRequestId', { isUUID: true });
        if (srvReqErr)
            errors.push(srvReqErr);
        const docTypeErr = validateField(data, 'documentType', { required: true, enumValues: VALID_DOCUMENT_TYPES });
        if (docTypeErr)
            errors.push(docTypeErr);
        const fileNameErr = validateField(data, 'fileName', { required: true, maxLength: 255 });
        if (fileNameErr)
            errors.push(fileNameErr);
        const fileHashErr = validateField(data, 'fileHash', { maxLength: 64 });
        if (fileHashErr)
            errors.push(fileHashErr);
        const fileUrlErr = validateField(data, 'fileUrl', { isURL: true });
        if (fileUrlErr)
            errors.push(fileUrlErr);
        return errors;
    }
    static sanitize(data) {
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
exports.CreateVisaDocumentDto = CreateVisaDocumentDto;
class UpdateVisaDocumentDto {
    static validate(data) {
        const errors = [];
        const docTypeErr = validateField(data, 'documentType', { enumValues: VALID_DOCUMENT_TYPES });
        if (docTypeErr)
            errors.push(docTypeErr);
        const fileNameErr = validateField(data, 'fileName', { maxLength: 255 });
        if (fileNameErr)
            errors.push(fileNameErr);
        const fileUrlErr = validateField(data, 'fileUrl', { isURL: true });
        if (fileUrlErr)
            errors.push(fileUrlErr);
        return errors;
    }
    static sanitize(data) {
        const dto = new UpdateVisaDocumentDto();
        dto.documentType = data.documentType;
        dto.fileName = data.fileName?.trim();
        dto.fileUrl = data.fileUrl?.trim();
        return dto;
    }
}
exports.UpdateVisaDocumentDto = UpdateVisaDocumentDto;
class VisaDocumentResponseDto {
}
exports.VisaDocumentResponseDto = VisaDocumentResponseDto;
