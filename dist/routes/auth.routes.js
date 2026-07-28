"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_dto_1 = require("../dto/auth.dto");
const auth_service_1 = require("../services/auth.service");
const db_config_1 = require("../config/db.config");
const redis_config_1 = require("../config/redis.config");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rateLimit = require('express-rate-limit');
const authService = new auth_service_1.AuthService(db_config_1.prisma, redis_config_1.redisClient);
const authController = new auth_controller_1.AuthController(authService);
const router = (0, express_1.Router)();
const verifyEmailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many verification attempts, please try again later' } },
});
// Public routes
router.post('/register', (0, validation_middleware_1.validate)(auth_dto_1.RegisterDto), authController.register);
router.post('/login', (0, validation_middleware_1.validate)(auth_dto_1.LoginDto), authController.login);
router.post('/refresh', (0, validation_middleware_1.validate)(auth_dto_1.RefreshDto), authController.refresh);
router.post('/forgot-password', (0, validation_middleware_1.validate)(auth_dto_1.ForgotPasswordDto), authController.forgotPassword);
router.post('/reset-password', (0, validation_middleware_1.validate)(auth_dto_1.ResetPasswordDto), authController.resetPassword);
// Protected routes
router.post('/logout', auth_middleware_1.authMiddleware, authController.logout);
router.post('/change-password', auth_middleware_1.authMiddleware, (0, validation_middleware_1.validate)(auth_dto_1.ChangePasswordDto), authController.changePassword);
router.post('/send-verification', auth_middleware_1.authenticatedUserMiddleware, authController.sendVerification);
router.post('/verify-email', verifyEmailLimiter, (0, validation_middleware_1.validate)(auth_dto_1.VerifyEmailDto), authController.verifyEmail);
exports.default = router;
