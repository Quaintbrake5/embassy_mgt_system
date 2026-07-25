# Embassy Management System - Technical Design Document

## 1. System Overview

The Embassy Management System (EMS) is a comprehensive backend platform for consular services management. Built with Node.js/TypeScript, Express 5, Prisma ORM v7.9, and PostgreSQL 15+, it provides authentication/authorization, citizen profiles, passport services, civil registry, visa processing, appointments, document legalization, emergency services, diplomatic logistics, and financial ledger with immutable audit logging.

### 1.1 Technology Stack
| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Node.js | 20+ LTS |
| Language | TypeScript | 5.6+ |
| Framework | Express.js | 5.x |
| ORM | Prisma ORM | 7.9 |
| Database | PostgreSQL | 15+ |
| Auth | JWT (RS256) + bcrypt | bcrypt cost ≥ 12 |
| Validation | validator.js | 13.12+ |
| Config | dotenv | 16.4+ |

### 1.2 Architecture Pattern
- **Layered Architecture**: Routes → Controllers → Services → Repositories → Prisma/DB
- **RBAC**: Role-based access control with granular permissions (resource:action)
- **Audit-First**: Immutable audit logs for all entity changes
- **Multi-tenant**: Embassy-scoped data isolation via `embassyId`

**Project Status**: Phase 1 (Foundation - Weeks 1-2) - Infrastructure and Auth module in progress
**Database**: PostgreSQL on localhost:5433 (`embassy_mgt_system`)
**Server Port**: 3010

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EMBASSY MANAGEMENT SYSTEM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐   │
│  │   Citizen    │    │   Officer    │    │   Admin      │    │  External│   │
│  │   Portal     │    │   Portal     │    │   Dashboard  │    │  Systems │   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └────┬─────┘   │
│         │                   │                   │                  │        │
│         └───────────────────┼───────────────────┼──────────────────┘        │
│                             ▼                   ▼                           │
│                    ┌─────────────────────────────────────────┐              │
│                    │           API GATEWAY (Express.js v5)    │             │
│                    │  ┌───────────────────────────────────┐   │             │
│                    │  │  Rate Limiter │ CORS │ Auth Middle │   │            │
│                    │  └───────────────────────────────────┘   │             │
│                    └──────────────────┬────────────────────────┘            │
│                                       │                                     │
│         ┌─────────────────────────────┼─────────────────────────────┐       │
│         ▼                             ▼                             ▼       │
│  ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐│
│  │  Auth Module    │         │  Core Services  │         │  Admin Services ││
│  │  - JWT Auth     │         │  - Citizen      │         │  - RBAC Mgmt    ││
│  │  - Refresh Tokens│        │  - Passport     │         │  - Audit Logs   ││
│  │  - RBAC         │         │  - Civil Registry│        │  - System Config││
│  │  - Encryption   │         │  - Visa         │         │  - Financial    ││
│  └────────┬────────┘         │  - Appointments │         │  - Diplomatic   ││
│           │                  │  - Legalization │         └────────┬────────┘│
│           │                  │  - Emergency    │                  │         │
│           │                  │  - Diplomatic   │                  │         │
│           │                  └────────┬────────┘                  │         │
│           │                           │                            │         │
│           ▼                           ▼                            ▼         │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        SERVICE LAYER (Prisma ORM)                       ││
│  │  User │ Role │ Permission │ CitizenProfile │ PassportApp │ CivilRegistry││
│  │  VisaApp │ Appointment │ Legalization │ Emergency │ Pouch │ Clearance   ││
│  │  Financial │ AuditLog │ RefreshToken │ Profile │ Document │ etc.        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                       │                                     │
│                                       ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    POSTGRESQL DATABASE (Prisma + pg adapter)            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │  │
│  │  │   Users     │  │   Roles/    │  │  Citizen    │  │  Services   │    │  │
│  │  │   & Auth    │  │   Perms     │  │  Services   │  │  Domain     │    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │  │
│  │  │  Diplomatic │  │  Financial  │  │  Emergency  │  │   Audit     │    │  │
│  │  │   & Admin   │  │   Ledger    │  │   Services  │  │   Logs      │    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                       │                                        │
│                    ┌──────────────────┴──────────────────┐                   │
│                    │         EXTERNAL SERVICES            │                   │
│                    │  Redis │ S3/MinIO │ SMTP │ SMS │ Vault│                   │
│                    └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema Design (Prisma)

### 3.1 Core Authentication Models

```prisma
enum UserStatus {
  PENDING
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum Gender {
  MALE
  FEMALE
}

model User {
  userid        String        @id @default(uuid())
  firstName     String
  lastName      String
  email         String        @unique
  phone         String?       @unique
  passwordHash  String
  roleId        String?
  emailVerified Boolean       @default(false)
  lastLoginAt   DateTime?
  status        UserStatus    @default(PENDING)
  createdAt     DateTime      @default(now())
  Updated       DateTime      @updatedAt

  roles         UserRole[]
  profile       Profile?
  token         RefreshToken?
  role          Role?         @relation(fields: [roleId], references: [id])
  appointments  Appointment[]
  serviceRequests ServiceRequest[]
  visaApplications VisaApplication[]
  payments      Payment[]
  emergencyCases EmergencyCase[]
  staffClearance StaffClearance?
  clearancesIssued StaffClearance[] @relation("ClearanceIssuer")
  decisions     VisaDecision[] @relation("OfficerDecisions")
  secondaryDecisions VisaDecision[] @relation("SecondaryOfficerDecisions")
  verifications VerificationCheck[]
  watchlistEntries WatchlistEntry[]

  @@index([roleId])
  @@index([status])
}

model Role {
  id              String           @id @default(uuid())
  name            String
  slug            String           @unique
  description     String?
  isSystem        Boolean          @default(false)
  createdAt       DateTime         @default(now())
  Updated         DateTime         @updatedAt

  users           UserRole[]
  permissions     RolePermission[]
}

model Permission {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?
  createdAt   DateTime @default(now())
  Updated     DateTime @updatedAt

  @@unique([resource, action])
  roles       RolePermission[]
}

model RolePermission {
  roleId       String
  permissionId String
  createdAt    DateTime   @default(now())
  Updated      DateTime   @updatedAt
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@index([roleId])
  @@index([permissionId])
}

model UserRole {
  userId String
  roleId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
}
```

