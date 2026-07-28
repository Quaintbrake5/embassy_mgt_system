import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { RegisterDto, LoginDto, RefreshDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto } from '../dto/auth.dto';
import { ValidationError, AuthenticationError } from '../exceptions';

export class AuthController {
  private authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = RegisterDto.sanitize(req.body);
      const errors = RegisterDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const result = await this.authService.register(dto);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = LoginDto.sanitize(req.body);
      const errors = LoginDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const result = await this.authService.login(dto);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = RefreshDto.sanitize(req.body);
      const errors = RefreshDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const result = await this.authService.refresh(dto.refreshToken);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      await this.authService.logout(userId);
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      const dto = ChangePasswordDto.sanitize(req.body);
      const errors = ChangePasswordDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

await this.authService.changePassword(userId, dto);
      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = ForgotPasswordDto.sanitize(req.body);
      const errors = ForgotPasswordDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const result = await this.authService.forgotPassword(dto.email);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = ResetPasswordDto.sanitize(req.body);
      const errors = ResetPasswordDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const result = await this.authService.resetPassword(dto.token, dto.newPassword);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
  sendVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId
      if (!userId) throw new AuthenticationError('User not authenticated')

      const result = await this.authService.sendVerification(userId)
      res.status(201).json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }

  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as VerifyEmailDto
      const result = await this.authService.verifyEmail(dto.token)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }
}