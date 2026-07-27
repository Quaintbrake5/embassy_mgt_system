# HANDOFF — Embassy Management System (EMS) — Phase 1 Complete, Ready for Phase 2

## Goal
Build a Node.js/TypeScript/Express 5 + Prisma 7.9 + PostgreSQL backend for an Embassy Management System with comprehensive consular services.

## Current Status: Phase 1 Complete — Root Route Bug Fixed

### ✅ Phase 1 Complete (Auth, Users, Roles, Audit)
- **Database & Prisma**: Schema complete (14 models, 20+ enums), migrations applied
- **Server & Express App**: Express 5 app with all middleware (v5.2.1, router v2.2.0)
- **Authentication**: JWT Access (15min) + Refresh (7d) with rotation, bcrypt cost 12
- **RBAC**: Permission/role-based middleware, full CRUD
- **Validation & Error Handling**: validator.js DTOs, custom exceptions, global handler
- **Audit Logging**: Automatic logging of all mutations

### ✅ Root Route Bug Fixed
**Verification**: All routes work correctly. Tested with Express 5.2.1 (router 2.2.0):

| Route | Status | Response |
|-------|--------|----------|
| `GET /` | ✅ 200 | Embassy Management System API metadata |
| `GET /test` | ✅ 200 | `{"test": true}` |
| `GET /health` | ✅ 200 | Health check with uptime/timestamp |
| `GET /nonexistent` | ✅ 404 | `Route GET /nonexistent not found` |
| `POST /api/v1/auth/register` | ✅ 400 | Validation error (expected, DTO working) |
| All `/api/v1/*` endpoints | ✅ Works | Route matching correct |

**Root cause**: The `src/server.ts` file was empty in the initial commit. The Phase 1 implementation added all route handlers in the correct order:
1. CORS, JSON parser, URL-encoded parser middleware
2. Request logging middleware
3. **Health check** → `app.get('/health', ...)`
4. **Root route** → `app.get('/', ...)`
5. **Test route** → `app.get('/test', ...)`
6. API routes → `app.use('/api/v1', routes)`
7. Audit middleware (skips non-mutating GET requests)
8. 404 handler + error middleware

All routes are registered before the `notFoundMiddleware`, which correctly catches only truly unmatched paths.

**TypeScript**: Compiles cleanly (`npx tsc --noEmit` → no errors).

## Project Structure

```
src/
├── server.ts           # Express app setup (entry point for app export)
├── index.ts            # Server bootstrap (connects DB, starts listening)
├── config/
│   └── db.config.ts    # PrismaClient singleton with PrismaPg adapter
├── routes/
│   ├── index.ts        # Route aggregator (mounts /auth, /users, /roles, /permissions)
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   ├── role.routes.ts
│   └── permission.routes.ts
├── controllers/
│   ├── auth.controller.ts
│   ├── user.controller.ts
│   ├── role.controller.ts
│   └── permission.controller.ts
├── services/
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── role.service.ts
│   ├── permission.service.ts
│   └── implementation/   # Ready for Phase 2+ domain logic
├── middleware/
│   ├── auth.middleware.ts
│   ├── audit.middleware.ts
│   ├── error.middleware.ts
│   └── validation.middleware.ts
├── dto/
│   ├── auth.dto.ts
│   ├── user.dto.ts
│   ├── role.dto.ts
│   └── permission.dto.ts
├── exceptions/
│   ├── AppError.ts
│   ├── ValidationError.ts
│   ├── AuthenticationError.ts
│   ├── AuthorizationError.ts
│   ├── NotFoundError.ts
│   ├── ConflictError.ts
│   └── index.ts
└── utils/
    ├── jwt.utilities.ts
    ├── bcrypt.utilities.ts
    ├── crypto.utilities.ts
    └── validation.utils.ts
```

## Phase 2+ Tasks (From tasks.md)

### Phase 2 (Weeks 3-5): Citizen Profile, Passport, Civil Registry
1. Embassy & Department CRUD
2. ServiceType & ServiceRequest CRUD
3. Citizen Profile management
4. Passport application workflows
5. Civil registry (birth, marriage, death)

### Phase 3 (Weeks 6-8): Visa Processing, Appointments
1. Visa application with document upload
2. Automated vetting against watchlists
3. Officer adjudication with dual-approval
4. Appointment booking with QR/OTP

### Phase 4 (Weeks 9-11): Legalization, Emergency, Diplomatic, Financial
1. Document legalization/apostille
2. Emergency registration & alerts
3. Diplomatic pouch tracking
4. Financial ledger & reconciliation

### Phase 5 (Weeks 12-13): Testing, Security, Documentation
1. Unit/Integration/E2E tests
2. Security audit & penetration testing
3. Load testing
4. API documentation (OpenAPI/Swagger)

## Key Files Reference
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Complete DB schema (15 enums, 14 models) |
| `src/config/db.config.ts` | PrismaClient singleton with PrismaPg adapter |
| `src/server.ts` | Express app setup |
| `src/index.ts` | Entry point (server bootstrap) |
| `.env` | JWT secrets, DATABASE_URL, PORT |
| `src/routes/*.ts` | API route definitions |
| `src/services/*.ts` | Business logic |
| `src/controllers/*.ts` | Request/response handling |
| `src/middleware/*.ts` | Cross-cutting concerns (auth, audit, validation, errors) |
| `src/dto/*.ts` | Request validation DTOs |

## Commands
```bash
# Start dev server
npx tsx src/index.ts

# Start dev server (alternative)
npm run dev

# Health check
curl http://localhost:3010/health

# Root route
curl http://localhost:3010/

# Type check
npm run typecheck

# Prisma commands
npm run prisma:generate
npm run prisma:migrate -- --name <name>
npm run prisma:studio
```

## Resuming Work
1. Ensure PostgreSQL is running on port 5433
2. Start server: `npm run dev`
3. Verify routes with curl (see table above)
4. Continue with Phase 2 tasks sequentially
5. When adding new domain modules:
   - Add DB schema in `prisma/schema.prisma`
   - Run `npm run prisma:generate`
   - Create routes, controllers, services in respective `src/` directories
   - Register new routes in `src/routes/index.ts`