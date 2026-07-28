"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceRequestService = void 0;
const crypto_1 = require("crypto");
const exceptions_1 = require("../exceptions");
const VALID_TRANSITIONS = {
    DRAFT: ['SUBMITTED', 'CANCELLED'],
    SUBMITTED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'CLOSED', 'CANCELLED'],
    COMPLETED: ['CLOSED'],
    CLOSED: [],
    CANCELLED: [],
};
function generateReferenceNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = (0, crypto_1.randomBytes)(8).toString('hex').toUpperCase();
    return `SR-${timestamp}-${random}`;
}
class ServiceRequestService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, dto) {
        const [serviceType, embassy] = await Promise.all([
            this.prisma.serviceType.findUnique({ where: { id: dto.serviceTypeId } }),
            this.prisma.embassy.findUnique({ where: { id: dto.embassyId } }),
        ]);
        if (!serviceType) {
            throw new exceptions_1.NotFoundError('Service type not found');
        }
        if (!embassy) {
            throw new exceptions_1.NotFoundError('Embassy not found');
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
    async findById(requestId) {
        const request = await this.prisma.serviceRequest.findUnique({
            where: { id: requestId },
            include: ServiceRequestService.SERVICE_REQUEST_INCLUDE,
        });
        if (!request) {
            throw new exceptions_1.NotFoundError('Service request not found');
        }
        return this.toResponse(request);
    }
    async findAll(params) {
        const page = params.page || 1;
        const limit = params.limit || 10;
        const skip = (page - 1) * limit;
        const where = {};
        if (params.userId)
            where.userId = params.userId;
        if (params.embassyId)
            where.embassyId = params.embassyId;
        if (params.status)
            where.status = params.status;
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
    async updateStatus(requestId, dto, userId) {
        const existing = await this.prisma.serviceRequest.findUnique({
            where: { id: requestId },
        });
        if (!existing) {
            throw new exceptions_1.NotFoundError('Service request not found');
        }
        const allowedNext = VALID_TRANSITIONS[existing.status];
        if (!allowedNext || !allowedNext.includes(dto.status)) {
            throw new exceptions_1.ValidationError(`Cannot transition from ${existing.status} to ${dto.status}. Allowed: ${(allowedNext || []).join(', ') || 'none'}`);
        }
        const request = await this.prisma.serviceRequest.update({
            where: { id: requestId },
            data: {
                status: dto.status,
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
    toResponse(request) {
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
            payments: request.payments?.map((p) => ({
                id: p.id,
                amount: p.amount.toNumber(),
                currency: p.currency,
                status: p.status,
                createdAt: p.createdAt,
            })) || [],
        };
    }
}
exports.ServiceRequestService = ServiceRequestService;
ServiceRequestService.SERVICE_REQUEST_INCLUDE = {
    user: { select: { userid: true, firstName: true, lastName: true, email: true } },
    serviceType: { select: { id: true, name: true, slug: true, category: true } },
    embassy: { select: { id: true, name: true, code: true, country: true, city: true } },
    payments: true,
};
