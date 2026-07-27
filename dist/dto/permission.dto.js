"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginatedPermissionsDto = exports.PermissionResponseDto = exports.UpdatePermissionDto = exports.CreatePermissionDto = void 0;
class CreatePermissionDto {
    static validate(data) {
        const errors = [];
        if (!data.name || typeof data.name !== 'string') {
            errors.push('Permission name is required');
        }
        else if (data.name.trim().length < 2) {
            errors.push('Permission name must be at least 2 characters');
        }
        else if (data.name.trim().length > 100) {
            errors.push('Permission name must not exceed 100 characters');
        }
        if (!data.slug || typeof data.slug !== 'string') {
            errors.push('Permission slug is required');
        }
        else if (!/^[a-z0-9:_.-]+$/.test(data.slug)) {
            errors.push('Permission slug must follow resource:action format (e.g., user:create)');
        }
        else if (data.slug.length > 100) {
            errors.push('Permission slug must not exceed 100 characters');
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
        const dto = new CreatePermissionDto();
        dto.name = data.name?.trim();
        dto.slug = data.slug?.trim().toLowerCase();
        dto.description = data.description?.trim();
        return dto;
    }
}
exports.CreatePermissionDto = CreatePermissionDto;
class UpdatePermissionDto {
    static validate(data) {
        const errors = [];
        if (data.name !== undefined) {
            if (typeof data.name !== 'string') {
                errors.push('Permission name must be a string');
            }
            else if (data.name.trim().length < 2) {
                errors.push('Permission name must be at least 2 characters');
            }
            else if (data.name.trim().length > 100) {
                errors.push('Permission name must not exceed 100 characters');
            }
        }
        if (data.slug !== undefined) {
            if (typeof data.slug !== 'string') {
                errors.push('Permission slug must be a string');
            }
            else if (!/^[a-z0-9:_.-]+$/.test(data.slug)) {
                errors.push('Permission slug must follow resource:action format (e.g., user:create)');
            }
            else if (data.slug.length > 100) {
                errors.push('Permission slug must not exceed 100 characters');
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
        const dto = new UpdatePermissionDto();
        if (data.name !== undefined)
            dto.name = data.name.trim();
        if (data.slug !== undefined)
            dto.slug = data.slug.trim().toLowerCase();
        if (data.description !== undefined)
            dto.description = data.description.trim();
        return dto;
    }
}
exports.UpdatePermissionDto = UpdatePermissionDto;
class PermissionResponseDto {
}
exports.PermissionResponseDto = PermissionResponseDto;
class PaginatedPermissionsDto {
}
exports.PaginatedPermissionsDto = PaginatedPermissionsDto;
