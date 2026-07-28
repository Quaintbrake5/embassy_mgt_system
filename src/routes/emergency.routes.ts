import { Router } from 'express';
import { EmergencyController } from '../controllers/emergency.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { CreateEmergencyCaseDto, AlertBroadcastDto, UpdateEmergencyCaseStatusDto } from '../dto/emergency.dto';
import { EmergencyService } from '../services/emergency.service';
import { prisma } from '../config/db.config';

const emergencyService = new EmergencyService(prisma);
const emergencyController = new EmergencyController(emergencyService);

const router = Router();

router.use(authMiddleware);

router.post('/cases', validate(CreateEmergencyCaseDto), requirePermission('emergency:create'), emergencyController.createCase);
router.get('/cases', requirePermission('emergency:read'), emergencyController.findAll);
router.get('/cases/:id', requirePermission('emergency:read'), emergencyController.findById);
router.put('/cases/:id/status', validate(UpdateEmergencyCaseStatusDto), requirePermission('emergency:update'), emergencyController.updateStatus);
router.get('/evacuation-list', requirePermission('emergency:read'), emergencyController.getEvacuationList);
router.post('/alerts', validate(AlertBroadcastDto), requirePermission('emergency:manage'), emergencyController.broadcastAlert);

export default router;