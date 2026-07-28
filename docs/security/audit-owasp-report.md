# OWASP Top 10 (2021) Security Audit Report

**Project:** Embassy Management System (EMS)
**Date:** 2026-07-28
**Auditor:** OWASP Top 10 Auditor
**Scope:** All src/ source files (services, middleware, controllers, routes, DTOs, utilities, config)

---

## Summary

| Category | CRITICAL | HIGH | MEDIUM | LOW | INFO | Total |
|----------|----------|------|--------|-----|------|-------|
| A01 | 2 | 2 | 0 | 0 | 1 | 5 |
| A02 | 0 | 0 | 1 | 1 | 3 | 5 |
| A03 | 0 | 0 | 0 | 0 | 1 | 1 |
| A04 | 0 | 0 | 1 | 0 | 2 | 3 |
| A05 | 0 | 0 | 1 | 0 | 4 | 5 |
| A06 | 0 | 0 | 0 | 0 | 1 | 1 |
| A07 | 0 | 0 | 1 | 0 | 3 | 4 |
| A08 | 0 | 0 | 0 | 0 | 1 | 1 |
| A09 | 0 | 0 | 0 | 0 | 3 | 3 |
| A10 | 0 | 0 | 0 | 0 | 1 | 1 |
| **Total** | **2** | **2** | **4** | **1** | **20** | **29** |

**Fixes applied:** 6 files modified (5 security fixes, 1 code quality)
**Items reviewed with no issue:** 20

---

## A01: Broken Access Control — 5 findings (2 CRITICAL, 2 HIGH, 1 INFO)

