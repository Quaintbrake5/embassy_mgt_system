import { PrismaClient } from '../generated/prisma/client';
import { randomBytes } from 'crypto';
import {
  CreateServiceRequestDto,
  UpdateServiceRequestStatusDto,
  ServiceRequestResponseDto,
  PaginatedServiceRequestsDto,
} from '../dto/service-request.dto';
import { NotFoundError, ValidationError } from '../exceptions';

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CLOSED', 'CANCELLED'],
  COMPLETED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

export interface IServiceRequestService {
  create(userId: string, dto: CreateServiceRequestDto): Promise<ServiceRequestResponseDto>;
  findById(requestId: string): Promise<ServiceRequestResponseDto>;
  findAll(params: { userId?: string; embassyId?: string; status?: string; page?: number; limit?: number }): Promise<PaginatedServiceRequestsDto>;
  updateStatus(requestId: string, dto: UpdateServiceRequestStatusDto, userId?: string): Promise<ServiceRequestResponseDto>;
}

function generateReferenceNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(8).toString('hex').toUpperCase();
  return `SR-${timestamp}-${random}`;
}

export class ServiceRequestService implements IServiceRequestService {
  private prisma: PrismaClient;

  private static readonly SERVICE_REQUEST_INCLUDE = {
    user: { select: { userid: true, firstName: true, lastName: true, email: true } },
    serviceType: { select: { id: true, name: true, slug: true, category: true } },
    embassy: { select: { id: true, name: true, code: true, country: true, city: true } },
    payments: true,
  } as const;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(userId: string, dto: CreateServiceRequestDto): Promise<ServiceRequestResponseDto> {
    const [serviceType, embassy] = await Promise.all([
      this.prisma.serviceType.findUnique({ where: { id: dto.serviceTypeId } }),
      this.prisma.embassy.findUnique({ where: { id: dto.embassyId } }),
    ]);

    if (!serviceType) {
      throw new NotFoundError('Service type not found');
    }

    if (!embassy) {
      throw new NotFoundError('Embassy not found');
    }

    const request = await this.prisma.serviceRequest.create({
      data: {
        referenceNumber: generateReferenceNumber(),
        userId,
        serviceTypeId: dto.serviceTypeId,
        embassyId: dto.embassyId,
        status: 'DRAFT',
        details: dto.details || {},
      },
      include: ServiceRequestService.SERVICE_REQUEST_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entity: 'ServiceRequest',
        entityId: request.id,
        description: `Created service request: ${request.referenceNumber}`,
        metaData: { newValues: { referenceNumber: request.referenceNumber, serviceTypeId: dto.serviceTypeId } },
      },
    });

    if (serviceType.fee && serviceType.fee.toNumber() > 0) {
      await this.prisma.payment.create({
        data: {
          serviceRequestId: request.id,
          userId,
          amount: serviceType.fee,
          currency: 'USD',
          status: 'PENDING',
        },
      });
    }

    return this.toResponse(request);
  }

  async findById(requestId: string): Promise<ServiceRequestResponseDto> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: ServiceRequestService.SERVICE_REQUEST_INCLUDE,
    });

    if (!request) {
      throw new NotFoundError('Service request not found');
    }

    return this.toResponse(request);
  }

  async findAll(params: {
    userId?: string;
    embassyId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedServiceRequestsDto> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.userId) where.userId = params.userId;
    if (params.embassyId) where.embassyId = params.embassyId;
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: ServiceRequestService.SERVICE_REQUEST_INCLUDE,
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);

    return {
      data: data.map((r) => this.toResponse(r)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateStatus(requestId: string, dto: UpdateServiceRequestStatusDto, userId?: string): Promise<ServiceRequestResponseDto> {
    const existing = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
    });

    if (!existing) {
      throw new NotFoundError('Service request not found');
    }

    const allowedNext = VALID_TRANSITIONS[existing.status];
    if (!allowedNext || !allowedNext.includes(dto.status)) {
      throw new ValidationError(
        `Cannot transition from ${existing.status} to ${dto.status}. Allowed: ${(allowedNext || []).join(', ') || 'none'}`
      );
    }

    const request = await this.prisma.serviceRequest.update({
      where: { id: requestId },
      data: {
        status: dto.status as any,
        submittedAt: existing.status === 'DRAFT' && dto.status === 'SUBMITTED' ? new Date() : undefined,
      },
      include: ServiceRequestService.SERVICE_REQUEST_INCLUDE,
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'UPDATE_STATUS',
          entity: 'ServiceRequest',
          entityId: requestId,
          description: `Updated service request ${request.referenceNumber} status: ${existing.status} → ${dto.status}`,
          metaData: {
            oldValues: { status: existing.status },
            newValues: { status: dto.status },
          },
        },
      });
    }

    return this.toResponse(request);
  }

  private toResponse(request: any): ServiceRequestResponseDto {
    return {
      id: request.id,
      referenceNumber: request.referenceNumber,
      userId: request.userId,
      serviceTypeId: request.serviceTypeId,
      embassyId: request.embassyId,
      status: request.status,
      details: request.details,
      submittedAt: request.submittedAt,
      createdAt: request.createdAt,
      updatedAt: request.Updated,
      user: request.user,
      serviceType: request.serviceType,
      embassy: request.embassy,
      payments: request.payments?.map((p: any) => ({
        id: p.id,
        amount: p.amount.toNumber(),
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt,
      })) || [],
    };
  }
}