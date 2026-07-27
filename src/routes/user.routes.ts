import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
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

// Admin routes
router.post('/', validate(CreateUserDto), userController.create);
router.get('/', userController.findAll);
router.get('/:id', userController.findById);
router.put('/:id', validate(UpdateUserDto), userController.update);
router.delete('/:id', userController.delete);
router.patch('/:id/status', userController.changeStatus);

export default router;