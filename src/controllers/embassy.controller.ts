import { Request, Response, NextFunction } from 'express';
import { EmbassyService } from '../services/embassy.service';
import { CreateEmbassyDto, UpdateEmbassyDto, CreateDepartmentDto, UpdateDepartmentDto } from '../dto/embassy.dto';
import { ValidationError } from '../exceptions';

export class EmbassyController {
  private embassyService: EmbassyService;

  constructor(embassyService: EmbassyService) {
    this.embassyService = embassyService;
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = CreateEmbassyDto.sanitize(req.body);
      const errors = CreateEmbassyDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const embassy = await this.embassyService.create(dto, req.user?.userId);
      res.status(201).json({ success: true, data: embassy });
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.embassyService.findAll(page, limit);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const embassy = await this.embassyService.findById(id);
      res.json({ success: true, data: embassy });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const dto = UpdateEmbassyDto.sanitize(req.body);
      const errors = UpdateEmbassyDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const embassy = await this.embassyService.update(id, dto, req.user?.userId);
      res.json({ success: true, data: embassy });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.embassyService.delete(id, req.user?.userId);
      res.json({ success: true, message: 'Embassy deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  createDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const embassyId = req.params.embassyId as string;
      const dto = CreateDepartmentDto.sanitize(req.body);
      const errors = CreateDepartmentDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const department = await this.embassyService.createDepartment(embassyId, dto, req.user?.userId);
      res.status(201).json({ success: true, data: department });
    } catch (error) {
      next(error);
    }
  };

  findDepartments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const embassyId = req.params.embassyId as string;
      const departments = await this.embassyService.findDepartments(embassyId);
      res.json({ success: true, data: departments });
    } catch (error) {
      next(error);
    }
  };

  updateDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const dto = UpdateDepartmentDto.sanitize(req.body);
      const errors = UpdateDepartmentDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const department = await this.embassyService.updateDepartment(id, dto, req.user?.userId);
      res.json({ success: true, data: department });
    } catch (error) {
      next(error);
    }
  };

  deleteDepartment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      await this.embassyService.deleteDepartment(id, req.user?.userId);
      res.json({ success: true, message: 'Department deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
}