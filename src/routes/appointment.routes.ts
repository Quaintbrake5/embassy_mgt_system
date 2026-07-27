import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { CreateAppointmentDto } from '../dto/appointment.dto';
import { AppointmentService } from '../services/appointment.service';
import { OTPService } from '../services/otp.service';
import { prisma } from '../config/db.config';

const otpService = new OTPService();
const appointmentService = new AppointmentService(prisma, otpService);
const appointmentController = new AppointmentController(appointmentService);

const router = Router();

router.use(authMiddleware);

router.get('/slots', requirePermission('appointment:read'), appointmentController.getAvailableSlots);
router.post('/book', validate(CreateAppointmentDto), requirePermission('appointment:create'), appointmentController.book);
router.get('/my', requirePermission('appointment:read'), appointmentController.findMyAppointments);
router.put('/:id/cancel', requirePermission('appointment:update'), appointmentController.cancel);
router.post('/:id/checkin', appointmentController.checkIn);
router.get('/queue', requirePermission('appointment:read'), appointmentController.getQueue);
router.post('/queue/next', requirePermission('appointment:update'), appointmentController.callNext);
router.put('/:id/complete', requirePermission('appointment:update'), appointmentController.complete);
router.put('/:id/no-show', requirePermission('appointment:update'), appointmentController.markNoShow);

export default router;