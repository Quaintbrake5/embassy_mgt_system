import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';
import { ValidationError } from '../exceptions';

export class AuditController {
  private auditService: AuditService;

  constructor(auditService: AuditService) {
    this.auditService = auditService;
  }

  getLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const userId = req.query.userId as string | undefined;
      const entity = req.query.entity as string | undefined;
      const action = req.query.action as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const result = await this.auditService.findAll({
        userId, entity, action, startDate, endDate, page, limit,
      });

      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  };

  getLogById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const log = await this.auditService.findById(id);
      res.json({
        success: true,
        data: log,
      });
    } catch (error) {
      next(error);
    }
  };

  exportLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entity = req.query.entity as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const logs = await this.auditService.exportLogs({ startDate, endDate, entity });

      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  };
}