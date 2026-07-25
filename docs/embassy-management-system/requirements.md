# Embassy Management System - Requirements Specification

## Project Overview

**Project Name:** Embassy Management System (EMS)
**Type:** Node.js/TypeScript Backend (Express.js + Prisma ORM + PostgreSQL)
**Timeline:** 13 weeks (5 phases)
**Context:** Cloud Computing course project (Aptech) - following existing project structure from root Cloud Computing folder

---

## Functional Requirements

### FR-01: Authentication & Authorization System
**User Story:** As a system user, I want secure authentication and role-based access control, so that only authorized personnel can access consular functions.

#### Acceptance Criteria (EARS Format):
1. WHEN user provides valid email and password THEN system SHALL authenticate and return JWT access token (15 min) and refresh token (7 days)
2. WHEN user provides invalid credentials THEN system SHALL return 401 with "invalid credentials" error
3. WHEN access token expires THEN system SHALL allow refresh using valid refresh token
4. WHEN refresh token is revoked/expired THEN system SHALL require re-authentication
5. WHEN admin creates role THEN system SHALL allow assigning granular permissions (resource:action)
6. WHEN admin assigns role to user THEN system SHALL enforce immediately without re-login
7. IF user has multiple roles THEN system SHALL apply union of permissions
8. WHEN permission checked THEN system SHALL verify against user's effective permissions

### FR-02: User & Profile Management
**User Story:** As a citizen abroad, I want to manage my profile and documents, so that consular services can process my requests efficiently.

#### Acceptance Criteria (EARS Format):
1. WHEN citizen creates profile THEN system SHALL store personal details, contact info, and emergency contacts
2. WHEN citizen uploads document THEN system SHALL encrypt PII fields at rest (AES-256-GCM)
3. WHEN citizen updates profile THEN system SHALL create audit log with old/new values
4. WHEN officer views profile THEN system SHALL log access with officer ID, timestamp, IP hash
5. IF citizen requests data deletion THEN system SHALL anonymize per GDPR (retain audit logs)

### FR-03: Embassy & Department Management
**User Story:** As an admin, I want to manage embassies and their departments, so that services are organized by location and function.

#### Acceptance Criteria (EARS Format):
1. WHEN admin creates embassy THEN system SHALL store name, code, country, city, address, contact info, operating hours
2. WHEN admin creates department THEN system SHALL link to embassy with name, slug, description
3. WHEN user accesses services THEN system SHALL filter by their embassy context

### FR-04: Service Type & Request Management
**User Story:** As a citizen, I want to submit service requests (passport, civil registry, legalization, visa, etc.), so that consular officers can process them.

#### Acceptance Criteria (EARS Format):
1. WHEN admin creates service type THEN system SHALL define name, slug, category, description, fee, duration, appointment requirement
2. WHEN citizen submits service request THEN system SHALL create request with reference number, link to service type and embassy, set status DRAFT
3. WHEN citizen submits request THEN system SHALL change status to SUBMITTED and record timestamp
4. WHEN officer processes request THEN system SHALL allow status transitions: IN_PROGRESS → COMPLETED/CLOSED/CANCELLED
5. WHEN request created THEN system SHALL create audit log entry
6. IF request requires payment THEN system SHALL create Payment record linked to request

### FR-05: Visa Processing Engine
**User Story:** As a visa applicant, I want to submit visa applications with documents, so that consular officers can adjudicate them.

#### Acceptance Criteria (EARS Format):
1. WHEN applicant submits visa application THEN system SHALL accept form data, documents, biometrics
2. WHEN application submitted THEN system SHALL run automated vetting against watchlists
3. WHEN officer reviews THEN system SHALL show vetting results and allow: APPROVE, REJECT, REQUEST_MORE_INFO, ESCALATE
4. WHEN high-stakes decision (diplomatic visa, etc.) THEN system SHALL require dual-approval (four-eyes principle)
5. WHEN decision made THEN system SHALL generate decision letter and update status
6. IF applicant appeals THEN system SHALL track appeal workflow

### FR-06: Appointment & Queue Management
**User Story:** As a citizen, I want to book appointments and check-in via QR code, so that I spend minimal time waiting.

