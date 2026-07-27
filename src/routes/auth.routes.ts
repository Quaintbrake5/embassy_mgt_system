import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { RegisterDto, LoginDto, RefreshDto, ChangePasswordDto } from '../dto/auth.dto';
import { AuthService } from '../services/auth.service';
import { prisma } from '../config/db.config';

const authService = new AuthService(prisma);
const authController = new AuthController(authService);

const router = Router();

// Public routes
router.post('/register', validate(RegisterDto), authController.register);
router.post('/login', validate(LoginDto), authController.login);
router.post('/refresh', validate(RefreshDto), authController.refresh);

// Protected routes
router.post('/logout', authMiddleware, authController.logout);
router.post('/change-password', authMiddleware, validate(ChangePasswordDto), authController.changePassword);

export default router;