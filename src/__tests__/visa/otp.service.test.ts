import { OTPService } from '../../services/otp.service';

jest.mock('crypto', () => ({
  randomInt: jest.fn(() => 123456),
  randomBytes: jest.fn(() => ({ toString: () => 'ABCD' })),
}));

describe('OTPService', () => {
  let service: OTPService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OTPService();
  });

  describe('generateOtp', () => {
    it('should generate a 6-digit OTP', async () => {
      const otp = await service.generateOtp('appt-1');
      expect(otp).toBe('123456');
      expect(otp).toMatch(/^\d{6}$/);
    });

    it('should set OTP expiry to 5 minutes', async () => {
      const before = Date.now();
      await service.generateOtp('appt-1');
      const otpEntry = (service as any).otpStore.get('appt-1');
      expect(otpEntry.expiresAt - before).toBeCloseTo(5 * 60 * 1000, -3);
    });

    it('should enforce rate limit of 3 per hour', async () => {
      for (let i = 0; i < 3; i++) {
        await service.generateOtp('appt-2');
      }
      await expect(service.generateOtp('appt-2')).rejects.toThrow('Rate limit exceeded');
    });

    it('should reset rate limit after 1 hour', async () => {
      jest.useFakeTimers();
      for (let i = 0; i < 3; i++) {
        await service.generateOtp('appt-3');
      }
      jest.advanceTimersByTime(60 * 60 * 1000 + 1);
      const otp = await service.generateOtp('appt-3');
      expect(otp).toBeDefined();
      jest.useRealTimers();
    });
  });

  describe('verifyOtp', () => {
    it('should verify a valid OTP', async () => {
      await service.generateOtp('appt-4');
      const result = service.verifyOtp('appt-4', '123456');
      expect(result).toBe(true);
    });

    it('should reject an expired OTP', async () => {
      jest.useFakeTimers();
      await service.generateOtp('appt-5');
      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
      const result = service.verifyOtp('appt-5', '123456');
      expect(result).toBe(false);
      jest.useRealTimers();
    });

    it('should reject an invalid OTP', async () => {
      await service.generateOtp('appt-6');
      const result = service.verifyOtp('appt-6', '000000');
      expect(result).toBe(false);
    });

    it('should reject OTP for non-existent appointment', () => {
      const result = service.verifyOtp('nonexistent', '123456');
      expect(result).toBe(false);
    });

    it('should consume OTP after successful verification', async () => {
      await service.generateOtp('appt-7');
      service.verifyOtp('appt-7', '123456');
      const result = service.verifyOtp('appt-7', '123456');
      expect(result).toBe(false);
    });

    it('should enforce rate limit of 5 verifications per 15 minutes', async () => {
      await service.generateOtp('appt-8');
      for (let i = 0; i < 5; i++) {
        service.verifyOtp('appt-8', 'wrong-otp');
      }
      const result = service.verifyOtp('appt-8', '123456');
      expect(result).toBe(false);
    });
  });
});