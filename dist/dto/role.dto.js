"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionResponseDto = exports.PaginatedRolesDto = exports.RoleResponseDto = exports.AssignPermissionsDto = exports.UpdateRoleDto = exports.CreateRoleDto = void 0;
const validator_1 = __importDefault(require("validator"));
class CreateRoleDto {
    static validate(data) {
        const errors = [];
        if (!data.name || typeof data.name !== 'string') {
            errors.push('Role name is required');
        }
        else if (data.name.trim().length < 2) {
            errors.push('Role name must be at least 2 characters');
        }
        else if (data.name.trim().length > 100) {
            errors.push('Role name must not exceed 100 characters');
        }
        if (!data.slug || typeof data.slug !== 'string') {
            errors.push('Role slug is required');
        }
        else if (!/^[a-z0-9_-]+$/.test(data.slug)) {
            errors.push('Role slug must contain only lowercase letters, numbers, underscores, and hyphens');
        }
        else if (data.slug.length > 50) {
            errors.push('Role slug must not exceed 50 characters');
        }
        if (data.description !== undefined && data.description !== null && data.description !== '') {
            if (typeof data.description !== 'string') {
                errors.push('Description must be a string');
            }
            else if (data.description.length > 500) {
                errors.push('Description must not exceed 500 characters');
            }
        }
        return errors;
    }
    static sanitize(data) {
        const dto = new CreateRoleDto();
        dto.name = data.name?.trim();
        dto.slug = data.slug?.trim().toLowerCase();
        dto.description = data.description?.trim();
        return dto;
    }
}
exports.CreateRoleDto = CreateRoleDto;
class UpdateRoleDto {
    static validate(data) {
        const errors = [];
        if (data.name !== undefined) {
            if (typeof data.name !== 'string') {
                errors.push('Role name must be a string');
            }
            else if (data.name.trim().length < 2) {
                errors.push('Role name must be at least 2 characters');
            }
            else if (data.name.trim().length > 100) {
                errors.push('Role name must not exceed 100 characters');
            }
        }
        if (data.slug !== undefined) {
            if (typeof data.slug !== 'string') {
                errors.push('Role slug must be a string');
            }
            else if (!/^[a-z0-9_-]+$/.test(data.slug)) {
                errors.push('Role slug must contain only lowercase letters, numbers, underscores, and hyphens');
            }
            else if (data.slug.length > 50) {
                errors.push('Role slug must not exceed 50 characters');
            }
        }
        if (data.description !== undefined && data.description !== null && data.description !== '') {
            if (typeof data.description !== 'string') {
                errors.push('Description must be a string');
            }
            else if (data.description.length > 500) {
                errors.push('Description must not exceed 500 characters');
            }
        }
        return errors;
    }
    static sanitize(data) {
        const dto = new UpdateRoleDto();
        if (data.name !== undefined)
            dto.name = data.name.trim();
        if (data.slug !== undefined)
            dto.slug = data.slug.trim().toLowerCase();
        if (data.description !== undefined)
            dto.description = data.description.trim();
        return dto;
    }
}
exports.UpdateRoleDto = UpdateRoleDto;
class AssignPermissionsDto {
    static validate(data) {
        const errors = [];
        if (!data.permissionIds || !Array.isArray(data.permissionIds)) {
            errors.push('Permission IDs must be an array');
        }
        else {
            data.permissionIds.forEach((id, index) => {
                if (typeof id !== 'string') {
                    errors.push(`Permission ID at index ${index} must be a string`);
                }
                else if (!validator_1.default.isUUID(id)) {
                    errors.push(`Permission ID at index ${index} must be a valid UUID`);
                }
            });
        }
        return errors;
    }
    static sanitize(data) {
        const dto = new AssignPermissionsDto();
        dto.permissionIds = data.permissionIds?.filter((id) => typeof id === 'string' && validator_1.default.isUUID(id));
        return dto;
    }
}
exports.AssignPermissionsDto = AssignPermissionsDto;
class RoleResponseDto {
}
exports.RoleResponseDto = RoleResponseDto;
class PaginatedRolesDto {
}
exports.PaginatedRolesDto = PaginatedRolesDto;
class PermissionResponseDto {
}
exports.PermissionResponseDto = PermissionResponseDto;