### 3.2 Authentication & Security Models

```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String   @unique
  ipAddress String?
  userAgent String?
  isRevoked Boolean  @default(false)
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [userid], onDelete: Cascade)

  @@index([userId])
}

model AuditLog {
  id           String   @id @default(uuid())
  userId       String?
  user         User?    @relation(fields: [userId], references: [userid])
  action       String
  entity       String
  entityId     String
  description  String?
  metaData     Json?
  changes      Json?
  ipAddress    String?
  userAgent    String?
  correlationId String? @index
  createdAt    DateTime @default(now())

  @@index([userId])
  @@index([entity])
  @@index([entityType, entityId])
  @@index([userId, createdAt])
  @@index([correlationId])
}
```

### 3.3 Profile & Citizen Models

```prisma
model Profile {
  id          String   @id @default(uuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [userid], onDelete: Cascade)
  gender      Gender?
  dateOfBirth DateTime?
  avatar      String?
  bio         String?
  city        String?
  state       String?
  country     String?
  postalCode  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 3.4 Embassy & Department Models

```prisma
model Embassy {
  id                  String            @id @default(uuid())
  name                String
  code                String            @unique
  country             String
  city                String
  address             String
  phone               String?
  email               String?
  operatingHours      String?
  createdAt           DateTime          @default(now())
  Updated             DateTime          @updatedAt

  departments         Department[]
  serviceRequests     ServiceRequest[]
  appointments        Appointment[]
  visaApplications    VisaApplication[]
  emergencyCases      EmergencyCase[]
  originPouches       DiplomaticPouch[] @relation("OriginEmbassy")
  destinationPouches  DiplomaticPouch[] @relation("DestinationEmbassy")
}

model Department {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?
  embassyId   String
  createdAt   DateTime @default(now())
  Updated     DateTime @updatedAt
  embassy     Embassy  @relation(fields: [embassyId], references: [id], onDelete: Cascade)

  @@index([embassyId])
}
```

### 3.5 Service Types & Requests

```prisma
enum ServiceCategory {
  PASSPORT
  CIVIL_REGISTRY
  EMERGENCY_ASSISTANCE
  DOCUMENT_LEGALIZATION
  VISA
  NOTARIAL
  CONSULAR_REPORT
}

enum RequestStatus {
  DRAFT
  SUBMITTED
  IN_PROGRESS
  COMPLETED
  CLOSED
  CANCELLED
}

model ServiceType {
  id                  String          @id @default(uuid())
  name                String
  slug                String          @unique
  category            ServiceCategory
  description         String?
  fee                 Decimal?
  duration            Int?
  requiresAppointment Boolean
  createdAt           DateTime        @default(now())
  Updated             DateTime        @updatedAt

  serviceRequests     ServiceRequest[]
}

model ServiceRequest {
  id              String          @id @default(uuid())
  referenceNumber String          @unique
  userId          String
  serviceTypeId   String
  embassyId       String
  status          RequestStatus   @default(DRAFT)
  details         Json?
  submittedAt     DateTime        @default(now())
  createdAt       DateTime        @default(now())
  Updated         DateTime        @updatedAt

  user            User            @relation(fields: [userId], references: [userid])
  serviceType     ServiceType     @relation(fields: [serviceTypeId], references: [id])
  embassy         Embassy         @relation(fields: [embassyId], references: [id])
  appointments    Appointment[]
  payments        Payment[]
  documents       VisaDocument[]

  @@index([userId])
  @@index([serviceTypeId])
  @@index([embassyId])
  @@index([status])
}
```

### 3.6 Visa Processing Models

```prisma
enum VisaType {
  TOURIST
  BUSINESS
  WORK
  STUDENT
  DIPLOMATIC
  TRANSIT
  MEDIA
  MEDICAL
  FAMILY_REUNION
}

enum VisaStatus {
  DRAFT
  SUBMITTED
  UNDER_REVIEW
  MORE_INFO_REQUESTED
  APPROVED
  REJECTED
  ESCALATED
  ISSUED
}

enum DecisionType {
  APPROVE
  REJECT
  REQUEST_MORE_INFO
  ESCALATE_TO_HQ
}

enum CheckStatus {
  PENDING
  IN_PROGRESS
  CLEARED
  FLAGGED
  ERROR
}

