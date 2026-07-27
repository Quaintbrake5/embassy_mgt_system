import { Router } from 'express';
import { VisaDocumentController } from '../controllers/visa-document.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { CreateVisaDocumentDto } from '../dto/visa-document.dto';
import { VisaDocumentService } from '../services/visa-document.service';
import { prisma } from '../config/db.config';

const visaDocumentService = new VisaDocumentService(prisma);
const visaDocumentController = new VisaDocumentController(visaDocumentService);

const router = Router();

router.use(authMiddleware);

router.post('/', validate(CreateVisaDocumentDto), requirePermission('visa:create'), visaDocumentController.create);
router.get('/application/:visaApplicationId', requirePermission('visa:read'), visaDocumentController.findByApplication);
router.get('/:id', requirePermission('visa:read'), visaDocumentController.findById);
router.delete('/:id', requirePermission('visa:update'), visaDocumentController.delete);

export default router;