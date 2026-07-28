import { Request, Response, NextFunction } from 'express';
import {
  httpRequestCounter,
  httpRequestDurationHistogram,
  httpRequestsActiveGauge,
  httpRequestErrorsCounter,
} from '../config/metrics.config';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/metrics') {
    return next();
  }

  httpRequestsActiveGauge.inc();

  const end = httpRequestDurationHistogram.startTimer();

  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: req.route?.path || '__unknown__',
      status_code: res.statusCode.toString(),
    };

    httpRequestCounter.inc(labels);
    end(labels);

    if (res.statusCode >= 500) {
      httpRequestErrorsCounter.inc({ method: req.method, route: labels.route });
    }

    httpRequestsActiveGauge.dec();
  });

  next();
}