# HANDOFF — Embassy Management System (EMS) — Phase 1 Complete

## Goal
Build a Node.js/TypeScript/Express 5 + Prisma 7.9 + PostgreSQL backend for an Embassy Management System with comprehensive consular services.

## Current Status: ✅ Phase 1 Fully Complete

### ✅ Completed Phase 1 Items
- **Database & Prisma**: Schema complete (14 models, 20+ enums), migrations applied
- **Server & Express App**: Express 5 app with helmet, CORS, rate limiting (100/min general, 20/15min auth), correlation IDs, morgan structured logging
- **Authentication**: JWT Access (15min) + Refresh (7d) with rotation, bcrypt cost 12, password reset flow (forgot/reset with secure tokens)
- **RBAC Middleware**: `requirePermission`, `requireRole`, `requireAnyPermission`, `requireAllPermissions` all implemented
- **Roles & Permissions CRUD**: Full route sets with validation
- **User Management**: Full CRUD, profile retrieval, status changes, **user self-profile update (PUT /me)**, **role assignment (PUT /:id/role)**
- **Validation & Error Handling**: validator.js DTOs, custom exceptions, global handler
- **Audit Service**: Dedicated `AuditService` with paginated queries, filtering (user/entity/action/date range), and export
- **Audit Middleware**: Automatic logging of mutations, **old/new value capture**, **correlation ID propagation**
- **Audit Routes**: GET /audit (paginated), GET /audit/:id, GET /audit/export
- **Integration Tests**: 18 tests across 3 suites (auth service, audit service, API endpoints) — all passing
- **TypeScript**: Compiles cleanly — `npx tsc --noEmit` → zero errors

## Project Structure

```
src/
├── server.ts                    # Express app setup (helmet, rate limiting, morgan, correlation IDs)
├── index.ts                     # Server bootstrap (connects DB, starts listening)
├── config/
│   └── db.config.ts             # PrismaClient singleton with PrismaPg adapter
├── routes/
│   ├── index.ts                 # Route aggregator (mounts /auth, /users, /roles, /permissions, /audit)
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   ├── role.routes.ts
│   ├── permission.routes.ts
│   └── audit.routes.ts
├── controllers/
│   ├── auth.controller.ts
│   ├── user.controller.ts
│   ├── role.controller.ts
│   ├── permission.controller.ts
│   └── audit.controller.ts
├── services/
│   ├── auth.service.ts          # Register, login, refresh, logout, changePassword, forgotPassword, resetPassword
│   ├── user.service.ts          # CRUD, getProfile, changeStatus, updateProfile, assignRole
│   ├── role.service.ts
│   ├── permission.service.ts
│   ├── audit.service.ts         # Log, findAll (paginated+filtered), findById, exportLogs
│   └── implementation/          # Ready for Phase 2+ domain logic
├── middleware/
│   ├── auth.middleware.ts       # JWT verification + optional auth
│   ├── audit.middleware.ts      # Auto-log mutations + old/new value capture + correlation IDs
│   ├── error.middleware.ts      # Global error handler + 404
│   ├── rbac.middleware.ts       # requirePermission, requireRole, requireAnyPermission, requireAllPermissions
│   └── validation.middleware.ts
├── dto/
│   ├── auth.dto.ts              # RegisterDto, LoginDto, RefreshDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto
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
├── utils/
│   ├── jwt.utilities.ts
│   ├── bcrypt.utilities.ts
│   ├── crypto.utilities.ts
│   └── validation.utils.ts
└── __tests__/
    ├── auth.service.test.ts     # 11 tests: register, login, forgotPassword, resetPassword
    ├── audit.service.test.ts    # 6 tests: log, findAll (filtered), findById, exportLogs
    └── api.test.ts              # 1 test: health + root + 404
```

## 🔄 Phase 1 Task Status — ALL COMPLETE

### Week 1: Server Infrastructure & Authentication Core

#### Server Infrastructure
- [x] **TASK-101**: Implement Express server — helmet, CORS, rate limiting (100/min general, 20/15min auth), morgan structured logging with correlation IDs, health check, global error handler, API versioning
- [x] **TASK-102**: Entry point — DB connection, server start on PORT 3010, graceful shutdown

