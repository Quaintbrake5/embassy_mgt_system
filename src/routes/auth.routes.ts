import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware, authenticatedUserMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { RegisterDto, LoginDto, RefreshDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto } from '../dto/auth.dto';
import { AuthService } from '../services/auth.service';
import { prisma } from '../config/db.config';
import { redisClient } from '../config/redis.config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rateLimit = require('express-rate-limit');

const authService = new AuthService(prisma, redisClient);
const authController = new AuthController(authService);

const router = Router();

const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many verification attempts, please try again later' } },
});

// Public routes
router.post('/register', validate(RegisterDto), authController.register);
router.post('/login', validate(LoginDto), authController.login);
router.post('/refresh', validate(RefreshDto), authController.refresh);
router.post('/forgot-password', validate(ForgotPasswordDto), authController.forgotPassword);
router.post('/reset-password', validate(ResetPasswordDto), authController.resetPassword);

// Protected routes
router.post('/logout', authMiddleware, authController.logout);
router.post('/change-password', authMiddleware, validate(ChangePasswordDto), authController.changePassword);

router.post('/send-verification', authenticatedUserMiddleware, authController.sendVerification)
router.post('/verify-email', verifyEmailLimiter, validate(VerifyEmailDto), authController.verifyEmail)

export default router;