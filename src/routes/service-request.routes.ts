import { Router } from 'express';
import { ServiceRequestController } from '../controllers/service-request.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { CreateServiceRequestDto, UpdateServiceRequestStatusDto } from '../dto/service-request.dto';
import { ServiceRequestService } from '../services/service-request.service';
import { prisma } from '../config/db.config';

const serviceRequestService = new ServiceRequestService(prisma);
const serviceRequestController = new ServiceRequestController(serviceRequestService);

const router = Router();

router.use(authMiddleware);

router.post('/', validate(CreateServiceRequestDto), requirePermission('service-request:create'), serviceRequestController.create);
router.get('/', requirePermission('service-request:read'), serviceRequestController.findAll);
router.get('/:id', requirePermission('service-request:read'), serviceRequestController.findById);
router.put('/:id/status', validate(UpdateServiceRequestStatusDto), requirePermission('service-request:update'), serviceRequestController.updateStatus);

export default router;