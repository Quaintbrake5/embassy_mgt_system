import { Request, Response, NextFunction } from 'express';
import { ServiceTypeService } from '../services/service-type.service';
import { CreateServiceTypeDto, UpdateServiceTypeDto } from '../dto/service-type.dto';
import { ValidationError } from '../exceptions';

export class ServiceTypeController {
  private serviceTypeService: ServiceTypeService;

  constructor(serviceTypeService: ServiceTypeService) {
    this.serviceTypeService = serviceTypeService;
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = CreateServiceTypeDto.sanitize(req.body);
      const errors = CreateServiceTypeDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const serviceType = await this.serviceTypeService.create(dto, req.user?.userId);
      res.status(201).json({ success: true, data: serviceType });
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.serviceTypeService.findAll(page, limit);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const serviceType = await this.serviceTypeService.findById(id);
      res.json({ success: true, data: serviceType });
    } catch (error) {
      next(error);
    }
  };

  findByCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const category = req.params.category as string;
      const items = await this.serviceTypeService.findByCategory(category);
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const dto = UpdateServiceTypeDto.sanitize(req.body);
      const errors = UpdateServiceTypeDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const serviceType = await this.serviceTypeService.update(id, dto, req.user?.userId);
      res.json({ success: true, data: serviceType });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.serviceTypeService.delete(id, req.user?.userId);
      res.json({ success: true, message: 'Service type deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
}