model VisaApplication {
  id                String              @id @default(uuid())
  applicationNumber String              @unique
  userId            String
  visaType          VisaType
  embassyId         String
  status            VisaStatus          @default(DRAFT)
  submittedAt       DateTime            @default(now())
  decisionAt        DateTime?
  createdAt         DateTime            @default(now())
  Updated           DateTime            @updatedAt

  user              User                @relation(fields: [userId], references: [userid])
  embassy           Embassy             @relation(fields: [embassyId], references: [id])
  documents         VisaDocument[]
  decision          VisaDecision?
  payments          Payment[]
  verificationChecks VerificationCheck[]

  @@index([userId])
  @@index([embassyId])
  @@index([status])
}

model VisaDocument {
  id                String          @id @default(uuid())
  visaApplicationId String?
  serviceRequestId  String?
  documentType      DocumentType
  fileName          String
  fileHash          String?
  fileUrl           String?
  uploadedAt        DateTime        @default(now())
  createdAt         DateTime        @default(now())

  visaApplication   VisaApplication? @relation(fields: [visaApplicationId], references: [id])
  serviceRequest    ServiceRequest?  @relation(fields: [serviceRequestId], references: [id])

  @@index([visaApplicationId])
  @@index([serviceRequestId])
}

model VisaDecision {
  id                  String          @id @default(uuid())
  visaApplicationId   String          @unique
  officerId           String
  secondaryOfficerId  String?
  decision            DecisionType
  remarks             String?
  rationale           String?
  decidedAt           DateTime        @default(now())
  createdAt           DateTime        @default(now())
  Updated             DateTime        @updatedAt

  visaApplication     VisaApplication @relation(fields: [visaApplicationId], references: [id])
  officer             User            @relation("OfficerDecisions", fields: [officerId], references: [userid])
  secondaryOfficer    User?           @relation("SecondaryOfficerDecisions", fields: [secondaryOfficerId], references: [userid])

  @@index([officerId])
}

model VerificationCheck {
  id                String          @id @default(uuid())
  visaApplicationId String
  checkType         String
  result            Json?
  status            CheckStatus     @default(PENDING)
  checkedBy         String?
  checkedAt         DateTime?
  createdAt         DateTime        @default(now())

  visaApplication   VisaApplication @relation(fields: [visaApplicationId], references: [id])
  checkedByUser     User?           @relation(fields: [checkedBy], references: [userid])

  @@index([visaApplicationId])
  @@index([checkedBy])
}
```

### 3.7 Appointment & Queue Management

```prisma
enum AppointmentStatus {
  AVAILABLE
  BOOKED
  CHECKED_IN
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}

model Appointment {
  id              String             @id @default(uuid())
  serviceRequestId String
  userId          String
  embassyId       String
  slotDate        DateTime
  slotTime        String
  status          AppointmentStatus  @default(AVAILABLE)
  qrCode          String?
  checkInAt       DateTime?
  tokenNumber     String?
  createdAt       DateTime           @default(now())
  Updated         DateTime           @updatedAt

  serviceRequest  ServiceRequest     @relation(fields: [serviceRequestId], references: [id])
  user            User               @relation(fields: [userId], references: [userid])
  embassy         Embassy            @relation(fields: [embassyId], references: [id])

  @@index([serviceRequestId])
  @@index([userId])
  @@index([embassyId])
  @@index([status])
}
```

### 3.8 Financial Models

```prisma
enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
  CANCELLED
}

model Payment {
  id                String           @id @default(uuid())
  serviceRequestId  String?
  visaApplicationId String?
  userId            String
  amount            Decimal
  currency          String
  status            PaymentStatus   @default(PENDING)
  paymentMethod     String?
  transactionId     String?
  paidAt            DateTime?
  createdAt         DateTime        @default(now())

  serviceRequest    ServiceRequest?  @relation(fields: [serviceRequestId], references: [id])
  visaApplication   VisaApplication? @relation(fields: [visaApplicationId], references: [id])
  user              User             @relation(fields: [userId], references: [userid])

  @@index([userId])
  @@index([serviceRequestId])
  @@index([visaApplicationId])
}
```

### 3.9 Emergency Services

```prisma
enum UrgencyLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum CaseStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

model EmergencyCase {
  id              String      @id @default(uuid())
  referenceNumber String      @unique
  userId          String
  embassyId       String
  urgency         UrgencyLevel @default(MEDIUM)
  caseType        String
  description     String?
  status          CaseStatus  @default(OPEN)
  resolvedAt      DateTime?
  createdAt       DateTime    @default(now())
  Updated         DateTime    @updatedAt

  user            User        @relation(fields: [userId], references: [userid])
  embassy         Embassy     @relation(fields: [embassyId], references: [id])

  @@index([userId])
  @@index([embassyId])
  @@index([status])
}
```

### 3.10 Diplomatic Administration

```prisma
enum PouchStatus {
  CREATED
  IN_TRANSIT
  RECEIVED
  CLOSED
  LOST
}

enum ClearanceLevel {
  LEVEL_1
  LEVEL_2
  LEVEL_3
  LEVEL_4
  LEVEL_5
}

model DiplomaticPouch {
  id                  String      @id @default(uuid())
  pouchNumber         String      @unique
  originEmbassyId     String
  destinationEmbassyId String
  status              PouchStatus @default(CREATED)
  dispatchDate        DateTime?
  receivedDate        DateTime?
  chainOfCustody      Json?
  createdAt           DateTime    @default(now())
  Updated             DateTime    @updatedAt

  originEmbassy       Embassy     @relation("OriginEmbassy", fields: [originEmbassyId], references: [id])
  destinationEmbassy  Embassy     @relation("DestinationEmbassy", fields: [destinationEmbassyId], references: [id])

  @@index([originEmbassyId])
  @@index([destinationEmbassyId])
}

