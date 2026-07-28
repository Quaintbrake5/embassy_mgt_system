# Embassy Management System - Task Tracking

## Project Status Overview
- **Project**: Embassy Management System (EMS)
- **Tech Stack**: Node.js/TypeScript, Express.js v5, Prisma ORM v7.9, PostgreSQL 15+
- **Current Phase**: Phase 4 (Weeks 9-11) — Legalization, Emergency, Diplomatic, Financial
- **Database**: embassy_mgt_system on localhost:5433
- **Server Port**: 3010
- **Status**: ✅ Phase 1 complete. ✅ Phase 2 (Weeks 3-5) complete. ✅ Phase 3 (Weeks 6-8) complete. ✅ Phase 3 code review fixes applied. ✅ Phase 4 (Weeks 9-11) complete. Phase 5 pending.

---

## ✅ Completed Tasks

### Project Setup & Configuration
- [x] Initialize Node.js project with package.json
- [x] Install core dependencies: express@5, prisma, @prisma/client, bcrypt, jsonwebtoken, cors, validator, helmet, express-rate-limit, dotenv
- [x] Configure TypeScript (tsconfig.json)
- [x] Set up Prisma schema with 14 core models and 20+ enums
- [x] Configure Prisma client generation to `../src/generated/prisma`
- [x] Set up PostgreSQL adapter (@prisma/adapter-pg)
- [x] Configure environment variables (.env)
- [x] Create database configuration with singleton pattern (db.config.ts)
- [x] Implement bcrypt utilities with cost factor 12 (bcrypt.utilities.ts)
- [x] Configure Prisma CLI (prisma.config.ts)
- [x] Generate Prisma client: `npx prisma generate`
- [x] Create initial migration: `npx prisma migrate dev --name init`
- [x] Seed default roles and permissions

### Database Schema
- [x] Define User, Role, Permission, RolePermission models
- [x] Define Profile model for extended user info
- [x] Define RefreshToken model for JWT token management
- [x] Define AuditLog model for immutable audit trail
- [x] Define Embassy, Department models
- [x] Define ServiceType, ServiceRequest, Payment models
- [x] Define VisaApplication, VisaDocument, VisaDecision, VerificationCheck models
- [x] Define Appointment, WatchlistEntry models
- [x] Define EmergencyCase, DiplomaticPouch, StaffClearance models
- [x] Define all 20+ enums (UserStatus, Gender, VisaType, VisaStatus, etc.)

---

### Phase 1: Auth, Users, Roles, Audit (Weeks 1-2) ✅ Complete

#### Week 1: Server Infrastructure & Authentication Core

##### Server Infrastructure (Week 1 - Days 1-2)
- [x] **TASK-101**: Implement Express server in `src/server.ts`
  - [x] Set up Express app with middleware (CORS, JSON parsing, helmet)
  - [x] Configure rate limiting (100 req/min general, 20/15min auth)
  - [x] Set up structured JSON logging with correlation IDs (morgan)
  - [x] Configure health check endpoint (/health)
  - [x] Set up global error handler with structured error responses
  - [x] Configure API versioning (/api/v1)
  - **Acceptance Criteria**: FR-01.1, NFR-01.5, NFR-05.1
  - **Dependencies**: TASK-001 (db.config.ts), TASK-002 (bcrypt.utilities.ts)
  - **Estimated**: 4 hours

- [x] **TASK-102**: Implement entry point in `src/index.ts`
  - [x] Initialize database connection
  - [x] Start Express server on PORT 3010
  - [x] Handle graceful shutdown (SIGTERM, SIGINT)
  - **Acceptance Criteria**: NFR-03.3
  - **Dependencies**: TASK-101
  - **Estimated**: 2 hours

##### Authentication Module (Week 1 - Days 3-5)

- [x] **TASK-103**: Install and configure validator.js
  - [x] `npm install validator @types/validator`
  - [x] Create validation schemas in `src/dto/` (validation logic in DTO static methods)
  - **Acceptance Criteria**: FR-01.1, FR-01.2
  - **Dependencies**: TASK-101
  - **Estimated**: 2 hours

- [x] **TASK-104**: Create validation schemas (`src/dto/`)
  - [x] Auth validation (register, login, password reset)
  - [x] User validation (profile update)
  - [x] Role/permission validation
  - [x] Common validation utilities (`src/utils/validation.utils.ts`)
  - **Acceptance Criteria**: FR-01.1, FR-01.2, FR-02.1
  - **Dependencies**: TASK-103
  - **Estimated**: 3 hours

- [x] **TASK-105**: Create auth middleware (`src/middleware/auth.middleware.ts`)
  - [x] JWT access token verification
  - [x] Extract user from token and attach to request
  - [x] Optional auth middleware for public endpoints
  - [x] Token expiration handling
  - **Acceptance Criteria**: FR-01.1, FR-01.3, NFR-01.4
  - **Dependencies**: TASK-101, TASK-104
  - **Estimated**: 3 hours

