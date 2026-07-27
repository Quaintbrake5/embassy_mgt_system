import { Request, Response, NextFunction } from 'express';
import { VisaApplicationService } from '../services/visa-application.service';
import { CreateVisaApplicationDto } from '../dto/visa-application.dto';
import { ValidationError } from '../exceptions';
import { getUserPermissions } from '../middleware/rbac.middleware';

export class VisaApplicationController {
  private visaApplicationService: VisaApplicationService;

  constructor(visaApplicationService: VisaApplicationService) {
    this.visaApplicationService = visaApplicationService;
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const dto = CreateVisaApplicationDto.sanitize(req.body);
      if ((dto.embassyId === undefined || dto.embassyId === null) && req.embassyContext?.embassyId) {
        dto.embassyId = req.embassyContext.embassyId;
      }
      const errors = CreateVisaApplicationDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const application = await this.visaApplicationService.create(userId, dto);
      res.status(201).json({ success: true, data: application });
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string | undefined;
      const visaType = req.query.visaType as string | undefined;
      const embassyId = req.query.embassyId as string | undefined;

      const permissions = await getUserPermissions(req.user!.userId);
      const canViewAll = permissions.includes('visa:read-all');

      const filter: any = { page, limit };
      if (status) filter.status = status;
      if (visaType) filter.visaType = visaType;
      if (embassyId) filter.embassyId = embassyId;
      else if (req.embassyContext?.embassyId) filter.embassyId = req.embassyContext.embassyId;
      if (!canViewAll) filter.userId = req.user!.userId;

      const result = await this.visaApplicationService.findAll(filter);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const application = await this.visaApplicationService.findById(id);
      res.json({ success: true, data: application });
    } catch (error) {
      next(error);
    }
  };

  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const userId = req.user?.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const application = await this.visaApplicationService.submit(id, userId);
      res.json({ success: true, data: application });
    } catch (error) {
      next(error);
    }
  };
}