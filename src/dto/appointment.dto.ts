import validator from 'validator';
import { AppointmentStatus } from '../generated/prisma/enums';

const VALID_STATUSES = Object.values(AppointmentStatus);

export class CreateAppointmentDto {
  serviceRequestId!: string;
  embassyId!: string;
  slotDate!: string;
  slotTime!: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.serviceRequestId || typeof data.serviceRequestId !== 'string') {
      errors.push('Service request ID is required');
    } else if (!validator.isUUID(data.serviceRequestId)) {
      errors.push('Service request ID must be a valid UUID');
    }

    if (!data.embassyId || typeof data.embassyId !== 'string') {
      errors.push('Embassy ID is required');
    } else if (!validator.isUUID(data.embassyId)) {
      errors.push('Embassy ID must be a valid UUID');
    }

    if (!data.slotDate || typeof data.slotDate !== 'string') {
      errors.push('Slot date is required');
    } else if (!validator.isISO8601(data.slotDate)) {
      errors.push('Slot date must be a valid ISO date');
    }

    if (!data.slotTime || typeof data.slotTime !== 'string') {
      errors.push('Slot time is required');
    } else if (!/^\d{2}:\d{2}$/.test(data.slotTime)) {
      errors.push('Slot time must be in HH:mm format');
    }

    return errors;
  }

  static sanitize(data: any): CreateAppointmentDto {
    const dto = new CreateAppointmentDto();
    dto.serviceRequestId = data.serviceRequestId?.trim();
    dto.embassyId = data.embassyId?.trim();
    dto.slotDate = data.slotDate?.trim();
    dto.slotTime = data.slotTime?.trim();
    return dto;
  }
}

export class CancelAppointmentDto {
  reason?: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (data.reason !== undefined && typeof data.reason !== 'string') {
      errors.push('Reason must be a string');
    }

    return errors;
  }

  static sanitize(data: any): CancelAppointmentDto {
    const dto = new CancelAppointmentDto();
    dto.reason = data.reason?.trim();
    return dto;
  }
}

export class AvailableSlotsQueryDto {
  embassyId!: string;
  date!: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    if (!data.embassyId || typeof data.embassyId !== 'string') {
      errors.push('Embassy ID is required');
    } else if (!validator.isUUID(data.embassyId)) {
      errors.push('Embassy ID must be a valid UUID');
    }

    if (!data.date || typeof data.date !== 'string') {
      errors.push('Date is required');
    } else if (!validator.isISO8601(data.date)) {
      errors.push('Date must be a valid ISO date');
    }

    return errors;
  }

  static sanitize(data: any): AvailableSlotsQueryDto {
    const dto = new AvailableSlotsQueryDto();
    dto.embassyId = data.embassyId?.trim();
    dto.date = data.date?.trim();
    return dto;
  }
}

export class AppointmentResponseDto {
  id!: string;
  serviceRequestId!: string;
  userId!: string;
  embassyId!: string;
  slotDate!: Date;
  slotTime!: string;
  status!: string;
  qrCode?: string;
  checkInAt?: Date;
  tokenNumber?: string;
  createdAt!: Date;
  updatedAt!: Date;
  user?: {
    userid: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  embassy?: {
    id: string;
    name: string;
    code: string;
    country: string;
    city: string;
  };
}

export class PaginatedAppointmentsDto {
  data!: AppointmentResponseDto[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}