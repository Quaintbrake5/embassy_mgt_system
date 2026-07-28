"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginatedClearanceDto = exports.PaginatedPouchDto = exports.ClearanceResponseDto = exports.PouchResponseDto = exports.UpdateClearanceDto = exports.CreateClearanceDto = exports.UpdatePouchHandoffDto = exports.CreatePouchDto = void 0;
const validator_1 = __importDefault(require("validator"));
const enums_1 = require("../generated/prisma/enums");
const VALID_POUCH_STATUSES = Object.values(enums_1.PouchStatus);
const VALID_CLEARANCE_LEVELS = Object.values(enums_1.ClearanceLevel);
class CreatePouchDto {
    static validate(data) {
        const errors = [];
        if (!data.originEmbassyId || typeof data.originEmbassyId !== 'string') {
            errors.push('Origin embassy ID is required');
        }
        else if (!validator_1.default.isUUID(data.originEmbassyId)) {
            errors.push('Origin embassy ID must be a valid UUID');
        }
        if (!data.destinationEmbassyId || typeof data.destinationEmbassyId !== 'string') {
            errors.push('Destination embassy ID is required');
        }
        else if (!validator_1.default.isUUID(data.destinationEmbassyId)) {
            errors.push('Destination embassy ID must be a valid UUID');
        }
        if (data.originEmbassyId && data.destinationEmbassyId && data.originEmbassyId === data.destinationEmbassyId) {
            errors.push('Origin and destination embassies must be different');
        }
        if (data.dispatchDate !== undefined && data.dispatchDate !== null && data.dispatchDate !== '') {
            if (typeof data.dispatchDate !== 'string') {
                errors.push('Dispatch date must be a string');
            }
            else if (isNaN(Date.parse(data.dispatchDate))) {
                errors.push('Dispatch date must be a valid date string');
            }
        }
        return errors;
    }
    static sanitize(data) {
        const dto = new CreatePouchDto();
        dto.originEmbassyId = data.originEmbassyId?.trim();
        dto.destinationEmbassyId = data.destinationEmbassyId?.trim();
        dto.dispatchDate = data.dispatchDate?.trim();
        return dto;
    }
}
exports.CreatePouchDto = CreatePouchDto;
class UpdatePouchHandoffDto {
    static validate(data) {
        const errors = [];
        if (!data.handoffData || typeof data.handoffData !== 'object' || Array.isArray(data.handoffData)) {
            errors.push('Handoff data is required and must be an object');
        }
        else {
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
            }
            else if (!VALID_POUCH_STATUSES.includes(data.newStatus)) {
                errors.push(`New status must be one of: ${VALID_POUCH_STATUSES.join(', ')}`);
            }
        }
        return errors;
    }
    static sanitize(data) {
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
exports.UpdatePouchHandoffDto = UpdatePouchHandoffDto;
class CreateClearanceDto {
    static validate(data) {
        const errors = [];
        if (!data.userId || typeof data.userId !== 'string') {
            errors.push('User ID is required');
        }
        else if (!validator_1.default.isUUID(data.userId)) {
            errors.push('User ID must be a valid UUID');
        }
        if (!data.clearanceLevel || typeof data.clearanceLevel !== 'string') {
            errors.push('Clearance level is required');
        }
        else if (!VALID_CLEARANCE_LEVELS.includes(data.clearanceLevel)) {
            errors.push(`Clearance level must be one of: ${VALID_CLEARANCE_LEVELS.join(', ')}`);
        }
        if (data.expiresAt !== undefined && data.expiresAt !== null && data.expiresAt !== '') {
            if (typeof data.expiresAt !== 'string') {
                errors.push('Expires at must be a string');
            }
            else if (isNaN(Date.parse(data.expiresAt))) {
                errors.push('Expires at must be a valid date string');
            }
        }
        return errors;
    }
    static sanitize(data) {
        const dto = new CreateClearanceDto();
        dto.userId = data.userId?.trim();
        dto.clearanceLevel = data.clearanceLevel?.trim();
        dto.expiresAt = data.expiresAt?.trim();
        return dto;
    }
}
exports.CreateClearanceDto = CreateClearanceDto;
class UpdateClearanceDto {
    static validate(data) {
        const errors = [];
        if (data.clearanceLevel !== undefined) {
            if (typeof data.clearanceLevel !== 'string') {
                errors.push('Clearance level must be a string');
            }
            else if (!VALID_CLEARANCE_LEVELS.includes(data.clearanceLevel)) {
                errors.push(`Clearance level must be one of: ${VALID_CLEARANCE_LEVELS.join(', ')}`);
            }
        }
        if (data.expiresAt !== undefined && data.expiresAt !== null && data.expiresAt !== '') {
            if (typeof data.expiresAt !== 'string') {
                errors.push('Expires at must be a string');
            }
            else if (isNaN(Date.parse(data.expiresAt))) {
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
    static sanitize(data) {
        const dto = new UpdateClearanceDto();
        if (data.clearanceLevel !== undefined)
            dto.clearanceLevel = data.clearanceLevel;
        if (data.expiresAt !== undefined)
            dto.expiresAt = data.expiresAt?.trim();
        if (data.isActive !== undefined)
            dto.isActive = data.isActive;
        return dto;
    }
}
exports.UpdateClearanceDto = UpdateClearanceDto;
class PouchResponseDto {
}
exports.PouchResponseDto = PouchResponseDto;
class ClearanceResponseDto {
}
exports.ClearanceResponseDto = ClearanceResponseDto;
class PaginatedPouchDto {
}
exports.PaginatedPouchDto = PaginatedPouchDto;
class PaginatedClearanceDto {
}
exports.PaginatedClearanceDto = PaginatedClearanceDto;