model StaffClearance {
  id              String         @id @default(uuid())
  userId          String         @unique
  clearanceLevel  ClearanceLevel
  issuedBy        String
  issuedAt        DateTime       @default(now())
  expiresAt       DateTime?
  isActive        Boolean        @default(true)
  createdAt       DateTime       @default(now())
  Updated         DateTime       @updatedAt

  user            User           @relation(fields: [userId], references: [userid], onDelete: Cascade)
  issuer          User           @relation("ClearanceIssuer", fields: [issuedBy], references: [userid])

  @@index([issuedBy])
}

model WatchlistEntry {
  id             String       @id @default(uuid())
  fullName       String
  documentNumber String?
  nationality    String?
  reason         String
  riskLevel      UrgencyLevel @default(MEDIUM)
  listedAt       DateTime     @default(now())
  listedBy       String
  expiresAt      DateTime?
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  Updated        DateTime     @updatedAt

  listedByUser   User         @relation(fields: [listedBy], references: [userid])

  @@index([listedBy])
}
```

### 3.11 Document Type Enum

```prisma
enum DocumentType {
  PASSPORT
  BIOMETRIC
  PHOTOGRAPH
  NATIONAL_ID
  BIRTH_CERTIFICATE
  MARRIAGE_CERTIFICATE
  DEATH_CERTIFICATE
  TRAVEL_INSURANCE
  INVITATION_LETTER
  SUPPORTING_DOCUMENT
  OTHER
}
```

---

## 4. API Design

### 4.1 API Versioning
- **Strategy**: URL Path Versioning (`/api/v1/...`)
- **Current Version**: v1
- **Base Path**: `/api/v1`

### 4.2 Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Register new user | Public |
| POST | `/api/v1/auth/login` | User login | Public |
| POST | `/api/v1/auth/refresh` | Refresh access token | Refresh Token |
| POST | `/api/v1/auth/logout` | Revoke refresh token | Access Token |
| POST | `/api/v1/auth/forgot-password` | Request password reset | Public |
| POST | `/api/v1/auth/reset-password` | Reset password with token | Public |

### 4.3 User & Role Management

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| GET | `/api/v1/users/me` | Get current user profile | Authenticated |
| PUT | `/api/v1/users/me` | Update own profile | Authenticated |
| GET | `/api/v1/users/:id` | Get user by ID (admin) | `user:read` |
| PUT | `/api/v1/users/:id` | Update user (admin) | `user:update` |
| PUT | `/api/v1/users/:id/status` | Update user status (admin) | `user:update` |
| PUT | `/api/v1/users/:id/role` | Assign role to user (admin) | `role:assign` |
| GET | `/api/v1/roles` | List all roles | `role:read` |
| POST | `/api/v1/roles` | Create role (admin) | `role:create` |
| GET | `/api/v1/roles/:id` | Get role details | `role:read` |
| PUT | `/api/v1/roles/:id` | Update role (admin) | `role:update` |
| DELETE | `/api/v1/roles/:id` | Delete role (admin) | `role:delete` |
| POST | `/api/v1/roles/:id/permissions` | Assign permissions to role | `role:update` |
| GET | `/api/v1/permissions` | List all permissions | `permission:read` |

### 4.4 Embassy & Department

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| GET | `/api/v1/embassies` | List all embassies | `embassy:read` |
| POST | `/api/v1/embassies` | Create embassy (admin) | `embassy:create` |
| GET | `/api/v1/embassies/:id` | Get embassy details | `embassy:read` |
| PUT | `/api/v1/embassies/:id` | Update embassy (admin) | `embassy:update` |
| GET | `/api/v1/departments` | List departments | `department:read` |
| POST | `/api/v1/departments` | Create department (admin) | `department:create` |

### 4.5 Service Types & Requests

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| GET | `/api/v1/service-types` | List service types | `service:read` |
| POST | `/api/v1/service-types` | Create service type (admin) | `service:create` |
| POST | `/api/v1/service-requests` | Submit service request | `request:create` |
| GET | `/api/v1/service-requests` | List service requests | `request:read` |
| GET | `/api/v1/service-requests/:id` | Get request details | `request:read` |
| PUT | `/api/v1/service-requests/:id/status` | Update request status (officer) | `request:update` |

### 4.6 Visa Processing

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| POST | `/api/v1/visa/applications` | Submit visa application | `visa:create` |
| GET | `/api/v1/visa/applications` | List applications | `visa:read` |
| GET | `/api/v1/visa/applications/:id` | Get application details | `visa:read` |
| PUT | `/api/v1/visa/applications/:id/review` | Officer review | `visa:review` |
| POST | `/api/v1/visa/applications/:id/decision` | Adjudicate decision | `visa:decide` |
| POST | `/api/v1/visa/applications/:id/dual-approval` | Dual approval | `visa:dual-approve` |

### 4.7 Appointments

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| GET | `/api/v1/appointments/slots` | Get available slots | `appointment:read` |
| POST | `/api/v1/appointments/book` | Book appointment | `appointment:create` |
| GET | `/api/v1/appointments/my` | List my appointments | `appointment:read` |
| PUT | `/api/v1/appointments/:id/cancel` | Cancel appointment | `appointment:cancel` |
| POST | `/api/v1/appointments/:id/checkin` | QR check-in | `appointment:checkin` |
| GET | `/api/v1/appointments/queue` | Get queue (officer) | `appointment:queue` |
| POST | `/api/v1/appointments/queue/next` | Call next | `appointment:queue` |

### 4.8 Document Legalization

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| POST | `/api/v1/legalization/requests` | Submit request | `legalization:create` |
| GET | `/api/v1/legalization/requests` | List requests | `legalization:read` |
| GET | `/api/v1/legalization/requests/:id` | Get request | `legalization:read` |
| PUT | `/api/v1/legalization/requests/:id/process` | Process request | `legalization:process` |

### 4.9 Emergency Services

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| POST | `/api/v1/emergency/registrations` | Register for emergency | `emergency:register` |
| GET | `/api/v1/emergency/registrations` | List registrations | `emergency:read` |
| POST | `/api/v1/emergency/alerts` | Send alert (admin) | `emergency:alert` |
| GET | `/api/v1/emergency/evacuation-list` | Get evacuation list | `emergency:evacuation` |

### 4.10 Diplomatic Administration

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| POST | `/api/v1/diplomatic/pouches` | Create pouch | `pouch:create` |
| GET | `/api/v1/diplomatic/pouches` | List pouches | `pouch:read` |
| PUT | `/api/v1/diplomatic/pouches/:id/handoff` | Handoff pouch | `pouch:handoff` |
| POST | `/api/v1/diplomatic/clearances` | Request clearance | `clearance:create` |
| GET | `/api/v1/diplomatic/clearances` | List clearances | `clearance:read` |

### 4.11 Financial

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| POST | `/api/v1/financial/transactions` | Record transaction | `financial:create` |
| GET | `/api/v1/financial/transactions` | List transactions | `financial:read` |
| GET | `/api/v1/financial/reconciliation/daily` | Daily reconciliation | `financial:reconcile` |
| GET | `/api/v1/financial/reports/monthly` | Monthly report | `financial:report` |

### 4.12 Audit

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| GET | `/api/v1/audit/logs` | Query audit logs | `audit:read` |
| GET | `/api/v1/audit/logs/:id` | Get log entry | `audit:read` |
| GET | `/api/v1/audit/export` | Export audit logs | `audit:export` |

---

## 5. Security Architecture

### 5.1 Authentication Flow

```
┌─────────┐     POST /login      ┌──────────────┐
│ Client  │ ──────────────────▶  │  Auth Server │
└─────────┘   {email, password}  └──────┬───────┘
        │                               │
        │  {accessToken, refreshToken}  │
        │  accessToken: 15min, RS256    │
        │  refreshToken: 7d, stored     │
        ◀───────────────────────────────┘
        │
        │  GET /api/resource
        │  Authorization: Bearer <accessToken>
        ▼
