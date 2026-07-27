import { Router } from 'express';
import { RoleController } from '../controllers/role.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsDto } from '../dto/role.dto';
import { RoleService } from '../services/role.service';
import { prisma } from '../config/db.config';

const roleService = new RoleService(prisma);
const roleController = new RoleController(roleService);

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.post('/', validate(CreateRoleDto), roleController.create);
router.get('/', roleController.findAll);
router.get('/:id', roleController.findById);
router.put('/:id', validate(UpdateRoleDto), roleController.update);
router.delete('/:id', roleController.delete);
router.post('/:id/permissions', validate(AssignPermissionsDto), roleController.assignPermissions);

export default router;