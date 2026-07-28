"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisaApplicationController = void 0;
const visa_application_dto_1 = require("../dto/visa-application.dto");
const exceptions_1 = require("../exceptions");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
class VisaApplicationController {
    constructor(visaApplicationService) {
        this.create = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const dto = visa_application_dto_1.CreateVisaApplicationDto.sanitize(req.body);
                if ((dto.embassyId === undefined || dto.embassyId === null) && req.embassyContext?.embassyId) {
                    dto.embassyId = req.embassyContext.embassyId;
                }
                const errors = visa_application_dto_1.CreateVisaApplicationDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const application = await this.visaApplicationService.create(userId, dto);
                res.status(201).json({ success: true, data: application });
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
                const visaType = req.query.visaType;
                const embassyId = req.query.embassyId;
                const permissions = await (0, rbac_middleware_1.getUserPermissions)(req.user.userId);
                const canViewAll = permissions.includes('visa:read-all');
                const filter = { page, limit };
                if (status)
                    filter.status = status;
                if (visaType)
                    filter.visaType = visaType;
                if (embassyId)
                    filter.embassyId = embassyId;
                else if (req.embassyContext?.embassyId)
                    filter.embassyId = req.embassyContext.embassyId;
                if (!canViewAll)
                    filter.userId = req.user.userId;
                const result = await this.visaApplicationService.findAll(filter);
                res.json({ success: true, data: result.data, meta: result.meta });
            }
            catch (error) {
                next(error);
            }
        };
        this.findById = async (req, res, next) => {
            try {
                const id = req.params.id;
                const application = await this.visaApplicationService.findById(id);
                res.json({ success: true, data: application });
            }
            catch (error) {
                next(error);
            }
        };
        this.submit = async (req, res, next) => {
            try {
                const id = req.params.id;
                const userId = req.user?.userId;
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const application = await this.visaApplicationService.submit(id, userId);
                res.json({ success: true, data: application });
            }
            catch (error) {
                next(error);
            }
        };
        this.visaApplicationService = visaApplicationService;
    }
}
exports.VisaApplicationController = VisaApplicationController;
