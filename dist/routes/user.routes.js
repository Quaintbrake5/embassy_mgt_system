"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
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
// Admin routes
router.post('/', (0, validation_middleware_1.validate)(user_dto_1.CreateUserDto), userController.create);
router.get('/', userController.findAll);
router.get('/:id', userController.findById);
router.put('/:id', (0, validation_middleware_1.validate)(user_dto_1.UpdateUserDto), userController.update);
router.delete('/:id', userController.delete);
router.patch('/:id/status', userController.changeStatus);
exports.default = router;