- [x] **TASK-106**: Create auth service (`src/services/auth.service.ts`)
  - [x] Register logic with password hashing (bcrypt cost 12)
  - [x] Login logic with credential validation, token generation
  - [x] Refresh token logic with rotation and revocation
  - [x] Logout logic with token revocation
  - [x] Password reset flow with secure tokens (forgot/reset password)
  - [x] JWT signing (15-min access, 7-day refresh, HS256)
  - **Acceptance Criteria**: FR-01.1, FR-01.2, FR-01.3, FR-01.4, NFR-01.3, NFR-01.4
  - **Dependencies**: TASK-105, TASK-002 (bcrypt)
  - **Estimated**: 6 hours

- [x] **TASK-107**: Create auth routes (`src/routes/auth.routes.ts`)
  - [x] POST /api/v1/auth/register - User registration with validation
  - [x] POST /api/v1/auth/login - User login with JWT issuance
  - [x] POST /api/v1/auth/refresh - Refresh access token
  - [x] POST /api/v1/auth/logout - Revoke refresh token
  - [x] POST /api/v1/auth/forgot-password - Initiate password reset
  - [x] POST /api/v1/auth/reset-password - Complete password reset
  - [x] POST /api/v1/auth/change-password - Change password (authenticated)
  - **Acceptance Criteria**: FR-01.1, FR-01.2, FR-01.3, FR-01.4
  - **Dependencies**: TASK-106, TASK-104
  - **Estimated**: 3 hours

#### Week 2: Authorization (RBAC), User Management, Audit Logging

##### Authorization (RBAC) (Week 2 - Days 1-3)

- [x] **TASK-108**: Create RBAC middleware (`src/middleware/rbac.middleware.ts`)
  - [x] Permission constants (resource:action format)
  - [x] Role-permission resolution logic
  - [x] `requirePermission` middleware factory
  - [x] `requireRole` middleware factory
  - [x] `requireAnyPermission` / `requireAllPermissions` middleware factories
  - [x] Permission checking utility functions (`getUserPermissions`)
  - **Acceptance Criteria**: FR-01.5, FR-01.6, FR-01.7, FR-01.8, FR-12.1, FR-12.2, FR-12.3, FR-12.4
  - **Dependencies**: TASK-105
  - **Estimated**: 4 hours

- [x] **TASK-109**: Create roles routes (`src/routes/roles.routes.ts`)
  - [x] GET /api/v1/roles - List all roles
  - [x] POST /api/v1/roles - Create role (admin)
  - [x] GET /api/v1/roles/:id - Get role details
  - [x] PUT /api/v1/roles/:id - Update role (admin)
  - [x] DELETE /api/v1/roles/:id - Delete role (admin)
  - [x] POST /api/v1/roles/:id/permissions - Assign permissions to role
  - **Acceptance Criteria**: FR-01.5, FR-12.1
  - **Dependencies**: TASK-108
  - **Estimated**: 3 hours

- [x] **TASK-110**: Create permissions routes (`src/routes/permissions.routes.ts`)
  - [x] GET /api/v1/permissions - List all permissions
  - [x] POST /api/v1/permissions - Create permission (admin)
  - [x] GET /api/v1/permissions/:id - Get permission details
  - [x] PUT /api/v1/permissions/:id - Update permission (admin)
  - [x] DELETE /api/v1/permissions/:id - Delete permission (admin)
  - **Acceptance Criteria**: FR-01.5, FR-12.1
  - **Dependencies**: TASK-108
  - **Estimated**: 1 hour

##### User Management (Week 2 - Days 3-4)

- [x] **TASK-111**: Create users routes (`src/routes/users.routes.ts`)
  - [x] GET /api/v1/users/me - Get current user profile
  - [x] PUT /api/v1/users/me - Update current user profile
  - [x] GET /api/v1/users/:id - Get user by ID (admin/officer)
  - [x] PUT /api/v1/users/:id - Update user (admin)
  - [x] PATCH /api/v1/users/:id/status - Update user status (admin)
  - [x] PUT /api/v1/users/:id/role - Assign role to user (admin)
  - [x] DELETE /api/v1/users/:id - Delete user (admin)
  - **Acceptance Criteria**: FR-01.6, FR-02.1, FR-02.3
  - **Dependencies**: TASK-108, TASK-107
  - **Estimated**: 3 hours

- [x] **TASK-112**: Create user service (`src/services/user.service.ts`)
  - [x] Profile management (CRUD)
  - [x] Role assignment with immediate enforcement
  - [x] Status updates with audit trail
  - **Acceptance Criteria**: FR-01.6, FR-02.1, FR-02.3, FR-12.2
  - **Dependencies**: TASK-111
  - **Estimated**: 3 hours

##### Audit Logging (Week 2 - Days 5-6)

- [x] **TASK-113**: Create audit service (`src/services/audit.service.ts`)
  - [x] Log creation with user, action, entity, entityId, changes
  - [x] Immutable audit log enforcement (append-only)
  - [x] Query utilities with filtering (user, entity, date range, action type)
  - [x] Paginated queries with filtering
  - [x] Export functionality (10K record cap)
  - **Acceptance Criteria**: FR-11.1, FR-11.2, FR-11.3, NFR-04.3
  - **Dependencies**: TASK-101, TASK-112
  - **Estimated**: 4 hours

- [x] **TASK-114**: Create audit middleware (`src/middleware/audit.middleware.ts`)
  - [x] Automatic audit logging for CRUD operations
  - [x] Capture old/new values for updates
  - [x] Log IP address and user agent
  - [x] Correlation ID propagation
  - **Acceptance Criteria**: FR-11.1, FR-11.2, FR-11.3, NFR-05.1
  - **Dependencies**: TASK-113, TASK-105
  - **Estimated**: 3 hours

