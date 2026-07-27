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
- **Memory Leak Mitigation**: In-memory token store has periodic eviction (5min) + 10K cap, process signal listeners moved exclusively to entry point (no accumulation on module import), dynamic `import()` in auth middleware replaced with static import, audit export capped at 10K records

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

## Remaining Roadmap

### Phase 2: Embassy, Services, Requests (Weeks 3-5)

#### Embassy & Department Management (Week 3)
- [ ] **TASK-201**: Embassy + Department service — CRUD for both, embassy context resolution
- [ ] **TASK-202**: Embassy routes — `GET/POST /embassies`, `GET/POST /departments`
- [ ] **TASK-203**: Embassy context middleware — extract embassy from header/user, filter services

#### Service Type & Request Management (Week 4)
- [ ] **TASK-204**: ServiceType service — admin CRUD, fee/duration/category/appointment-requirement
- [ ] **TASK-205**: ServiceType routes — `GET/POST /service-types`
- [ ] **TASK-206**: ServiceRequest service — submission with reference number, status machine (DRAFT→SUBMITTED→IN_PROGRESS→COMPLETED/CLOSED/CANCELLED), payment record creation
- [ ] **TASK-207**: ServiceRequest routes — `POST/GET /service-requests`, `PUT /:id/status`

#### Citizen Profile Management (Week 5)
- [ ] **TASK-208**: Profile service — CRUD, GDPR deletion/anonymization, access logging (officer ID, timestamp, IP hash)
- [ ] **TASK-209**: Profile routes — `GET/PUT /profile/me`, document upload, GDPR delete
- [ ] **TASK-210**: Encryption utilities — install `crypto-js` or native `crypto`, AES-256-GCM for PII, key management

---

### Phase 3: Visa Processing & Appointments (Weeks 6-8)

#### Visa Application (Week 6)
- [ ] **TASK-301**: VisaApplication service — submit with documents/biometrics, automated vetting against watchlists
- [ ] **TASK-302**: VisaDocument service — document upload, type validation, encrypted storage
- [ ] **TASK-303**: Visa routes — `POST/GET /visa/applications`, `GET /:id`

#### Visa Adjudication (Week 7)
- [ ] **TASK-304**: VisaDecision service — officer review with vetting display, decision workflow (APPROVE/REJECT/REQUEST_MORE_INFO/ESCALATE), dual-approval, decision letters, appeals
- [ ] **TASK-305**: Visa decision routes — `PUT /:id/review`, `POST /:id/decision`, `POST /:id/dual-approval`
- [ ] **TASK-306**: Vetting service — watchlist matching, VerificationCheck + risk scoring

#### Appointment System (Week 8)
- [ ] **TASK-307**: Appointment service — slot availability, OTP booking, QR check-in, queue tokens, no-show handling, wait estimates
- [ ] **TASK-308**: Appointment routes — `GET /slots`, `POST /book`, `GET /my`, `PUT /:id/cancel`, `POST /:id/checkin`, `GET /queue`, `POST /queue/next`
- [ ] **TASK-309**: OTP service — generate/validate, SMS/email delivery integration, rate limiting

---

### Phase 4: Legalization, Emergency, Diplomatic, Financial (Weeks 9-11)

#### Document Legalization (Week 9)
- [ ] **TASK-401**: Legalization service — request workflow, document authenticity verification, digital seal, tracking number, Hague Convention routing (apostille vs legalization)
- [ ] **TASK-402**: Legalization routes — `POST/GET /legalization/requests`, `PUT /:id/process`

#### Emergency & Diplomatic (Week 10)
- [ ] **TASK-403**: Emergency service — case registration (location/dependents/medical), alert broadcast (email/SMS), evacuation prioritization, welfare checks
- [ ] **TASK-404**: Emergency routes — `POST/GET /emergency/cases`, `POST /alerts`, `GET /evacuation-list`
- [ ] **TASK-405**: Diplomatic service — pouch chain-of-custody tracking, staff clearance management (levels/expiry/renewal), overdue escalation
- [ ] **TASK-406**: Diplomatic routes — `POST/GET /diplomatic/pouches`, `PUT /:id/handoff`, `POST/GET /clearances`

#### Financial Transactions (Week 11)
- [ ] **TASK-407**: Financial service — transaction recording (service/amount/currency/payer/officer), daily reconciliation, discrepancy flags, monthly reports
- [ ] **TASK-408**: Financial routes — `POST/GET /financial/transactions`, `GET /reconciliation/daily`, `GET /reports/monthly`

---

### Phase 5: Testing, Security Hardening, Documentation (Weeks 12-13)

#### Testing (Week 12)
- [ ] **TASK-501**: Unit tests — services, utils (Jest + ts-jest, 80%+ coverage)
- [ ] **TASK-502**: Integration tests — API endpoints for all modules, DB transactions, RBAC enforcement
- [ ] **TASK-503**: E2E tests — critical flows: citizen journey (register→profile→request→appointment), visa (apply→vet→decide), emergency (register→alert→evacuate)

#### Security & Performance (Week 13)
- [ ] **TASK-504**: Security audit — npm audit, OWASP Top 10, rate limiting/CORS/TLS/JWT review, encryption verification
- [ ] **TASK-505**: Performance testing — 1000 concurrent users, <200ms p95 API, connection pool validation
- [ ] **TASK-506**: Compliance audit — GDPR (right to erasure, data portability), Vienna Convention, 7-year audit retention
- [ ] **TASK-507**: Observability — structured JSON logging, OpenTelemetry tracing, Prometheus metrics, alerting rules
- [ ] **TASK-508**: Documentation — OpenAPI/Swagger, deployment guide, schema docs, developer onboarding

---

## Dependency Graph

```
Phase 1 (✅ Complete) → Phase 2
├── TASK-201 ← TASK-116
├── TASK-202 ← TASK-201
├── TASK-203 ← TASK-108
├── TASK-204 ← TASK-201
├── TASK-205 ← TASK-204
├── TASK-206 ← TASK-204, TASK-113
├── TASK-207 ← TASK-206
├── TASK-208 ← TASK-112, TASK-113, TASK-206
├── TASK-209 ← TASK-208
└── TASK-210 ← TASK-208

Phase 2 → Phase 3
├── TASK-301 ← TASK-206, TASK-113
├── TASK-302 ← TASK-301, TASK-210
├── TASK-303 ← TASK-301, TASK-302
├── TASK-304 ← TASK-301, TASK-113
├── TASK-305 ← TASK-304
├── TASK-306 ← TASK-301
├── TASK-307 ← TASK-201, TASK-113
├── TASK-308 ← TASK-307
└── TASK-309 ← TASK-307

Phase 3 → Phase 4 → Phase 5
├── TASK-401 ← TASK-206, TASK-210
├── TASK-402 ← TASK-401
├── TASK-403 ← TASK-112, TASK-309
├── TASK-404 ← TASK-403
├── TASK-405 ← TASK-113
├── TASK-406 ← TASK-405
├── TASK-407 ← TASK-206, TASK-113
└── TASK-408 ← TASK-407
```

---

## External Dependencies (Required for Full Implementation)
1. **PostgreSQL 15+** (localhost:5433 — configured)
2. **Redis** for caching/sessions/queues
3. **Object storage** (S3/MinIO) for document storage
4. **SMTP server** for email notifications
5. **SMS gateway** for OTP/notifications
6. **HashiCorp Vault** for encryption keys (AES-256-GCM)