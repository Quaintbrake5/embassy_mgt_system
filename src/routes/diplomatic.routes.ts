import { Router } from 'express';
import { DiplomaticController } from '../controllers/diplomatic.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { CreatePouchDto, UpdatePouchHandoffDto, CreateClearanceDto, UpdateClearanceDto } from '../dto/diplomatic.dto';
import { DiplomaticService } from '../services/diplomatic.service';
import { prisma } from '../config/db.config';

const diplomaticService = new DiplomaticService(prisma);
const diplomaticController = new DiplomaticController(diplomaticService);

const router = Router();

router.use(authMiddleware);

router.post('/pouches', validate(CreatePouchDto), requirePermission('diplomatic:create'), diplomaticController.createPouch);
router.get('/pouches', requirePermission('diplomatic:read'), diplomaticController.findPouches);
router.get('/pouches/:id', requirePermission('diplomatic:read'), diplomaticController.findPouchById);
router.put('/pouches/:id/handoff', validate(UpdatePouchHandoffDto), requirePermission('diplomatic:update'), diplomaticController.handoffPouch);

router.post('/clearances', validate(CreateClearanceDto), requirePermission('diplomatic:create'), diplomaticController.createClearance);
router.get('/clearances', requirePermission('diplomatic:read'), diplomaticController.findClearances);
router.get('/clearances/:id', requirePermission('diplomatic:read'), diplomaticController.findClearanceById);
router.put('/clearances/:id', validate(UpdateClearanceDto), requirePermission('diplomatic:update'), diplomaticController.updateClearance);

export default router;