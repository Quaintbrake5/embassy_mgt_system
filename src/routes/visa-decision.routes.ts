import { Router } from 'express';
import { VisaDecisionController } from '../controllers/visa-decision.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { CreateVisaDecisionDto } from '../dto/visa-decision.dto';
import { VisaDecisionService } from '../services/visa-decision.service';
import { prisma } from '../config/db.config';

const visaDecisionService = new VisaDecisionService(prisma);
const visaDecisionController = new VisaDecisionController(visaDecisionService);

const router = Router();

router.use(authMiddleware);

router.post('/applications/:id/decision', validate(CreateVisaDecisionDto), requirePermission('visa:update'), visaDecisionController.createDecision);
router.get('/applications/:id/decision', requirePermission('visa:read'), visaDecisionController.getDecision);
router.get('/decisions/officer/me', requirePermission('visa:read'), visaDecisionController.getMyDecisions);

export default router;