#### Acceptance Criteria (EARS Format):
1. WHEN citizen views available slots THEN system SHALL show real-time availability based on staff capacity
2. WHEN citizen books appointment THEN system SHALL require OTP verification to prevent bot booking
3. WHEN citizen arrives THEN system SHALL allow QR check-in and assign queue token
4. WHEN officer calls next THEN system SHALL display citizen info and assign to window
5. IF citizen no-shows THEN system SHALL release slot after grace period
6. WHEN queue displayed THEN system SHALL show real-time wait estimates

### FR-07: Document Legalization & Apostille
**User Story:** As a document holder, I want to request apostille/legalization services, so that my documents are valid internationally.

#### Acceptance Criteria (EARS Format):
1. WHEN request submitted THEN system SHALL capture document type, destination country, urgency
2. WHEN officer processes THEN system SHALL verify document authenticity and apply digital seal
3. WHEN completed THEN system SHALL generate tracking number for verification portal
4. IF destination country not in Hague Convention THEN system SHALL route to legalization workflow

### FR-08: Payment & Financial Ledger
**User Story:** As finance officer, I want to collect fees, reconcile daily, and generate reports, so that funds are accounted for.

#### Acceptance Criteria (EARS Format):
1. WHEN fee collected THEN system SHALL record service type, amount, currency, payer, officer
2. WHEN daily reconciliation runs THEN system SHALL match collections to issued receipts
3. IF discrepancy found THEN system SHALL flag and notify supervisor
4. WHEN monthly report generated THEN system SHALL aggregate by service, currency, officer

### FR-09: Emergency Services & Crisis Management
**User Story:** As a citizen in crisis, I want to register for evacuation and receive alerts, so that the embassy can assist me.

#### Acceptance Criteria (EARS Format):
1. WHEN emergency registration submitted THEN system SHALL capture location, dependents, medical needs
2. WHEN admin sends alert THEN system SHALL broadcast via email/SMS to registered citizens in area
3. WHEN evacuation list generated THEN system SHALL prioritize by vulnerability (medical, dependents, location)
4. WHEN welfare check conducted THEN system SHALL log response and update status

### FR-10: Diplomatic Administration & Logistics
**User Story:** As diplomatic staff, I want to track pouches, clearances, and inventory, so that operations run smoothly.

#### Acceptance Criteria (EARS Format):
1. WHEN pouch created THEN system SHALL track chain of custody (sender, carrier, receiver, timestamps)
2. WHEN staff clearance requested THEN system SHALL manage levels, expiry, and renewal workflows
3. WHEN inventory item logged THEN system SHALL track assignment, condition, and audit trail
4. IF pouch overdue THEN system SHALL escalate to security officer

### FR-11: Immutable Audit Logging
**User Story:** As compliance officer, I want immutable audit logs of all system actions, so that accountability is maintained.

#### Acceptance Criteria (EARS Format):
1. WHEN any data created/updated/deleted THEN system SHALL create audit log with timestamp, user, action, entity, old/new values
2. WHEN audit log created THEN system SHALL make it immutable (append-only, tamper-evident)
3. WHEN audit log queried THEN system SHALL support filtering by user, entity, date range, action type
4. IF audit log tampering detected THEN system SHALL alert security team immediately

### FR-12: Role-Based Access Control (RBAC)
**User Story:** As administrator, I want to manage roles and permissions granularly, so that users have minimal necessary access.

#### Acceptance Criteria (EARS Format):
1. WHEN admin creates role THEN system SHALL allow assigning granular permissions (resource:action)
2. WHEN admin assigns role to user THEN system SHALL enforce immediately without re-login
3. IF user has multiple roles THEN system SHALL apply union of permissions
4. WHEN permission checked THEN system SHALL verify against user's effective permissions

---

## Non-Functional Requirements

### NFR-01: Security
1. All PII fields encrypted at rest using AES-256-GCM envelope encryption
2. All API communication over TLS 1.3
3. Passwords hashed with bcrypt (cost ≥ 12)
4. JWT tokens with RS256 signing, 15-min access, 7-day refresh
5. Rate limiting: 100 req/min per IP, 1000 req/min per authenticated user
6. CORS restricted to approved embassy domains

### NFR-02: Performance
1. API response time < 200ms for 95th percentile (simple queries)
2. Database connection pooling with max 20 connections
3. Support 1000 concurrent users
4. Background job processing < 30 seconds for document generation

