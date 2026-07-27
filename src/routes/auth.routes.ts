import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { RegisterDto, LoginDto, RefreshDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from '../dto/auth.dto';
import { AuthService } from '../services/auth.service';
import { prisma } from '../config/db.config';

const authService = new AuthService(prisma);
const authController = new AuthController(authService);

const router = Router();

// Public routes
router.post('/register', validate(RegisterDto), authController.register);
router.post('/login', validate(LoginDto), authController.login);
router.post('/refresh', validate(RefreshDto), authController.refresh);
router.post('/forgot-password', validate(ForgotPasswordDto), authController.forgotPassword);
router.post('/reset-password', validate(ResetPasswordDto), authController.resetPassword);

// Protected routes
router.post('/logout', authMiddleware, authController.logout);
router.post('/change-password', authMiddleware, validate(ChangePasswordDto), authController.changePassword);

export default router;