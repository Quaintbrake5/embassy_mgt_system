"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticatedUserMiddleware = exports.optionalAuthMiddleware = exports.authMiddleware = void 0;
const db_config_1 = require("../config/db.config");
const jwt_utilities_1 = require("../utils/jwt.utilities");
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
        const payload = (0, jwt_utilities_1.verifyAccessToken)(token);
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
        const payload = (0, jwt_utilities_1.verifyAccessToken)(token);
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
/**
 * Authenticated user middleware
 * Verifies JWT access token and attaches user to request.
 * Unlike authMiddleware, it does NOT require ACTIVE status.
 * Allows PENDING users to access endpoints like send-verification.
 */
const authenticatedUserMiddleware = async (req, res, next) => {
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
        const payload = (0, jwt_utilities_1.verifyAccessToken)(token);
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
        req.user = {
            userId: user.userid,
            email: user.email,
            roleId: user.roleId ?? undefined,
        };
        next();
    }
    catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Invalid or expired token',
                },
            });
            return;
        }
        next(error);
    }
};
exports.authenticatedUserMiddleware = authenticatedUserMiddleware;
