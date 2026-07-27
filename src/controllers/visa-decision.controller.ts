import { Request, Response, NextFunction } from 'express';
import { VisaDecisionService } from '../services/visa-decision.service';
import { CreateVisaDecisionDto } from '../dto/visa-decision.dto';
import { ValidationError } from '../exceptions';

export class VisaDecisionController {
  private visaDecisionService: VisaDecisionService;

  constructor(visaDecisionService: VisaDecisionService) {
    this.visaDecisionService = visaDecisionService;
  }

  createDecision = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const applicationId = req.params.id as string;
      const dto = CreateVisaDecisionDto.sanitize(req.body);
      const errors = CreateVisaDecisionDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const decision = await this.visaDecisionService.createDecision(applicationId, dto, userId);
      res.status(201).json({ success: true, data: decision });
    } catch (error) {
      next(error);
    }
  };

  getDecision = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const applicationId = req.params.id as string;
      const decision = await this.visaDecisionService.getDecision(applicationId);
      res.json({ success: true, data: decision });
    } catch (error) {
      next(error);
    }
  };

  getMyDecisions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.visaDecisionService.getDecisionsByOfficer(userId, page, limit);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  };
}