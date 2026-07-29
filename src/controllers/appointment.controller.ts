import { Request, Response, NextFunction } from 'express';
import { AppointmentService } from '../services/appointment.service';
import { CreateAppointmentDto, CancelAppointmentDto, AvailableSlotsQueryDto } from '../dto/appointment.dto';
import { ValidationError } from '../exceptions';

export class AppointmentController {
  private appointmentService: AppointmentService;

  constructor(appointmentService: AppointmentService) {
    this.appointmentService = appointmentService;
  }

  getAvailableSlots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = AvailableSlotsQueryDto.sanitize(req.query);
      const errors = AvailableSlotsQueryDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const result = await this.appointmentService.getAvailableSlots(dto.embassyId, dto.date);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  book = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const dto = CreateAppointmentDto.sanitize(req.body);
      const errors = CreateAppointmentDto.validate(dto);
      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      const appointment = await this.appointmentService.book(dto, userId);
      res.status(201).json({ success: true, data: appointment });
    } catch (error) {
      next(error);
    }
  };

  findMyAppointments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.appointmentService.findMyAppointments(userId, page, limit);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const id = req.params.id as string;
      const appointment = await this.appointmentService.findById(id, userId);
      res.json({ success: true, data: appointment });
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const id = req.params.id as string;
      const appointment = await this.appointmentService.cancel(id, userId);
      res.json({ success: true, data: appointment });
    } catch (error) {
      next(error);
    }
  };

  checkIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const otp = req.body.otp as string;

      if (!otp || typeof otp !== 'string') {
        throw new ValidationError('OTP is required');
      }

      const appointment = await this.appointmentService.checkIn(id, otp);
      res.json({ success: true, data: appointment });
    } catch (error) {
      next(error);
    }
  };

  getQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const embassyId = req.query.embassyId as string;
      if (!embassyId) {
        throw new ValidationError('Embassy ID is required');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await this.appointmentService.getQueue(embassyId, page, limit);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  };

  callNext = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const embassyId = req.query.embassyId as string;
      if (!embassyId) {
        throw new ValidationError('Embassy ID is required');
      }

      const appointment = await this.appointmentService.callNext(embassyId);
      res.json({ success: true, data: appointment });
    } catch (error) {
      next(error);
    }
  };

  complete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const appointment = await this.appointmentService.complete(id);
      res.json({ success: true, data: appointment });
    } catch (error) {
      next(error);
    }
  };

  markNoShow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const appointment = await this.appointmentService.markNoShow(id);
      res.json({ success: true, data: appointment });
    } catch (error) {
      next(error);
    }
  };
}