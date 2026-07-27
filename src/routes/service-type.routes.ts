import { Router } from 'express';
import { ServiceTypeController } from '../controllers/service-type.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { CreateServiceTypeDto, UpdateServiceTypeDto } from '../dto/service-type.dto';
import { ServiceTypeService } from '../services/service-type.service';
import { prisma } from '../config/db.config';

const serviceTypeService = new ServiceTypeService(prisma);
const serviceTypeController = new ServiceTypeController(serviceTypeService);

const router = Router();

router.use(authMiddleware);

router.post('/', validate(CreateServiceTypeDto), requirePermission('service-type:create'), serviceTypeController.create);
router.get('/', requirePermission('service-type:read'), serviceTypeController.findAll);
router.get('/category/:category', requirePermission('service-type:read'), serviceTypeController.findByCategory);
router.get('/:id', requirePermission('service-type:read'), serviceTypeController.findById);
router.put('/:id', validate(UpdateServiceTypeDto), requirePermission('service-type:update'), serviceTypeController.update);
router.delete('/:id', requirePermission('service-type:delete'), serviceTypeController.delete);

export default router;