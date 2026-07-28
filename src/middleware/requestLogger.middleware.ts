import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger.config';

const SENSITIVE_QUERY_PARAMS = ['token', 'password', 'secret', 'key', 'access_token', 'refresh_token', 'api_key'];

function sanitizeQuery(url: string): string {
  try {
    const urlObj = new URL(url, 'http://localhost');
    SENSITIVE_QUERY_PARAMS.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    });
    return urlObj.pathname + urlObj.search;
  } catch {
    return url;
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;

    const rawUrl = req.originalUrl || req.url;
    const sanitizedUrl = sanitizeQuery(rawUrl);

    const logData: Record<string, unknown> = {
      method: req.method,
      url: sanitizedUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      contentLength: res.getHeader('content-length') || 0,
      correlationId: req.correlationId || res.locals.correlationId || '-',
      userAgent: req.get('user-agent') || '-',
      remoteAddr: req.ip || req.socket.remoteAddress || '-',
      userId: req.user?.userId,
    };

    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger.log(level, `${req.method} ${sanitizedUrl} ${res.statusCode}`, logData);
  });

  next();
}