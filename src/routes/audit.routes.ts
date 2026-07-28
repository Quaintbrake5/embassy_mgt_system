import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { AuditService } from '../services/audit.service';
import { prisma } from '../config/db.config';

const auditService = new AuditService(prisma);
const auditController = new AuditController(auditService);

const router = Router();

router.use(authMiddleware);

router.get('/export', requirePermission('audit:export'), auditController.exportLogs);
router.get('/', requirePermission('audit:read'), auditController.getLogs);
router.get('/:id', requirePermission('audit:read'), auditController.getLogById);

export default router;