┌─────────────────────────────────────────────┐
│            API Gateway                      │
│  1. Validate JWT signature (RS256)          │
│  2. Check expiry                            │
│  3. Extract userId, roles, permissions      │
│  4. Rate limit check                        │
└─────────────────────────────────────────────┘
        │
        ▼
   ┌─────────┐
   │ Service │
   └─────────┘

Token Refresh Flow:
┌─────────┐     POST /refresh      ┌──────────────┐
│ Client  │ ────────────────────▶  │  Auth Server │
└─────────┘   {refreshToken}       └──────┬───────┘
        │                                │
        │   Validate: not revoked,       │
        │   not expired, rotate token    │
        │                                │
        ◀────────────────────────────────┘
        │  {newAccessToken, newRefreshToken}
```

### 5.2 RBAC Permission Model

**Permission Format**: `resource:action`

**Examples**:
- `citizen:read`, `citizen:create`, `citizen:update`, `citizen:delete`
- `passport:read`, `passport:create`, `passport:review`
- `visa:decide`, `visa:dual-approve`
- `audit:read`, `audit:export`
- `role:create`, `role:update`, `role:delete`
- `financial:reconcile`
- `emergency:alert`

**Role Hierarchy**:
- **Super Admin**: All permissions
- **Admin**: User/role management, system config, audit
- **Consular Officer**: Passport, visa, civil registry, legalization
- **Visa Officer**: Visa applications, decisions, vetting
- **Front Desk**: Appointments, queue management, check-in
- **Finance Officer**: Payments, reconciliation, reports
- **Emergency Coordinator**: Emergency cases, alerts, evacuation
- **Diplomatic Staff**: Pouches, clearances
- **Citizen**: Own profile, applications, appointments

### 5.3 Encryption Strategy (Envelope Encryption)

```
┌─────────────────────────────────────────────────────────────┐
│                    ENVELOPE ENCRYPTION                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Data (PII)                                                 │
│      │                                                       │
│      ▼                                                       │
│   ┌─────────┐    DEK (Data Encryption Key)                  │
│   │ AES-256 │◀────────────────────────────────────────┐     │
│   │ -GCM    │         Encrypt                        │     │
│   └────┬────┘                                         │     │
│        │                                              │     │
│        ▼                                              │     │
│   Encrypted Data + IV + Auth Tag                       │     │
│        │                                              │     │
│        ▼                                              │     │
│   ┌─────────────────────────────────────────────────┐  │     │
│   │              KEY MANAGEMENT (Vault)              │  │     │
│   │  Master Key (KEK) ────▶ Encrypts DEK            │  │     │
│   │  DEK rotated per document/field                  │  │     │
│   └─────────────────────────────────────────────────┘  │     │
│        │                                              │     │
│        ▼                                              │     │
│   Stored in DB:                                        │     │
│   - encryptedData (BLOB)                               │     │
│   - encryptedDEK (encrypted by KEK)                    │     │
│   - iv, authTag                                        │     │
│   - keyId (references KEK version)                     │     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Rate Limiting

