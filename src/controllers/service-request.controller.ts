import { Request, Response, NextFunction } from 'express';
import { ServiceRequestService } from '../services/service-request.service';
import { CreateServiceRequestDto, UpdateServiceRequestStatusDto } from '../dto/service-request.dto';
import { ValidationError } from '../exceptions';
import { getUserPermissions } from '../middleware/rbac.middleware';

export class ServiceRequestController {
  private serviceRequestService: ServiceRequestService;

  constructor(serviceRequestService: ServiceRequestService) {
    this.serviceRequestService = serviceRequestService;
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const dto = CreateServiceRequestDto.sanitize(req.body);
      const errors = CreateServiceRequestDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const request = await this.serviceRequestService.create(userId, dto);
      res.status(201).json({ success: true, data: request });
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string | undefined;
      const embassyId = req.query.embassyId as string | undefined;

      const permissions = await getUserPermissions(req.user!.userId);
      const canViewAll = permissions.includes('service-request:read-all');

      const filter: any = { page, limit };
      if (status) filter.status = status;
      if (embassyId) filter.embassyId = embassyId;
      if (!canViewAll) filter.userId = req.user!.userId;

      const result = await this.serviceRequestService.findAll(filter);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const request = await this.serviceRequestService.findById(id);
      res.json({ success: true, data: request });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const dto = UpdateServiceRequestStatusDto.sanitize(req.body);
      const errors = UpdateServiceRequestStatusDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const request = await this.serviceRequestService.updateStatus(id, dto, req.user?.userId);
      res.json({ success: true, data: request });
    } catch (error) {
      next(error);
    }
  };
}