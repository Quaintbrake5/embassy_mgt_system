import { PrismaClient } from '../generated/prisma/client';
import { randomBytes } from 'crypto';
import {
  CreateAppointmentDto,
  AppointmentResponseDto,
  PaginatedAppointmentsDto,
} from '../dto/appointment.dto';
import { NotFoundError, ValidationError, ConflictError } from '../exceptions';
import { OTPService } from './otp.service';
import { AppointmentStatus } from '../generated/prisma/enums';

export interface IAppointmentService {
  getAvailableSlots(embassyId: string, date: string): Promise<{ slots: { time: string; available: boolean }[] }>;
  book(dto: CreateAppointmentDto, userId: string): Promise<AppointmentResponseDto>;
  findMyAppointments(userId: string, page?: number, limit?: number): Promise<PaginatedAppointmentsDto>;
  cancel(appointmentId: string, userId: string): Promise<AppointmentResponseDto>;
  checkIn(appointmentId: string, otp: string): Promise<AppointmentResponseDto>;
  getQueue(embassyId: string, page?: number, limit?: number): Promise<PaginatedAppointmentsDto>;
  callNext(embassyId: string): Promise<AppointmentResponseDto>;
  complete(appointmentId: string): Promise<AppointmentResponseDto>;
  markNoShow(appointmentId: string): Promise<AppointmentResponseDto>;
}

function generateTokenNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(4).toString('hex').toUpperCase();
  return `TK-${timestamp}-${random}`;
}

export class AppointmentService implements IAppointmentService {
  private prisma: PrismaClient;
  private otpService: OTPService;

  private static readonly APPOINTMENT_INCLUDE = {
    user: { select: { userid: true, firstName: true, lastName: true, email: true } },
    embassy: { select: { id: true, name: true, code: true, country: true, city: true } },
  } as const;

  constructor(prisma: PrismaClient, otpService: OTPService) {
    this.prisma = prisma;
    this.otpService = otpService;
  }

  async getAvailableSlots(embassyId: string, date: string): Promise<{ slots: { time: string; available: boolean }[] }> {
    const embassy = await this.prisma.embassy.findUnique({ where: { id: embassyId } });
    if (!embassy) {
      throw new NotFoundError('Embassy not found');
    }

    const slotDate = new Date(date);
    const startOfDay = new Date(slotDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(slotDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        embassyId,
        slotDate: { gte: startOfDay, lte: endOfDay },
        status: { in: ['BOOKED', 'CHECKED_IN', 'IN_PROGRESS'] },
      },
      select: { slotTime: true },
    });

    const bookedTimes = new Set(existingAppointments.map((a) => a.slotTime));

