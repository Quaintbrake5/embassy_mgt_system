"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const user_dto_1 = require("../dto/user.dto");
const user_service_1 = require("../services/user.service");
const db_config_1 = require("../config/db.config");
const userService = new user_service_1.UserService(db_config_1.prisma);
const userController = new user_controller_1.UserController(userService);
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authMiddleware);
// Current user profile
router.get('/me', userController.getProfile);
router.put('/me', (0, validation_middleware_1.validate)(user_dto_1.UpdateUserDto), userController.updateProfile);
// Admin routes
router.post('/', (0, validation_middleware_1.validate)(user_dto_1.CreateUserDto), (0, rbac_middleware_1.requirePermission)('user:create'), userController.create);
router.get('/', (0, rbac_middleware_1.requirePermission)('user:read'), userController.findAll);
router.get('/:id', (0, rbac_middleware_1.requirePermission)('user:read'), userController.findById);
router.put('/:id', (0, validation_middleware_1.validate)(user_dto_1.UpdateUserDto), (0, rbac_middleware_1.requirePermission)('user:update'), userController.update);
router.put('/:id/role', (0, rbac_middleware_1.requirePermission)('user:update'), userController.assignRole);
router.delete('/:id', (0, rbac_middleware_1.requirePermission)('user:delete'), userController.delete);
router.patch('/:id/status', (0, rbac_middleware_1.requirePermission)('user:update'), userController.changeStatus);
exports.default = router;
