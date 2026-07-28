import promClient from 'prom-client';

const isTest = process.env.NODE_ENV === 'test';
const metricsEnabled = process.env.METRICS_ENABLED !== 'false';

const register = new promClient.Registry();

if (!isTest && metricsEnabled) {
  promClient.collectDefaultMetrics({ register });
}

const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

const httpRequestDurationHistogram = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

const httpRequestsActiveGauge = new promClient.Gauge({
  name: 'http_requests_active',
  help: 'Number of active HTTP requests',
  registers: [register],
});

const httpRequestErrorsCounter = new promClient.Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors (5xx)',
  labelNames: ['method', 'route'] as const,
  registers: [register],
});

export {
  register,
  httpRequestCounter,
  httpRequestDurationHistogram,
  httpRequestsActiveGauge,
  httpRequestErrorsCounter,
};