| Tier | Limit | Window |
|------|-------|--------|
| Anonymous IP | 100 req | 1 minute |
| Authenticated User | 1000 req | 1 minute |
| Auth Endpoints | 10 req | 1 minute |
| File Upload | 5 req | 1 minute |

### 5.5 Password Security

- **Algorithm**: bcrypt with cost factor 12
- **Minimum Length**: 12 characters
- **Requirements**: Uppercase, lowercase, number, special character
- **Breach Check**: Check against HaveIBeenPwned API (optional)

---

## 6. Service Layer Architecture

### 6.1 Module Structure

```
src/
├── config/
│   ├── db.config.ts          # Prisma client with pg adapter
│   ├── redis.config.ts       # Redis connection
│   ├── vault.config.ts       # HashiCorp Vault client
│   └── env.config.ts         # Validated env vars
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   ├── refresh-token.service.ts
│   │   ├── password.service.ts
│   │   └── dto/
│   ├── users/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/
│   ├── roles/
│   │   ├── roles.controller.ts
│   │   ├── roles.service.ts
│   │   └── dto/
│   ├── citizens/
│   │   ├── citizens.controller.ts
│   │   ├── citizens.service.ts
│   │   ├── documents.service.ts
│   │   └── dto/
│   ├── passport/
│   │   ├── passport.controller.ts
│   │   ├── passport.service.ts
│   │   ├── lost-stolen.service.ts
│   │   └── dto/
│   ├── civil-registry/
│   │   ├── civil-registry.controller.ts
│   │   ├── civil-registry.service.ts
│   │   ├── certificate.service.ts
│   │   └── dto/
│   ├── visa/
│   │   ├── visa.controller.ts
│   │   ├── visa.service.ts
│   │   ├── vetting.service.ts
│   │   ├── dual-approval.service.ts
│   │   └── dto/
│   ├── appointments/
│   │   ├── appointments.controller.ts
│   │   ├── appointments.service.ts
│   │   ├── queue.service.ts
│   │   ├── otp.service.ts
│   │   └── dto/
│   ├── legalization/
│   │   ├── legalization.controller.ts
│   │   ├── legalization.service.ts
│   │   └── dto/
│   ├── emergency/
│   │   ├── emergency.controller.ts
│   │   ├── emergency.service.ts
│   │   ├── alert.service.ts
│   │   ├── evacuation.service.ts
│   │   └── dto/
│   ├── diplomatic/
│   │   ├── diplomatic.controller.ts
│   │   ├── pouch.service.ts
│   │   ├── clearance.service.ts
│   │   └── dto/
│   ├── financial/
│   │   ├── financial.controller.ts
│   │   ├── transaction.service.ts
│   │   ├── reconciliation.service.ts
│   │   ├── report.service.ts
│   │   └── dto/
│   └── audit/
│       ├── audit.controller.ts
│       ├── audit.service.ts
│       └── dto/
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── permissions.guard.ts
│   ├── interceptors/
│   │   ├── audit.interceptor.ts
│   │   ├── encryption.interceptor.ts
│   │   └── response.interceptor.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── permissions.decorator.ts
│   │   └── roles.decorator.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── pipes/
│   │   └── validation.pipe.ts
│   └── utils/
│       ├── encryption.util.ts
│       ├── pagination.util.ts
│       └── correlation-id.util.ts
├── prisma/
│   └── schema.prisma
└── main.ts
```

### 6.2 Core Service Interfaces

#### Auth Service
```typescript
interface AuthService {
  register(dto: RegisterDto): Promise<AuthResult>
  login(dto: LoginDto): Promise<AuthResult>
  refresh(refreshToken: string): Promise<AuthResult>
  logout(refreshToken: string): Promise<void>
  forgotPassword(email: string): Promise<void>
  resetPassword(token: string, newPassword: string): Promise<void>
  validateUser(userId: string): Promise<User | null>
}

interface AuthResult {
  user: User
  accessToken: string
  refreshToken: string
}
```

#### Audit Service (Immutable Logging)
```typescript
interface AuditService {
  log(entry: AuditEntry): Promise<void>
  query(filter: AuditFilter): Promise<AuditLog[]>
  export(filter: AuditFilter): Promise<ReadableStream>
  verifyIntegrity(): Promise<IntegrityReport>
}

interface AuditEntry {
  userId?: string
  action: string
  entityType: string
  entityId: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  correlationId?: string
}
```

#### Encryption Service
```typescript
interface EncryptionService {
  encrypt(data: string, keyId?: string): Promise<EncryptedData>
  decrypt(encryptedData: EncryptedData): Promise<string>
  rotateKey(keyId: string): Promise<void>
}

interface EncryptedData {
  data: Buffer
  encryptedKey: Buffer
  iv: Buffer
  authTag: Buffer
  keyId: string
}
```

---

## 7. Infrastructure & Deployment

