import { randomInt } from 'crypto';
import Redis from 'ioredis';

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
  verifyOtp(appointmentId: string, otp: string): Promise<boolean>;
}

export class OTPService implements IOTPService {
  private redis: Redis | null;
  private otpStore: Map<string, OtpEntry> = new Map();
  private rateLimitStore: Map<string, RateLimitEntry> = new Map();
  private verifyRateLimitStore: Map<string, RateLimitEntry> = new Map();

  private static readonly OTP_EXPIRY_MS = 5 * 60 * 1000;
  private static readonly RATE_LIMIT_MAX = 3;
  private static readonly RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
  private static readonly VERIFY_RATE_LIMIT_MAX = 5;
  private static readonly VERIFY_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

  constructor(redisClient?: Redis | null) {
    this.redis = redisClient || null;
  }

  private redisAvailable(): boolean {
    return this.redis !== null && this.redis.status === 'ready';
  }

  private static readonly RATE_INCR_SCRIPT = `
    local c = redis.call("INCR", KEYS[1])
    if c == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
    return c
  `;

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
    if (this.redisAvailable()) {
      return this.generateOtpRedis(appointmentId);
    }
    return this.generateOtpMemory(appointmentId);
  }

  async verifyOtp(appointmentId: string, otp: string): Promise<boolean> {
    if (this.redisAvailable()) {
      return this.verifyOtpRedis(appointmentId, otp);
    }
    return this.verifyOtpMemory(appointmentId, otp);
  }

  private async generateOtpRedis(appointmentId: string): Promise<string> {
    const rateKey = `otp:rate:${appointmentId}`;
    const count = await this.redis!.eval(
      OTPService.RATE_INCR_SCRIPT,
      1,
      rateKey,
      OTPService.RATE_LIMIT_WINDOW_MS / 1000
    ) as number;
    if (count > OTPService.RATE_LIMIT_MAX) {
      throw new Error('Rate limit exceeded. Maximum 3 OTP generations per hour.');
    }

    const otp = randomInt(100000, 999999).toString();
    await this.redis!.setex(`otp:${appointmentId}`, OTPService.OTP_EXPIRY_MS / 1000, otp);
    return otp;
  }

  private async verifyOtpRedis(appointmentId: string, otp: string): Promise<boolean> {
    const verifyKey = `otp:verify:${appointmentId}`;
    const verifyCount = await this.redis!.eval(
      OTPService.RATE_INCR_SCRIPT,
      1,
      verifyKey,
      OTPService.VERIFY_RATE_LIMIT_WINDOW_MS / 1000
    ) as number;
    if (verifyCount > OTPService.VERIFY_RATE_LIMIT_MAX) {
      return false;
    }

    const storedOtp = await this.redis!.get(`otp:${appointmentId}`);
    if (!storedOtp || storedOtp !== otp) {
      return false;
    }

    await this.redis!.del(`otp:${appointmentId}`);
    return true;
  }

  private async generateOtpMemory(appointmentId: string): Promise<string> {
    this.cleanupExpired();

    const now = Date.now();
    const rateEntry = this.rateLimitStore.get(appointmentId);

    if (rateEntry) {
      if (rateEntry.firstRequest + OTPService.RATE_LIMIT_WINDOW_MS > now) {
        if (rateEntry.count >= OTPService.RATE_LIMIT_MAX) {
          throw new Error('Rate limit exceeded. Maximum 3 OTP generations per hour.');
        }
        rateEntry.count++;
      } else {
        this.rateLimitStore.set(appointmentId, { count: 1, firstRequest: now });
      }
    } else {
      this.rateLimitStore.set(appointmentId, { count: 1, firstRequest: now });
    }

    const otp = randomInt(100000, 999999).toString();
    this.otpStore.set(appointmentId, {
      otp,
      expiresAt: now + OTPService.OTP_EXPIRY_MS,
    });

    return otp;
  }

  private verifyOtpMemory(appointmentId: string, otp: string): boolean {
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
