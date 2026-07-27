import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.config';
import { AuditService } from '../services/audit.service';

const auditService = new AuditService(prisma);

export const auditMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!mutatingMethods.includes(req.method)) {
    return next();
  }

  const skipPaths = ['/auth', '/health'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  const entity = extractEntityFromPath(req.path);
  const entityId = extractEntityIdFromParams(req);
  const action = extractActionFromMethod(req.method);

  let oldValues: any = undefined;
  if ((req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') && entityId && entityId !== 'unknown') {
    try {
      oldValues = await fetchOldValues(req, entity, entityId);
    } catch {
      // Best-effort old value capture
    }
  }

  const originalSend = res.send;

  res.send = function (body?: any): Response {
    const isSuccess = res.statusCode >= 200 && res.statusCode < 400;

    if (isSuccess && req.user) {
      let responseData;
      try {
        responseData = typeof body === 'string' ? JSON.parse(body) : body;
      } catch {
        responseData = body;
      }

      const resolvedEntityId = extractEntityId(req, responseData) || entityId;
      const metaData: any = {
        method: req.method,
        path: req.path,
        query: req.query,
        body: sanitizeBody(req.body),
        correlationId: req.correlationId || res.locals.correlationId,
      };

      auditService.log({
        userId: req.user.userId,
        action,
        entity,
        entityId: resolvedEntityId,
        description: `${action} ${entity}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metaData,
        oldValues,
        newValues: action === 'DELETE' ? undefined : sanitizeBody(req.body),
      }).catch(console.error);
    }

    return originalSend.call(this, body);
  };

  next();
};

function extractEntityFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  const apiIndex = segments.findIndex(s => s === 'api' || s === 'v1');
  const entitySegment = segments[apiIndex + 1] || 'Unknown';
  const singular = entitySegment.replace(/s$/, '');
  return singular.charAt(0).toUpperCase() + singular.slice(1);
}

function extractActionFromMethod(method: string): string {
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

function extractEntityIdFromParams(req: Request): string {
  const getParam = (name: string): string | undefined => {
    const val = req.params[name];
    return Array.isArray(val) ? val[0] : val;
  };

  if (getParam('id')) return getParam('id')!;
  if (getParam('userId')) return getParam('userId')!;
  if (getParam('roleId')) return getParam('roleId')!;
  if (getParam('permissionId')) return getParam('permissionId')!;

  return 'unknown';
}

function extractEntityId(req: Request, responseData: any): string {
  const fromParams = extractEntityIdFromParams(req);
  if (fromParams !== 'unknown') return fromParams;

  if (responseData?.data?.userid) return responseData.data.userid;
  if (responseData?.data?.id) return responseData.data.id;

  return 'unknown';
}

async function fetchOldValues(req: Request, entity: string, entityId: string): Promise<any> {
  const modelMap: Record<string, string> = {
    User: 'user',
    Role: 'role',
    Permission: 'permission',
  };

  const modelName = modelMap[entity];
  if (!modelName) return undefined;

  const record = await (prisma as any)[modelName].findUnique({
    where: { id: entityId },
  });

  if (!record) {
    const altRecord = await (prisma as any)[modelName].findUnique({
      where: { userid: entityId },
    });
    return altRecord ? sanitizeBody(altRecord) : undefined;
  }

  return sanitizeBody(record);
}

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'passwordHash', 'token', 'refreshToken', 'accessToken', 'secret'];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}