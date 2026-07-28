"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisaDecisionService = void 0;
const exceptions_1 = require("../exceptions");
const DECISION_STATUS_MAP = {
    APPROVE: 'APPROVED',
    REJECT: 'REJECTED',
    REQUEST_MORE_INFO: 'MORE_INFO_REQUESTED',
    ESCALATE_TO_HQ: 'ESCALATED',
};
const ALLOWED_TRANSITION_STATUSES = ['UNDER_REVIEW', 'MORE_INFO_REQUESTED'];
class VisaDecisionService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createDecision(applicationId, dto, officerId) {
        const application = await this.prisma.visaApplication.findUnique({
            where: { id: applicationId },
        });
        if (!application) {
            throw new exceptions_1.NotFoundError('Visa application not found');
        }
        if (!ALLOWED_TRANSITION_STATUSES.includes(application.status)) {
            throw new exceptions_1.ValidationError(`Cannot make decision on application in status ${application.status}. Allowed: ${ALLOWED_TRANSITION_STATUSES.join(', ')}`);
        }
        if (dto.decision === 'ESCALATE_TO_HQ' && !dto.secondaryOfficerId) {
            throw new exceptions_1.ValidationError('Secondary officer ID is required when escalating to HQ');
        }
        if (dto.secondaryOfficerId) {
            const secondaryOfficer = await this.prisma.user.findUnique({
                where: { userid: dto.secondaryOfficerId },
            });
            if (!secondaryOfficer) {
                throw new exceptions_1.NotFoundError('Secondary officer not found');
            }
        }
        const targetStatus = DECISION_STATUS_MAP[dto.decision];
        if (!targetStatus) {
            throw new exceptions_1.ValidationError(`Invalid decision type: ${dto.decision}`);
        }
        const decision = await this.prisma.$transaction(async (tx) => {
            const d = await tx.visaDecision.create({
                data: {
                    visaApplicationId: applicationId,
                    officerId,
                    decision: dto.decision,
                    remarks: dto.remarks,
                    rationale: dto.rationale,
                    secondaryOfficerId: dto.secondaryOfficerId,
                },
                include: VisaDecisionService.DECISION_INCLUDE,
            });
            await tx.visaApplication.update({
                where: { id: applicationId },
                data: {
                    status: targetStatus,
                    decisionAt: new Date(),
                },
            });
            return d;
        });
        await this.prisma.auditLog.create({
            data: {
                userId: officerId,
                action: 'DECISION',
                entity: 'VisaDecision',
                entityId: decision.id,
                description: `Visa application ${application.applicationNumber}: decision ${dto.decision}`,
                metaData: {
                    applicationId,
                    applicationNumber: application.applicationNumber,
                    decision: dto.decision,
                    previousStatus: application.status,
                    newStatus: targetStatus,
                },
            },
        });
        return this.toResponse(decision);
    }
    async getDecision(applicationId) {
        const decision = await this.prisma.visaDecision.findUnique({
            where: { visaApplicationId: applicationId },
            include: VisaDecisionService.DECISION_INCLUDE,
        });
        if (!decision) {
            throw new exceptions_1.NotFoundError('Visa decision not found for this application');
        }
        return this.toResponse(decision);
    }
    async getDecisionsByOfficer(officerId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.visaDecision.findMany({
                where: { officerId },
                skip,
                take: limit,
                orderBy: { decidedAt: 'desc' },
                include: VisaDecisionService.DECISION_INCLUDE,
            }),
            this.prisma.visaDecision.count({ where: { officerId } }),
        ]);
        return {
            data: data.map((d) => this.toResponse(d)),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    toResponse(decision) {
        return {
            id: decision.id,
            visaApplicationId: decision.visaApplicationId,
            officerId: decision.officerId,
            secondaryOfficerId: decision.secondaryOfficerId || undefined,
            decision: decision.decision,
            remarks: decision.remarks,
            rationale: decision.rationale,
            decidedAt: decision.decidedAt,
            createdAt: decision.createdAt,
            officer: decision.officer,
            secondaryOfficer: decision.secondaryOfficer,
        };
    }
}
exports.VisaDecisionService = VisaDecisionService;
VisaDecisionService.DECISION_INCLUDE = {
    officer: { select: { userid: true, firstName: true, lastName: true, email: true } },
    secondaryOfficer: { select: { userid: true, firstName: true, lastName: true, email: true } },
};
