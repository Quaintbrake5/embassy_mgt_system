import { PrismaClient } from '../generated/prisma/client';
import { randomBytes } from 'crypto';
import {
  CreateEmergencyCaseDto,
  EmergencyCaseResponseDto,
  AlertBroadcastDto,
  PaginatedEmergencyDto,
} from '../dto/emergency.dto';
import { NotFoundError, ValidationError } from '../exceptions';
import { UrgencyLevel, CaseStatus } from '../generated/prisma/enums';

export interface IEmergencyService {
  createCase(dto: CreateEmergencyCaseDto, userId: string): Promise<EmergencyCaseResponseDto>;
  findAll(page?: number, limit?: number): Promise<PaginatedEmergencyDto>;
  findById(id: string): Promise<EmergencyCaseResponseDto>;
  updateStatus(id: string, status: string, userId: string): Promise<EmergencyCaseResponseDto>;
  getEvacuationList(embassyId: string): Promise<EmergencyCaseResponseDto[]>;
  broadcastAlert(dto: AlertBroadcastDto, userId: string): Promise<void>;
}

const URGENCY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export class EmergencyService implements IEmergencyService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private generateReferenceNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = randomBytes(8).toString('hex').toUpperCase();
    return `EC-${timestamp}-${random}`;
  }

  async createCase(dto: CreateEmergencyCaseDto, userId: string): Promise<EmergencyCaseResponseDto> {
    const embassy = await this.prisma.embassy.findUnique({ where: { id: dto.embassyId } });
    if (!embassy) {
      throw new NotFoundError('Embassy not found');
    }

    const description = [dto.description, dto.location].filter(Boolean).join(' | ');
    const referenceNumber = this.generateReferenceNumber();

    const emergencyCase = await this.prisma.emergencyCase.create({
      data: {
        referenceNumber,
        userId,
        embassyId: dto.embassyId,
        urgency: dto.urgency as any,
        caseType: dto.caseType,
        description: description || null,
        status: 'OPEN',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entity: 'EmergencyCase',
        entityId: emergencyCase.id,
        description: `Created emergency case ${referenceNumber} - ${dto.caseType}`,
        metaData: {
          newValues: { referenceNumber, caseType: dto.caseType, urgency: dto.urgency, embassyId: dto.embassyId },
        },
      },
    });

    return this.toResponse(emergencyCase);
  }

  async findAll(page?: number, limit?: number): Promise<PaginatedEmergencyDto> {
    const currentPage = page || 1;
    const currentLimit = limit || 10;
    const skip = (currentPage - 1) * currentLimit;

    const [data, total] = await Promise.all([
      this.prisma.emergencyCase.findMany({
        skip,
        take: currentLimit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.emergencyCase.count(),
    ]);

    return {
      data: data.map((c) => this.toResponse(c)),
      meta: { total, page: currentPage, limit: currentLimit, totalPages: Math.ceil(total / currentLimit) },
    };
  }

  async findById(id: string): Promise<EmergencyCaseResponseDto> {
    const emergencyCase = await this.prisma.emergencyCase.findUnique({
      where: { id },
    });

    if (!emergencyCase) {
      throw new NotFoundError('Emergency case not found');
    }

    return this.toResponse(emergencyCase);
  }

  async updateStatus(id: string, status: string, userId: string): Promise<EmergencyCaseResponseDto> {
    const emergencyCase = await this.prisma.emergencyCase.findUnique({
      where: { id },
    });

    if (!emergencyCase) {
      throw new NotFoundError('Emergency case not found');
    }

    const updateData: any = { status: status as any };

    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    const updated = await this.prisma.emergencyCase.update({
      where: { id },
      data: updateData,
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'EmergencyCase',
        entityId: id,
        description: `Updated emergency case ${emergencyCase.referenceNumber} status to ${status}`,
        metaData: {
          oldValues: { status: emergencyCase.status },
          newValues: { status },
        },
      },
    });

    return this.toResponse(updated);
  }

  async getEvacuationList(embassyId: string): Promise<EmergencyCaseResponseDto[]> {
    const cases = await this.prisma.emergencyCase.findMany({
      where: {
        embassyId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    });

    cases.sort((a, b) => {
      const urgencyDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return cases.map((c) => this.toResponse(c));
  }

  async broadcastAlert(dto: AlertBroadcastDto, userId: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'BROADCAST',
        entity: 'Alert',
        entityId: dto.embassyId,
        description: `Emergency alert broadcast: ${dto.message}`,
        metaData: {
          message: dto.message,
          embassyId: dto.embassyId,
          urgency: dto.urgency,
        },
      },
    });
  }

  private toResponse(emergencyCase: any): EmergencyCaseResponseDto {
    return {
      id: emergencyCase.id,
      referenceNumber: emergencyCase.referenceNumber,
      caseType: emergencyCase.caseType,
      description: emergencyCase.description,
      urgency: emergencyCase.urgency,
      status: emergencyCase.status,
      resolvedAt: emergencyCase.resolvedAt,
      createdAt: emergencyCase.createdAt,
      updatedAt: emergencyCase.Updated,
    };
  }
}