#### Authentication Module
- [x] **TASK-103**: validator.js installed and configured
- [x] **TASK-104**: Validation schemas for auth, user, role/permission DTOs
- [x] **TASK-105**: Auth middleware — JWT verification, token expiration, optional auth
- [x] **TASK-106**: Auth service — register, login, refresh (rotation), logout, changePassword, forgotPassword (secure token generation), resetPassword (token validation + password update)
- [x] **TASK-107**: Auth routes — register, login, refresh, logout, forgot-password, reset-password, change-password

### Week 2: Authorization (RBAC), User Management, Audit Logging

#### Authorization (RBAC)
- [x] **TASK-108**: RBAC middleware — requirePermission, requireRole, requireAnyPermission, requireAllPermissions, getUserPermissions
- [x] **TASK-109**: Roles routes — full CRUD + permission assignment
- [x] **TASK-110**: Permissions routes — full CRUD (extended beyond GET-only spec)

#### User Management
- [x] **TASK-111**: Users routes — GET /me, PUT /me (profile update), GET /:id, PUT /:id, PATCH /:id/status, PUT /:id/role, DELETE /:id
- [x] **TASK-112**: User service — CRUD, getProfile, changeStatus, updateProfile (strips roleId/status for self-update), assignRole

#### Audit Logging
- [x] **TASK-113**: Audit service — log creation, paginated queries with filtering (user/entity/action/date range), findById, exportLogs
- [x] **TASK-114**: Audit middleware — auto-log mutations, old/new value capture, IP/UA logging, correlation ID propagation, uses AuditService
- [x] **TASK-115**: Audit routes — GET /audit (paginated with filters), GET /audit/:id, GET /audit/export

#### Integration & Testing
- [x] **TASK-116**: 18 integration/unit tests across 3 suites — auth flow, audit service, API health — all passing

## Verification Results

| Check | Status |
|-------|--------|
| TypeScript compilation (`npx tsc --noEmit`) | ✅ Zero errors |
| Tests (`npx jest`) | ✅ 18/18 passing |
| Tests (auth service) | ✅ 11 tests (register, login, forgotPassword, resetPassword) |
| Tests (audit service) | ✅ 6 tests (log, findAll, filtering, findById, export) |
| Tests (API) | ✅ 1 test (health, root, 404) |

## Key Files Reference
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Complete DB schema (15 enums, 14 models) |
| `src/config/db.config.ts` | PrismaClient singleton with PrismaPg adapter |
| `src/server.ts` | Express app setup (helmet, rate limiting, correlation IDs, morgan) |
| `src/index.ts` | Entry point (server bootstrap) |
| `.env` | JWT secrets, DATABASE_URL, PORT |
| `src/routes/*.ts` | API route definitions |
| `src/services/*.ts` | Business logic |
| `src/controllers/*.ts` | Request/response handling |
| `src/middleware/*.ts` | Cross-cutting concerns (auth, audit, validation, errors, RBAC) |
| `src/dto/*.ts` | Request validation DTOs |
| `src/__tests__/*.test.ts` | Integration/unit tests |

## Commands
```bash
# Start dev server
npm run dev

# Health check
curl http://localhost:3010/health

# Root route
curl http://localhost:3010/

# Type check
npm run typecheck

# Run tests
npm test

# Prisma commands
npm run prisma:generate
npm run prisma:migrate -- --name <name>
npm run prisma:studio
```

## Seed Data Needed
The `prisma/seed.ts` file is a placeholder. Before Phase 2 development, seed:
1. Default roles: `admin`, `officer`, `consular_staff`, `viewer`
2. Default permissions: `user:create`, `user:read`, `user:update`, `user:delete`, `role:manage`, `permission:manage`, `audit:read`, `audit:export`, `visa:create`, `visa:read`, `visa:update`, etc.
3. Admin user with full permissions
4. Run: `npm run prisma:seed`

## Phase 2 Next Steps
1. Seed default data (roles, permissions, admin user)
2. Embassy & Department domain (models exist in schema)
3. Service catalog (ServiceType, ServiceRequest)
4. Visa applications (VisaApplication, VisaDocument, VisaDecision)
5. Appointment booking (Appointment, Payment)
6. Security module (VerificationCheck, WatchlistEntry, StaffClearance, EmergencyCase, DiplomaticPouch)
7. When adding new domain modules:
   - Add DB schema in `prisma/schema.prisma`
   - Run `npm run prisma:generate`
   - Create routes, controllers, services in respective `src/` directories
   - Register new routes in `src/routes/index.ts`