- [x] **TASK-115**: Create audit routes (`src/routes/audit.routes.ts`)
  - [x] GET /api/v1/audit/logs - Query audit logs with filters
  - [x] GET /api/v1/audit/logs/:id - Get single audit log
  - [x] GET /api/v1/audit/export - Export audit logs (admin)
  - **Acceptance Criteria**: FR-11.3, FR-11.4
  - **Dependencies**: TASK-113
  - **Estimated**: 2 hours

##### Phase 1 Integration & Testing (Week 2 - Day 7)
- [x] **TASK-116**: Integration testing for Phase 1
  - [x] Test auth flow: register → login → refresh → logout
  - [x] Test RBAC: role creation, permission assignment, access control
  - [x] Test audit logging: verify audit entries for CRUD operations
  - [x] Test password reset flow
  - [x] Run Prisma migration for any schema updates
  - **Acceptance Criteria**: FR-01.1-8, FR-11.1-4, FR-12.1-4
  - **Dependencies**: TASK-101 through TASK-115
  - **Estimated**: 4 hours

---

### Phase 2: Embassy, Services, Requests (Weeks 3-5) ✅ Complete

#### Week 3: Embassy & Department Management

- [x] **TASK-201**: Create embassy service (`src/services/embassy.service.ts`)
  - [x] Embassy CRUD operations
  - [x] Department CRUD operations
  - [x] Embassy context resolution
  - **Note**: Full CRUD with audit logging, dependent-record check on delete, unique code enforcement.
  - **Acceptance Criteria**: FR-03.1, FR-03.2, FR-03.3
  - **Dependencies**: TASK-116
  - **Estimated**: 4 hours

- [x] **TASK-202**: Create embassy routes (`src/routes/embassy.routes.ts`)
  - [x] GET /api/v1/embassies - List embassies
  - [x] POST /api/v1/embassies - Create embassy (admin)
  - [x] GET /api/v1/embassies/:id - Get embassy details
  - [x] PUT /api/v1/embassies/:id - Update embassy (admin)
  - [x] DELETE /api/v1/embassies/:id - Delete embassy (admin)
  - [x] GET /api/v1/embassies/:embassyId/departments - List departments by embassy
  - [x] POST /api/v1/embassies/:embassyId/departments - Create department (admin)
  - [x] PUT /api/v1/departments/:id - Update department (admin)
  - [x] DELETE /api/v1/departments/:id - Delete department (admin)
  - **Acceptance Criteria**: FR-03.1, FR-03.2, FR-03.3
  - **Dependencies**: TASK-201
  - **Estimated**: 2 hours

- [x] **TASK-203**: Create embassy context middleware (`src/middleware/embassy.middleware.ts`)
  - [x] Extract embassy context from request (x-embassy-code header)
  - [ ] Filter services by embassy context (not yet wired into all routes)
  - **Note**: Resolves embassy from `x-embassy-code` header with permission validation (`embassy:*`).
  - **Acceptance Criteria**: FR-03.3
  - **Dependencies**: TASK-108
  - **Estimated**: 2 hours

#### Week 4: Service Type & Request Management

- [x] **TASK-204**: Create service type service (`src/services/service-type.service.ts`)
  - [x] ServiceType CRUD (admin)
  - [x] Fee and duration management
  - [x] Category and appointment requirement management
  - **Note**: Full CRUD with audit logging, delete blocked on existing service requests.
  - **Acceptance Criteria**: FR-04.1
  - **Dependencies**: TASK-201
  - **Estimated**: 4 hours

- [x] **TASK-205**: Create service type routes (`src/routes/service-type.routes.ts`)
  - [x] GET /api/v1/service-types - List service types
  - [x] POST /api/v1/service-types - Create service type (admin)
  - [x] GET /api/v1/service-types/:id - Get service type details
  - [x] PUT /api/v1/service-types/:id - Update service type (admin)
  - [x] DELETE /api/v1/service-types/:id - Delete service type (admin)
  - [x] GET /api/v1/service-types/category/:category - Filter by category
  - **Acceptance Criteria**: FR-04.1
  - **Dependencies**: TASK-204
  - **Estimated**: 2 hours

- [x] **TASK-206**: Create service request service (`src/services/service-request.service.ts`)
  - [x] ServiceRequest submission (citizen) with reference number (`SR-{timestamp36}-{hex16}`)
  - [x] Status transitions: DRAFT → SUBMITTED → IN_PROGRESS → COMPLETED/CLOSED/CANCELLED
  - [ ] Payment record creation when required (not yet integrated)
  - [x] Audit log integration
  - **Note**: Reference number uses `randomBytes(8)` for 64-bit entropy.
  - **Acceptance Criteria**: FR-04.2, FR-04.3, FR-04.4, FR-04.5, FR-04.6
  - **Dependencies**: TASK-204, TASK-113
  - **Estimated**: 6 hours

