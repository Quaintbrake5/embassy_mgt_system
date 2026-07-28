import { Request, Response, NextFunction } from 'express';
import { LegalizationService } from '../services/legalization.service';
import { CreateLegalizationDto, ProcessLegalizationDto } from '../dto/legalization.dto';
import { ValidationError } from '../exceptions';

export class LegalizationController {
  private legalizationService: LegalizationService;

  constructor(legalizationService: LegalizationService) {
    this.legalizationService = legalizationService;
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const dto = CreateLegalizationDto.sanitize(req.body);
      const errors = CreateLegalizationDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const result = await this.legalizationService.create(dto, userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.legalizationService.findAll(page, limit);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await this.legalizationService.findById(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  process = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const id = req.params.id as string;
      const dto = ProcessLegalizationDto.sanitize(req.body);
      const errors = ProcessLegalizationDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const result = await this.legalizationService.process(id, dto, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}