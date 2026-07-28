"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceTypeController = void 0;
const service_type_dto_1 = require("../dto/service-type.dto");
const exceptions_1 = require("../exceptions");
class ServiceTypeController {
    constructor(serviceTypeService) {
        this.create = async (req, res, next) => {
            try {
                const dto = service_type_dto_1.CreateServiceTypeDto.sanitize(req.body);
                const errors = service_type_dto_1.CreateServiceTypeDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const serviceType = await this.serviceTypeService.create(dto, req.user?.userId);
                res.status(201).json({ success: true, data: serviceType });
            }
            catch (error) {
                next(error);
            }
        };
        this.findAll = async (req, res, next) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const result = await this.serviceTypeService.findAll(page, limit);
                res.json({ success: true, data: result.data, meta: result.meta });
            }
            catch (error) {
                next(error);
            }
        };
        this.findById = async (req, res, next) => {
            try {
                const id = req.params.id;
                const serviceType = await this.serviceTypeService.findById(id);
                res.json({ success: true, data: serviceType });
            }
            catch (error) {
                next(error);
            }
        };
        this.findByCategory = async (req, res, next) => {
            try {
                const category = req.params.category;
                const items = await this.serviceTypeService.findByCategory(category);
                res.json({ success: true, data: items });
            }
            catch (error) {
                next(error);
            }
        };
        this.update = async (req, res, next) => {
            try {
                const id = req.params.id;
                const dto = service_type_dto_1.UpdateServiceTypeDto.sanitize(req.body);
                const errors = service_type_dto_1.UpdateServiceTypeDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const serviceType = await this.serviceTypeService.update(id, dto, req.user?.userId);
                res.json({ success: true, data: serviceType });
            }
            catch (error) {
                next(error);
            }
        };
        this.delete = async (req, res, next) => {
            try {
                const id = req.params.id;
                await this.serviceTypeService.delete(id, req.user?.userId);
                res.json({ success: true, message: 'Service type deleted successfully' });
            }
            catch (error) {
                next(error);
            }
        };
        this.serviceTypeService = serviceTypeService;
    }
}
exports.ServiceTypeController = ServiceTypeController;