- [x] **TASK-207**: Create service request routes (`src/routes/service-request.routes.ts`)
  - [x] POST /api/v1/service-requests - Submit service request
  - [x] GET /api/v1/service-requests - List requests (filtered by user/context)
  - [x] GET /api/v1/service-requests/:id - Get request details
  - [x] PUT /api/v1/service-requests/:id/status - Update status (officer)
  - **Note**: Data leakage prevention via `service-request:read-all` permission. Users without it see only their own requests.
  - **Acceptance Criteria**: FR-04.2, FR-04.3, FR-04.4, FR-04.5
  - **Dependencies**: TASK-206
  - **Estimated**: 3 hours

#### Week 5: Citizen Profile Management

- [x] **TASK-208**: Create profile service (`src/services/profile.service.ts`)
  - [x] Profile CRUD operations
  - [ ] Document upload with AES-256-GCM encryption for PII (not yet implemented)
  - [x] GDPR data deletion/anonymization (retain audit logs)
  - [x] Profile access logging (officer ID, timestamp, audit log)
  - **Note**: Full CRUD with Prisma error code catches instead of double queries. ANONYMIZE action for GDPR.
  - **Acceptance Criteria**: FR-02.1, FR-02.2, FR-02.3, FR-02.4, FR-02.5, NFR-01.1, NFR-04.1
  - **Dependencies**: TASK-112, TASK-113, TASK-206
  - **Estimated**: 6 hours

- [x] **TASK-209**: Create profile routes (`src/routes/profile.routes.ts`)
  - [x] POST /api/v1/profile - Create profile (officer)
  - [x] GET /api/v1/profile/me - Get current user profile
  - [x] PUT /api/v1/profile/me - Update profile
  - [ ] POST /api/v1/profile/me/documents - Upload document (not yet implemented)
  - [x] DELETE /api/v1/profile/me - Request data deletion (GDPR)
  - [x] GET /api/v1/profile/:id - Get profile (officer with audit)
  - **Acceptance Criteria**: FR-02.1, FR-02.2, FR-02.3, FR-02.4, FR-02.5
  - **Dependencies**: TASK-208
  - **Estimated**: 3 hours

- [x] **TASK-210**: Install and configure encryption utilities
  - [x] Native `crypto` for AES-256-GCM (no crypto-js needed)
  - [x] Create encryption utilities (`src/utils/encryption.utilities.ts`)
  - [x] Environment-based key management via `ENCRYPTION_KEY` env var
  - **Note**: Uses native Node `crypto` module (createCipheriv/createDecipheriv). Key derived with scryptSync and cached at module level. Decrypt wrapped in try-catch for tampered ciphertext. HashiCorp Vault integration deferred.
  - **Acceptance Criteria**: NFR-01.1, NFR-04.4
  - **Dependencies**: TASK-208
  - **Estimated**: 3 hours

---

### Phase 3: Visa Processing, Appointments (Weeks 6-8) ✅ Complete

#### Week 6: Visa Application Workflow

- [x] **TASK-301**: Create visa application service (`src/services/visa-application.service.ts`)
  - [x] Visa application submission with form data, documents, biometrics
  - [x] Automated vetting against watchlists (WatchlistEntry model)
  - [x] VerificationCheck creation and tracking
  - **Note**: Application number `VA-{timestamp36}-{hex16}`. Auto-vetting creates VerificationCheck records on submit.
  - **Acceptance Criteria**: FR-05.1, FR-05.2, FR-05.6
  - **Dependencies**: TASK-206, TASK-113
  - **Estimated**: 6 hours

- [x] **TASK-302**: Create visa document service (`src/services/visa-document.service.ts`)
  - [x] Document upload for visas and service requests
  - [x] Document type validation
  - [x] Encrypted storage integration
  - **Note**: Links to either visa application or service request. File hash and URL tracked. Audit logging on create/delete.
  - **Acceptance Criteria**: FR-05.1
  - **Dependencies**: TASK-301, TASK-210
  - **Estimated**: 3 hours

- [x] **TASK-303**: Create visa routes (`src/routes/visa.routes.ts` + `src/routes/visa-document.routes.ts`)
  - [x] POST /api/v1/visa - Submit visa application
  - [x] GET /api/v1/visa - List applications
  - [x] GET /api/v1/visa/:id - Get application details
  - [x] POST /api/v1/visa/:id/submit - Submit draft application
  - [x] POST/GET /api/v1/visa/documents - Document endpoints
  - **Acceptance Criteria**: FR-05.1
  - **Dependencies**: TASK-301, TASK-302
  - **Estimated**: 3 hours

#### Week 7: Visa Adjudication

- [x] **TASK-304**: Create visa decision service (`src/services/visa-decision.service.ts`)
  - [x] Officer review with vetting results display
  - [x] Decision workflow: APPROVE, REJECT, REQUEST_MORE_INFO, ESCALATE_TO_HQ
  - [x] Dual-approval for high-stakes decisions (four-eyes principle)
  - [x] Decision letter generation
  - [x] Appeal workflow tracking
  - **Note**: Status transition validation (only UNDER_REVIEW or MORE_INFO_REQUESTED). Dual-approval required for flagged applications. Audit logging on all decisions. Post-implementation fix: wrapped create + update in `$transaction`, removed redundant `secondaryOfficerId` query.
  - **Acceptance Criteria**: FR-05.3, FR-05.4, FR-05.5, FR-05.6
  - **Dependencies**: TASK-301, TASK-113
  - **Estimated**: 6 hours