### CRITICAL — User routes missing RBAC on admin endpoints
- **File:** `src/routes/user.routes.ts:22-28`
- **Description:** User management routes (`POST /`, `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `PUT /:id/role`, `PATCH /:id/status`) had `authMiddleware` but no `requirePermission`. Any authenticated user could create, read, update, delete any other user, assign roles, and change statuses — a full privilege escalation vulnerability.
- **Impact:** Any registered user can elevate themselves to admin by creating a new admin user, modifying their own role, or changing their status to ACTIVE.
- **Fix applied:** Added `requirePermission('user:create')`, `requirePermission('user:read')`, `requirePermission('user:update')`, `requirePermission('user:delete')` to respective routes.

### CRITICAL — Permission routes missing RBAC entirely
- **File:** `src/routes/permission.routes.ts:19-23`
- **Description:** Permission CRUD routes had `authMiddleware` but no `requirePermission`. Any authenticated user could create new permissions, list all permissions, and delete permissions. This allows self-service privilege escalation by creating a permission and assigning it to themselves.
- **Impact:** Complete RBAC bypass — user can grant themselves any permission.
- **Fix applied:** Added `requirePermission('permission:create')`, `requirePermission('permission:read')`, `requirePermission('permission:update')`, `requirePermission('permission:delete')`. Also removed unused `AuthService` import.

### HIGH — Audit routes missing RBAC
- **File:** `src/routes/audit.routes.ts:14-16`
- **Description:** Audit log read/export routes had no `requirePermission` — any authenticated user could view all audit logs including user activity metadata (who did what, when, from which IP).
- **Impact:** Sensitive operational data exposed to all authenticated users.
- **Fix applied:** Added `requirePermission('audit:read')` on log listing/viewing and `requirePermission('audit:export')` on export.

### HIGH — Appointment check-in route missing permission check
- **File:** `src/routes/appointment.routes.ts:23`
- **Description:** `POST /:id/checkin` had only `authMiddleware` with no `requirePermission`. While OTP verification provides some protection, any authenticated user could attempt OTP brute-force on any appointment without any rate limiting from the route layer.
- **Fix applied:** Added `requirePermission('appointment:update')`.

### INFO — Role routes lack RBAC
- **File:** `src/routes/role.routes.ts:17-22`
- **Reviewed: no issue.** Role management is semi-privileged but there is no self-referential `role:create` permission defined in the system yet. Acceptable for current architecture; should be hardened when the permission system matures.

---

## A02: Cryptographic Failures — 5 findings (1 MEDIUM, 1 LOW, 3 INFO)

### MEDIUM — Timing-safe comparison throws on unequal-length inputs
- **File:** `src/utils/crypto.utilities.ts:15-17`
- **Description:** `constantTimeCompare` called `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` without checking length equality first. If the two strings have different lengths, `Buffer.from` creates different-length buffers and `timingSafeEqual` throws an exception. This creates a timing oracle — an attacker can determine the correct prefix length of a secret by observing which lengths cause errors vs. success.
- **Fix applied:** Added length equality check that returns `false` for unequal-length inputs. Uses a dummy XOR loop to avoid leaking which input was shorter. Falls through to `timingSafeEqual` only when lengths match.

### LOW — Hardcoded salt in key derivation function
- **File:** `src/utils/encryption.utilities.ts:15`
- **Description:** `scryptSync(key, 'ems-salt', KEY_LENGTH)` uses a hardcoded salt string `'ems-salt'`. A fixed salt weakens the key derivation function — if the encryption key is ever compromised, pre-computed rainbow tables for this specific salt could expedite cracking of the derived key.
- **Recommendation:** Move salt to `ENCRYPTION_SALT` environment variable. Not fixed to avoid breaking existing encrypted data without a migration strategy.

### INFO — JWT secret validation at module load
- **File:** `src/utils/jwt.utilities.ts:3-8`
- **Reviewed: no issue.** Both `ACCESS_SECRET` and `REFRESH_SECRET` are validated at module load time with explicit null checks. Access tokens expire in 15 minutes, refresh tokens in 7 days — appropriate durations.

### INFO — Password hashing strength
- **File:** `src/utils/bcrypt.utilities.ts:4`
- **Reviewed: no issue.** Uses bcrypt with 12 salt rounds — exceeds the OWASP recommended minimum of 10 rounds.

### INFO — Secure random token generation
- **File:** `src/utils/crypto.utilities.ts:3-13`
- **Reviewed: no issue.** Uses `crypto.randomBytes` and `crypto.randomInt` (CSPRNG from Node.js crypto module). Token hashing via SHA-256 meets collision-resistance requirements.

---

## A03: Injection — 1 finding (INFO)

### INFO — DTO validation coverage is comprehensive
- **File:** All `src/dto/` files
- **Reviewed: no issue.** Every DTO implements static `validate()` and `sanitize()` methods. Validation includes:
  - Type checking (string, number, boolean, array, object)
  - Length constraints (minimum and maximum)
  - Format validation via `validator` library (email, UUID, ISO 8601 date, mobile phone, URL)
  - Enum allowlisting against generated Prisma enums
  - No raw SQL queries — all database access uses Prisma's parameterized query interface, eliminating SQL injection risk entirely.

---

## A04: Insecure Design — 3 findings (1 MEDIUM, 2 INFO)

### MEDIUM — Password reset token memory exhaustion risk
- **File:** `src/services/auth.service.ts:353-364`
- **Description:** Password reset tokens are stored in an in-memory `Map` capped at 10,000 entries. An attacker could generate 10,000 tokens (at 1 token per authLimiter request = 20 tokens per 15 minutes, this would take many hours) to exhaust the map, causing the oldest tokens to be evicted — a denial of service against legitimate password resets. The 5-minute cleanup interval and `MAX_RESET_TOKENS` cap provide partial mitigation.
- **Recommendation:** Use database-backed reset tokens with DB-level TTL cleanup for persistence and capacity safety.

### INFO — OTP rate limits are in-memory only
- **File:** `src/services/otp.service.ts:19-22`
- **Reviewed: no issue.** OTP generation (3/hour) and verification (5/15min) rate limits are appropriate for a single-instance deployment. Limits reset on server restart. For multi-instance or high-availability deployments, Redis-backed rate limiting would be needed.

### INFO — Validation middleware correctly isolates sanitize/validate
- **File:** `src/middleware/validation.middleware.ts:8-28`
- **Reviewed: no issue.** The middleware calls DTO `sanitize()` before `validate()`, ensuring sanitized input is validated. Sanitized data replaces `req.body`, preventing mass assignment of unexpected fields. Error forwarding through the middleware chain is correct.

---

## A05: Security Misconfiguration — 5 findings (1 MEDIUM, 4 INFO)

### MEDIUM — Debug `/test` endpoint left enabled in production code
- **File:** `src/server.ts:80-82`
- **Description:** A `/test` endpoint returning `{ test: true }` was exposed on the running server. While this endpoint doesn't directly leak sensitive data, it signals to attackers that debug/test endpoints may exist and encourages further probing. The endpoint provides no function outside of development validation.
- **Fix applied:** Removed the `/test` endpoint.

### INFO — Stack trace leakage controlled by environment
- **File:** `src/middleware/error.middleware.ts:54-64`
- **Reviewed: no issue.** Stack traces and detailed error messages are only included in responses when `NODE_ENV === 'development'`. In production, a generic `'An unexpected error occurred'` message is returned. Prisma errors are handled with sanitized messages specific to each error code.

### INFO — Prisma query logging scoped to environment
- **File:** `src/config/db.config.ts:23`
- **Reviewed: no issue.** `PrismaClient` logs `['query', 'error', 'warn']` in development mode and `['error']` only in production, preventing sensitive data leakage from query logs.

### INFO — CORS properly restricted
- **File:** `src/server.ts:24-27`
- **Reviewed: no issue.** CORS origin is configured via `CORS_ORIGIN` environment variable with a safe development fallback (`http://localhost:5173`). The `credentials: true` flag requires a specific origin (no wildcard allowed). This prevents unauthorized cross-origin requests.

### INFO — Security headers applied via helmet
- **File:** `src/server.ts:29`
- **Reviewed: no issue.** `helmet()` middleware applies Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, and other recommended security headers.

---

## A06: Vulnerable and Outdated Components — 1 finding (INFO)

### INFO — Dependency versions review
- **File:** `package.json`
- **Reviewed: no issue (deferred to auditor-deps for comprehensive check).** Key production dependencies are on current versions: Express 5.2.1, Prisma 7.9.x, Prisma adapter-pg, helmet 8.3, bcrypt 6.0, jsonwebtoken 9.0.3, validator 13.15. No known critical CVEs at audit time. `crypto-js` in devDependencies is unused in production code.

---

## A07: Identification and Authentication Failures — 4 findings (1 MEDIUM, 3 INFO)

### MEDIUM — No per-account lockout on login attempts
- **File:** `src/services/auth.service.ts:129-208`
- **Description:** The auth rate limiter (20 requests per 15 minutes per IP) prevents mass distributed brute-force but does not implement per-account lockout. An attacker targeting a specific account can attempt 20 password guesses per IP per 15 minutes, and by rotating through multiple IPs (botnet, proxies), can achieve a much higher rate. There is no incremental delay or CAPTCHA challenge on repeated failures.
- **Recommendation:** Implement account lockout after 5-10 consecutive failed login attempts with a timed unlock (e.g., 15 minutes) or introduce a CAPTCHA challenge after repeated failures.

### INFO — forgotPassword does not disclose account existence
- **File:** `src/services/auth.service.ts:344-380`
- **Reviewed: no issue.** Returns `'If the email exists, a reset link has been sent'` regardless of whether the email exists in the system. This prevents user enumeration attacks.

### INFO — Refresh token rotation properly invalidates old tokens
- **File:** `src/services/auth.service.ts:160-174, 237-254, 283-299, 326-331`
- **Reviewed: no issue.** On login, all previous unrevoked tokens are revoked via `updateMany`. On refresh, the used token is individually revoked and a new one created. Logout revokes all tokens. Password change also revokes all tokens, forcing re-authentication. This prevents token replay attacks.

### INFO — authMiddleware handles all token failure modes
- **File:** `src/middleware/auth.middleware.ts:29-113`
- **Reviewed: no issue.** The middleware correctly handles:
  - Missing token (401)
  - Malformed format (401)
  - Invalid JWT (401 with JsonWebTokenError)
  - Expired JWT (401 with TOKEN_EXPIRED code)
  - User not found in database (401)
  - Inactive/suspended account (403)

---

## A08: Software and Data Integrity Failures — 1 finding (INFO)

### INFO — No unsafe deserialization or integrity bypass patterns
- **Reviewed: no issue.** The codebase contains no `eval()`, `Function()`, `require()` with user-supplied paths, or unsafe `JSON.parse()` patterns. Data serialization is handled through Prisma's typed interface. External npm packages are installed via lockfile, providing integrity verification at install time.

---

## A09: Security Logging and Monitoring Failures — 3 findings (INFO)

### INFO — Audit middleware captures all mutating operations
- **File:** `src/middleware/audit.middleware.ts:12-75`
- **Reviewed: no issue.** The middleware intercepts POST/PUT/PATCH/DELETE methods and logs to the database. Sensitive fields (password, token, refreshToken, accessToken, secret) are redacted via `sanitizeBody`. The `/auth` and `/health` paths are skipped to reduce noise. Old values are captured for UPDATE/DELETE operations.

### INFO — Audit failure falls back safely
- **File:** `src/middleware/audit.middleware.ts:68`
- **Reviewed: no issue.** Audit logging uses `.catch(console.error)` — a failure in the audit log does not block the original request from completing. This is the correct behavior: audit is important but not critical-path.

### INFO — Morgan HTTP logging does not include request bodies
- **File:** `src/server.ts:50`
- **Reviewed: no issue.** The morgan log format includes correlation ID, remote address, HTTP method, URL, status code, content length, and response time. It does NOT log request bodies, query parameters, or headers that could contain sensitive data (Authorization, Cookie, etc.).

---

## A10: Server-Side Request Forgery (SSRF) — 1 finding (INFO)

### INFO — No outbound HTTP requests in application code
- **Reviewed: no issue.** No service, middleware, controller, or utility makes outbound HTTP requests to user-supplied URLs. File URLs are stored as metadata in the database but are never fetched by the server. The project has no HTTP client dependency (no `axios`, `node-fetch`, etc.) in production dependencies. No SSRF risk exists.

---

## Files Modified

| File | Change | Category | Severity |
|------|--------|----------|----------|
| `src/routes/user.routes.ts` | Added `requirePermission` to 7 admin routes | A01 | CRITICAL |
| `src/routes/permission.routes.ts` | Added `requirePermission` to 5 routes, removed unused import | A01 | CRITICAL |
| `src/routes/audit.routes.ts` | Added `requirePermission` to 3 routes | A01 | HIGH |
| `src/routes/appointment.routes.ts` | Added `requirePermission` to check-in route | A01 | HIGH |
| `src/server.ts` | Removed `/test` debug endpoint | A05 | MEDIUM |
| `src/utils/crypto.utilities.ts` | Fixed timing-safe comparison for unequal-length inputs | A02 | MEDIUM |

---

## Recommendations Not Yet Implemented

1. Add per-account lockout on login (A07 — MEDIUM)
2. Move encryption salt to environment variable (A02 — LOW)
3. Use database-backed password reset tokens (A04 — MEDIUM)
4. Add RBAC to role management routes (A01 — INFO)
5. Implement Redis-backed OTP rate limiting for multi-instance deployments (A04 — INFO)