### 7.1 Docker Compose (Development)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: embassy_mgt_system
      POSTGRES_USER: embassy
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U embassy"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  vault:
    image: hashicorp/vault:latest
    ports:
      - "8200:8200"
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: ${VAULT_TOKEN}
      VAULT_DEV_LISTEN_ADDRESS: "0.0.0.0:8200"
    cap_add:
      - IPC_LOCK

  app:
    build: .
    ports:
      - "3010:3010"
    environment:
      DATABASE_URL: postgresql://embassy:${DB_PASSWORD}@postgres:5432/embassy_mgmt
      REDIS_URL: redis://redis:6379
      VAULT_ADDR: http://vault:8200
      VAULT_TOKEN: ${VAULT_TOKEN}
      MINIO_ENDPOINT: minio:9000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
      vault:
        condition: service_started

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### 7.2 Environment Variables

```env
# Database
DATABASE_URL=postgresql://embassy:password@localhost:5433/embassy_mgt_system
DB_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379
REDIS_TLS=false

# JWT
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800
JWT_ISSUER=embassy-mgmt
JWT_AUDIENCE=embassy-api

# Encryption
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=dev-token
ENCRYPTION_KEY_ID=embassy-data-key-v1

# Storage
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=embassy-documents
MINIO_USE_SSL=false

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=embassy@example.com
SMTP_PASS=password
EMAIL_FROM=Embassy Management <noreply@embassy.gov>

# SMS
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM_NUMBER=+15551234567

# App
PORT=3010
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# Monitoring
LOG_LEVEL=debug
ENABLE_TRACING=true
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
```

---

## 8. Implementation Phases

### Phase 1: Foundation (Weeks 1-2) ✅ In Progress
**Goal**: Auth, Users, Roles, Permissions, Audit Logging

**Completed**:
- [x] Prisma schema with all core models
- [x] Database migrations
- [x] Prisma client generation
- [x] Bcrypt utilities (cost 12)
- [x] Database configuration with pg adapter

**Remaining**:
- [ ] Express server setup (`src/server.ts`)
- [ ] Entry point (`src/index.ts`)
- [ ] JWT authentication (register, login, refresh, logout)
- [ ] RBAC middleware
- [ ] Audit logging middleware
- [ ] Request validation

### Phase 2: Citizen Services (Weeks 3-5)
**Goal**: Citizen Profile, Passport, Civil Registry

**Deliverables**:
- [ ] Citizen profile CRUD with document upload
- [ ] Document encryption at rest
- [ ] Passport application workflow
- [ ] Lost/stolen passport reporting
- [ ] Emergency travel document
- [ ] Birth/Marriage/Death registration
- [ ] Certificate generation with digital seal

### Phase 3: Visa & Appointments (Weeks 6-8)
**Goal**: Visa Processing Engine, Appointment & Queue Management

**Deliverables**:
- [ ] Visa application with document upload
- [ ] Automated vetting against watchlists
- [ ] Officer review workflow
- [ ] Dual approval for high-stakes visas
- [ ] Appeal tracking
- [ ] Appointment booking with OTP verification
- [ ] QR code check-in
- [ ] Real-time queue management
- [ ] Wait time estimates

### Phase 4: Advanced Services (Weeks 9-11)
**Goal**: Legalization, Emergency, Diplomatic, Financial

**Deliverables**:
- [ ] Apostille/Legalization workflow
- [ ] Digital seal generation
- [ ] Tracking number verification portal
- [ ] Emergency registration with vulnerability scoring
- [ ] Alert broadcast system (email/SMS)
- [ ] Evacuation list prioritization
- [ ] Diplomatic pouch chain of custody
- [ ] Staff clearance management
- [ ] Financial transaction recording
- [ ] Daily reconciliation
- [ ] Monthly reporting

### Phase 5: Hardening & Documentation (Weeks 12-13)
**Goal**: Security, Performance, Compliance, Documentation

**Deliverables**:
- [ ] Penetration testing
- [ ] Load testing (1000 concurrent users)
- [ ] Chaos engineering (DB failover, Redis failover)
- [ ] GDPR compliance verification
- [ ] Audit log immutability verification
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Deployment runbooks
- [ ] Operations manual
- [ ] User guides

---

## 9. Testing Strategy

### 9.1 Test Pyramid

```
                    ┌─────────────┐
                    │   E2E Tests │  ← 10% (Critical flows)
                    └─────────────┘
               ┌───────────────────┐
               │ Integration Tests │  ← 30% (API + DB)
               └───────────────────┘
         ┌─────────────────────────────┐
         │      Unit Tests             │  ← 60% (Services, Utils)
         └─────────────────────────────┘
```

### 9.2 Coverage Targets

| Layer | Target |
|-------|--------|
| Unit Tests | > 90% |
| Integration Tests | > 80% |
| E2E Tests | Critical paths 100% |

### 9.3 Test Categories

```typescript
// Unit: services, utils, guards
describe('AuthService', () => {
  it('should hash password with bcrypt cost 12')
  it('should generate valid JWT with RS256')
  it('should rotate refresh tokens on refresh')
})

// Integration: API endpoints with test DB
describe('POST /api/auth/login', () => {
  it('returns 401 for invalid credentials')
  it('returns tokens for valid credentials')
  it('increments failed attempts on failure')
})

// E2E: Complete user journeys
describe('Passport Application Flow', () => {
  it('citizen applies → officer reviews → passport issued')
  it('emergency travel document expedited flow')
})
```

---

## 10. Monitoring & Observability

### 10.1 Structured Logging

