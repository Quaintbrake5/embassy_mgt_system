"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginatedAppointmentsDto = exports.AppointmentResponseDto = exports.AvailableSlotsQueryDto = exports.CancelAppointmentDto = exports.CreateAppointmentDto = void 0;
const validator_1 = __importDefault(require("validator"));
const enums_1 = require("../generated/prisma/enums");
const VALID_STATUSES = Object.values(enums_1.AppointmentStatus);
class CreateAppointmentDto {
    static validate(data) {
        const errors = [];
        if (!data.serviceRequestId || typeof data.serviceRequestId !== 'string') {
            errors.push('Service request ID is required');
        }
        else if (!validator_1.default.isUUID(data.serviceRequestId)) {
            errors.push('Service request ID must be a valid UUID');
        }
        if (!data.embassyId || typeof data.embassyId !== 'string') {
            errors.push('Embassy ID is required');
        }
        else if (!validator_1.default.isUUID(data.embassyId)) {
            errors.push('Embassy ID must be a valid UUID');
        }
        if (!data.slotDate || typeof data.slotDate !== 'string') {
            errors.push('Slot date is required');
        }
        else if (!validator_1.default.isISO8601(data.slotDate)) {
            errors.push('Slot date must be a valid ISO date');
        }
        if (!data.slotTime || typeof data.slotTime !== 'string') {
            errors.push('Slot time is required');
        }
        else if (!/^\d{2}:\d{2}$/.test(data.slotTime)) {
            errors.push('Slot time must be in HH:mm format');
        }
        return errors;
    }
    static sanitize(data) {
        const dto = new CreateAppointmentDto();
        dto.serviceRequestId = data.serviceRequestId?.trim();
        dto.embassyId = data.embassyId?.trim();
        dto.slotDate = data.slotDate?.trim();
        dto.slotTime = data.slotTime?.trim();
        return dto;
    }
}
exports.CreateAppointmentDto = CreateAppointmentDto;
class CancelAppointmentDto {
    static validate(data) {
        const errors = [];
        if (data.reason !== undefined && typeof data.reason !== 'string') {
            errors.push('Reason must be a string');
        }
        return errors;
    }
    static sanitize(data) {
        const dto = new CancelAppointmentDto();
        dto.reason = data.reason?.trim();
        return dto;
    }
}
exports.CancelAppointmentDto = CancelAppointmentDto;
class AvailableSlotsQueryDto {
    static validate(data) {
        const errors = [];
        if (!data.embassyId || typeof data.embassyId !== 'string') {
            errors.push('Embassy ID is required');
        }
        else if (!validator_1.default.isUUID(data.embassyId)) {
            errors.push('Embassy ID must be a valid UUID');
        }
        if (!data.date || typeof data.date !== 'string') {
            errors.push('Date is required');
        }
        else if (!validator_1.default.isISO8601(data.date)) {
            errors.push('Date must be a valid ISO date');
        }
        return errors;
    }
    static sanitize(data) {
        const dto = new AvailableSlotsQueryDto();
        dto.embassyId = data.embassyId?.trim();
        dto.date = data.date?.trim();
        return dto;
    }
}
exports.AvailableSlotsQueryDto = AvailableSlotsQueryDto;
class AppointmentResponseDto {
}
exports.AppointmentResponseDto = AppointmentResponseDto;
class PaginatedAppointmentsDto {
}
exports.PaginatedAppointmentsDto = PaginatedAppointmentsDto;
