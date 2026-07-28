# Security Configuration Audit Report

**Audit Date:** 2026-07-28
**Scope:** Express server configuration, rate limiting, CORS, error handling, environment variables, Helmet headers, security hardening
**Auditor:** Infrastructure Configuration Auditor (TASK-504)

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 4 |
| LOW | 2 |
| INFO | 3 |

---

## Findings

### 1. Express X-Powered-By Header

| Field | Value |
|-------|-------|
| **Category** | Security Hardening |
| **Severity** | LOW |
| **Current Config** | Not explicitly disabled; Helmet's `hidePoweredBy` middleware removes it as part of `app.use(helmet())` |
| **Risk** | Minimal — Helmet already strips the header. Lack of explicit `app.disable('x-powered-by')` is a defence-in-depth gap. |
| **Fix** | Added `app.disable('x-powered-by')` at `src/server.ts:24` before any middleware. |

### 2. Content-Security-Policy — `upgrade-insecure-requests` in Development

| Field | Value |
|-------|-------|
| **Category** | Security Headers / Development Compatibility |
| **Severity** | LOW |
| **Current Config** | `app.use(helmet())` with default CSP includes `upgrade-insecure-requests` — forces HTTPS upgrades even on `localhost` |
| **Risk** | Safari refuses to load `http://localhost` resources when this directive is active, breaking development workflows. Not a production vulnerability. |
| **Fix** | Added `NODE_ENV`-aware CSP at `src/server.ts:32-38`: `upgrade-insecure-requests` is disabled in development, active in production. |

### 3. Audit Middleware Placement — Not Intercepting Route Responses

| Field | Value |
|-------|-------|
| **Category** | Application Logic / Security Monitoring |
| **Severity** | MEDIUM |
| **Current Config** | `auditMiddleware` placed AFTER `app.use('/api/v1', routes)` at `src/server.ts:81` |
| **Risk** | In Express, middleware defined after route handlers does not execute for matched routes (the route handler sends a response and middleware chain stops). The audit middleware monkey-patches `res.send` to log mutations — this patch was never applied for any route, effectively disabling all mutation audit logging. |
| **Fix** | Moved `app.use(auditMiddleware)` to line 82 (before `routes`) at `src/server.ts:82`. The middleware now patches `res.send` before route handlers execute, and audit logging works for all matching routes. Skipped paths (`/auth`, `/health`) are handled internally. |

### 4. PrismaClientValidationError Message Leak

| Field | Value |
|-------|-------|
| **Category** | Information Leakage |
| **Severity** | MEDIUM |
| **Current Config** | `PrismaClientValidationError` handler returns `error.message` in the `details` field of the error response |
| **Risk** | Prisma validation error messages can contain database schema information (field names, types, constraints) which could aid an attacker in crafting injection attacks or understanding the data model. |
| **Fix** | Removed the `details` field from the response at `src/middleware/error.middleware.ts:29-38`. The handler now returns only `code` and `message` — generic "Invalid data provided". |

### 5. PostgreSQL SSL/TLS Not Configured

| Field | Value |
|-------|-------|
| **Category** | Data-in-Transit Protection |
| **Severity** | MEDIUM |
| **Current Config** | `DATABASE_URL` has no `sslmode` parameter. `PrismaPg` adapter created with plain `connectionString` at `src/config/db.config.ts:16-19` |
| **Risk** | Database traffic between the application server and PostgreSQL is transmitted in plaintext. An attacker with network access (same VPC, compromised host, or MITM position) can intercept all queries and results including user data, credentials, and visa/PII information. |
| **Fix** | Added SSL/TLS detection at `src/config/db.config.ts:17-24`: if `DATABASE_SSL=true` is set or `sslmode=require` exists in `DATABASE_URL`, the adapter appends `sslmode=require` to the connection string. **Note:** Production deployment must either set `DATABASE_SSL=true` environment variable or include `sslmode=require` in the `DATABASE_URL`. |

### 6. JWT Secrets — Placeholder Values