```json
{
  "timestamp": "2026-07-25T10:30:00.000Z",
  "level": "info",
  "service": "embassy-mgmt",
  "traceId": "abc-123-def",
  "spanId": "span-456",
  "userId": "user-789",
  "action": "passport_application_created",
  "entityType": "PassportApplication",
  "entityId": "app-001",
  "message": "Passport application submitted",
  "metadata": {
    "applicationType": "STANDARD",
    "citizenId": "citizen-001"
  }
}
```

### 10.2 Key Metrics

| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| http_request_duration_ms | Histogram | p95 > 500ms |
| http_requests_total | Counter | error_rate > 1% |
| db_connection_pool_usage | Gauge | > 80% |
| queue_depth | Gauge | > 100 |
| audit_log_lag_seconds | Gauge | > 60s |
| encryption_operations_duration_ms | Histogram | p95 > 100ms |

### 10.3 Health Checks

```typescript
GET /health/live   // Liveness - process is running
GET /health/ready  // Readiness - DB, Redis, Vault accessible
GET /health/metrics // Prometheus metrics
```

---

## 11. Compliance Checklist

### 11.1 GDPR Compliance
- [ ] Right to access (GET /api/citizens/profile)
- [ ] Right to rectification (PUT /api/citizens/profile)
- [ ] Right to erasure (anonymize, retain audit logs)
- [ ] Right to data portability (export endpoint)
- [ ] Data processing agreements
- [ ] Privacy by design (encryption, minimization)
- [ ] DPIA for high-risk processing

### 11.2 Vienna Convention Compliance
- [ ] Consular functions properly formatted document generation
- [ ] Official seal management
- [ ] Chain of custody for diplomatic pouches
- [ ] Staff clearance tracking
- [ ] Inviolability of archives

### 11.3 Audit Requirements
- [ ] Immutable append-only logs
- [ ] Tamper detection (hash chaining)
- [ ] 7-year retention
- [ ] Export capability
- [ ] Real-time alerting on anomalies

---

## 12. API Versioning Strategy

```
URL Path Versioning: /api/v1/...
Header Versioning: Accept: application/vnd.embassy.v1+json

Deprecation Policy:
- 12 months notice
- Sunset header in responses
- Migration guide in docs
```

---

## 13. Error Handling Standards

```typescript
// Standard error response
interface ErrorResponse {
  statusCode: number
  error: string
  message: string
  details?: ValidationError[]
  traceId: string
  timestamp: string
  path: string
}

interface ValidationError {
  field: string
  message: string
  value?: any
}

// HTTP Status Codes
// 200 - OK
// 201 - Created
// 400 - Bad Request (validation)
// 401 - Unauthorized
// 403 - Forbidden (insufficient permissions)
// 404 - Not Found
// 409 - Conflict (duplicate, concurrency)
// 422 - Unprocessable Entity (business rule)
// 429 - Too Many Requests
// 500 - Internal Server Error
// 503 - Service Unavailable
```

---

## 14. Future Extensibility

### 14.1 Microservice Decomposition Points

When scale demands, these modules can become independent services:

| Module | Data Ownership | Communication |
|--------|---------------|---------------|
| Auth | Users, Roles, Tokens | gRPC for token validation |
| Citizen Services | Profiles, Documents | Event-driven |
| Visa Processing | Applications, Decisions | Event-driven |
| Appointments | Slots, Queue | WebSocket + Events |
| Financial | Transactions, Reports | Event-driven |
| Diplomatic | Pouches, Clearances | Event-driven |

### 14.2 Event-Driven Architecture (Future)

```
┌─────────────┐     Events      ┌─────────────┐
│  Service A  │ ──────────────▶ │  Service B  │
└─────────────┘  (Kafka/Rabbit) └─────────────┘
       │                            │
       ▼                            ▼
  Publishes:                   Consumes:
  - user.created               - user.created
  - visa.approved              - visa.approved
  - payment.completed          - payment.completed
```

---

## 15. Appendix: Key Implementation Decisions

| Decision | Rationale |
|----------|-----------|
| Prisma with pg adapter | Connection pooling, better performance |
| Express v5 | Latest stable, improved routing |
| RS256 for JWT | Asymmetric keys, better security |
| bcrypt cost 12 | Balance security/performance |
| UUID for IDs | Distributed-friendly, no collisions |
| Soft delete (deletedAt) | Audit trail, GDPR compliance |
| JSON for flexible fields | Documents, details, metadata |
| Composite indexes | Query performance on common filters |
| Enums in Prisma | Type safety, database constraints |
| Global Prisma singleton | Prevent multiple instances in dev |

---

## 16. File Structure Summary

```
embassy_mgt_system/
├── prisma/
│   ├── schema.prisma          # Complete database schema
│   └── migrations/            # Database migrations
├── src/
│   ├── config/
│   │   └── db.config.ts       # Prisma client with pg adapter
│   ├── utils/
│   │   └── bcrypt.utilities.ts # Password hashing (cost 12)
│   ├── index.ts               # Entry point (empty - needs implementation)
│   └── server.ts              # Express server (empty - needs implementation)
├── .env                       # Environment variables
├── prisma.config.ts           # Prisma CLI configuration
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies and scripts
├── Design.md                  # This file
└── tasks.md                   # Task tracking
```

---

*Document Version: 1.0*  
*Last Updated: 2026-07-25*  
*Project: Embassy Management System (EMS)*