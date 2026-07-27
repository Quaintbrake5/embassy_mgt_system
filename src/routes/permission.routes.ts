import { Router } from 'express';
import { PermissionController } from '../controllers/permission.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { CreatePermissionDto, UpdatePermissionDto } from '../dto/permission.dto';
import { PermissionService } from '../services/permission.service';
import { prisma } from '../config/db.config';
import { AuthService } from '../services/auth.service';

const authService = new AuthService(prisma);
const permissionService = new PermissionService(prisma);
const permissionController = new PermissionController(permissionService);

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.post('/', permissionController.create);
router.get('/', permissionController.findAll);
router.get('/:id', permissionController.findById);
router.put('/:id', permissionController.update);
router.delete('/:id', permissionController.delete);

export default router;