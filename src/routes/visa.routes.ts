import { Router } from 'express';
import { VisaApplicationController } from '../controllers/visa-application.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { CreateVisaApplicationDto } from '../dto/visa-application.dto';
import { VisaApplicationService } from '../services/visa-application.service';
import { prisma } from '../config/db.config';
import { resolveEmbassyContext } from '../middleware/embassy.middleware';

const visaService = new VisaApplicationService(prisma);
const visaController = new VisaApplicationController(visaService);

const router = Router();

router.use(authMiddleware);
router.use(resolveEmbassyContext);

router.post('/', validate(CreateVisaApplicationDto), requirePermission('visa:create'), visaController.create);
router.get('/', requirePermission('visa:read'), visaController.findAll);
router.get('/:id', requirePermission('visa:read'), visaController.findById);
router.post('/:id/submit', requirePermission('visa:update'), visaController.submit);

export default router;