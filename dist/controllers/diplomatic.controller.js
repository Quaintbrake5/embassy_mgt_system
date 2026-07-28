"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiplomaticController = void 0;
const diplomatic_dto_1 = require("../dto/diplomatic.dto");
const exceptions_1 = require("../exceptions");
class DiplomaticController {
    constructor(diplomaticService) {
        this.createPouch = async (req, res, next) => {
            try {
                const dto = diplomatic_dto_1.CreatePouchDto.sanitize(req.body);
                const errors = diplomatic_dto_1.CreatePouchDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const pouch = await this.diplomaticService.createPouch(dto, req.user.userId);
                res.status(201).json({ success: true, data: pouch });
            }
            catch (error) {
                next(error);
            }
        };
        this.findPouches = async (req, res, next) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const result = await this.diplomaticService.findPouches(page, limit);
                res.json({ success: true, data: result.data, meta: result.meta });
            }
            catch (error) {
                next(error);
            }
        };
        this.findPouchById = async (req, res, next) => {
            try {
                const id = req.params.id;
                const pouch = await this.diplomaticService.findPouchById(id);
                res.json({ success: true, data: pouch });
            }
            catch (error) {
                next(error);
            }
        };
        this.handoffPouch = async (req, res, next) => {
            try {
                const id = req.params.id;
                const dto = diplomatic_dto_1.UpdatePouchHandoffDto.sanitize(req.body);
                const errors = diplomatic_dto_1.UpdatePouchHandoffDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const pouch = await this.diplomaticService.handoffPouch(id, dto, req.user.userId);
                res.json({ success: true, data: pouch });
            }
            catch (error) {
                next(error);
            }
        };
        this.createClearance = async (req, res, next) => {
            try {
                const dto = diplomatic_dto_1.CreateClearanceDto.sanitize(req.body);
                const errors = diplomatic_dto_1.CreateClearanceDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const clearance = await this.diplomaticService.createClearance(dto, req.user.userId);
                res.status(201).json({ success: true, data: clearance });
            }
            catch (error) {
                next(error);
            }
        };
        this.findClearances = async (req, res, next) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const result = await this.diplomaticService.findClearances(page, limit);
                res.json({ success: true, data: result.data, meta: result.meta });
            }
            catch (error) {
                next(error);
            }
        };
        this.findClearanceById = async (req, res, next) => {
            try {
                const id = req.params.id;
                const clearance = await this.diplomaticService.findClearanceById(id);
                res.json({ success: true, data: clearance });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateClearance = async (req, res, next) => {
            try {
                const id = req.params.id;
                const dto = diplomatic_dto_1.UpdateClearanceDto.sanitize(req.body);
                const errors = diplomatic_dto_1.UpdateClearanceDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const clearance = await this.diplomaticService.updateClearance(id, dto, req.user.userId);
                res.json({ success: true, data: clearance });
            }
            catch (error) {
                next(error);
            }
        };
        this.diplomaticService = diplomaticService;
    }
}
exports.DiplomaticController = DiplomaticController;