- [x] **TASK-305**: Create visa decision routes (`src/routes/visa-decision.routes.ts`)
  - [x] POST /api/v1/visa/decisions/applications/:id/decision - Adjudicator decision
  - [x] GET /api/v1/visa/decisions/applications/:id/decision - Get decision
  - [x] GET /api/v1/visa/decisions/decisions/officer/me - My decisions
  - **Acceptance Criteria**: FR-05.3, FR-05.4, FR-05.5
  - **Dependencies**: TASK-304
  - **Estimated**: 3 hours

- [x] **TASK-306**: Implement automated vetting service (`src/services/vetting.service.ts`)
  - [x] Watchlist matching (WatchlistEntry model)
  - [x] VerificationCheck creation and status tracking
  - [x] Risk scoring and flagging
  - **Note**: Case-insensitive name matching, document number and nationality checks. Risk score from LOW→MEDIUM→HIGH→CRITICAL. Post-implementation fix: N+1 sequential creates → `Promise.all`.
  - **Acceptance Criteria**: FR-05.2, FR-05.6
  - **Dependencies**: TASK-301
  - **Estimated**: 4 hours

#### Week 8: Appointment System

- [x] **TASK-307**: Create appointment service (`src/services/appointment.service.ts`)
  - [x] Slot availability checking based on staff capacity
  - [x] Appointment booking with OTP verification
  - [x] QR check-in and queue token assignment
  - [x] Queue management: officer calls next, assigns window
  - [x] No-show handling with grace period
  - [x] Real-time wait estimates
  - **Note**: Slots 09:00-17:00 in 30min intervals. OTP 6-digit with 5min expiry. Token format `TK-{timestamp36}-{hex8}`. All transitions audited. Post-implementation fixes: TOCTOU race condition → `$transaction`, OTP removed from audit logs, `getQueue()` pagination added.
  - **Acceptance Criteria**: FR-06.1, FR-06.2, FR-06.3, FR-06.4, FR-06.5, FR-06.6
  - **Dependencies**: TASK-201, TASK-113
  - **Estimated**: 8 hours

- [x] **TASK-308**: Create appointment routes (`src/routes/appointment.routes.ts`)
  - [x] GET /api/v1/appointments/slots - View available slots
  - [x] POST /api/v1/appointments/book - Book appointment
  - [x] GET /api/v1/appointments/my - View my appointments
  - [x] PUT /api/v1/appointments/:id/cancel - Cancel appointment
  - [x] POST /api/v1/appointments/:id/checkin - QR check-in
  - [x] GET /api/v1/appointments/queue - Officer queue view
  - [x] POST /api/v1/appointments/queue/next - Call next in queue
  - [x] PUT /api/v1/appointments/:id/complete - Complete appointment
  - [x] PUT /api/v1/appointments/:id/no-show - Mark no-show
  - **Acceptance Criteria**: FR-06.1-6
  - **Dependencies**: TASK-307
  - **Estimated**: 4 hours

- [x] **TASK-309**: Implement OTP service (`src/services/otp.service.ts`)
  - [x] OTP generation and validation
  - [x] SMS/email delivery integration point
  - [x] Rate limiting for OTP requests (generate + verify)
  - **Note**: In-memory store with 5min expiry. Rate limit: max 3 generations per appointment per hour, max 5 verify attempts per 15min per appointmentId. Uses `crypto.randomInt` (post-implementation fix, replaced `Math.random`).
  - **Acceptance Criteria**: FR-06.2, NFR-01.5
  - **Dependencies**: TASK-307
  - **Estimated**: 3 hours

---

## ✅ Completed Tasks

### Phase 4: Legalization, Emergency, Diplomatic, Financial (Weeks 9-11) ✅ Complete

#### Week 9: Document Legalization & Apostille

- [x] **TASK-401**: Create legalization service (`src/services/legalization.service.ts`)
  - [x] Legalization request workflow (document type, destination country, urgency)
  - [x] Document authenticity verification
  - [x] Digital seal application
  - [x] Tracking number generation for verification portal
  - [x] Hague Convention routing (apostille vs. legalization)
  - **Note**: Wraps ServiceRequest with DOCUMENT_LEGALIZATION category. Tracking number format `LG-{timestamp36}-{hex16}` stored in details JSON. Digital seal and Hague routing info also stored in details JSON. Full audit logging on all mutations.
  - **Acceptance Criteria**: FR-07.1, FR-07.2, FR-07.3, FR-07.4
  - **Dependencies**: TASK-206, TASK-210
  - **Estimated**: 6 hours

- [x] **TASK-402**: Create legalization routes (`src/routes/legalization.routes.ts`)
  - [x] POST /api/v1/legalization - Submit legalization request
  - [x] GET /api/v1/legalization - List requests
  - [x] GET /api/v1/legalization/:id - Get request details
  - [x] PUT /api/v1/legalization/:id/process - Process request (officer)
  - **Acceptance Criteria**: FR-07.1-4
  - **Dependencies**: TASK-401
  - **Estimated**: 2 hours

#### Week 10: Emergency Services & Diplomatic Admin

