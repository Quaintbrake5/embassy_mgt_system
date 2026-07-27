"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_dto_1 = require("../dto/auth.dto");
const auth_service_1 = require("../services/auth.service");
const db_config_1 = require("../config/db.config");
const authService = new auth_service_1.AuthService(db_config_1.prisma);
const authController = new auth_controller_1.AuthController(authService);
const router = (0, express_1.Router)();
// Public routes
router.post('/register', (0, validation_middleware_1.validate)(auth_dto_1.RegisterDto), authController.register);
router.post('/login', (0, validation_middleware_1.validate)(auth_dto_1.LoginDto), authController.login);
router.post('/refresh', (0, validation_middleware_1.validate)(auth_dto_1.RefreshDto), authController.refresh);
// Protected routes
router.post('/logout', auth_middleware_1.authMiddleware, authController.logout);
router.post('/change-password', auth_middleware_1.authMiddleware, (0, validation_middleware_1.validate)(auth_dto_1.ChangePasswordDto), authController.changePassword);
exports.default = router;
