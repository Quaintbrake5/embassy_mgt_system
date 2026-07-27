import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/profile.service';
import { CreateProfileDto, UpdateProfileDto } from '../dto/profile.dto';
import { ValidationError, AuthenticationError } from '../exceptions';

export class ProfileController {
  private profileService: ProfileService;

  constructor(profileService: ProfileService) {
    this.profileService = profileService;
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      const dto = CreateProfileDto.sanitize(req.body);
      const errors = CreateProfileDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const profile = await this.profileService.createProfile(userId, dto, req.user?.userId);
      res.status(201).json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  };

  getMyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      const profile = await this.profileService.getProfile(userId, req.user?.userId);
      res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  };

  updateMyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      const dto = UpdateProfileDto.sanitize(req.body);
      const errors = UpdateProfileDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const profile = await this.profileService.updateProfile(userId, dto, req.user?.userId);
      res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  };

  deleteMyProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      await this.profileService.deleteProfile(userId, req.user?.userId);
      res.json({ success: true, message: 'Profile deleted successfully (GDPR anonymization)' });
    } catch (error) {
      next(error);
    }
  };

  findProfileByOfficer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const officerId = req.user?.userId;
      if (!officerId) {
        throw new AuthenticationError('User not authenticated');
      }
      const profile = await this.profileService.findProfileByOfficer(id, officerId);
      res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  };
}