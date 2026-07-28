"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginatedEmergencyDto = exports.EmergencyCaseResponseDto = exports.AlertBroadcastDto = exports.UpdateEmergencyCaseStatusDto = exports.CreateEmergencyCaseDto = void 0;
const validator_1 = __importDefault(require("validator"));
const enums_1 = require("../generated/prisma/enums");
const VALID_URGENCIES = Object.values(enums_1.UrgencyLevel);
const VALID_STATUSES = Object.values(enums_1.CaseStatus);
class CreateEmergencyCaseDto {
    static validate(data) {
        const errors = [];
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
        }
        else if (!validator_1.default.isUUID(data.embassyId)) {
            errors.push('Embassy ID must be a valid UUID');
        }
        return errors;
    }
    static sanitize(data) {
        const dto = new CreateEmergencyCaseDto();
        dto.caseType = data.caseType?.trim();
        dto.description = data.description?.trim();
        dto.urgency = data.urgency?.trim() || 'MEDIUM';
        dto.location = data.location?.trim();
        dto.embassyId = data.embassyId?.trim();
        return dto;
    }
}
exports.CreateEmergencyCaseDto = CreateEmergencyCaseDto;
class UpdateEmergencyCaseStatusDto {
    static validate(data) {
        const errors = [];
        if (!data.status || typeof data.status !== 'string') {
            errors.push('Status is required');
        }
        else if (!VALID_STATUSES.includes(data.status)) {
            errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
        }
        return errors;
    }
    static sanitize(data) {
        const dto = new UpdateEmergencyCaseStatusDto();
        dto.status = data.status?.trim();
        return dto;
    }
}
exports.UpdateEmergencyCaseStatusDto = UpdateEmergencyCaseStatusDto;
class AlertBroadcastDto {
    static validate(data) {
        const errors = [];
        if (!data.message || typeof data.message !== 'string') {
            errors.push('Message is required');
        }
        if (!data.embassyId || typeof data.embassyId !== 'string') {
            errors.push('Embassy ID is required');
        }
        else if (!validator_1.default.isUUID(data.embassyId)) {
            errors.push('Embassy ID must be a valid UUID');
        }
        if (!data.urgency || !VALID_URGENCIES.includes(data.urgency)) {
            errors.push(`Urgency must be one of: ${VALID_URGENCIES.join(', ')}`);
        }
        return errors;
    }
    static sanitize(data) {
        const dto = new AlertBroadcastDto();
        dto.message = data.message?.trim();
        dto.embassyId = data.embassyId?.trim();
        dto.urgency = data.urgency?.trim();
        return dto;
    }
}
exports.AlertBroadcastDto = AlertBroadcastDto;
class EmergencyCaseResponseDto {
}
exports.EmergencyCaseResponseDto = EmergencyCaseResponseDto;
class PaginatedEmergencyDto {
}
exports.PaginatedEmergencyDto = PaginatedEmergencyDto;
