"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginatedUsersDto = exports.UserResponseDto = exports.UpdateUserDto = exports.CreateUserDto = void 0;
const validator_1 = __importDefault(require("validator"));
class CreateUserDto {
    static validate(data) {
        const errors = [];
        if (!data.firstName || typeof data.firstName !== 'string' || data.firstName.trim().length === 0) {
            errors.push('First name is required');
        }
        else if (data.firstName.trim().length > 100) {
            errors.push('First name must not exceed 100 characters');
        }
        if (!data.lastName || typeof data.lastName !== 'string' || data.lastName.trim().length === 0) {
            errors.push('Last name is required');
        }
        else if (data.lastName.trim().length > 100) {
            errors.push('Last name must not exceed 100 characters');
        }
        if (!data.email || typeof data.email !== 'string') {
            errors.push('Email is required');
        }
        else if (!validator_1.default.isEmail(data.email)) {
            errors.push('Invalid email format');
        }
        if (!data.password || typeof data.password !== 'string') {
            errors.push('Password is required');
        }
        else if (data.password.length < 8) {
            errors.push('Password must be at least 8 characters');
        }
        else if (!validator_1.default.isStrongPassword(data.password, {
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
        })) {
            errors.push('Password must contain uppercase, lowercase, number, and special character');
        }
        if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
            if (typeof data.phone !== 'string') {
                errors.push('Phone must be a string');
            }
            else if (!validator_1.default.isMobilePhone(data.phone, 'any', { strictMode: false })) {
                errors.push('Invalid phone number format');
            }
        }
        if (data.roleId !== undefined && data.roleId !== null && data.roleId !== '') {
            if (typeof data.roleId !== 'string') {
                errors.push('Role ID must be a string');
            }
            else if (!validator_1.default.isUUID(data.roleId)) {
                errors.push('Role ID must be a valid UUID');
            }
        }
        if (data.status !== undefined) {
            const validStatuses = ['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'];
            if (!validStatuses.includes(data.status)) {
                errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
            }
        }
        return errors;
    }
    static sanitize(data) {
        const dto = new CreateUserDto();
        dto.firstName = data.firstName?.trim();
        dto.lastName = data.lastName?.trim();
        dto.email = data.email?.trim().toLowerCase();
        dto.password = data.password;
        dto.phone = data.phone?.trim();
        dto.roleId = data.roleId?.trim();
        dto.status = data.status;
        return dto;
    }
}
exports.CreateUserDto = CreateUserDto;
class UpdateUserDto {
    static validate(data) {
        const errors = [];
        if (data.firstName !== undefined) {
            if (typeof data.firstName !== 'string') {
                errors.push('First name must be a string');
            }
            else if (data.firstName.trim().length < 2) {
                errors.push('First name must be at least 2 characters');
            }
            else if (data.firstName.trim().length > 100) {
                errors.push('First name must not exceed 100 characters');
            }
        }
        if (data.lastName !== undefined) {
            if (typeof data.lastName !== 'string') {
                errors.push('Last name must be a string');
            }
            else if (data.lastName.trim().length < 2) {
                errors.push('Last name must be at least 2 characters');
            }
            else if (data.lastName.trim().length > 100) {
                errors.push('Last name must not exceed 100 characters');
            }
        }
        if (data.email !== undefined) {
            if (typeof data.email !== 'string') {
                errors.push('Email must be a string');
            }
            else if (!validator_1.default.isEmail(data.email)) {
                errors.push('Invalid email format');
            }
        }
        if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
            if (typeof data.phone !== 'string') {
                errors.push('Phone must be a string');
            }
            else if (!validator_1.default.isMobilePhone(data.phone, 'any', { strictMode: false })) {
                errors.push('Invalid phone number format');
            }
        }
        if (data.roleId !== undefined && data.roleId !== null && data.roleId !== '') {
            if (typeof data.roleId !== 'string') {
                errors.push('Role ID must be a string');
            }
            else if (!validator_1.default.isUUID(data.roleId)) {
                errors.push('Role ID must be a valid UUID');
            }
        }
        if (data.status !== undefined) {
            const validStatuses = ['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'];
            if (!validStatuses.includes(data.status)) {
                errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
            }
        }
        return errors;
    }
    static sanitize(data) {
        const dto = new UpdateUserDto();
        if (data.firstName !== undefined)
            dto.firstName = data.firstName.trim();
        if (data.lastName !== undefined)
            dto.lastName = data.lastName.trim();
        if (data.email !== undefined)
            dto.email = data.email.trim().toLowerCase();
        if (data.phone !== undefined)
            dto.phone = data.phone?.trim();
        if (data.roleId !== undefined)
            dto.roleId = data.roleId?.trim();
        if (data.status !== undefined)
            dto.status = data.status;
        return dto;
    }
}
exports.UpdateUserDto = UpdateUserDto;
class UserResponseDto {
}
exports.UserResponseDto = UserResponseDto;
class PaginatedUsersDto {
}
exports.PaginatedUsersDto = PaginatedUsersDto;
