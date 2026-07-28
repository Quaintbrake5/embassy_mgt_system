"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyService = void 0;
const crypto_1 = require("crypto");
const exceptions_1 = require("../exceptions");
const URGENCY_ORDER = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
};
class EmergencyService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    generateReferenceNumber() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = (0, crypto_1.randomBytes)(8).toString('hex').toUpperCase();
        return `EC-${timestamp}-${random}`;
    }
    async createCase(dto, userId) {
        const embassy = await this.prisma.embassy.findUnique({ where: { id: dto.embassyId } });
        if (!embassy) {
            throw new exceptions_1.NotFoundError('Embassy not found');
        }
        const description = [dto.description, dto.location].filter(Boolean).join(' | ');
        const referenceNumber = this.generateReferenceNumber();
        const emergencyCase = await this.prisma.emergencyCase.create({
            data: {
                referenceNumber,
                userId,
                embassyId: dto.embassyId,
                urgency: dto.urgency,
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
    async findAll(page, limit) {
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
    async findById(id) {
        const emergencyCase = await this.prisma.emergencyCase.findUnique({
            where: { id },
        });
        if (!emergencyCase) {
            throw new exceptions_1.NotFoundError('Emergency case not found');
        }
        return this.toResponse(emergencyCase);
    }
    async updateStatus(id, status, userId) {
        const emergencyCase = await this.prisma.emergencyCase.findUnique({
            where: { id },
        });
        if (!emergencyCase) {
            throw new exceptions_1.NotFoundError('Emergency case not found');
        }
        const updateData = { status: status };
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
    async getEvacuationList(embassyId) {
        const cases = await this.prisma.emergencyCase.findMany({
            where: {
                embassyId,
                status: { in: ['OPEN', 'IN_PROGRESS'] },
            },
        });
        cases.sort((a, b) => {
            const urgencyDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
            if (urgencyDiff !== 0)
                return urgencyDiff;
            return a.createdAt.getTime() - b.createdAt.getTime();
        });
        return cases.map((c) => this.toResponse(c));
    }
    async broadcastAlert(dto, userId) {
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
    toResponse(emergencyCase) {
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
exports.EmergencyService = EmergencyService;
