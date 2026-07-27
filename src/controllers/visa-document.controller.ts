import { Request, Response, NextFunction } from 'express';
import { VisaDocumentService } from '../services/visa-document.service';
import { CreateVisaDocumentDto } from '../dto/visa-document.dto';
import { ValidationError, AuthenticationError } from '../exceptions';

export class VisaDocumentController {
  private visaDocumentService: VisaDocumentService;

  constructor(visaDocumentService: VisaDocumentService) {
    this.visaDocumentService = visaDocumentService;
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      const dto = CreateVisaDocumentDto.sanitize(req.body);
      const errors = CreateVisaDocumentDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const document = await this.visaDocumentService.create(dto, userId);
      res.status(201).json({ success: true, data: document });
    } catch (error) {
      next(error);
    }
  };

  findByApplication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const visaApplicationId = req.params.visaApplicationId as string;
      const documents = await this.visaDocumentService.findByApplication(visaApplicationId);
      res.json({ success: true, data: documents });
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const document = await this.visaDocumentService.findById(req.params.id as string);
      res.json({ success: true, data: document });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      await this.visaDocumentService.delete(req.params.id as string, userId);
      res.json({ success: true, message: 'Visa document deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
}