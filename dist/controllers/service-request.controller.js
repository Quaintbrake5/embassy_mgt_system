"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceRequestController = void 0;
const service_request_dto_1 = require("../dto/service-request.dto");
const exceptions_1 = require("../exceptions");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
class ServiceRequestController {
    constructor(serviceRequestService) {
        this.create = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const dto = service_request_dto_1.CreateServiceRequestDto.sanitize(req.body);
                if ((dto.embassyId === undefined || dto.embassyId === null) && req.embassyContext?.embassyId) {
                    dto.embassyId = req.embassyContext.embassyId;
                }
                const errors = service_request_dto_1.CreateServiceRequestDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const request = await this.serviceRequestService.create(userId, dto);
                res.status(201).json({ success: true, data: request });
            }
            catch (error) {
                next(error);
            }
        };
        this.findAll = async (req, res, next) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const status = req.query.status;
                const embassyId = req.query.embassyId;
                const permissions = await (0, rbac_middleware_1.getUserPermissions)(req.user.userId);
                const canViewAll = permissions.includes('service-request:read-all');
                const filter = { page, limit };
                if (status)
                    filter.status = status;
                if (embassyId)
                    filter.embassyId = embassyId;
                else if (req.embassyContext?.embassyId)
                    filter.embassyId = req.embassyContext.embassyId;
                if (!canViewAll)
                    filter.userId = req.user.userId;
                const result = await this.serviceRequestService.findAll(filter);
                res.json({ success: true, data: result.data, meta: result.meta });
            }
            catch (error) {
                next(error);
            }
        };
        this.findById = async (req, res, next) => {
            try {
                const id = req.params.id;
                const request = await this.serviceRequestService.findById(id);
                res.json({ success: true, data: request });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateStatus = async (req, res, next) => {
            try {
                const id = req.params.id;
                const dto = service_request_dto_1.UpdateServiceRequestStatusDto.sanitize(req.body);
                const errors = service_request_dto_1.UpdateServiceRequestStatusDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const request = await this.serviceRequestService.updateStatus(id, dto, req.user?.userId);
                res.json({ success: true, data: request });
            }
            catch (error) {
                next(error);
            }
        };
        this.serviceRequestService = serviceRequestService;
    }
}
exports.ServiceRequestController = ServiceRequestController;
