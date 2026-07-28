# Redis Integration — Plan

## Goal
Replace in-memory stores (rate limiting, OTP, password reset tokens) with `ioredis` for persistence, multi-instance sharing, and auto-expiry. Add proper 429 error responses.

## Prerequisites
- `ioredis` and `@types/ioredis` are already installed
- Need to install: `npm install rate-limit-redis`

## Council Recommendations Applied
1. **Version compatibility check** — verify `rate-limit-redis` store interface matches installed `express-rate-limit` version before coding
2. **`.env.example` + `docker-compose.yml`** — update both so Redis dependency is explicit
3. **Security model** — config file documents assumptions (localhost/no-TLS for dev); AUTH support from day one
4. **Degradation tests** — add step to run tests with Redis unavailable, verifying in-memory fallback
5. **429 handler + headers** — verify `Retry-After` still works with custom handler + `standardHeaders: true`

## Files to Create (2)
| File | Purpose |
|------|---------|
| `src/config/redis.config.ts` | Redis client singleton with connection management, error handling, health check, graceful shutdown, and AUTH support |
| `src/exceptions/RateLimitError.ts` | 429 error class extending AppError |

## Files to Modify (7)
| File | Changes |
|------|---------|
| `src/exceptions/index.ts` | Add `export * from './RateLimitError'` |
| `.env` | Add `REDIS_URL=redis://localhost:6379` |
| `.env.example` | Add `REDIS_URL=redis://localhost:6379` with comment |
| `docker-compose.yml` | Add Redis service container (port 6379, if compose file exists; create one if it doesn't) |
| `src/server.ts` | (1) Import redis config and rate-limit-redis store; (2) Pass `store` to `generalLimiter` + `authLimiter`; (3) Add custom `handler` to both limiters returning JSON `{ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message, retryAfter } }` with status 429; (4) Verify `Retry-After` header preserved |
| `src/services/otp.service.ts` | Replace 3 in-memory Maps with Redis calls using SET/GET/DEL/EXPIRE. OTP entries use 5min TTL, rate limit entries use 1h/15min TTL. The `IOTPService` interface stays unchanged. Generate/verify signatures stay the same. |
| `src/services/auth.service.ts` | Replace in-memory `resetTokens` Map + `evictExpiredTokens` cleanup timer with Redis. Reset token TTL: 1 hour. Remove `MAX_RESET_TOKENS` cap (Redis handles memory via TTL). |

## Architectural Decisions

### Redis Config Pattern
Mirror `db.config.ts` singleton pattern with `global.redis` to prevent duplicate clients on hot reload. Include AUTH support even if unused in dev:

```typescript
import Redis from 'ioredis';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
// ... singleton export with password option
```

### Graceful Degradation
If Redis is unavailable at startup, log a warning and fall back to in-memory stores (current behavior). Redis availability must be checked at app init, not lazily. Tests must verify the app works correctly (not just silently) without Redis.

### Security Model
- Dev: localhost, no TLS, no password (defaults)
- Production: require AUTH via `REDIS_PASSWORD` env var, TLS via `rediss://` scheme in `REDIS_URL`
- Docs embedded in `redis.config.ts` header comment

### OTP Service Redis Key Schema
| Purpose | Key Pattern | TTL |
|---------|-------------|-----|
| OTP code | `otp:{appointmentId}` | 5min |
| Generate rate limit | `otp:rate:{appointmentId}` | 1h |
| Verify rate limit | `otp:verify:{appointmentId}` | 15min |

### Auth Service Redis Key Schema
| Purpose | Key Pattern | TTL |
|---------|-------------|-----|
| Reset token value | `reset:{token}` = userId | 1h |

### Rate Limiter Handler (429 Response)
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later",
    "retryAfter": "<seconds>"
  }
}
```
Custom `handler` must also set `Retry-After` header manually since `standardHeaders: true` may not propagate through a custom handler.

## Order of Implementation
0. **Version check**: `npm ls express-rate-limit` to confirm version, verify `rate-limit-redis` exports a compatible store class
1. Create `src/config/redis.config.ts` (singleton, AUTH, graceful degradation, health check)
2. Create `src/exceptions/RateLimitError.ts` + update `exceptions/index.ts`
3. Update `.env`, `.env.example`, and `docker-compose.yml` with Redis config
4. Update `src/server.ts` — Redis stores + 429 handler (ensure `Retry-After` header set)
5. Update `src/services/otp.service.ts`
6. Update `src/services/auth.service.ts`
7. Run `npx tsc --noEmit` to verify compilation
8. Run `npx jest` to verify no regressions
9. **Degradation test**: temporarily set `REDIS_URL` to an invalid address, restart app, and confirm all 472 tests pass with in-memory fallback
10. Revert degradation test config
