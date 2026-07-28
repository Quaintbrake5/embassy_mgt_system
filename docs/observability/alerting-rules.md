# Alerting Rules

## Overview

Alerting rules for Embassy Management System. Prometheus-compatible alert expressions for production deployment.

## Metric Endpoint

`GET /metrics` — Prometheus metrics served at port `PORT` (default 3010). Protected by the general rate limiter.

## Available Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | Counter | method, route, status_code | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | method, route, status_code | Request duration buckets |
| `http_requests_active` | Gauge | — | In-flight requests |
| `http_request_errors_total` | Counter | method, route | 5xx error count |
| Default Node.js metrics | Various | — | CPU, memory, event loop, GC via `prom-client` |

## Alerting Rules

### High Error Rate

```yaml
alert: HighErrorRate
expr: rate(http_request_errors_total[5m]) / rate(http_requests_total[5m]) > 0.05
for: 5m
labels:
  severity: critical
annotations:
  summary: "Error rate > 5% over 5 minutes"
  description: "API error rate is {{ $value | humanizePercentage }} in the last 5m"
```

### High Latency

```yaml
alert: HighLatency
expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
for: 5m
labels:
  severity: warning
annotations:
  summary: "p95 latency > 1s"
  description: "p95 request latency is {{ $value }}s over the last 5m"
```

### Elevated Active Requests

```yaml
alert: ElevatedActiveRequests
expr: http_requests_active > 50
for: 1m
labels:
  severity: warning
annotations:
  summary: "Active requests > 50"
  description: "There are {{ $value }} active requests"
```

### Too Many 429s (Rate-Limit Saturation)

```yaml
alert: RateLimitSaturation
expr: rate(http_requests_total{status_code="429"}[5m]) > 10
for: 5m
labels:
  severity: warning
annotations:
  summary: "High rate-limit rejection rate"
  description: "{{ $value }} req/s are being rate-limited"
```

### Service Down

```yaml
alert: ServiceDown
expr: up{job="embassy-mgt-system"} == 0
for: 1m
labels:
  severity: critical
annotations:
  summary: "EMS API is down"
  description: "The EMS API has been unreachable for 1 minute"
```

## Runbook Links

- **High Error Rate**: Check `error.log` for stack traces. Query recent 5xx routes via `http_request_errors_total`.
- **High Latency**: Check for slow DB queries (`pg_stat_activity`), N+1 issues in Prisma.
- **Service Down**: Check container health, DB connectivity, port availability.

## Log-based Alerting (Grafana Loki / ELK)

If shipping logs to a log aggregation system, create alerts on:

| Condition | Log Query | Severity |
|-----------|-----------|----------|
| Repeated DB connection failures | `"Database error"` AND rate > 0 in 5m | critical |
| JWT auth failures burst | `status=401` AND rate > 20 in 1m | warning |
| Audit log write failures | `"Audit log write failed"` | warning |
| Unhandled exceptions | `"Unhandled error"` | critical |