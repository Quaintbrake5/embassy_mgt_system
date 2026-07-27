import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { CreateProfileDto, UpdateProfileDto } from '../dto/profile.dto';
import { ProfileService } from '../services/profile.service';
import { prisma } from '../config/db.config';

const profileService = new ProfileService(prisma);
const profileController = new ProfileController(profileService);

const router = Router();

router.use(authMiddleware);

router.post('/', validate(CreateProfileDto), requirePermission('profile:create'), profileController.create);
router.get('/me', profileController.getMyProfile);
router.put('/me', validate(UpdateProfileDto), profileController.updateMyProfile);
router.delete('/me', profileController.deleteMyProfile);
router.get('/:id', requirePermission('profile:read'), profileController.findProfileByOfficer);

export default router;