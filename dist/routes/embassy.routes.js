"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const embassy_controller_1 = require("../controllers/embassy.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const embassy_dto_1 = require("../dto/embassy.dto");
const embassy_middleware_1 = require("../middleware/embassy.middleware");
const embassy_service_1 = require("../services/embassy.service");
const db_config_1 = require("../config/db.config");
const embassyService = new embassy_service_1.EmbassyService(db_config_1.prisma);
const embassyController = new embassy_controller_1.EmbassyController(embassyService);
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware, embassy_middleware_1.resolveEmbassyContext);
// Embassy routes
router.post('/', (0, validation_middleware_1.validate)(embassy_dto_1.CreateEmbassyDto), (0, rbac_middleware_1.requirePermission)('embassy:create'), embassyController.create);
router.get('/', (0, rbac_middleware_1.requirePermission)('embassy:read'), embassyController.findAll);
router.get('/:id', (0, rbac_middleware_1.requirePermission)('embassy:read'), embassyController.findById);
router.put('/:id', (0, validation_middleware_1.validate)(embassy_dto_1.UpdateEmbassyDto), (0, rbac_middleware_1.requirePermission)('embassy:update'), embassyController.update);
router.delete('/:id', (0, rbac_middleware_1.requirePermission)('embassy:delete'), embassyController.delete);
// Department routes (nested under embassies)
router.get('/:embassyId/departments', (0, rbac_middleware_1.requirePermission)('department:read'), embassyController.findDepartments);
router.post('/:embassyId/departments', (0, validation_middleware_1.validate)(embassy_dto_1.CreateDepartmentDto), (0, rbac_middleware_1.requirePermission)('department:create'), embassyController.createDepartment);
// Standalone department routes
router.put('/departments/:id', (0, validation_middleware_1.validate)(embassy_dto_1.UpdateDepartmentDto), (0, rbac_middleware_1.requirePermission)('department:update'), embassyController.updateDepartment);
router.delete('/departments/:id', (0, rbac_middleware_1.requirePermission)('department:delete'), embassyController.deleteDepartment);
exports.default = router;
