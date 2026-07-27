import crypto from 'crypto';

export const generateToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

export const generateOTP = (length: number = 6): string => {
  return crypto.randomInt(10 ** (length - 1), 10 ** length).toString();
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const constantTimeCompare = (a: string, b: string): boolean => {
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};