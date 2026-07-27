import { Router } from 'express';
import { EmbassyController } from '../controllers/embassy.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { CreateEmbassyDto, UpdateEmbassyDto, CreateDepartmentDto, UpdateDepartmentDto } from '../dto/embassy.dto';
import { resolveEmbassyContext } from '../middleware/embassy.middleware';
import { EmbassyService } from '../services/embassy.service';
import { prisma } from '../config/db.config';

const embassyService = new EmbassyService(prisma);
const embassyController = new EmbassyController(embassyService);

const router = Router();

router.use(authMiddleware, resolveEmbassyContext);

// Embassy routes
router.post('/', validate(CreateEmbassyDto), requirePermission('embassy:create'), embassyController.create);
router.get('/', requirePermission('embassy:read'), embassyController.findAll);
router.get('/:id', requirePermission('embassy:read'), embassyController.findById);
router.put('/:id', validate(UpdateEmbassyDto), requirePermission('embassy:update'), embassyController.update);
router.delete('/:id', requirePermission('embassy:delete'), embassyController.delete);

// Department routes (nested under embassies)
router.get('/:embassyId/departments', requirePermission('department:read'), embassyController.findDepartments);
router.post('/:embassyId/departments', validate(CreateDepartmentDto), requirePermission('department:create'), embassyController.createDepartment);

// Standalone department routes
router.put('/departments/:id', validate(UpdateDepartmentDto), requirePermission('department:update'), embassyController.updateDepartment);
router.delete('/departments/:id', requirePermission('department:delete'), embassyController.deleteDepartment);

export default router;