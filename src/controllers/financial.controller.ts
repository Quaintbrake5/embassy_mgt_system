import { Request, Response, NextFunction } from 'express';
import { FinancialService } from '../services/financial.service';
import { RecordTransactionDto } from '../dto/financial.dto';
import { ValidationError } from '../exceptions';
import validator from 'validator';

export class FinancialController {
  private financialService: FinancialService;

  constructor(financialService: FinancialService) {
    this.financialService = financialService;
  }

  recordTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const dto = RecordTransactionDto.sanitize(req.body);
      const errors = RecordTransactionDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const result = await this.financialService.recordTransaction(dto, userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  findTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.financialService.findTransactions(page, limit);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  };

  findTransactionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await this.financialService.findTransactionById(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getDailyReconciliation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
        throw new ValidationError('Date must be a valid date in YYYY-MM-DD format');
      }
      const result = await this.financialService.getDailyReconciliation(date, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getMonthlyReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
      const result = await this.financialService.getMonthlyReport(year, month, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}