"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginatedLegalizationDto = exports.LegalizationResponseDto = exports.ProcessLegalizationDto = exports.CreateLegalizationDto = void 0;
const validator_1 = __importDefault(require("validator"));
const VALID_ACTIONS = ['VERIFY', 'SEAL', 'ROUTE_APOSTILLE', 'ROUTE_LEGALIZATION', 'COMPLETE'];
class CreateLegalizationDto {
    static validate(data) {
        const errors = [];
        if (!data.documentType || typeof data.documentType !== 'string') {
            errors.push('Document type is required');
        }
        if (!data.destinationCountry || typeof data.destinationCountry !== 'string') {
            errors.push('Destination country is required');
        }
        else if (!validator_1.default.isLength(data.destinationCountry, { min: 2, max: 100 })) {
            errors.push('Destination country must be between 2 and 100 characters');
        }
        if (data.urgency !== undefined && typeof data.urgency !== 'string') {
            errors.push('Urgency must be a string');
        }
        if (data.remarks !== undefined && typeof data.remarks !== 'string') {
            errors.push('Remarks must be a string');
        }
        if (!data.serviceTypeId || typeof data.serviceTypeId !== 'string') {
            errors.push('Service type ID is required');
        }
        else if (!validator_1.default.isUUID(data.serviceTypeId)) {
            errors.push('Service type ID must be a valid UUID');
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
        const dto = new CreateLegalizationDto();
        dto.documentType = data.documentType?.trim();
        dto.destinationCountry = data.destinationCountry?.trim();
        dto.urgency = data.urgency?.trim();
        dto.remarks = data.remarks?.trim();
        dto.serviceTypeId = data.serviceTypeId;
        dto.embassyId = data.embassyId;
        return dto;
    }
}
exports.CreateLegalizationDto = CreateLegalizationDto;
class ProcessLegalizationDto {
    static validate(data) {
        const errors = [];
        if (!data.action || typeof data.action !== 'string') {
            errors.push('Action is required');
        }
        else if (!VALID_ACTIONS.includes(data.action)) {
            errors.push(`Action must be one of: ${VALID_ACTIONS.join(', ')}`);
        }
        if (data.officerRemarks !== undefined && typeof data.officerRemarks !== 'string') {
            errors.push('Officer remarks must be a string');
        }
        return errors;
    }
    static sanitize(data) {
        const dto = new ProcessLegalizationDto();
        dto.action = data.action;
        dto.officerRemarks = data.officerRemarks?.trim();
        return dto;
    }
}
exports.ProcessLegalizationDto = ProcessLegalizationDto;
class LegalizationResponseDto {
}
exports.LegalizationResponseDto = LegalizationResponseDto;
class PaginatedLegalizationDto {
}
exports.PaginatedLegalizationDto = PaginatedLegalizationDto;
