# Database Schema

## Overview

PostgreSQL 15+ database using Prisma ORM v7.9. The schema defines 21 models and 15 enums across 8 domain groups.

## Enums

| Enum | Values | Used By |
|------|--------|---------|
| `UserStatus` | `PENDING`, `ACTIVE`, `INACTIVE`, `SUSPENDED` | User |
| `Gender` | `MALE`, `FEMALE`, `PREFER_NOT_TO_SAY` | Profile |
| `VisaType` | `TOURIST`, `BUSINESS`, `WORK`, `STUDENT`, `DIPLOMATIC`, `TRANSIT`, `MEDIA`, `MEDICAL`, `FAMILY_REUNION` | VisaApplication |
| `VisaStatus` | `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `MORE_INFO_REQUESTED`, `APPROVED`, `REJECTED`, `ESCALATED`, `ISSUED` | VisaApplication |
| `AppointmentStatus` | `AVAILABLE`, `BOOKED`, `CHECKED_IN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW` | Appointment |
| `ServiceCategory` | `PASSPORT`, `CIVIL_REGISTRY`, `EMERGENCY_ASSISTANCE`, `DOCUMENT_LEGALIZATION`, `VISA`, `NOTARIAL`, `CONSULAR_REPORT` | ServiceType |
| `RequestStatus` | `DRAFT`, `SUBMITTED`, `IN_PROGRESS`, `COMPLETED`, `CLOSED`, `CANCELLED` | ServiceRequest |
| `DocumentType` | `PASSPORT`, `BIOMETRIC`, `PHOTOGRAPH`, `NATIONAL_ID`, `BIRTH_CERTIFICATE`, `MARRIAGE_CERTIFICATE`, `DEATH_CERTIFICATE`, `TRAVEL_INSURANCE`, `INVITATION_LETTER`, `SUPPORTING_DOCUMENT`, `OTHER` | VisaDocument |
| `PaymentStatus` | `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`, `CANCELLED` | Payment |
| `DecisionType` | `APPROVE`, `REJECT`, `REQUEST_MORE_INFO`, `ESCALATE_TO_HQ` | VisaDecision |
| `UrgencyLevel` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` | EmergencyCase |
| `CheckStatus` | `PENDING`, `IN_PROGRESS`, `CLEARED`, `FLAGGED`, `ERROR` | VerificationCheck |
| `CaseStatus` | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` | EmergencyCase |
| `PouchStatus` | `CREATED`, `IN_TRANSIT`, `RECEIVED`, `CLOSED`, `LOST` | DiplomaticPouch |
| `ClearanceLevel` | `LEVEL_1` through `LEVEL_5` | StaffClearance |

## Models by Domain

### 1. Core Auth (6 models)

**User** — Central identity record. Every person in the system has one.
- PK: `userid` (uuid)
- Unique: `email`, `phone`
- FK: `roleId` → Role
- Status lifecycle: `PENDING` → `ACTIVE` → `INACTIVE | SUSPENDED`
- Relations: Profile (1:1), RefreshToken (1:1), Role (N:1), ServiceRequest (1:N), Appointment (1:N), VisaApplication (1:N), Payment (1:N), EmergencyCase (1:N), StaffClearance (1:1), VisaDecision as officer or secondary officer

**Role** — Named group of permissions.
- PK: `id` (uuid)
- Unique: `slug`
- Relations: RolePermission (1:N), User (1:N)

**Permission** — Individual action capability (format: `resource:action`).
- PK: `id` (uuid)
- Unique: `slug`
- Relations: RolePermission (1:N)

**RolePermission** — Many-to-many join between Role and Permission.
- PK: `(roleId, permissionId)` composite
- FK: `roleId` → Role (cascade delete), `permissionId` → Permission (cascade delete)

**Profile** — Extended user information (gender, DOB, location).
- PK: `id` (uuid, also FK → User.userid) — 1:1 with cascade delete
- Gender via `Gender` enum

**RefreshToken** — JWT refresh token tracking.
- PK: `id` (uuid)
- Unique: `token`, `userId`
- FK: `userId` → User (cascade delete)
- Fields: `ipAddress`, `userAgent`, `isRevoked`, `expiresAt`

### 2. Audit (1 model)

**AuditLog** — Immutable record of all data mutations.
- PK: `id` (uuid)
- FK: `userId` → User (optional)
- Fields: `action` (CREATE/UPDATE/DELETE), `entity`, `entityId`, `description`, `metaData` (Json), `changes` (Json), `ipAddress`, `userAgent`
- Retention: 7 years (2555 days), auto-purged by `AuditService.purgeOldLogs()`

### 3. Embassy (2 models)

**Embassy** — Diplomatic mission location.
- PK: `id` (uuid)
- Unique: `code`
- Fields: `name`, `country`, `city`, `address`, `phone?`, `email?`, `operatingHours?`
- Relations: Department (1:N), ServiceRequest (1:N), Appointment (1:N), VisaApplication (1:N), EmergencyCase (1:N), DiplomaticPouch (1:N as origin and destination)

**Department** — Organizational unit within an embassy.
- PK: `id` (uuid)
- Unique: `slug`
- FK: `embassyId` → Embassy (cascade delete)

### 4. Services (2 models)

**ServiceType** — Catalog of consular services offered.
- PK: `id` (uuid)
- Unique: `slug`
- Fields: `category` (ServiceCategory enum), `description?`, `fee?` (Decimal), `duration?` (Int, minutes), `requiresAppointment?` (Boolean)

**ServiceRequest** — Citizen request for a service.
- PK: `id` (uuid)
- Unique: `referenceNumber` (auto-generated)
- FK: `userId` → User, `serviceTypeId` → ServiceType, `embassyId` → Embassy
- Fields: `status` (RequestStatus enum), `details?` (Json)
- Relations: Appointment (1:N), Payment (1:N), VisaDocument (1:N)

### 5. Visa (3 models)

**VisaApplication** — Visa application record.
- PK: `id` (uuid)
- Unique: `applicationNumber` (auto-generated)
- FK: `userId` → User, `embassyId` → Embassy
- Fields: `visaType` (VisaType enum), `status` (VisaStatus enum), `submittedAt?`, `decisionAt?`
- Relations: VisaDocument (1:N), VisaDecision (1:1), Payment (1:N), VerificationCheck (1:N)

**VisaDocument** — Supporting documents for visa or service requests.
- PK: `id` (uuid)
- FK: `visaApplicationId?` → VisaApplication, `serviceRequestId?` → ServiceRequest
- Fields: `documentType` (DocumentType enum), `fileName`, `fileHash?`, `fileUrl?`

**VisaDecision** — Adjudication outcome for a visa application.
- PK: `id` (uuid)
- FK: `visaApplicationId` (unique) → VisaApplication, `officerId` → User, `secondaryOfficerId?` → User
- Fields: `decision` (DecisionType enum), `remarks?`, `rationale?`

### 6. Booking (2 models)

**Appointment** — Scheduled service appointment.
- PK: `id` (uuid)
- FK: `serviceRequestId` → ServiceRequest, `userId` → User, `embassyId` → Embassy
- Fields: `slotDate`, `slotTime`, `status` (AppointmentStatus enum), `qrCode?`, `checkInAt?`, `tokenNumber?`

**Payment** — Financial transaction record.
- PK: `id` (uuid)
- FK: `serviceRequestId?` → ServiceRequest, `visaApplicationId?` → VisaApplication, `userId` → User
- Fields: `amount` (Decimal), `currency`, `status` (PaymentStatus enum), `paymentMethod?`, `transactionId?`

### 7. Security (3 models)

**VerificationCheck** — Background/security check on visa applications.
- PK: `id` (uuid)
- FK: `visaApplicationId` → VisaApplication, `checkedBy?` → User
- Fields: `checkType`, `result` (Json), `status` (CheckStatus enum), `checkedAt?`

**WatchlistEntry** — Person of interest watchlist.
- PK: `id` (uuid)
- Fields: `fullName`, `documentNumber?`, `nationality?`, `reason`, `riskLevel`, `listedBy` → User, `expiresAt?`, `isActive`

**StaffClearance** — Security clearance for embassy staff.
- PK: `id` (uuid)
- FK: `userId` (unique) → User (cascade delete), `issuedBy` → User
- Fields: `clearanceLevel` (ClearanceLevel enum), `issuedAt`, `expiresAt?`, `isActive`

### 8. Emergency & Diplomatic (2 models)

**EmergencyCase** — Emergency incident registration.
- PK: `id` (uuid)
- Unique: `referenceNumber`
- FK: `userId` → User, `embassyId` → Embassy
- Fields: `urgency` (UrgencyLevel enum), `caseType`, `description?`, `status` (CaseStatus enum), `resolvedAt?`

**DiplomaticPouch** — Secure diplomatic courier tracking.
- PK: `id` (uuid)
- Unique: `pouchNumber`
- FK: `originEmbassyId` → Embassy, `destinationEmbassyId` → Embassy
- Fields: `status` (PouchStatus enum), `dispatchDate`, `receivedDate?`, `chainOfCustody` (Json array of handoff records)

## Relationship Summary

| Model | Owns | Belongs To |
|-------|------|-----------|
| User | Profile, RefreshToken | Role |
| Role | User, RolePermission | — |
| RolePermission | — | Role, Permission |
| Profile | — | User (1:1, cascade) |
| RefreshToken | — | User (1:1, cascade) |
| AuditLog | — | User (optional) |
| Embassy | Department, ServiceRequest, Appointment | — |
| Department | — | Embassy (cascade) |
| ServiceRequest | Appointment, Payment | User, ServiceType, Embassy |
| VisaApplication | VisaDocument, VisaDecision, Payment, VerificationCheck | User, Embassy |
| VisaDocument | — | VisaApplication, ServiceRequest |
| VisaDecision | — | VisaApplication (1:1), User (×2) |
| Appointment | — | ServiceRequest, User, Embassy |
| Payment | — | ServiceRequest, VisaApplication, User |
| StaffClearance | — | User (1:1, cascade), User (issuer) |
| WatchlistEntry | — | User (listedBy) |
| DiplomaticPouch | — | Embassy (origin), Embassy (destination) |
| EmergencyCase | — | User, Embassy |

## Indexes

- Primary keys on all models (uuid)
- Unique indexes on: User.email, User.phone, Role.slug, Permission.slug, RefreshToken.token, RefreshToken.userId, Embassy.code, Department.slug, ServiceType.slug, ServiceRequest.referenceNumber, VisaApplication.applicationNumber, EmergencyCase.referenceNumber, DiplomaticPouch.pouchNumber
- Foreign key indexes on all relation columns (implicit via Prisma)
- Index on AuditLog.createdAt recommended for retention purge queries