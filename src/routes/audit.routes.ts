import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { AuditService } from '../services/audit.service';
import { prisma } from '../config/db.config';

const auditService = new AuditService(prisma);
const auditController = new AuditController(auditService);

const router = Router();

router.use(authMiddleware);

router.get('/export', auditController.exportLogs);
router.get('/', auditController.getLogs);
router.get('/:id', auditController.getLogById);

export default router;