### NFR-03: Reliability
1. 99.9% uptime SLA
2. Automated daily database backups with point-in-time recovery
3. Health check endpoints for load balancer
4. Graceful degradation when external services unavailable

### NFR-04: Compliance
1. GDPR-compliant data handling (right to erasure, data portability)
2. Vienna Convention on Consular Relations compliance
3. Audit logs retained minimum 7 years
4. Data residency: all data stored within embassy jurisdiction

### NFR-05: Observability
1. Structured logging (JSON) with correlation IDs
2. Distributed tracing for cross-service requests
3. Metrics: request latency, error rates, queue depths
4. Alerting on: error rate > 1%, latency > 500ms, queue backlog > 100

---

## Data Models Summary

### Core Entities (20 models)

1. **User** - Core user entity with roles, status, email verification
2. **Role** - Named roles with permission sets
3. **Permission** - Granular resource:action permissions
4. **RolePermission** - Many-to-many join between Role and Permission
5. **Profile** - Extended user profile (gender, DOB, avatar, bio, address)
6. **RefreshToken** - JWT refresh tokens with revocation support
7. **AuditLog** - Comprehensive audit trail for all entity changes

### Embassy Domain
8. **Embassy** - Embassy locations with contact info
9. **Department** - Embassy departments
10. **ServiceType** - Consular service definitions with categories, fees, duration
11. **ServiceRequest** - Citizen service requests (passport, civil registry, legalization, visa, notarial, consular report)
12. **Payment** - Financial transactions for services and visas

### Visa Processing
13. **VisaApplication** - Visa requests with types, statuses, decisions
14. **VisaDocument** - Document uploads for visas and service requests
15. **VisaDecision** - Adjudication decisions with dual-approval support
16. **VerificationCheck** - Automated vetting checks for visa applications

### Appointments & Security
17. **Appointment** - Scheduled appointments with QR check-in and queue management
18. **WatchlistEntry** - Security watchlist with risk levels

### Emergency & Diplomatic
19. **EmergencyCase** - Crisis/evacuation registrations with urgency levels
20. **DiplomaticPouch** - Chain-of-custody tracking for diplomatic pouches
21. **StaffClearance** - Diplomatic staff security clearances

### Enums (15)
- UserStatus: PENDING, ACTIVE, INACTIVE, SUSPENDED
- Gender: MALE, FEMALE
- VisaType: TOURIST, BUSINESS, WORK, STUDENT, DIPLOMATIC, TRANSIT, MEDIA, MEDICAL, FAMILY_REUNION
- VisaStatus: DRAFT, SUBMITTED, UNDER_REVIEW, MORE_INFO_REQUESTED, APPROVED, REJECTED, ESCALATED, ISSUED
- AppointmentStatus: AVAILABLE, BOOKED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
- ServiceCategory: PASSPORT, CIVIL_REGISTRY, EMERGENCY_ASSISTANCE, DOCUMENT_LEGALIZATION, VISA, NOTARIAL, CONSULAR_REPORT
- RequestStatus: DRAFT, SUBMITTED, IN_PROGRESS, COMPLETED, CLOSED, CANCELLED
- DocumentType: PASSPORT, BIOMETRIC, PHOTOGRAPH, NATIONAL_ID, BIRTH_CERTIFICATE, MARRIAGE_CERTIFICATE, DEATH_CERTIFICATE, TRAVEL_INSURANCE, INVITATION_LETTER, SUPPORTING_DOCUMENT, OTHER
- PaymentStatus: PENDING, COMPLETED, FAILED, REFUNDED, CANCELLED
- DecisionType: APPROVE, REJECT, REQUEST_MORE_INFO, ESCALATE_TO_HQ
- UrgencyLevel: LOW, MEDIUM, HIGH, CRITICAL
- CheckStatus: PENDING, IN_PROGRESS, CLEARED, FLAGGED, ERROR
- CaseStatus: OPEN, IN_PROGRESS, RESOLVED, CLOSED
- PouchStatus: CREATED, IN_TRANSIT, RECEIVED, CLOSED, LOST
- ClearanceLevel: LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5

---

## API Endpoints Summary

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

### Users & Roles
- GET /api/users/me
- PUT /api/users/me
- GET /api/users/:id (admin)
- GET /api/roles
- POST /api/roles (admin)
- PUT /api/roles/:id (admin)
- GET /api/permissions

