import { Router } from 'express';
import { FinancialController } from '../controllers/financial.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { RecordTransactionDto } from '../dto/financial.dto';
import { FinancialService } from '../services/financial.service';
import { prisma } from '../config/db.config';

const financialService = new FinancialService(prisma);
const financialController = new FinancialController(financialService);

const router = Router();

router.use(authMiddleware);

router.post('/transactions', validate(RecordTransactionDto), requirePermission('financial:create'), financialController.recordTransaction);
router.get('/transactions', requirePermission('financial:read'), financialController.findTransactions);
router.get('/transactions/:id', requirePermission('financial:read'), financialController.findTransactionById);
router.get('/reconciliation/daily', requirePermission('financial:manage'), financialController.getDailyReconciliation);
router.get('/reports/monthly', requirePermission('financial:manage'), financialController.getMonthlyReport);

export default router;