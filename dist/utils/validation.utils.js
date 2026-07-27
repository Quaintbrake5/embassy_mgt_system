"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateChangePasswordInput = exports.validateLoginInput = exports.validateRegisterInput = exports.validateUUID = exports.validatePhone = exports.sanitizeString = exports.validatePassword = exports.validateEmail = void 0;
const validator_1 = __importDefault(require("validator"));
const validateEmail = (email) => {
    return validator_1.default.isEmail(email);
};
exports.validateEmail = validateEmail;
const validatePassword = (password) => {
    return validator_1.default.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    });
};
exports.validatePassword = validatePassword;
const sanitizeString = (input) => {
    return validator_1.default.escape(input.trim());
};
exports.sanitizeString = sanitizeString;
const validatePhone = (phone) => {
    return validator_1.default.isMobilePhone(phone, 'any', { strictMode: false });
};
exports.validatePhone = validatePhone;
const validateUUID = (uuid) => {
    return validator_1.default.isUUID(uuid);
};
exports.validateUUID = validateUUID;
const validateRegisterInput = (data) => {
    const errors = [];
    if (!data.firstName || !validator_1.default.isLength(data.firstName, { min: 1, max: 100 })) {
        errors.push('First name is required (max 100 characters)');
    }
    if (!data.lastName || !validator_1.default.isLength(data.lastName, { min: 1, max: 100 })) {
        errors.push('Last name is required (max 100 characters)');
    }
    if (!data.email || !(0, exports.validateEmail)(data.email)) {
        errors.push('Valid email is required');
    }
    if (!data.password || !(0, exports.validatePassword)(data.password)) {
        errors.push('Password must be at least 8 characters with uppercase, lowercase, number, and symbol');
    }
    if (data.phone && !(0, exports.validatePhone)(data.phone)) {
        errors.push('Invalid phone number format');
    }
    return errors;
};
exports.validateRegisterInput = validateRegisterInput;
const validateLoginInput = (data) => {
    const errors = [];
    if (!data.email || !(0, exports.validateEmail)(data.email)) {
        errors.push('Valid email is required');
    }
    if (!data.password) {
        errors.push('Password is required');
    }
    return errors;
};
exports.validateLoginInput = validateLoginInput;
const validateChangePasswordInput = (data) => {
    const errors = [];
    if (!data.currentPassword) {
        errors.push('Current password is required');
    }
    if (!data.newPassword || !(0, exports.validatePassword)(data.newPassword)) {
        errors.push('New password must be at least 8 characters with uppercase, lowercase, number, and symbol');
    }
    return errors;
};
exports.validateChangePasswordInput = validateChangePasswordInput;
