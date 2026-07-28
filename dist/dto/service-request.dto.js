"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginatedServiceRequestsDto = exports.ServiceRequestResponseDto = exports.UpdateServiceRequestStatusDto = exports.CreateServiceRequestDto = void 0;
const validator_1 = __importDefault(require("validator"));
const enums_1 = require("../generated/prisma/enums");
const VALID_STATUSES = Object.values(enums_1.RequestStatus);
class CreateServiceRequestDto {
    static validate(data) {
        const errors = [];
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
        if (data.details !== undefined) {
            if (typeof data.details !== 'object' || Array.isArray(data.details)) {
                errors.push('Details must be an object');
            }
        }
        return errors;
    }
    static sanitize(data) {
        const dto = new CreateServiceRequestDto();
        dto.serviceTypeId = data.serviceTypeId?.trim();
        dto.embassyId = data.embassyId?.trim();
        dto.details = data.details || {};
        return dto;
    }
}
exports.CreateServiceRequestDto = CreateServiceRequestDto;
class UpdateServiceRequestStatusDto {
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
        const dto = new UpdateServiceRequestStatusDto();
        dto.status = data.status;
        return dto;
    }
}
exports.UpdateServiceRequestStatusDto = UpdateServiceRequestStatusDto;
class ServiceRequestResponseDto {
}
exports.ServiceRequestResponseDto = ServiceRequestResponseDto;
class PaginatedServiceRequestsDto {
}
exports.PaginatedServiceRequestsDto = PaginatedServiceRequestsDto;
