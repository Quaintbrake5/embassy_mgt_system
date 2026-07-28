"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const permission_controller_1 = require("../controllers/permission.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const permission_service_1 = require("../services/permission.service");
const db_config_1 = require("../config/db.config");
const permissionService = new permission_service_1.PermissionService(db_config_1.prisma);
const permissionController = new permission_controller_1.PermissionController(permissionService);
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authMiddleware);
router.post('/', (0, rbac_middleware_1.requirePermission)('permission:create'), permissionController.create);
router.get('/', (0, rbac_middleware_1.requirePermission)('permission:read'), permissionController.findAll);
router.get('/:id', (0, rbac_middleware_1.requirePermission)('permission:read'), permissionController.findById);
router.put('/:id', (0, rbac_middleware_1.requirePermission)('permission:update'), permissionController.update);
router.delete('/:id', (0, rbac_middleware_1.requirePermission)('permission:delete'), permissionController.delete);
exports.default = router;
