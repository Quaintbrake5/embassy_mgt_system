"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_dto_1 = require("../dto/user.dto");
const exceptions_1 = require("../exceptions");
class UserController {
    constructor(userService) {
        this.create = async (req, res, next) => {
            try {
                const dto = user_dto_1.CreateUserDto.sanitize(req.body);
                const errors = user_dto_1.CreateUserDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const user = await this.userService.create(dto);
                res.status(201).json({
                    success: true,
                    data: user,
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
                const result = await this.userService.findAll(page, limit);
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
                const user = await this.userService.findById(id);
                res.json({
                    success: true,
                    data: user,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.update = async (req, res, next) => {
            try {
                const id = req.params.id;
                const dto = user_dto_1.UpdateUserDto.sanitize(req.body);
                const errors = user_dto_1.UpdateUserDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const user = await this.userService.update(id, dto);
                res.json({
                    success: true,
                    data: user,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.delete = async (req, res, next) => {
            try {
                const id = req.params.id;
                await this.userService.delete(id);
                res.json({
                    success: true,
                    message: 'User deleted successfully',
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.changeStatus = async (req, res, next) => {
            try {
                const id = req.params.id;
                const { status } = req.body;
                if (!status) {
                    throw new exceptions_1.ValidationError('Status is required');
                }
                const user = await this.userService.changeStatus(id, status);
                res.json({
                    success: true,
                    data: user,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.getProfile = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const profile = await this.userService.getProfile(userId);
                res.json({
                    success: true,
                    data: profile,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateProfile = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const dto = req.body;
                const updated = await this.userService.updateProfile(userId, dto);
                res.json({
                    success: true,
                    data: updated,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.assignRole = async (req, res, next) => {
            try {
                const id = req.params.id;
                const { roleId } = req.body;
                if (!roleId) {
                    throw new exceptions_1.ValidationError('Role ID is required');
                }
                const updated = await this.userService.assignRole(id, roleId);
                res.json({
                    success: true,
                    data: updated,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.userService = userService;
    }
}
exports.UserController = UserController;
