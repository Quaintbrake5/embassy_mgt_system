"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserPermissions = exports.requireAllPermissions = exports.requireAnyPermission = exports.requireRole = exports.requirePermission = void 0;
const db_config_1 = require("../config/db.config");
/**
 * RBAC Middleware factory
 * Checks if user has required permission
 */
const requirePermission = (permission) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Authentication required',
                    },
                });
                return;
            }
            const userId = req.user.userId;
            // Get user's effective permissions
            const user = await db_config_1.prisma.user.findUnique({
                where: { userid: userId },
                include: {
                    role: {
                        include: {
                            rolePermissions: {
                                include: {
                                    permission: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!user || !user.role) {
                res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'User has no role assigned',
                    },
                });
                return;
            }
            // Check if user has the required permission
            const hasPermission = user.role.rolePermissions.some((rp) => rp.permission.slug === permission);
            if (!hasPermission) {
                res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: `Permission required: ${permission}`,
                    },
                });
                return;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requirePermission = requirePermission;
const requireRole = (roleSlug) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Authentication required',
                    },
                });
                return;
            }
            const user = await db_config_1.prisma.user.findUnique({
                where: { userid: req.user.userId },
                include: {
                    role: true,
                },
            });
            if (!user || !user.role) {
                res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'User has no role assigned',
                    },
                });
                return;
            }
            if (user.role.slug !== roleSlug) {
                res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: `Role required: ${roleSlug}`,
                    },
                });
                return;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireRole = requireRole;
const requireAnyPermission = (permissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Authentication required',
                    },
                });
                return;
            }
            const user = await db_config_1.prisma.user.findUnique({
                where: { userid: req.user.userId },
                include: {
                    role: {
                        include: {
                            rolePermissions: {
                                include: {
                                    permission: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!user || !user.role) {
                res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'User has no role assigned',
                    },
                });
                return;
            }
            const userPermissions = user.role.rolePermissions.map((rp) => rp.permission.slug);
            const hasAnyPermission = permissions.some((p) => userPermissions.includes(p));
            if (!hasAnyPermission) {
                res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: `One of these permissions required: ${permissions.join(', ')}`,
                    },
                });
                return;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireAnyPermission = requireAnyPermission;
const requireAllPermissions = (permissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Authentication required',
                    },
                });
                return;
            }
            const user = await db_config_1.prisma.user.findUnique({
                where: { userid: req.user.userId },
                include: {
                    role: {
                        include: {
                            rolePermissions: {
                                include: {
                                    permission: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!user || !user.role) {
                res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'User has no role assigned',
                    },
                });
                return;
            }
            const userPermissions = user.role.rolePermissions.map((rp) => rp.permission.slug);
            const hasAllPermissions = permissions.every((p) => userPermissions.includes(p));
            if (!hasAllPermissions) {
                res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: `All permissions required: ${permissions.join(', ')}`,
                    },
                });
                return;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireAllPermissions = requireAllPermissions;
/**
 * Utility to get user's effective permissions
 */
const getUserPermissions = async (userId) => {
    const user = await db_config_1.prisma.user.findUnique({
        where: { userid: userId },
        include: {
            role: {
                include: {
                    rolePermissions: {
                        include: {
                            permission: true,
                        },
                    },
                },
            },
        },
    });
    if (!user || !user.role) {
        return [];
    }
    return user.role.rolePermissions.map((rp) => rp.permission.slug);
};
exports.getUserPermissions = getUserPermissions;
