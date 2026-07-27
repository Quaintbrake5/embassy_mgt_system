"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditMiddleware = void 0;
const db_config_1 = require("../config/db.config");
/**
 * Audit logging middleware
 * Automatically logs CREATE, UPDATE, DELETE operations
 */
const auditMiddleware = async (req, res, next) => {
    // Only audit mutating methods
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!mutatingMethods.includes(req.method)) {
        return next();
    }
    // Skip audit for certain paths
    const skipPaths = ['/auth', '/health'];
    if (skipPaths.some(path => req.path.startsWith(path))) {
        return next();
    }
    // Store original send method
    const originalSend = res.send;
    // Override send to capture response
    res.send = function (body) {
        // Only log on successful responses
        const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
        const isMutating = mutatingMethods.includes(req.method);
        if (isSuccess && isMutating && req.user) {
            // Parse response body
            let responseData;
            try {
                responseData = typeof body === 'string' ? JSON.parse(body) : body;
            }
            catch {
                responseData = body;
            }
            // Extract entity info from route
            const entity = extractEntityFromPath(req.path);
            const action = extractActionFromMethod(req.method);
            // Log asynchronously (don't block response)
            logAudit({
                userId: req.user.userId,
                action,
                entity,
                entityId: extractEntityId(req, responseData),
                description: `${action} ${entity}`,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                metaData: {
                    method: req.method,
                    path: req.path,
                    query: req.query,
                    body: sanitizeBody(req.body),
                },
            }).catch(console.error);
        }
        // Call original send
        return originalSend.call(this, body);
    };
    next();
};
exports.auditMiddleware = auditMiddleware;
/**
 * Extract entity name from request path
 * e.g., /api/v1/users/123 -> User
 */
function extractEntityFromPath(path) {
    const segments = path.split('/').filter(Boolean);
    const apiIndex = segments.findIndex(s => s === 'api' || s === 'v1');
    const entitySegment = segments[apiIndex + 1] || 'Unknown';
    // Convert to singular PascalCase
    const singular = entitySegment.replace(/s$/, '');
    return singular.charAt(0).toUpperCase() + singular.slice(1);
}
/**
 * Extract action from HTTP method
 */
function extractActionFromMethod(method) {
    switch (method) {
        case 'POST':
            return 'CREATE';
        case 'PUT':
        case 'PATCH':
            return 'UPDATE';
        case 'DELETE':
            return 'DELETE';
        default:
            return method;
    }
}
/**
 * Extract entity ID from request/response
 */
function extractEntityId(req, responseData) {
    // From route params - handle Express param types
    const getParam = (name) => {
        const val = req.params[name];
        return Array.isArray(val) ? val[0] : val;
    };
    if (getParam('id'))
        return getParam('id');
    if (getParam('userId'))
        return getParam('userId');
    if (getParam('roleId'))
        return getParam('roleId');
    if (getParam('permissionId'))
        return getParam('permissionId');
    // From response data
    if (responseData?.data?.userid)
        return responseData.data.userid;
    if (responseData?.data?.id)
        return responseData.data.id;
    return 'unknown';
}
/**
 * Sanitize request body for logging (remove sensitive fields)
 */
function sanitizeBody(body) {
    if (!body || typeof body !== 'object')
        return body;
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'passwordHash', 'token', 'refreshToken', 'accessToken', 'secret'];
    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }
    return sanitized;
}
/**
 * Log audit entry
 */
async function logAudit(data) {
    await db_config_1.prisma.auditLog.create({
        data: {
            userId: data.userId,
            action: data.action,
            entity: data.entity,
            entityId: data.entityId,
            description: data.description,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            metaData: data.metaData,
        },
    });
}
