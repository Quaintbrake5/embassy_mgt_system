import { Request, Response, NextFunction } from 'express';
import { DiplomaticService } from '../services/diplomatic.service';
import { CreatePouchDto, UpdatePouchHandoffDto, CreateClearanceDto, UpdateClearanceDto } from '../dto/diplomatic.dto';
import { ValidationError } from '../exceptions';

export class DiplomaticController {
  private diplomaticService: DiplomaticService;

  constructor(diplomaticService: DiplomaticService) {
    this.diplomaticService = diplomaticService;
  }

  createPouch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = CreatePouchDto.sanitize(req.body);
      const errors = CreatePouchDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const pouch = await this.diplomaticService.createPouch(dto, req.user!.userId);
      res.status(201).json({ success: true, data: pouch });
    } catch (error) {
      next(error);
    }
  };

  findPouches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.diplomaticService.findPouches(page, limit);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  };

  findPouchById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const pouch = await this.diplomaticService.findPouchById(id);
      res.json({ success: true, data: pouch });
    } catch (error) {
      next(error);
    }
  };

  handoffPouch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const dto = UpdatePouchHandoffDto.sanitize(req.body);
      const errors = UpdatePouchHandoffDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const pouch = await this.diplomaticService.handoffPouch(id, dto, req.user!.userId);
      res.json({ success: true, data: pouch });
    } catch (error) {
      next(error);
    }
  };

  createClearance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = CreateClearanceDto.sanitize(req.body);
      const errors = CreateClearanceDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const clearance = await this.diplomaticService.createClearance(dto, req.user!.userId);
      res.status(201).json({ success: true, data: clearance });
    } catch (error) {
      next(error);
    }
  };

  findClearances = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.diplomaticService.findClearances(page, limit);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  };

  findClearanceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const clearance = await this.diplomaticService.findClearanceById(id);
      res.json({ success: true, data: clearance });
    } catch (error) {
      next(error);
    }
  };

  updateClearance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const dto = UpdateClearanceDto.sanitize(req.body);
      const errors = UpdateClearanceDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const clearance = await this.diplomaticService.updateClearance(id, dto, req.user!.userId);
      res.json({ success: true, data: clearance });
    } catch (error) {
      next(error);
    }
  };
}