"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthMiddleware = exports.authMiddleware = void 0;
const db_config_1 = require("../config/db.config");
/**
 * Authentication middleware
 * Verifies JWT access token and attaches user to request
 */
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'No token provided',
                },
            });
            return;
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Invalid token format',
                },
            });
            return;
        }
        // Import jwt utilities dynamically to avoid circular dependency
        const { verifyAccessToken } = await Promise.resolve().then(() => __importStar(require('../utils/jwt.utilities')));
        const payload = verifyAccessToken(token);
        // Check if user exists and is active
        const user = await db_config_1.prisma.user.findUnique({
            where: { userid: payload.userId },
            select: { userid: true, status: true, roleId: true, email: true },
        });
        if (!user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not found',
                },
            });
            return;
        }
        if (user.status !== 'ACTIVE') {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Account is not active',
                },
            });
            return;
        }
        // Attach user to request
        req.user = {
            userId: user.userid,
            email: user.email,
            roleId: user.roleId ?? undefined,
        };
        next();
    }
    catch (error) {
        if (error.name === 'JsonWebTokenError') {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Invalid token',
                },
            });
            return;
        }
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({
                success: false,
                error: {
                    code: 'TOKEN_EXPIRED',
                    message: 'Token expired',
                },
            });
            return;
        }
        next(error);
    }
};
exports.authMiddleware = authMiddleware;
/**
 * Optional authentication middleware
 * Attaches user if valid token provided, otherwise continues without user
 */
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            next();
            return;
        }
        const { verifyAccessToken } = await Promise.resolve().then(() => __importStar(require('../utils/jwt.utilities')));
        const payload = verifyAccessToken(token);
        const user = await db_config_1.prisma.user.findUnique({
            where: { userid: payload.userId },
            select: { userid: true, status: true, roleId: true, email: true },
        });
        if (user && user.status === 'ACTIVE') {
            req.user = {
                userId: user.userid,
                email: user.email,
                roleId: user.roleId ?? undefined,
            };
        }
        next();
    }
    catch {
        // Ignore auth errors for optional auth
        next();
    }
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
