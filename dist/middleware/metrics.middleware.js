"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsMiddleware = metricsMiddleware;
const metrics_config_1 = require("../config/metrics.config");
function metricsMiddleware(req, res, next) {
    if (req.path === '/metrics') {
        return next();
    }
    metrics_config_1.httpRequestsActiveGauge.inc();
    const end = metrics_config_1.httpRequestDurationHistogram.startTimer();
    res.on('finish', () => {
        const labels = {
            method: req.method,
            route: req.route?.path || '__unknown__',
            status_code: res.statusCode.toString(),
        };
        metrics_config_1.httpRequestCounter.inc(labels);
        end(labels);
        if (res.statusCode >= 500) {
            metrics_config_1.httpRequestErrorsCounter.inc({ method: req.method, route: labels.route });
        }
        metrics_config_1.httpRequestsActiveGauge.dec();
    });
    next();
}
