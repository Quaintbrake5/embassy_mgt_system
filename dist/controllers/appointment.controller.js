"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentController = void 0;
const appointment_dto_1 = require("../dto/appointment.dto");
const exceptions_1 = require("../exceptions");
class AppointmentController {
    constructor(appointmentService) {
        this.getAvailableSlots = async (req, res, next) => {
            try {
                const dto = appointment_dto_1.AvailableSlotsQueryDto.sanitize(req.query);
                const errors = appointment_dto_1.AvailableSlotsQueryDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const result = await this.appointmentService.getAvailableSlots(dto.embassyId, dto.date);
                res.json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        };
        this.book = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const dto = appointment_dto_1.CreateAppointmentDto.sanitize(req.body);
                const errors = appointment_dto_1.CreateAppointmentDto.validate(dto);
                if (errors.length > 0) {
                    throw new exceptions_1.ValidationError('Validation failed', errors);
                }
                const appointment = await this.appointmentService.book(dto, userId);
                res.status(201).json({ success: true, data: appointment });
            }
            catch (error) {
                next(error);
            }
        };
        this.findMyAppointments = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const result = await this.appointmentService.findMyAppointments(userId, page, limit);
                res.json({ success: true, data: result.data, meta: result.meta });
            }
            catch (error) {
                next(error);
            }
        };
        this.cancel = async (req, res, next) => {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    throw new Error('User not authenticated');
                }
                const id = req.params.id;
                const appointment = await this.appointmentService.cancel(id, userId);
                res.json({ success: true, data: appointment });
            }
            catch (error) {
                next(error);
            }
        };
        this.checkIn = async (req, res, next) => {
            try {
                const id = req.params.id;
                const otp = req.body.otp;
                if (!otp || typeof otp !== 'string') {
                    throw new exceptions_1.ValidationError('OTP is required');
                }
                const appointment = await this.appointmentService.checkIn(id, otp);
                res.json({ success: true, data: appointment });
            }
            catch (error) {
                next(error);
            }
        };
        this.getQueue = async (req, res, next) => {
            try {
                const embassyId = req.query.embassyId;
                if (!embassyId) {
                    throw new exceptions_1.ValidationError('Embassy ID is required');
                }
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 50;
                const result = await this.appointmentService.getQueue(embassyId, page, limit);
                res.json({ success: true, data: result.data, meta: result.meta });
            }
            catch (error) {
                next(error);
            }
        };
        this.callNext = async (req, res, next) => {
            try {
                const embassyId = req.query.embassyId;
                if (!embassyId) {
                    throw new exceptions_1.ValidationError('Embassy ID is required');
                }
                const appointment = await this.appointmentService.callNext(embassyId);
                res.json({ success: true, data: appointment });
            }
            catch (error) {
                next(error);
            }
        };
        this.complete = async (req, res, next) => {
            try {
                const id = req.params.id;
                const appointment = await this.appointmentService.complete(id);
                res.json({ success: true, data: appointment });
            }
            catch (error) {
                next(error);
            }
        };
        this.markNoShow = async (req, res, next) => {
            try {
                const id = req.params.id;
                const appointment = await this.appointmentService.markNoShow(id);
                res.json({ success: true, data: appointment });
            }
            catch (error) {
                next(error);
            }
        };
        this.appointmentService = appointmentService;
    }
}
exports.AppointmentController = AppointmentController;
