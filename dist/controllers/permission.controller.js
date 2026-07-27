"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionController = void 0;
const permission_dto_1 = require("../dto/permission.dto");
const exceptions_1 = require("../exceptions");
class PermissionController {
    constructor(permissionService) {
        this.create = async (req, res, next) => {
            try {
                const dto = permission_dto_1.CreatePermissionDto.sanitize(req.body);
                const errors = permission_dto_1.CreatePermissionDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const permission = await this.permissionService.create(dto);
                res.status(201).json({
                    success: true,
                    data: permission,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.findAll = async (req, res, next) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const result = await this.permissionService.findAll(page, limit);
                res.json({
                    success: true,
                    data: result.data,
                    meta: result.meta,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.findById = async (req, res, next) => {
            try {
                const id = req.params.id;
                const permission = await this.permissionService.findById(id);
                res.json({
                    success: true,
                    data: permission,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.update = async (req, res, next) => {
            try {
                const id = req.params.id;
                const dto = permission_dto_1.UpdatePermissionDto.sanitize(req.body);
                const errors = permission_dto_1.UpdatePermissionDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const permission = await this.permissionService.update(id, dto);
                res.json({
                    success: true,
                    data: permission,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.delete = async (req, res, next) => {
            try {
                const id = req.params.id;
                await this.permissionService.delete(id);
                res.json({
                    success: true,
                    message: 'Permission deleted successfully',
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.permissionService = permissionService;
    }
}
exports.PermissionController = PermissionController;
