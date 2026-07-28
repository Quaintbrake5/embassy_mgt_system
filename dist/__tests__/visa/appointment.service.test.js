"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mock_db_1 = require("../helpers/mock-db");
const factories_1 = require("../helpers/factories");
const appointment_service_1 = require("../../services/appointment.service");
const otp_service_1 = require("../../services/otp.service");
jest.mock('../../config/db.config', () => ({ prisma: mock_db_1.mockPrisma }));
jest.mock('../../services/otp.service');
describe('AppointmentService', () => {
    let service;
    let mockOtpService;
    beforeEach(() => {
        jest.clearAllMocks();
        mockOtpService = new otp_service_1.OTPService();
        mockOtpService.generateOtp = jest.fn().mockResolvedValue('123456');
        mockOtpService.verifyOtp = jest.fn().mockResolvedValue(true);
        mock_db_1.mockPrisma.appointment.findFirst = jest.fn();
        service = new appointment_service_1.AppointmentService(mock_db_1.mockPrisma, mockOtpService);
    });
    describe('getAvailableSlots', () => {
        it('should generate 30-minute slots from 09:00 to 16:30', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.appointment.findMany.mockResolvedValue([]);
            const result = await service.getAvailableSlots('embassy-1', '2026-08-01');
            expect(result.slots).toHaveLength(16);
            expect(result.slots[0].time).toBe('09:00');
            expect(result.slots[15].time).toBe('16:30');
        });
        it('should mark booked slots as unavailable', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue((0, factories_1.createMockEmbassy)());
            mock_db_1.mockPrisma.appointment.findMany.mockResolvedValue([{ slotTime: '09:00' }, { slotTime: '10:30' }]);
            const result = await service.getAvailableSlots('embassy-1', '2026-08-01');
            expect(result.slots.find((s) => s.time === '09:00').available).toBe(false);
            expect(result.slots.find((s) => s.time === '10:30').available).toBe(false);
        });
        it('should throw NotFoundError for non-existent embassy', async () => {
            mock_db_1.mockPrisma.embassy.findUnique.mockResolvedValue(null);
            await expect(service.getAvailableSlots('nonexistent', '2026-08-01')).rejects.toThrow('Embassy not found');
        });
    });
    describe('book', () => {
        it('should book an appointment successfully', async () => {
            const mockApt = (0, factories_1.createMockAppointment)({ id: 'apt-1', status: 'BOOKED', qrCode: 'QRCODE123', tokenNumber: 'TK-ABC-123' });
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({ embassyId: 'embassy-1' }));
            mock_db_1.mockPrisma["$transaction"].mockImplementation(async (fn) => fn({ appointment: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(mockApt) } }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.book({ serviceRequestId: 'sr-1', embassyId: 'embassy-1', slotDate: '2026-08-01', slotTime: '10:00' }, 'user-1');
            expect(result.status).toBe('BOOKED');
            expect(mockOtpService.generateOtp).toHaveBeenCalledWith('apt-1');
        });
        it('should reject booking for someone else service request', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({ userId: 'other-user' }));
            await expect(service.book({ serviceRequestId: 'sr-1', embassyId: 'embassy-1', slotDate: '2026-08-01', slotTime: '10:00' }, 'user-1')).rejects.toThrow('Service request does not belong to this user');
        });
        it('should reject booking when embassy mismatches', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({ embassyId: 'embassy-2' }));
            await expect(service.book({ serviceRequestId: 'sr-1', embassyId: 'embassy-1', slotDate: '2026-08-01', slotTime: '10:00' }, 'user-1')).rejects.toThrow('Service request embassy does not match appointment embassy');
        });
        it('should reject booking for already taken slot', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue((0, factories_1.createMockServiceRequest)({ embassyId: 'embassy-1' }));
            mock_db_1.mockPrisma["$transaction"].mockImplementation(async (fn) => {
                const tx = { appointment: { findFirst: jest.fn().mockResolvedValue({ id: 'existing-apt' }), create: jest.fn() } };
                return fn(tx);
            });
            await expect(service.book({ serviceRequestId: 'sr-1', embassyId: 'embassy-1', slotDate: '2026-08-01', slotTime: '10:00' }, 'user-1')).rejects.toThrow('This time slot is already booked');
        });
        it('should throw NotFoundError for non-existent service request', async () => {
            mock_db_1.mockPrisma.serviceRequest.findUnique.mockResolvedValue(null);
            await expect(service.book({ serviceRequestId: 'nonexistent', embassyId: 'embassy-1', slotDate: '2026-08-01', slotTime: '10:00' }, 'user-1')).rejects.toThrow('Service request not found');
        });
    });
    describe('findMyAppointments', () => {
        it('should return user appointments', async () => {
            mock_db_1.mockPrisma.appointment.findMany.mockResolvedValue([(0, factories_1.createMockAppointment)()]);
            mock_db_1.mockPrisma.appointment.count.mockResolvedValue(1);
            const result = await service.findMyAppointments('user-1', 1, 10);
            expect(result.data).toHaveLength(1);
            expect(result.meta.total).toBe(1);
        });
    });
    describe('cancel', () => {
        it('should cancel a BOOKED appointment', async () => {
            mock_db_1.mockPrisma.appointment.findUnique.mockResolvedValue((0, factories_1.createMockAppointment)({ id: 'apt-1', status: 'BOOKED', tokenNumber: 'TK-001' }));
            mock_db_1.mockPrisma.appointment.update.mockResolvedValue((0, factories_1.createMockAppointment)({ id: 'apt-1', status: 'CANCELLED' }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.cancel('apt-1', 'user-1');
            expect(result.status).toBe('CANCELLED');
        });
        it('should reject cancel for non-BOOKED appointment', async () => {
            mock_db_1.mockPrisma.appointment.findUnique.mockResolvedValue((0, factories_1.createMockAppointment)({ status: 'COMPLETED' }));
            await expect(service.cancel('apt-1', 'user-1')).rejects.toThrow('Cannot cancel appointment with status COMPLETED');
        });
        it('should throw NotFoundError for missing appointment', async () => {
            mock_db_1.mockPrisma.appointment.findUnique.mockResolvedValue(null);
            await expect(service.cancel('nonexistent', 'user-1')).rejects.toThrow('Appointment not found');
        });
    });
    describe('checkIn', () => {
        it('should check in with valid OTP', async () => {
            mock_db_1.mockPrisma.appointment.findUnique.mockResolvedValue((0, factories_1.createMockAppointment)({ id: 'apt-1', status: 'BOOKED', userId: 'user-1', tokenNumber: 'TK-001' }));
            mockOtpService.verifyOtp.mockResolvedValue(true);
            mock_db_1.mockPrisma.appointment.update.mockResolvedValue((0, factories_1.createMockAppointment)({ id: 'apt-1', status: 'CHECKED_IN', checkInAt: new Date() }));
            mock_db_1.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
            const result = await service.checkIn('apt-1', '123456');
            expect(result.status).toBe('CHECKED_IN');
            expect(mockOtpService.verifyOtp).toHaveBeenCalledWith('apt-1', '123456');
        });
        it('should reject check-in with invalid OTP', async () => {
            mock_db_1.mockPrisma.appointment.findUnique.mockResolvedValue((0, factories_1.createMockAppointment)({ id: 'apt-1', status: 'BOOKED', userId: 'user-1' }));
            mockOtpService.verifyOtp.mockResolvedValue(false);
            await expect(service.checkIn('apt-1', 'wrong-otp')).rejects.toThrow('Invalid or expired OTP');
        });
        it('should reject check-in for non-BOOKED appointment', async () => {
            mock_db_1.mockPrisma.appointment.findUnique.mockResolvedValue((0, factories_1.createMockAppointment)({ status: 'CANCELLED' }));
            await expect(service.checkIn('apt-1', '123456')).rejects.toThrow('Cannot check in appointment with status CANCELLED');
        });
    });
    describe('getQueue', () => {
        it('should return checked-in and in-progress appointments', async () => {
            mock_db_1.mockPrisma.appointment.findMany.mockResolvedValue([
                (0, factories_1.createMockAppointment)({ id: 'apt-1', status: 'CHECKED_IN' }),
                (0, factories_1.createMockAppointment)({ id: 'apt-2', status: 'IN_PROGRESS' }),
            ]);
            mock_db_1.mockPrisma.appointment.count.mockResolvedValue(2);
            const result = await service.getQueue('embassy-1');
            expect(result.data).toHaveLength(2);
        });
    });
    describe('callNext', () => {
        it('should call next checked-in appointment', async () => {
            mock_db_1.mockPrisma.appointment.findFirst.mockResolvedValue((0, factories_1.createMockAppointment)({ id: 'apt-1', status: 'CHECKED_IN' }));
            mock_db_1.mockPrisma.appointment.update.mockResolvedValue((0, factories_1.createMockAppointment)({ id: 'apt-1', status: 'IN_PROGRESS' }));
            const result = await service.callNext('embassy-1');
            expect(result.status).toBe('IN_PROGRESS');
        });
        it('should throw NotFoundError when queue is empty', async () => {
            mock_db_1.mockPrisma.appointment.findFirst.mockResolvedValue(null);
            await expect(service.callNext('embassy-1')).rejects.toThrow('No checked-in appointments in queue');
        });
    });
    describe('complete', () => {
        it('should complete an IN_PROGRESS appointment', async () => {
            mock_db_1.mockPrisma.appointment.findUnique.mockResolvedValue((0, factories_1.createMockAppointment)({ id: 'apt-1', status: 'IN_PROGRESS' }));
            mock_db_1.mockPrisma.appointment.update.mockResolvedValue((0, factories_1.createMockAppointment)({ id: 'apt-1', status: 'COMPLETED' }));
            const result = await service.complete('apt-1');
            expect(result.status).toBe('COMPLETED');
        });
        it('should reject complete for non-IN_PROGRESS appointment', async () => {
            mock_db_1.mockPrisma.appointment.findUnique.mockResolvedValue((0, factories_1.createMockAppointment)({ status: 'BOOKED' }));
            await expect(service.complete('apt-1')).rejects.toThrow('Cannot complete appointment with status BOOKED');
        });
    });
    describe('markNoShow', () => {
        it('should mark no-show for past BOOKED appointment', async () => {
            const pastDate = new Date(Date.now() - 86400000);
            mock_db_1.mockPrisma.appointment.findUnique.mockResolvedValue((0, factories_1.createMockAppointment)({ id: 'apt-1', status: 'BOOKED', slotDate: pastDate }));
            mock_db_1.mockPrisma.appointment.update.mockResolvedValue((0, factories_1.createMockAppointment)({ id: 'apt-1', status: 'NO_SHOW' }));
            const result = await service.markNoShow('apt-1');
            expect(result.status).toBe('NO_SHOW');
        });
        it('should reject no-show for future appointment', async () => {
            const futureDate = new Date(Date.now() + 86400000);
            mock_db_1.mockPrisma.appointment.findUnique.mockResolvedValue((0, factories_1.createMockAppointment)({ id: 'apt-1', status: 'BOOKED', slotDate: futureDate }));
            await expect(service.markNoShow('apt-1')).rejects.toThrow('Cannot mark no-show before the appointment slot date');
        });
        it('should reject no-show for non-BOOKED appointment', async () => {
            mock_db_1.mockPrisma.appointment.findUnique.mockResolvedValue((0, factories_1.createMockAppointment)({ status: 'COMPLETED' }));
            await expect(service.markNoShow('apt-1')).rejects.toThrow('Cannot mark no-show for appointment with status COMPLETED');
        });
    });
});
