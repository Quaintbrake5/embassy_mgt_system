"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginatedVisaApplicationsDto = exports.VisaApplicationResponseDto = exports.CreateVisaApplicationDto = void 0;
const validator_1 = __importDefault(require("validator"));
const enums_1 = require("../generated/prisma/enums");
const VALID_VISA_TYPES = Object.values(enums_1.VisaType);
class CreateVisaApplicationDto {
    static validate(data) {
        const errors = [];
        if (!data.visaType || typeof data.visaType !== 'string') {
            errors.push('Visa type is required');
        }
        else if (!VALID_VISA_TYPES.includes(data.visaType)) {
            errors.push(`Visa type must be one of: ${VALID_VISA_TYPES.join(', ')}`);
        }
        if (!data.embassyId || typeof data.embassyId !== 'string') {
            errors.push('Embassy ID is required');
        }
        else if (!validator_1.default.isUUID(data.embassyId)) {
            errors.push('Embassy ID must be a valid UUID');
        }
        return errors;
    }
    static sanitize(data) {
        const dto = new CreateVisaApplicationDto();
        dto.visaType = data.visaType?.trim();
        dto.embassyId = data.embassyId?.trim();
        return dto;
    }
}
exports.CreateVisaApplicationDto = CreateVisaApplicationDto;
class VisaApplicationResponseDto {
}
exports.VisaApplicationResponseDto = VisaApplicationResponseDto;
class PaginatedVisaApplicationsDto {
}
exports.PaginatedVisaApplicationsDto = PaginatedVisaApplicationsDto;
