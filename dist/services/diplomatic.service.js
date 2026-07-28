"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiplomaticService = void 0;
const exceptions_1 = require("../exceptions");
const enums_1 = require("../generated/prisma/enums");
const crypto_1 = require("crypto");
class DiplomaticService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createPouch(dto, userId) {
        const origin = await this.prisma.embassy.findUnique({ where: { id: dto.originEmbassyId } });
        if (!origin)
            throw new exceptions_1.NotFoundError('Origin embassy not found');
        const destination = await this.prisma.embassy.findUnique({ where: { id: dto.destinationEmbassyId } });
        if (!destination)
            throw new exceptions_1.NotFoundError('Destination embassy not found');
        const pouchNumber = `DP-${Date.now().toString(36).toUpperCase()}-${(0, crypto_1.randomBytes)(8).toString('hex').toUpperCase()}`;
        const pouch = await this.prisma.diplomaticPouch.create({
            data: {
                pouchNumber,
                originEmbassyId: dto.originEmbassyId,
                destinationEmbassyId: dto.destinationEmbassyId,
                status: enums_1.PouchStatus.CREATED,
                dispatchDate: dto.dispatchDate ? new Date(dto.dispatchDate) : null,
            },
        });
        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'CREATE',
                entity: 'DiplomaticPouch',
                entityId: pouch.id,
                description: `Created diplomatic pouch ${pouchNumber} from ${origin.country} to ${destination.country}`,
                metaData: { pouchNumber, originEmbassyId: dto.originEmbassyId, destinationEmbassyId: dto.destinationEmbassyId },
            },
        });
        return this.toPouchResponse(pouch);
    }
    async findPouches(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [pouches, total] = await Promise.all([
            this.prisma.diplomaticPouch.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
            this.prisma.diplomaticPouch.count(),
        ]);
        return {
            data: pouches.map(this.toPouchResponse),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async findPouchById(id) {
        const pouch = await this.prisma.diplomaticPouch.findUnique({ where: { id } });
        if (!pouch)
            throw new exceptions_1.NotFoundError('Diplomatic pouch not found');
        return this.toPouchResponse(pouch);
    }
    async handoffPouch(id, dto, userId) {
        const pouch = await this.prisma.diplomaticPouch.findUnique({ where: { id } });
        if (!pouch)
            throw new exceptions_1.NotFoundError('Diplomatic pouch not found');
        const ALLOWED_TRANSITIONS = {
            CREATED: ['IN_TRANSIT'],
            IN_TRANSIT: ['RECEIVED', 'LOST'],
            RECEIVED: ['CLOSED'],
        };
        if (dto.newStatus) {
            const allowed = ALLOWED_TRANSITIONS[pouch.status];
            if (!allowed || !allowed.includes(dto.newStatus)) {
                throw new exceptions_1.ValidationError(`Cannot transition pouch from ${pouch.status} to ${dto.newStatus}`);
            }
        }
        const existingCustody = pouch.chainOfCustody ? pouch.chainOfCustody : [];
        const handoffEntry = {
            handedOverBy: dto.handoffData.handedOverBy,
            handedOverTo: dto.handoffData.handedOverTo,
            notes: dto.handoffData.notes || '',
            timestamp: new Date().toISOString(),
        };
        const updateData = {
            chainOfCustody: [...existingCustody, handoffEntry],
        };
        if (dto.newStatus) {
            updateData.status = dto.newStatus;
        }
        if (dto.newStatus === 'RECEIVED') {
            updateData.receivedDate = new Date();
        }
        const updated = await this.prisma.diplomaticPouch.update({
            where: { id },
            data: updateData,
        });
        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'UPDATE',
                entity: 'DiplomaticPouch',
                entityId: id,
                description: `Handoff recorded for pouch ${updated.pouchNumber}`,
                metaData: { handoffEntry, newStatus: dto.newStatus },
            },
        });
        return this.toPouchResponse(updated);
    }
    async createClearance(dto, userId) {
        const user = await this.prisma.user.findUnique({ where: { userid: dto.userId } });
        if (!user)
            throw new exceptions_1.NotFoundError('User not found');
        const existing = await this.prisma.staffClearance.findUnique({
            where: { userId: dto.userId },
        });
        if (existing) {
            throw new exceptions_1.ConflictError('User already has a staff clearance record');
        }
        const clearance = await this.prisma.staffClearance.create({
            data: {
                userId: dto.userId,
                clearanceLevel: dto.clearanceLevel,
                issuedBy: userId,
                issuedAt: new Date(),
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            },
        });
        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'CREATE',
                entity: 'StaffClearance',
                entityId: clearance.id,
                description: `Created clearance level ${dto.clearanceLevel} for user ${dto.userId}`,
                metaData: { clearanceLevel: dto.clearanceLevel, userId: dto.userId },
            },
        });
        return this.toClearanceResponse(clearance);
    }
    async findClearances(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [clearances, total] = await Promise.all([
            this.prisma.staffClearance.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
            this.prisma.staffClearance.count(),
        ]);
        return {
            data: clearances.map(this.toClearanceResponse),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }
    async findClearanceById(id) {
        const clearance = await this.prisma.staffClearance.findUnique({ where: { id } });
        if (!clearance)
            throw new exceptions_1.NotFoundError('Staff clearance not found');
        return this.toClearanceResponse(clearance);
    }
    async updateClearance(id, dto, userId) {
        const existing = await this.prisma.staffClearance.findUnique({ where: { id } });
        if (!existing)
            throw new exceptions_1.NotFoundError('Staff clearance not found');
        const updateData = {};
        if (dto.clearanceLevel !== undefined)
            updateData.clearanceLevel = dto.clearanceLevel;
        if (dto.expiresAt !== undefined)
            updateData.expiresAt = new Date(dto.expiresAt);
        if (dto.isActive !== undefined)
            updateData.isActive = dto.isActive;
        const clearance = await this.prisma.staffClearance.update({
            where: { id },
            data: updateData,
        });
        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'UPDATE',
                entity: 'StaffClearance',
                entityId: id,
                description: `Updated clearance for user ${clearance.userId}`,
                metaData: {
                    oldValues: { clearanceLevel: existing.clearanceLevel, isActive: existing.isActive },
                    newValues: { clearanceLevel: clearance.clearanceLevel, isActive: clearance.isActive },
                },
            },
        });
        return this.toClearanceResponse(clearance);
    }
    toPouchResponse(pouch) {
        return {
            id: pouch.id,
            pouchNumber: pouch.pouchNumber,
            originEmbassyId: pouch.originEmbassyId,
            destinationEmbassyId: pouch.destinationEmbassyId,
            status: pouch.status,
            dispatchDate: pouch.dispatchDate,
            receivedDate: pouch.receivedDate,
            chainOfCustody: pouch.chainOfCustody,
            createdAt: pouch.createdAt,
            updatedAt: pouch.Updated,
        };
    }
    toClearanceResponse(clearance) {
        return {
            id: clearance.id,
            userId: clearance.userId,
            clearanceLevel: clearance.clearanceLevel,
            issuedBy: clearance.issuedBy,
            issuedAt: clearance.issuedAt,
            expiresAt: clearance.expiresAt,
            isActive: clearance.isActive,
            createdAt: clearance.createdAt,
            updatedAt: clearance.Updated,
        };
    }
}
exports.DiplomaticService = DiplomaticService;