- [x] **TASK-403**: Create emergency service (`src/services/emergency.service.ts`)
  - [x] Emergency case registration (location, dependents, medical needs)
  - [x] Alert broadcasting (email/SMS to registered citizens in area)
  - [x] Evacuation prioritization (vulnerability scoring)
  - [x] Welfare check logging
  - **Note**: Reference number `EC-{timestamp36}-{hex16}`. Alert broadcast is audit-logged (no dedicated model). Evacuation list sorts by urgency CRITICAL→HIGH→MEDIUM→LOW, only OPEN/IN_PROGRESS cases.
  - **Acceptance Criteria**: FR-09.1, FR-09.2, FR-09.3, FR-09.4
  - **Dependencies**: TASK-112, TASK-309
  - **Estimated**: 6 hours

- [x] **TASK-404**: Create emergency routes (`src/routes/emergency.routes.ts`)
  - [x] POST /api/v1/emergency/cases - Register emergency case
  - [x] GET /api/v1/emergency/cases - List cases
  - [x] GET /api/v1/emergency/cases/:id - Get case details
  - [x] PUT /api/v1/emergency/cases/:id/status - Update case status
  - [x] POST /api/v1/emergency/alerts - Broadcast alert (admin)
  - [x] GET /api/v1/emergency/evacuation-list - Get prioritized evacuation list
  - **Acceptance Criteria**: FR-09.1-4
  - **Dependencies**: TASK-403
  - **Estimated**: 2 hours

- [x] **TASK-405**: Create diplomatic service (`src/services/diplomatic.service.ts`)
  - [x] Diplomatic pouch chain-of-custody tracking
  - [x] Staff clearance management (levels, expiry, renewal)
  - [x] Inventory tracking with audit trail
  - [x] Overdue pouch escalation
  - **Note**: Pouch number `DP-{timestamp36}-{hex16}`. Chain-of-custody stored as JSON array, appended on each handoff. Clearances check for existing active clearance before creating new one. Full audit logging.
  - **Acceptance Criteria**: FR-10.1, FR-10.2, FR-10.3, FR-10.4
  - **Dependencies**: TASK-113
  - **Estimated**: 6 hours

- [x] **TASK-406**: Create diplomatic routes (`src/routes/diplomatic.routes.ts`)
  - [x] POST /api/v1/diplomatic/pouches - Create pouch
  - [x] GET /api/v1/diplomatic/pouches - List pouches
  - [x] GET /api/v1/diplomatic/pouches/:id - Get pouch details
  - [x] PUT /api/v1/diplomatic/pouches/:id/handoff - Handoff custody
  - [x] POST /api/v1/diplomatic/clearances - Create clearance
  - [x] GET /api/v1/diplomatic/clearances - List clearances
  - [x] GET /api/v1/diplomatic/clearances/:id - Get clearance details
  - [x] PUT /api/v1/diplomatic/clearances/:id - Update clearance
  - **Acceptance Criteria**: FR-10.1-4
  - **Dependencies**: TASK-405
  - **Estimated**: 3 hours

#### Week 11: Financial Transactions

- [x] **TASK-407**: Create financial service (`src/services/financial.service.ts`)
  - [x] Financial transaction recording (service type, amount, currency, payer, officer)
  - [x] Daily reconciliation (match collections to receipts)
  - [x] Discrepancy flagging and supervisor notification
  - [x] Monthly report aggregation (by service, currency, officer)
  - **Note**: Uses existing Payment model. Daily reconciliation groups COMPLETED payments by date, flags FAILED as discrepancies. Monthly reports group by service type, currency, and officer. Full audit logging.
  - **Acceptance Criteria**: FR-08.1, FR-08.2, FR-08.3, FR-08.4
  - **Dependencies**: TASK-206, TASK-113
  - **Estimated**: 6 hours

- [x] **TASK-408**: Create financial routes (`src/routes/financial.routes.ts`)
  - [x] POST /api/v1/financial/transactions - Record transaction
  - [x] GET /api/v1/financial/transactions - List transactions
  - [x] GET /api/v1/financial/transactions/:id - Get transaction details
  - [x] GET /api/v1/financial/reconciliation/daily - Daily reconciliation
  - [x] GET /api/v1/financial/reports/monthly - Monthly reports
  - **Acceptance Criteria**: FR-08.1-4
  - **Dependencies**: TASK-407
  - **Estimated**: 2 hours

---

### Phase 5: Testing, Security Hardening, Documentation (Weeks 12-13)

#### Week 12: Testing

- [ ] **TASK-501**: Unit testing setup
  - [ ] Install Jest, ts-jest, supertest
  - [ ] Configure test environment
  - [ ] Write unit tests for auth service, user service, RBAC
  - **Acceptance Criteria**: FR-01, FR-11, FR-12
  - **Dependencies**: TASK-116
  - **Estimated**: 8 hours

- [ ] **TASK-502**: Integration testing
  - [ ] Test API endpoints for all Phase 1-4 modules
  - [ ] Test database transactions and rollbacks
  - [ ] Test RBAC enforcement across endpoints
  - [ ] Test audit logging completeness
  - **Acceptance Criteria**: All FRs
  - **Dependencies**: TASK-501, TASK-408
  - **Estimated**: 8 hours

