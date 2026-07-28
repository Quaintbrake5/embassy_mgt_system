"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpRequestErrorsCounter = exports.httpRequestsActiveGauge = exports.httpRequestDurationHistogram = exports.httpRequestCounter = exports.register = void 0;
const prom_client_1 = __importDefault(require("prom-client"));
const isTest = process.env.NODE_ENV === 'test';
const metricsEnabled = process.env.METRICS_ENABLED !== 'false';
const register = new prom_client_1.default.Registry();
exports.register = register;
if (!isTest && metricsEnabled) {
    prom_client_1.default.collectDefaultMetrics({ register });
}
const httpRequestCounter = new prom_client_1.default.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});
exports.httpRequestCounter = httpRequestCounter;
const httpRequestDurationHistogram = new prom_client_1.default.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [register],
});
exports.httpRequestDurationHistogram = httpRequestDurationHistogram;
const httpRequestsActiveGauge = new prom_client_1.default.Gauge({
    name: 'http_requests_active',
    help: 'Number of active HTTP requests',
    registers: [register],
});
exports.httpRequestsActiveGauge = httpRequestsActiveGauge;
const httpRequestErrorsCounter = new prom_client_1.default.Counter({
    name: 'http_request_errors_total',
    help: 'Total number of HTTP request errors (5xx)',
    labelNames: ['method', 'route'],
    registers: [register],
});
exports.httpRequestErrorsCounter = httpRequestErrorsCounter;