| Field | Value |
|-------|-------|
| **Category** | Secrets Management |
| **Severity** | MEDIUM |
| **Current Config** | `.env` file contains `JWT_ACCESS_SECRET="your-access-secret-here-change-in-production"` and `JWT_REFRESH_SECRET="your-refresh-secret-here-change-in-production"` |
| **Risk** | If the application is deployed without changing these placeholders, JWT tokens can be forged by anyone who reads the `.env` file or the source code. This would allow arbitrary user impersonation and privilege escalation. |
| **Fix** | Generate production secrets using `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` before deployment. Update `.env` or set via deployment environment variables. Note: `.env` is in `.gitignore` so it won't be committed. |

### 7. Permissions-Policy Header Not Set

| Field | Value |
|-------|-------|
| **Category** | Security Headers |
| **Severity** | INFO |
| **Current Config** | Not set. Helmet v8 does not include `Permissions-Policy` by default. |
| **Risk** | Browsers may allow access to device APIs (camera, microphone, geolocation) if other parts of the application or embedded content request them. Low risk for a backend API, but recommended for defence-in-depth. |
| **Fix** | Optional: add `Permissions-Policy: camera=(), microphone=(), geolocation=()` via Helmet's `permissionsPolicy` directive or a separate middleware. Not applied because this is an API backend. |

### 8. Rate Limiting Coverage

| Field | Value |
|-------|-------|
| **Category** | Rate Limiting |
| **Severity** | INFO |
| **Current Config** | General limiter (100/min) applied globally. Auth limiter (20/15min) applied to `/api/v1/auth`. All remaining API routes covered by general limiter. Health check and root endpoints also covered by general limiter. |
| **Risk** | None. All endpoints are rate-limited. The general limiter covers everything, and the auth-specific limiter provides additional protection for authentication endpoints. |
| **Fix** | None needed. |

### 9. Morgan Logging Format

| Field | Value |
|-------|-------|
| **Category** | Logging / Information Leakage |
| **Severity** | INFO |
| **Current Config** | `:correlation-id :remote-addr :method :url :status :res[content-length] - :response-time ms` |
| **Risk** | Safe. No request bodies, headers, query parameters, or session tokens are logged. Only metadata (correlation ID, remote address, method, URL, status, content length, response time). |
| **Fix** | None needed. |

### 10. Helmet Default Headers — Verified

| Field | Value |
|-------|-------|
| **Category** | Security Headers |
| **Severity** | INFO |
| **Current Config** | `app.use(helmet())` with one custom CSP override (see finding #2) |
| **Verification** | Helmet v8 sets the following headers by default (all verified present): |
|
| Header | Default Value |
|--------|--------------|
| `Content-Security-Policy` | `default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |
| `Origin-Agent-Cluster` | `?1` |
| `Referrer-Policy` | `no-referrer` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-DNS-Prefetch-Control` | `off` |
| `X-Download-Options` | `noopen` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Permitted-Cross-Domain-Policies` | `none` |
| `X-Powered-By` | *(removed)* |
| `X-XSS-Protection` | `0` |
|
| **Risk** | None. All 13 Helmet v8 default headers are set. HSTS (`max-age=31536000; includeSubDomains`) is adequate for production. `X-Frame-Options: SAMEORIGIN` and `X-Content-Type-Options: nosniff` are correctly present. `Referrer-Policy: no-referrer` provides strong privacy protection. |
| **Recommendation** | Current bare `helmet()` configuration is sufficient for this API backend. No additional header customization required. |

---

## Changes Applied

| File | Change |
|------|--------|
| `src/server.ts:24` | Added `app.disable('x-powered-by')` — explicit defence-in-depth |
| `src/server.ts:32-38` | Configured Helmet CSP to disable `upgrade-insecure-requests` in development (Safari localhost compat) |
| `src/server.ts:82` | Moved `auditMiddleware` before route mounting — fixes broken audit interception |
| `src/middleware/error.middleware.ts:29-38` | Removed `error.message` from PrismaClientValidationError response — prevents schema info leakage |
| `src/config/db.config.ts:17-24` | Added conditional SSL/TLS support for PostgreSQL via `DATABASE_SSL` env var or `sslmode=require` in connection string |

All changes compile cleanly (`npx tsc --noEmit` passes).
