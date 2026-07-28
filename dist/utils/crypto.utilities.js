"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.constantTimeCompare = exports.hashToken = exports.generateOTP = exports.generateToken = void 0;
const crypto_1 = __importDefault(require("crypto"));
const generateToken = (length = 32) => {
    return crypto_1.default.randomBytes(length).toString('hex');
};
exports.generateToken = generateToken;
const generateOTP = (length = 6) => {
    return crypto_1.default.randomInt(10 ** (length - 1), 10 ** length).toString();
};
exports.generateOTP = generateOTP;
const hashToken = (token) => {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
};
exports.hashToken = hashToken;
const constantTimeCompare = (a, b) => {
    if (a.length !== b.length) {
        return false;
    }
    return crypto_1.default.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};
exports.constantTimeCompare = constantTimeCompare;
