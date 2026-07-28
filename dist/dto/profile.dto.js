"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileResponseDto = exports.UpdateProfileDto = exports.CreateProfileDto = void 0;
const validator_1 = __importDefault(require("validator"));
const enums_1 = require("../generated/prisma/enums");
const VALID_GENDERS = Object.values(enums_1.Gender);
function validateField(data, field, rules) {
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
    if (rules.isISO8601 && !validator_1.default.isISO8601(value)) {
        return `${field.charAt(0).toUpperCase() + field.slice(1)} must be a valid ISO date`;
    }
    if (rules.isURL && !validator_1.default.isURL(value)) {
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
class CreateProfileDto {
    static validate(data) {
        const errors = [];
        const genderErr = validateField(data, 'gender', { required: true, enumValues: VALID_GENDERS });
        if (genderErr)
            errors.push(genderErr);
        const dobErr = validateField(data, 'dateOfBirth', { isISO8601: true });
        if (dobErr)
            errors.push(dobErr);
        const avatarErr = validateField(data, 'avatar', { isURL: true });
        if (avatarErr)
            errors.push(avatarErr);
        const bioErr = validateField(data, 'bio', { maxLength: 500 });
        if (bioErr)
            errors.push(bioErr);
        const cityErr = validateField(data, 'city', { maxLength: 100 });
        if (cityErr)
            errors.push(cityErr);
        const stateErr = validateField(data, 'state', { maxLength: 100 });
        if (stateErr)
            errors.push(stateErr);
        const countryErr = validateField(data, 'country', { maxLength: 100 });
        if (countryErr)
            errors.push(countryErr);
        const postalErr = validateField(data, 'postalCode', { maxLength: 20 });
        if (postalErr)
            errors.push(postalErr);
        return errors;
    }
    static sanitize(data) {
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
exports.CreateProfileDto = CreateProfileDto;
class UpdateProfileDto {
    static validate(data) {
        const errors = [];
        const genderErr = validateField(data, 'gender', { enumValues: VALID_GENDERS });
        if (genderErr)
            errors.push(genderErr);
        const dobErr = validateField(data, 'dateOfBirth', { isISO8601: true });
        if (dobErr)
            errors.push(dobErr);
        const avatarErr = validateField(data, 'avatar', { isURL: true });
        if (avatarErr)
            errors.push(avatarErr);
        const bioErr = validateField(data, 'bio', { maxLength: 500 });
        if (bioErr)
            errors.push(bioErr);
        const cityErr = validateField(data, 'city', { maxLength: 100 });
        if (cityErr)
            errors.push(cityErr);
        const stateErr = validateField(data, 'state', { maxLength: 100 });
        if (stateErr)
            errors.push(stateErr);
        const countryErr = validateField(data, 'country', { maxLength: 100 });
        if (countryErr)
            errors.push(countryErr);
        const postalErr = validateField(data, 'postalCode', { maxLength: 20 });
        if (postalErr)
            errors.push(postalErr);
        return errors;
    }
    static sanitize(data) {
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
exports.UpdateProfileDto = UpdateProfileDto;
class ProfileResponseDto {
}
exports.ProfileResponseDto = ProfileResponseDto;