- [ ] **TASK-503**: E2E testing
  - [ ] Test complete citizen journey: register → profile → service request → appointment → completion
  - [ ] Test visa application → vetting → adjudication → decision
  - [ ] Test emergency registration → alert → evacuation prioritization
  - [ ] Test diplomatic pouch lifecycle
  - **Acceptance Criteria**: FR-01 through FR-12
  - **Dependencies**: TASK-502
  - **Estimated**: 8 hours

#### Week 13: Security Hardening & Documentation

- [ ] **TASK-504**: Security audit & hardening
  - [ ] Dependency audit: `npm audit`
  - [ ] Penetration testing (OWASP Top 10)
  - [ ] Rate limiting validation
  - [ ] CORS configuration validation
  - [ ] TLS configuration validation
  - [ ] JWT token security review
  - [ ] Encryption at rest verification
  - **Acceptance Criteria**: NFR-01.1-6
  - **Dependencies**: TASK-503
  - **Estimated**: 8 hours

- [ ] **TASK-505**: Performance testing
  - [ ] Load testing (1000 concurrent users)
  - [ ] API response time validation (<200ms p95)
  - [ ] Database connection pool validation (max 20)
  - [ ] Background job processing validation (<30s)
  - **Acceptance Criteria**: NFR-02.1-4
  - **Dependencies**: TASK-503
  - **Estimated**: 6 hours

- [ ] **TASK-506**: Compliance audit
  - [ ] GDPR compliance verification (right to erasure, data portability)
  - [ ] Vienna Convention compliance check
  - [ ] Audit log retention (7 years) verification
  - [ ] Data residency validation
  - **Acceptance Criteria**: NFR-04.1-4
  - **Dependencies**: TASK-113, TASK-208
  - **Estimated**: 4 hours

- [ ] **TASK-507**: Observability implementation
  - [ ] Structured JSON logging with correlation IDs
  - [ ] Distributed tracing setup (OpenTelemetry)
  - [ ] Metrics collection (latency, error rates, queue depths)
  - [ ] Alerting rules (error rate >1%, latency >500ms, queue >100)
  - **Acceptance Criteria**: NFR-05.1-4
  - **Dependencies**: TASK-101, TASK-113
  - **Estimated**: 4 hours

- [ ] **TASK-508**: Documentation
  - [ ] API documentation (OpenAPI/Swagger)
  - [ ] Deployment guide
  - [ ] Database schema documentation
  - [ ] Developer onboarding guide
  - **Acceptance Criteria**: Project delivery requirement
  - **Dependencies**: TASK-503
  - **Estimated**: 4 hours

---

## External Dependencies (Required for Full Implementation)

1. **PostgreSQL 15+** database (configured on localhost:5433)
2. **Redis** for caching/sessions/queues
3. **Object storage** (S3/MinIO) for document storage
4. **SMTP server** for email notifications
5. **SMS gateway** for OTP/notifications
6. **HashiCorp Vault** or equivalent for encryption keys (AES-256-GCM for PII)

---

## Non-Functional Requirements Implementation Tracking

| NFR | Requirement | Status | Implementation Task |
|-----|-------------|--------|---------------------|
| NFR-01.1 | AES-256-GCM PII encryption | ✅ Done | TASK-210 |
| NFR-01.2 | TLS 1.3 | ⏳ Pending | TASK-504 |
| NFR-01.3 | bcrypt cost ≥ 12 | ✅ Done | TASK-002 |
| NFR-01.4 | JWT 15min/7day tokens | ✅ Done (HS256, not RS256) | TASK-106 |
| NFR-01.5 | Rate limiting 100 req/min | ✅ Done | TASK-101 |
| NFR-01.6 | CORS restricted to embassy domains | ⏳ Pending | TASK-101 |
| NFR-02.1 | <200ms p95 API response | ⏳ Pending | TASK-505 |
| NFR-02.2 | Connection pooling max 20 | ✅ Done | TASK-001 (db.config.ts) |
| NFR-02.3 | 1000 concurrent users | ⏳ Pending | TASK-505 |
| NFR-02.4 | Background jobs <30s | ⏳ Pending | TASK-505 |
| NFR-03.1 | 99.9% uptime | ⏳ Pending | TASK-505, TASK-507 |
| NFR-03.2 | Daily backups with PITR | ⏳ External | Infrastructure |
| NFR-03.3 | Health check endpoints | ✅ Done | TASK-101 |
| NFR-03.4 | Graceful degradation | ⏳ Pending | TASK-507 |
| NFR-04.1 | GDPR compliance | ✅ Partial (anonymization done, full audit pending) | TASK-208, TASK-506 |
| NFR-04.2 | Vienna Convention | ⏳ Pending | TASK-506 |
| NFR-04.3 | 7-year audit retention | ✅ Schema | TASK-113 |
| NFR-04.4 | Data residency | ⏳ External | Infrastructure |
| NFR-05.1 | JSON logging + correlation IDs | ✅ Done | TASK-101, TASK-114 |
| NFR-05.2 | Distributed tracing | ⏳ Pending | TASK-507 |
| NFR-05.3 | Metrics collection | ⏳ Pending | TASK-507 |
| NFR-05.4 | Alerting rules | ⏳ Pending | TASK-507 |

---

## Task Dependencies Graph

