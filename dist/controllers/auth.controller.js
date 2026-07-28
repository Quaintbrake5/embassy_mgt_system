"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_dto_1 = require("../dto/auth.dto");
const exceptions_1 = require("../exceptions");
class AuthController {
    constructor(authService) {
        this.register = async (req, res, next) => {
            try {
                const dto = auth_dto_1.RegisterDto.sanitize(req.body);
                const errors = auth_dto_1.RegisterDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const result = await this.authService.register(dto);
                res.status(201).json({
                    success: true,
                    data: result,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.login = async (req, res, next) => {
            try {
                const dto = auth_dto_1.LoginDto.sanitize(req.body);
                const errors = auth_dto_1.LoginDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const result = await this.authService.login(dto);
                res.json({
                    success: true,
                    data: result,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.refresh = async (req, res, next) => {
            try {
                const dto = auth_dto_1.RefreshDto.sanitize(req.body);
                const errors = auth_dto_1.RefreshDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const result = await this.authService.refresh(dto.refreshToken);
                res.json({
                    success: true,
                    data: result,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.logout = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new exceptions_1.AuthenticationError('User not authenticated');
                }
                await this.authService.logout(userId);
                res.json({
                    success: true,
                    message: 'Logged out successfully',
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.changePassword = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new exceptions_1.AuthenticationError('User not authenticated');
                }
                const dto = auth_dto_1.ChangePasswordDto.sanitize(req.body);
                const errors = auth_dto_1.ChangePasswordDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                await this.authService.changePassword(userId, dto);
                res.json({
                    success: true,
                    message: 'Password changed successfully',
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.forgotPassword = async (req, res, next) => {
            try {
                const dto = auth_dto_1.ForgotPasswordDto.sanitize(req.body);
                const errors = auth_dto_1.ForgotPasswordDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const result = await this.authService.forgotPassword(dto.email);
                res.json({
                    success: true,
                    data: result,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.resetPassword = async (req, res, next) => {
            try {
                const dto = auth_dto_1.ResetPasswordDto.sanitize(req.body);
                const errors = auth_dto_1.ResetPasswordDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const result = await this.authService.resetPassword(dto.token, dto.newPassword);
                res.json({
                    success: true,
                    data: result,
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.sendVerification = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId)
                    throw new exceptions_1.AuthenticationError('User not authenticated');
                const result = await this.authService.sendVerification(userId);
                res.status(201).json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.verifyEmail = async (req, res, next) => {
            try {
                const dto = req.body;
                const result = await this.authService.verifyEmail(dto.token);
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.authService = authService;
    }
}
exports.AuthController = AuthController;
