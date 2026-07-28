import { Request, Response, NextFunction } from 'express';
import { EmergencyService } from '../services/emergency.service';
import { CreateEmergencyCaseDto, AlertBroadcastDto, UpdateEmergencyCaseStatusDto } from '../dto/emergency.dto';
import { ValidationError } from '../exceptions';
import validator from 'validator';

export class EmergencyController {
  private emergencyService: EmergencyService;

  constructor(emergencyService: EmergencyService) {
    this.emergencyService = emergencyService;
  }

  createCase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const dto = CreateEmergencyCaseDto.sanitize(req.body);
      const errors = CreateEmergencyCaseDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const result = await this.emergencyService.createCase(dto, userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.emergencyService.findAll(page, limit);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await this.emergencyService.findById(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const id = req.params.id as string;
      const result = await this.emergencyService.updateStatus(id, req.body.status, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getEvacuationList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const embassyId = req.query.embassyId as string;
      if (!embassyId) {
        throw new ValidationError('Embassy ID is required');
      }
      if (!validator.isUUID(embassyId)) {
        throw new ValidationError('Embassy ID must be a valid UUID');
      }

      const result = await this.emergencyService.getEvacuationList(embassyId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  broadcastAlert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const dto = AlertBroadcastDto.sanitize(req.body);
      const errors = AlertBroadcastDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      await this.emergencyService.broadcastAlert(dto, userId);
      res.status(201).json({ success: true, message: 'Alert broadcasted successfully' });
    } catch (error) {
      next(error);
    }
  };
}