### Embassy & Department
- GET /api/embassies
- POST /api/embassies (admin)
- GET /api/embassies/:id
- GET /api/departments
- POST /api/departments (admin)

### Service Types & Requests
- GET /api/service-types
- POST /api/service-types (admin)
- POST /api/service-requests
- GET /api/service-requests
- GET /api/service-requests/:id
- PUT /api/service-requests/:id/status (officer)

### Visa Processing
- POST /api/visa/applications
- GET /api/visa/applications
- GET /api/visa/applications/:id
- PUT /api/visa/applications/:id/review (officer)
- POST /api/visa/applications/:id/decision (adjudicator)
- POST /api/visa/applications/:id/dual-approval (adjudicator)

### Appointments
- GET /api/appointments/slots
- POST /api/appointments/book
- GET /api/appointments/my
- PUT /api/appointments/:id/cancel
- POST /api/appointments/:id/checkin (QR)
- GET /api/appointments/queue (officer)
- POST /api/appointments/queue/next (officer)

### Document Legalization (via ServiceRequest with DOCUMENT_LEGALIZATION category)
- POST /api/service-requests (category: DOCUMENT_LEGALIZATION)
- GET /api/service-requests
- PUT /api/service-requests/:id/process (officer)

### Emergency Services
- POST /api/emergency/cases
- GET /api/emergency/cases
- POST /api/emergency/alerts (admin)
- GET /api/emergency/evacuation-list

### Diplomatic Admin
- POST /api/diplomatic/pouches
- GET /api/diplomatic/pouches
- PUT /api/diplomatic/pouches/:id/handoff
- POST /api/diplomatic/clearances
- GET /api/diplomatic/clearances

### Financial
- POST /api/financial/transactions
- GET /api/financial/transactions
- GET /api/financial/reconciliation/daily
- GET /api/financial/reports/monthly

### Audit
- GET /api/audit/logs
- GET /api/audit/logs/:id
- GET /api/audit/export

---

## Acceptance Criteria Summary

| Requirement | Priority | Test Strategy |
|-------------|----------|---------------|
| FR-01 Auth & RBAC | P0 | Unit + Integration tests |
| FR-02 User & Profile | P0 | Unit + Integration tests |
| FR-03 Embassy & Department | P1 | Integration tests |
| FR-04 Service Types & Requests | P0 | Integration + E2E tests |
| FR-05 Visa Processing | P0 | Unit + Integration + E2E tests |
| FR-06 Appointments | P1 | Integration + E2E tests |
| FR-07 Legalization | P2 | Integration tests |
| FR-08 Payments | P1 | Integration tests |
| FR-09 Emergency | P1 | Integration + E2E tests |
| FR-10 Diplomatic Admin | P2 | Integration tests |
| FR-11 Audit Logging | P0 | Unit + Integration tests |
| FR-12 RBAC | P0 | Unit + Integration tests |
| NFR-01 Security | P0 | Security audit + Pen testing |
| NFR-02 Performance | P1 | Load testing |
| NFR-03 Reliability | P1 | Chaos engineering |
| NFR-04 Compliance | P0 | Compliance audit |
| NFR-05 Observability | P1 | Monitoring validation |

---

## Dependencies & Constraints

### External Dependencies
1. PostgreSQL 15+ database
2. Redis for caching/sessions/queues
3. Object storage (S3/MinIO) for documents
4. SMTP server for email notifications
5. SMS gateway for OTP/notifications
6. HashiCorp Vault or equivalent for encryption keys

### Technical Constraints
1. Must follow existing project structure from Cloud Computing root folder
2. Must use Prisma ORM with PostgreSQL adapter
3. Must use Express.js v5 with TypeScript
4. Must implement JWT authentication with refresh tokens
5. Must use bcrypt for password hashing
6. Must follow existing Prisma client generation pattern (output to ../src/generated/prisma)

### Timeline Constraints
- Phase 1 (Auth, Users, Roles, Audit): 2 weeks
- Phase 2 (Embassy, Services, Requests): 3 weeks
- Phase 3 (Visa, Appointments): 3 weeks
- Phase 4 (Legalization, Emergency, Diplomatic, Financial): 3 weeks
- Phase 5 (Testing, Security Hardening, Documentation): 2 weeks