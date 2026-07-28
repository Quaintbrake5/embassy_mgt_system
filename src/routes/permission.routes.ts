import { Router } from 'express';
import { PermissionController } from '../controllers/permission.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { CreatePermissionDto, UpdatePermissionDto } from '../dto/permission.dto';
import { PermissionService } from '../services/permission.service';
import { prisma } from '../config/db.config';

const permissionService = new PermissionService(prisma);
const permissionController = new PermissionController(permissionService);

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.post('/', requirePermission('permission:create'), permissionController.create);
router.get('/', requirePermission('permission:read'), permissionController.findAll);
router.get('/:id', requirePermission('permission:read'), permissionController.findById);
router.put('/:id', requirePermission('permission:update'), permissionController.update);
router.delete('/:id', requirePermission('permission:delete'), permissionController.delete);

export default router;