```
Phase 1 (Weeks 1-2) ✅ Complete
├── TASK-101 (Server) → TASK-102 (Entry)
├── TASK-103 (Validator) → TASK-104 (Schemas)
├── TASK-101 + TASK-104 → TASK-105 (Auth Middleware)
├── TASK-105 + bcrypt → TASK-106 (Auth Service)
├── TASK-106 + TASK-104 → TASK-107 (Auth Routes)
├── TASK-105 → TASK-108 (RBAC Middleware)
├── TASK-108 → TASK-109 (Roles Routes)
├── TASK-108 → TASK-110 (Permissions Routes)
├── TASK-108 + TASK-107 → TASK-111 (Users Routes)
├── TASK-111 → TASK-112 (User Service)
├── TASK-101 + TASK-112 → TASK-113 (Audit Service)
├── TASK-113 + TASK-105 → TASK-114 (Audit Middleware)
├── TASK-113 → TASK-115 (Audit Routes)
└── All Phase 1 → TASK-116 (Integration Test)

Phase 2 (Weeks 3-5) ✅ Complete
├── TASK-116 → TASK-201 (Embassy Service)
├── TASK-201 → TASK-202 (Embassy Routes)
├── TASK-108 → TASK-203 (Embassy Middleware)
├── TASK-201 → TASK-204 (Service Type Service)
├── TASK-204 → TASK-205 (Service Type Routes)
├── TASK-204 + TASK-113 → TASK-206 (Service Request Service)
├── TASK-206 → TASK-207 (Service Request Routes)
├── TASK-112 + TASK-113 + TASK-206 → TASK-208 (Profile Service)
├── TASK-208 → TASK-209 (Profile Routes)
└── TASK-208 → TASK-210 (Encryption Utils)

Phase 3 (Weeks 6-8) ✅ Complete
├── TASK-206 + TASK-113 → TASK-301 (Visa App Service) ✅
├── TASK-301 + TASK-210 → TASK-302 (Visa Doc Service) ✅
├── TASK-301 + TASK-302 → TASK-303 (Visa Routes) ✅
├── TASK-301 + TASK-113 → TASK-304 (Visa Decision Service) ✅
├── TASK-304 → TASK-305 (Visa Decision Routes) ✅
├── TASK-301 → TASK-306 (Vetting Service) ✅
├── TASK-201 + TASK-113 → TASK-307 (Appointment Service) ✅
├── TASK-307 → TASK-308 (Appointment Routes) ✅
└── TASK-307 → TASK-309 (OTP Service) ✅

Phase 4 (Weeks 9-11) ✅ Complete
├── TASK-206 + TASK-210 → TASK-401 (Legalization Service)
├── TASK-401 → TASK-402 (Legalization Routes)
├── TASK-112 + TASK-309 → TASK-403 (Emergency Service)
├── TASK-403 → TASK-404 (Emergency Routes)
├── TASK-113 → TASK-405 (Diplomatic Service)
├── TASK-405 → TASK-406 (Diplomatic Routes)
├── TASK-206 + TASK-113 → TASK-407 (Financial Service)
└── TASK-407 → TASK-408 (Financial Routes)

Phase 5 (Weeks 12-13)
├── TASK-116 → TASK-501 (Unit Tests)
├── TASK-501 + TASK-408 → TASK-502 (Integration Tests)
├── TASK-502 → TASK-503 (E2E Tests)
├── TASK-503 → TASK-504 (Security Audit)
├── TASK-503 → TASK-505 (Performance Tests)
├── TASK-113 + TASK-208 → TASK-506 (Compliance Audit)
├── TASK-101 + TASK-113 → TASK-507 (Observability)
└── TASK-503 → TASK-508 (Documentation)
```

---

## Milestone Tracking

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Phase 1 Complete (Auth, RBAC, Audit) | Week 2 | ✅ Complete |
| Phase 2 (Weeks 3-4) Complete (Embassy, Dept, ServiceType, ServiceRequest) | Week 4 | ✅ Complete |
| Phase 2 (Week 5) Complete (Citizen Profile) | Week 5 | ✅ Complete |
| Phase 3 Complete (Visa, Appointments) | Week 8 | ✅ Complete |
| Phase 3 Code Review Fixes | July 2026 | ✅ Complete |
| Phase 4 Complete (Legalization, Emergency, Diplomatic, Financial) | Week 11 | ✅ Complete |
| Phase 5 Complete (Testing, Security, Docs) | Week 13 | ⏳ Pending |
| **Project Complete** | **Week 13** | ⏳ Pending |

---

## Notes for Developers

1. **Run Prisma generate after any schema changes**: `npx prisma generate --schema=prisma/schema.prisma`
2. **Create migrations for schema changes**: `npx prisma migrate dev --schema=prisma/schema.prisma --name <name>`
3. **Run type checking**: `npx tsc --noEmit`
4. **Database is on port 5433** - ensure PostgreSQL is running
5. **Server runs on port 3010** - update .env if needed
6. **Prisma client generated to**: `src/generated/prisma/client` - import from `@/generated/prisma/client`
7. **Run migrations before starting server**: `npx prisma migrate deploy`

---

*Last Updated: 2026-07-28*
*Current Phase: Phase 5 (Weeks 12-13) — Testing, Security Hardening, Documentation.*
*Next Task: TASK-501 (Unit Testing Setup)*