    const slots: { time: string; available: boolean }[] = [];
    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({ time, available: !bookedTimes.has(time) });
      }
    }

    return { slots };
  }

  async book(dto: CreateAppointmentDto, userId: string): Promise<AppointmentResponseDto> {
    const serviceRequest = await this.prisma.serviceRequest.findUnique({
      where: { id: dto.serviceRequestId },
    });

    if (!serviceRequest) {
      throw new NotFoundError('Service request not found');
    }

    if (serviceRequest.userId !== userId) {
      throw new ValidationError('Service request does not belong to this user');
    }

    if (serviceRequest.embassyId !== dto.embassyId) {
      throw new ValidationError('Service request embassy does not match appointment embassy');
    }

    const slotDate = new Date(dto.slotDate);

    const appointment = await this.prisma.$transaction(async (tx) => {
      const existingSlot = await tx.appointment.findFirst({
        where: {
          embassyId: dto.embassyId,
          slotDate: { equals: slotDate },
          slotTime: dto.slotTime,
          status: { in: ['BOOKED', 'CHECKED_IN', 'IN_PROGRESS'] },
        },
      });

      if (existingSlot) {
        throw new ConflictError('This time slot is already booked');
      }

      const qrCode = randomBytes(16).toString('hex').toUpperCase();
      const tokenNumber = generateTokenNumber();

      const appointment = await tx.appointment.create({
        data: {
          serviceRequestId: dto.serviceRequestId,
          userId,
          embassyId: dto.embassyId,
          slotDate,
          slotTime: dto.slotTime,
          status: 'BOOKED',
          qrCode,
          tokenNumber,
        },
        include: AppointmentService.APPOINTMENT_INCLUDE,
      });

      return appointment;
    });

    const otp = await this.otpService.generateOtp(appointment.id);

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'BOOK',
        entity: 'Appointment',
        entityId: appointment.id,
        description: `Booked appointment ${appointment.tokenNumber} at ${dto.slotDate} ${dto.slotTime}`,
        metaData: {
          newValues: { tokenNumber: appointment.tokenNumber, slotDate: dto.slotDate, slotTime: dto.slotTime },
        },
      },
    });

    return this.toResponse(appointment);
  }

  async findMyAppointments(userId: string, page?: number, limit?: number): Promise<PaginatedAppointmentsDto> {
    const currentPage = page || 1;
    const currentLimit = limit || 10;
    const skip = (currentPage - 1) * currentLimit;

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { userId },
        skip,
        take: currentLimit,
        orderBy: { slotDate: 'desc' },
        include: AppointmentService.APPOINTMENT_INCLUDE,
      }),
      this.prisma.appointment.count({ where: { userId } }),
    ]);

    return {
      data: data.map((a) => this.toResponse(a)),
      meta: { total, page: currentPage, limit: currentLimit, totalPages: Math.ceil(total / currentLimit) },
    };
  }

  async cancel(appointmentId: string, userId: string): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: AppointmentService.APPOINTMENT_INCLUDE,
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    if (appointment.status !== 'BOOKED') {
      throw new ValidationError(`Cannot cancel appointment with status ${appointment.status}. Only BOOKED appointments can be cancelled.`);
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELLED' },
      include: AppointmentService.APPOINTMENT_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'CANCEL',
        entity: 'Appointment',
        entityId: appointmentId,
        description: `Cancelled appointment ${appointment.tokenNumber}`,
        metaData: { oldValues: { status: appointment.status }, newValues: { status: 'CANCELLED' } },
      },
    });

    return this.toResponse(updated);
  }

  async checkIn(appointmentId: string, otp: string): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: AppointmentService.APPOINTMENT_INCLUDE,
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    if (appointment.status !== 'BOOKED') {
      throw new ValidationError(`Cannot check in appointment with status ${appointment.status}. Only BOOKED appointments can be checked in.`);
    }

    const isValid = this.otpService.verifyOtp(appointmentId, otp);
    if (!isValid) {
      throw new ValidationError('Invalid or expired OTP');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CHECKED_IN', checkInAt: new Date() },
      include: AppointmentService.APPOINTMENT_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: appointment.userId,
        action: 'CHECKIN',
        entity: 'Appointment',
        entityId: appointmentId,
        description: `Checked in appointment ${appointment.tokenNumber}`,
        metaData: { oldValues: { status: appointment.status }, newValues: { status: 'CHECKED_IN' } },
      },
    });

    return this.toResponse(updated);
  }

  async getQueue(embassyId: string, page = 1, limit = 50): Promise<PaginatedAppointmentsDto> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          embassyId,
          status: { in: ['CHECKED_IN', 'IN_PROGRESS'] },
        },
        skip,
        take: limit,
        orderBy: { checkInAt: 'asc' },
        include: AppointmentService.APPOINTMENT_INCLUDE,
      }),
      this.prisma.appointment.count({
        where: {
          embassyId,
          status: { in: ['CHECKED_IN', 'IN_PROGRESS'] },
        },
      }),
    ]);

    return {
      data: data.map((a) => this.toResponse(a)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async callNext(embassyId: string): Promise<AppointmentResponseDto> {
    const nextAppointment = await this.prisma.appointment.findFirst({
      where: {
        embassyId,
        status: 'CHECKED_IN',
      },
      orderBy: { checkInAt: 'asc' },
      include: AppointmentService.APPOINTMENT_INCLUDE,
    });

    if (!nextAppointment) {
      throw new NotFoundError('No checked-in appointments in queue');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: nextAppointment.id },
      data: { status: 'IN_PROGRESS' },
      include: AppointmentService.APPOINTMENT_INCLUDE,
    });

    return this.toResponse(updated);
  }

  async complete(appointmentId: string): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: AppointmentService.APPOINTMENT_INCLUDE,
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    if (appointment.status !== 'IN_PROGRESS') {
      throw new ValidationError(`Cannot complete appointment with status ${appointment.status}. Only IN_PROGRESS appointments can be completed.`);
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'COMPLETED' },
      include: AppointmentService.APPOINTMENT_INCLUDE,
    });

    return this.toResponse(updated);
  }

  async markNoShow(appointmentId: string): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: AppointmentService.APPOINTMENT_INCLUDE,
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    if (appointment.status !== 'BOOKED') {
      throw new ValidationError(`Cannot mark no-show for appointment with status ${appointment.status}. Only BOOKED appointments can be marked no-show.`);
    }

    const now = new Date();
    if (now < appointment.slotDate) {
      throw new ValidationError('Cannot mark no-show before the appointment slot date');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'NO_SHOW' },
      include: AppointmentService.APPOINTMENT_INCLUDE,
    });

    return this.toResponse(updated);
  }

  private toResponse(appointment: any): AppointmentResponseDto {
    return {
      id: appointment.id,
      serviceRequestId: appointment.serviceRequestId,
      userId: appointment.userId,
      embassyId: appointment.embassyId,
      slotDate: appointment.slotDate,
      slotTime: appointment.slotTime,
      status: appointment.status,
      qrCode: appointment.qrCode,
      checkInAt: appointment.checkInAt,
      tokenNumber: appointment.tokenNumber,
      createdAt: appointment.createdAt,
      updatedAt: appointment.Updated,
      user: appointment.user,
      embassy: appointment.embassy,
    };
  }
}