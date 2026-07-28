import { PrismaClient } from '../generated/prisma/client';
import { randomBytes } from 'crypto';
import {
  CreateLegalizationDto,
  ProcessLegalizationDto,
  LegalizationResponseDto,
  PaginatedLegalizationDto,
} from '../dto/legalization.dto';
import { NotFoundError, ValidationError } from '../exceptions';

export interface ILegalizationService {
  create(dto: CreateLegalizationDto, userId: string): Promise<LegalizationResponseDto>;
  findAll(page?: number, limit?: number): Promise<PaginatedLegalizationDto>;
  findById(id: string): Promise<LegalizationResponseDto>;
  process(id: string, dto: ProcessLegalizationDto, userId: string): Promise<LegalizationResponseDto>;
}

export class LegalizationService implements ILegalizationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(dto: CreateLegalizationDto, userId: string): Promise<LegalizationResponseDto> {
    const serviceType = await this.prisma.serviceType.findUnique({
      where: { id: dto.serviceTypeId },
    });

    if (!serviceType) {
      throw new NotFoundError('Service type not found');
    }

    if (serviceType.category !== 'DOCUMENT_LEGALIZATION' as any) {
      throw new ValidationError('Service type is not a legalization service');
    }

    const embassy = await this.prisma.embassy.findUnique({
      where: { id: dto.embassyId },
    });

    if (!embassy) {
      throw new NotFoundError('Embassy not found');
    }

    const referenceNumber = `SR-${Date.now().toString(36).toUpperCase()}-${randomBytes(8).toString('hex').toUpperCase()}`;

    const details: Record<string, any> = {
      documentType: dto.documentType,
      destinationCountry: dto.destinationCountry,
      urgency: dto.urgency || 'NORMAL',
    };

    if (dto.remarks) {
      details.remarks = dto.remarks;
    }

    const request = await this.prisma.serviceRequest.create({
      data: {
        referenceNumber,
        userId,
        serviceTypeId: dto.serviceTypeId,
        embassyId: dto.embassyId,
        status: 'SUBMITTED' as any,
        details,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entity: 'Legalization',
        entityId: request.id,
        description: `Created legalization request ${referenceNumber} for ${dto.destinationCountry}`,
        metaData: {
          newValues: { referenceNumber, documentType: dto.documentType, destinationCountry: dto.destinationCountry },
        },
      },
    });

    return this.toResponse(request);
  }

  async findAll(page = 1, limit = 10): Promise<PaginatedLegalizationDto> {
    const skip = (page - 1) * limit;

    const legalizationTypes = await this.prisma.serviceType.findMany({
      where: { category: 'DOCUMENT_LEGALIZATION' as any },
      select: { id: true },
    });

    const typeIds = legalizationTypes.map((st) => st.id);

    if (typeIds.length === 0) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const where = { serviceTypeId: { in: typeIds } };

    const [data, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);

    return {
      data: data.map((r) => this.toResponse(r)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<LegalizationResponseDto> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        serviceType: { select: { id: true, name: true, slug: true, category: true } },
      },
    });

    if (!request) {
      throw new NotFoundError('Legalization request not found');
    }

    if (request.serviceType.category !== 'DOCUMENT_LEGALIZATION' as any) {
      throw new NotFoundError('Legalization request not found');
    }

    return this.toResponse(request);
  }

  async process(id: string, dto: ProcessLegalizationDto, userId: string): Promise<LegalizationResponseDto> {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundError('Legalization request not found');
    }

    const currentDetails = (request.details as Record<string, any>) || {};

    const allowedActions: Record<string, string[]> = {
      SUBMITTED: ['VERIFY'],
      IN_PROGRESS: ['SEAL', 'ROUTE_APOSTILLE', 'ROUTE_LEGALIZATION', 'COMPLETE'],
    };

    const effectiveStatus = request.status === 'COMPLETED' ? 'COMPLETED' : request.status === 'SUBMITTED' ? 'SUBMITTED' : 'IN_PROGRESS';
    const validActions = allowedActions[effectiveStatus];

    if (!validActions || !validActions.includes(dto.action)) {
      throw new ValidationError(`Action ${dto.action} is not allowed when status is ${request.status}`);
    }

    if (dto.action === 'COMPLETE' && !currentDetails.sealInfo) {
      throw new ValidationError('Document must be sealed before completing');
    }

    if ((dto.action === 'ROUTE_APOSTILLE' || dto.action === 'ROUTE_LEGALIZATION') && !currentDetails.sealInfo) {
      throw new ValidationError('Document must be sealed before routing');
    }

    if ((dto.action === 'ROUTE_APOSTILLE' || dto.action === 'ROUTE_LEGALIZATION') && currentDetails.hagueRouting) {
      throw new ValidationError('Hague routing already assigned');
    }

    let newStatus = request.status;
    const newDetails = { ...currentDetails };

    switch (dto.action) {
      case 'VERIFY':
        newStatus = 'IN_PROGRESS' as any;
        newDetails.verifiedAt = new Date().toISOString();
        newDetails.verifiedBy = userId;
        break;
      case 'SEAL':
        newStatus = 'IN_PROGRESS' as any;
        newDetails.sealInfo = { appliedAt: new Date().toISOString(), appliedBy: userId };
        newDetails.trackingNumber = this.generateTrackingNumber();
        break;
      case 'ROUTE_APOSTILLE':
        newDetails.hagueRouting = 'APOSTILLE';
        newDetails.routedAt = new Date().toISOString();
        break;
      case 'ROUTE_LEGALIZATION':
        newDetails.hagueRouting = 'LEGALIZATION';
        newDetails.routedAt = new Date().toISOString();
        break;
      case 'COMPLETE':
        newStatus = 'COMPLETED' as any;
        newDetails.completedAt = new Date().toISOString();
        if (!newDetails.trackingNumber) {
          newDetails.trackingNumber = this.generateTrackingNumber();
        }
        break;
    }

    if (dto.officerRemarks) {
      newDetails.officerRemarks = dto.officerRemarks;
    }

    const updated = await this.prisma.serviceRequest.update({
      where: { id },
      data: {
        status: newStatus,
        details: newDetails,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: dto.action,
        entity: 'Legalization',
        entityId: id,
        description: `Legalization request ${request.referenceNumber}: ${dto.action}`,
        metaData: {
          oldValues: { status: request.status, ...currentDetails },
          newValues: { status: newStatus, ...newDetails },
        },
      },
    });

    return this.toResponse(updated);
  }

  private generateTrackingNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = randomBytes(8).toString('hex').toUpperCase();
    return `LG-${timestamp}-${random}`;
  }

  private toResponse(request: any): LegalizationResponseDto {
    const details = (request.details as Record<string, any>) || {};
    return {
      id: request.id,
      referenceNumber: request.referenceNumber,
      documentType: details.documentType || '',
      destinationCountry: details.destinationCountry || '',
      urgency: details.urgency || 'NORMAL',
      status: request.status,
      trackingNumber: details.trackingNumber,
      sealInfo: details.sealInfo,
      hagueRouting: details.hagueRouting,
      remarks: details.remarks || details.officerRemarks,
      createdAt: request.createdAt,
      updatedAt: request.Updated,
    };
  }
}