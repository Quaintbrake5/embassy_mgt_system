"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleController = void 0;
const role_dto_1 = require("../dto/role.dto");
const exceptions_1 = require("../exceptions");
class RoleController {
    constructor(roleService) {
        this.create = async (req, res, next) => {
            try {
                const dto = role_dto_1.CreateRoleDto.sanitize(req.body);
                const errors = role_dto_1.CreateRoleDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const role = await this.roleService.create(dto);
                res.status(201).json({
                    success: true,
                    data: role,
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
                const result = await this.roleService.findAll(page, limit);
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
                const role = await this.roleService.findById(id);
                res.json({
                    success: true,
                    data: role,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.update = async (req, res, next) => {
            try {
                const id = req.params.id;
                const dto = role_dto_1.UpdateRoleDto.sanitize(req.body);
                const errors = role_dto_1.UpdateRoleDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const role = await this.roleService.update(id, dto);
                res.json({
                    success: true,
                    data: role,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.delete = async (req, res, next) => {
            try {
                const id = req.params.id;
                await this.roleService.delete(id);
                res.json({
                    success: true,
                    message: 'Role deleted successfully',
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.assignPermissions = async (req, res, next) => {
            try {
                const id = req.params.id;
                const dto = role_dto_1.AssignPermissionsDto.sanitize(req.body);
                const errors = role_dto_1.AssignPermissionsDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const role = await this.roleService.assignPermissions(id, dto);
                res.json({
                    success: true,
                    data: role,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.roleService = roleService;
    }
}
exports.RoleController = RoleController;
