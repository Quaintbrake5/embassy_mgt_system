"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbassyController = void 0;
const embassy_dto_1 = require("../dto/embassy.dto");
const exceptions_1 = require("../exceptions");
class EmbassyController {
    constructor(embassyService) {
        this.create = async (req, res, next) => {
            try {
                const dto = embassy_dto_1.CreateEmbassyDto.sanitize(req.body);
                const errors = embassy_dto_1.CreateEmbassyDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const embassy = await this.embassyService.create(dto, req.user?.userId);
                res.status(201).json({ success: true, data: embassy });
            }
            catch (error) {
                next(error);
            }
        };
        this.findAll = async (req, res, next) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const result = await this.embassyService.findAll(page, limit);
                res.json({ success: true, data: result.data, meta: result.meta });
            }
            catch (error) {
                next(error);
            }
        };
        this.findById = async (req, res, next) => {
            try {
                const id = req.params.id;
                const embassy = await this.embassyService.findById(id);
                res.json({ success: true, data: embassy });
            }
            catch (error) {
                next(error);
            }
        };
        this.update = async (req, res, next) => {
            try {
                const id = req.params.id;
                const dto = embassy_dto_1.UpdateEmbassyDto.sanitize(req.body);
                const errors = embassy_dto_1.UpdateEmbassyDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const embassy = await this.embassyService.update(id, dto, req.user?.userId);
                res.json({ success: true, data: embassy });
            }
            catch (error) {
                next(error);
            }
        };
        this.delete = async (req, res, next) => {
            try {
                const id = req.params.id;
                await this.embassyService.delete(id, req.user?.userId);
                res.json({ success: true, message: 'Embassy deleted successfully' });
            }
            catch (error) {
                next(error);
            }
        };
        this.createDepartment = async (req, res, next) => {
            try {
                const embassyId = req.params.embassyId;
                const dto = embassy_dto_1.CreateDepartmentDto.sanitize(req.body);
                const errors = embassy_dto_1.CreateDepartmentDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const department = await this.embassyService.createDepartment(embassyId, dto, req.user?.userId);
                res.status(201).json({ success: true, data: department });
            }
            catch (error) {
                next(error);
            }
        };
        this.findDepartments = async (req, res, next) => {
            try {
                const embassyId = req.params.embassyId;
                const departments = await this.embassyService.findDepartments(embassyId);
                res.json({ success: true, data: departments });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateDepartment = async (req, res, next) => {
            try {
                const id = req.params.id;
                const dto = embassy_dto_1.UpdateDepartmentDto.sanitize(req.body);
                const errors = embassy_dto_1.UpdateDepartmentDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const department = await this.embassyService.updateDepartment(id, dto, req.user?.userId);
                res.json({ success: true, data: department });
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteDepartment = async (req, res, next) => {
            try {
                const id = req.params.id;
                await this.embassyService.deleteDepartment(id, req.user?.userId);
                res.json({ success: true, message: 'Department deleted successfully' });
            }
            catch (error) {
                next(error);
            }
        };
        this.embassyService = embassyService;
    }
}
exports.EmbassyController = EmbassyController;
