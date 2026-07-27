import validator from 'validator';
import { Gender } from '../generated/prisma/enums';

const VALID_GENDERS = Object.values(Gender);

interface FieldRules {
  required?: boolean;
  maxLength?: number;
  isURL?: boolean;
  isISO8601?: boolean;
  enumValues?: string[];
}

function validateField(data: any, field: string, rules: FieldRules): string | null {
  const value = data[field];

  if (rules.required) {
    if (!value || typeof value !== 'string') {
      return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    }
  }

  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    return `${field.charAt(0).toUpperCase() + field.slice(1)} must be a string`;
  }

  if (rules.isISO8601 && !validator.isISO8601(value)) {
    return `${field.charAt(0).toUpperCase() + field.slice(1)} must be a valid ISO date`;
  }
  if (rules.isURL && !validator.isURL(value)) {
    return `${field.charAt(0).toUpperCase() + field.slice(1)} must be a valid URL`;
  }
  if (rules.enumValues && !rules.enumValues.includes(value)) {
    return `${field.charAt(0).toUpperCase() + field.slice(1)} must be one of: ${rules.enumValues.join(', ')}`;
  }
  if (rules.maxLength && value.trim().length > rules.maxLength) {
    return `${field.charAt(0).toUpperCase() + field.slice(1)} must not exceed ${rules.maxLength} characters`;
  }

  return null;
}

export class CreateProfileDto {
  gender!: string;
  dateOfBirth?: string;
  avatar?: string;
  bio?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    const genderErr = validateField(data, 'gender', { required: true, enumValues: VALID_GENDERS });
    if (genderErr) errors.push(genderErr);

    const dobErr = validateField(data, 'dateOfBirth', { isISO8601: true });
    if (dobErr) errors.push(dobErr);

    const avatarErr = validateField(data, 'avatar', { isURL: true });
    if (avatarErr) errors.push(avatarErr);

    const bioErr = validateField(data, 'bio', { maxLength: 500 });
    if (bioErr) errors.push(bioErr);

    const cityErr = validateField(data, 'city', { maxLength: 100 });
    if (cityErr) errors.push(cityErr);

    const stateErr = validateField(data, 'state', { maxLength: 100 });
    if (stateErr) errors.push(stateErr);

    const countryErr = validateField(data, 'country', { maxLength: 100 });
    if (countryErr) errors.push(countryErr);

    const postalErr = validateField(data, 'postalCode', { maxLength: 20 });
    if (postalErr) errors.push(postalErr);

    return errors;
  }

  static sanitize(data: any): CreateProfileDto {
    const dto = new CreateProfileDto();
    dto.gender = data.gender;
    dto.dateOfBirth = data.dateOfBirth;
    dto.avatar = data.avatar?.trim();
    dto.bio = data.bio?.trim();
    dto.city = data.city?.trim();
    dto.state = data.state?.trim();
    dto.country = data.country?.trim();
    dto.postalCode = data.postalCode?.trim();
    return dto;
  }
}

export class UpdateProfileDto {
  gender?: string;
  dateOfBirth?: string;
  avatar?: string;
  bio?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;

  static validate(data: any): string[] {
    const errors: string[] = [];

    const genderErr = validateField(data, 'gender', { enumValues: VALID_GENDERS });
    if (genderErr) errors.push(genderErr);

    const dobErr = validateField(data, 'dateOfBirth', { isISO8601: true });
    if (dobErr) errors.push(dobErr);

    const avatarErr = validateField(data, 'avatar', { isURL: true });
    if (avatarErr) errors.push(avatarErr);

    const bioErr = validateField(data, 'bio', { maxLength: 500 });
    if (bioErr) errors.push(bioErr);

    const cityErr = validateField(data, 'city', { maxLength: 100 });
    if (cityErr) errors.push(cityErr);

    const stateErr = validateField(data, 'state', { maxLength: 100 });
    if (stateErr) errors.push(stateErr);

    const countryErr = validateField(data, 'country', { maxLength: 100 });
    if (countryErr) errors.push(countryErr);

    const postalErr = validateField(data, 'postalCode', { maxLength: 20 });
    if (postalErr) errors.push(postalErr);

    return errors;
  }

  static sanitize(data: any): UpdateProfileDto {
    const dto = new UpdateProfileDto();
    dto.gender = data.gender;
    dto.dateOfBirth = data.dateOfBirth;
    dto.avatar = data.avatar?.trim();
    dto.bio = data.bio?.trim();
    dto.city = data.city?.trim();
    dto.state = data.state?.trim();
    dto.country = data.country?.trim();
    dto.postalCode = data.postalCode?.trim();
    return dto;
  }
}

export class ProfileResponseDto {
  id!: string;
  gender!: string;
  dateOfBirth?: Date | null;
  avatar?: string | null;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}