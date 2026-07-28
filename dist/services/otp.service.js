"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTPService = void 0;
const crypto_1 = require("crypto");
class OTPService {
    constructor(redisClient) {
        this.otpStore = new Map();
        this.rateLimitStore = new Map();
        this.verifyRateLimitStore = new Map();
        this.redis = redisClient || null;
    }
    redisAvailable() {
        return this.redis !== null && this.redis.status === 'ready';
    }
    cleanupExpired() {
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
    async generateOtp(appointmentId) {
        if (this.redisAvailable()) {
            return this.generateOtpRedis(appointmentId);
        }
        return this.generateOtpMemory(appointmentId);
    }
    async verifyOtp(appointmentId, otp) {
        if (this.redisAvailable()) {
            return this.verifyOtpRedis(appointmentId, otp);
        }
        return this.verifyOtpMemory(appointmentId, otp);
    }
    async generateOtpRedis(appointmentId) {
        const rateKey = `otp:rate:${appointmentId}`;
        const count = await this.redis.eval(OTPService.RATE_INCR_SCRIPT, 1, rateKey, OTPService.RATE_LIMIT_WINDOW_MS / 1000);
        if (count > OTPService.RATE_LIMIT_MAX) {
            throw new Error('Rate limit exceeded. Maximum 3 OTP generations per hour.');
        }
        const otp = (0, crypto_1.randomInt)(100000, 999999).toString();
        await this.redis.setex(`otp:${appointmentId}`, OTPService.OTP_EXPIRY_MS / 1000, otp);
        return otp;
    }
    async verifyOtpRedis(appointmentId, otp) {
        const verifyKey = `otp:verify:${appointmentId}`;
        const verifyCount = await this.redis.eval(OTPService.RATE_INCR_SCRIPT, 1, verifyKey, OTPService.VERIFY_RATE_LIMIT_WINDOW_MS / 1000);
        if (verifyCount > OTPService.VERIFY_RATE_LIMIT_MAX) {
            return false;
        }
        const storedOtp = await this.redis.get(`otp:${appointmentId}`);
        if (!storedOtp || storedOtp !== otp) {
            return false;
        }
        await this.redis.del(`otp:${appointmentId}`);
        return true;
    }
    async generateOtpMemory(appointmentId) {
        this.cleanupExpired();
        const now = Date.now();
        const rateEntry = this.rateLimitStore.get(appointmentId);
        if (rateEntry) {
            if (rateEntry.firstRequest + OTPService.RATE_LIMIT_WINDOW_MS > now) {
                if (rateEntry.count >= OTPService.RATE_LIMIT_MAX) {
                    throw new Error('Rate limit exceeded. Maximum 3 OTP generations per hour.');
                }
                rateEntry.count++;
            }
            else {
                this.rateLimitStore.set(appointmentId, { count: 1, firstRequest: now });
            }
        }
        else {
            this.rateLimitStore.set(appointmentId, { count: 1, firstRequest: now });
        }
        const otp = (0, crypto_1.randomInt)(100000, 999999).toString();
        this.otpStore.set(appointmentId, {
            otp,
            expiresAt: now + OTPService.OTP_EXPIRY_MS,
        });
        return otp;
    }
    verifyOtpMemory(appointmentId, otp) {
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
            }
            else {
                this.verifyRateLimitStore.set(verifyKey, { count: 1, firstRequest: now });
            }
        }
        else {
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
exports.OTPService = OTPService;
OTPService.OTP_EXPIRY_MS = 5 * 60 * 1000;
OTPService.RATE_LIMIT_MAX = 3;
OTPService.RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
OTPService.VERIFY_RATE_LIMIT_MAX = 5;
OTPService.VERIFY_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
OTPService.RATE_INCR_SCRIPT = `
    local c = redis.call("INCR", KEYS[1])
    if c == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
    return c
  `;
