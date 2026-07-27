import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import roleRoutes from './role.routes';
import permissionRoutes from './permission.routes';
import auditRoutes from './audit.routes';
import embassyRoutes from './embassy.routes';
import serviceTypeRoutes from './service-type.routes';
import serviceRequestRoutes from './service-request.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/audit', auditRoutes);
router.use('/embassies', embassyRoutes);
router.use('/service-types', serviceTypeRoutes);
router.use('/service-requests', serviceRequestRoutes);

export default router;