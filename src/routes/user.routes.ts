import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { CreateUserDto, UpdateUserDto } from '../dto/user.dto';
import { UserService } from '../services/user.service';
import { prisma } from '../config/db.config';

const userService = new UserService(prisma);
const userController = new UserController(userService);

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Current user profile
router.get('/me', userController.getProfile);
router.put('/me', validate(UpdateUserDto), userController.updateProfile);

// Admin routes
router.post('/', validate(CreateUserDto), requirePermission('user:create'), userController.create);
router.get('/', requirePermission('user:read'), userController.findAll);
router.get('/:id', requirePermission('user:read'), userController.findById);
router.put('/:id', validate(UpdateUserDto), requirePermission('user:update'), userController.update);
router.put('/:id/role', requirePermission('user:update'), userController.assignRole);
router.delete('/:id', requirePermission('user:delete'), userController.delete);
router.patch('/:id/status', requirePermission('user:update'), userController.changeStatus);

export default router;