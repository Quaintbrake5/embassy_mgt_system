import { randomBytes, randomInt } from 'crypto';

interface OtpEntry {
  otp: string;
  expiresAt: number;
}

interface RateLimitEntry {
  count: number;
  firstRequest: number;
}

export interface IOTPService {
  generateOtp(appointmentId: string): Promise<string>;
  verifyOtp(appointmentId: string, otp: string): boolean;
}

export class OTPService implements IOTPService {
  private otpStore: Map<string, OtpEntry> = new Map();
  private rateLimitStore: Map<string, RateLimitEntry> = new Map();
  private verifyRateLimitStore: Map<string, RateLimitEntry> = new Map();

  private static readonly OTP_EXPIRY_MS = 5 * 60 * 1000;
  private static readonly RATE_LIMIT_MAX = 3;
  private static readonly RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
  private static readonly VERIFY_RATE_LIMIT_MAX = 5;
  private static readonly VERIFY_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.otpStore.entries()) {
      if (entry.expiresAt <= now) {
        this.otpStore.delete(key);
      }
    }
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (entry.firstRequest + OTPService.RATE_LIMIT_WINDOW_MS <= now) {
        this.rateLimitStore.delete(key);
      }
    }
    for (const [key, entry] of this.verifyRateLimitStore.entries()) {
      if (entry.firstRequest + OTPService.VERIFY_RATE_LIMIT_WINDOW_MS <= now) {
        this.verifyRateLimitStore.delete(key);
      }
    }
  }

  async generateOtp(appointmentId: string): Promise<string> {
    this.cleanupExpired();

    const now = Date.now();
    const rateKey = appointmentId;
    const rateEntry = this.rateLimitStore.get(rateKey);

    if (rateEntry) {
      if (rateEntry.firstRequest + OTPService.RATE_LIMIT_WINDOW_MS > now) {
        if (rateEntry.count >= OTPService.RATE_LIMIT_MAX) {
          throw new Error('Rate limit exceeded. Maximum 3 OTP generations per hour.');
        }
        rateEntry.count++;
      } else {
        this.rateLimitStore.set(rateKey, { count: 1, firstRequest: now });
      }
    } else {
      this.rateLimitStore.set(rateKey, { count: 1, firstRequest: now });
    }

    const otp = randomInt(100000, 999999).toString();
    this.otpStore.set(appointmentId, {
      otp,
      expiresAt: now + OTPService.OTP_EXPIRY_MS,
    });

    return otp;
  }

  verifyOtp(appointmentId: string, otp: string): boolean {
    this.cleanupExpired();

    const now = Date.now();
    const verifyKey = `verify:${appointmentId}`;
    const verifyEntry = this.verifyRateLimitStore.get(verifyKey);

    if (verifyEntry) {
      if (verifyEntry.firstRequest + OTPService.VERIFY_RATE_LIMIT_WINDOW_MS > now) {
        if (verifyEntry.count >= OTPService.VERIFY_RATE_LIMIT_MAX) {
          return false;
        }
        verifyEntry.count++;
      } else {
        this.verifyRateLimitStore.set(verifyKey, { count: 1, firstRequest: now });
      }
    } else {
      this.verifyRateLimitStore.set(verifyKey, { count: 1, firstRequest: now });
    }

    const entry = this.otpStore.get(appointmentId);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.otpStore.delete(appointmentId);
      return false;
    }

    if (entry.otp !== otp) {
      return false;
    }

    this.otpStore.delete(appointmentId);
    return true;
  }
}