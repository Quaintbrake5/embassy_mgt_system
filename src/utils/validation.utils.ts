import { ValidationError } from '../exceptions/ValidationError';
import validator from 'validator';

export const validateEmail = (email: string): boolean => {
  return validator.isEmail(email);
};

export const validatePassword = (password: string): boolean => {
  return validator.isStrongPassword(password, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  });
};

export const sanitizeString = (input: string): string => {
  return validator.escape(input.trim());
};

export const validatePhone = (phone: string): boolean => {
  return validator.isMobilePhone(phone, 'any', { strictMode: false });
};

export const validateUUID = (uuid: string): boolean => {
  return validator.isUUID(uuid);
};

export const validateRegisterInput = (data: any): string[] => {
  const errors: string[] = [];

  if (!data.firstName || !validator.isLength(data.firstName, { min: 1, max: 100 })) {
    errors.push('First name is required (max 100 characters)');
  }

  if (!data.lastName || !validator.isLength(data.lastName, { min: 1, max: 100 })) {
    errors.push('Last name is required (max 100 characters)');
  }

  if (!data.email || !validateEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.password || !validatePassword(data.password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, number, and symbol');
  }

  if (data.phone && !validatePhone(data.phone)) {
    errors.push('Invalid phone number format');
  }

  return errors;
};

export const validateLoginInput = (data: any): string[] => {
  const errors: string[] = [];

  if (!data.email || !validateEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.password) {
    errors.push('Password is required');
  }

  return errors;
};

export const validateChangePasswordInput = (data: any): string[] => {
  const errors: string[] = [];

  if (!data.currentPassword) {
    errors.push('Current password is required');
  }

  if (!data.newPassword || !validatePassword(data.newPassword)) {
    errors.push('New password must be at least 8 characters with uppercase, lowercase, number, and symbol');
  }

  return errors;
};