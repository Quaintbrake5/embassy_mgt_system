import { Router } from 'express';
import { LegalizationController } from '../controllers/legalization.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { CreateLegalizationDto, ProcessLegalizationDto } from '../dto/legalization.dto';
import { LegalizationService } from '../services/legalization.service';
import { prisma } from '../config/db.config';

const legalizationService = new LegalizationService(prisma);
const legalizationController = new LegalizationController(legalizationService);

const router = Router();

router.use(authMiddleware);

router.post('/', validate(CreateLegalizationDto), requirePermission('legalization:create'), legalizationController.create);
router.get('/', requirePermission('legalization:read'), legalizationController.findAll);
router.get('/:id', requirePermission('legalization:read'), legalizationController.findById);
router.put('/:id/process', validate(ProcessLegalizationDto), requirePermission('legalization:update'), legalizationController.process);

export default router;