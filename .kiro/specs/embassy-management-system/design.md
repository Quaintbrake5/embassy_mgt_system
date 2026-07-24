# Embassy Management System - Design Specification

## Architecture Overview

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
│                    │           API GATEWAY (Express.js)       │             │
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
│           │                           │                            │        │
│           ▼                           ▼                            ▼        │
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

## 1. Database Schema Design (Prisma)

### 1.1 Core Authentication Models

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
  OTHER
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  firstName     String
  lastName      String
  phone         String?
  status        UserStatus @default(PENDING)
  emailVerified Boolean   @default(false)
  lastLoginAt   DateTime?
  failedAttempts Int      @default(0)
  lockedUntil   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  roles         UserRole[]
  profile       Profile?
  citizenProfile CitizenProfile?
  refreshTokens RefreshToken[]
  auditLogs     AuditLog[]
  passportApps  PassportApplication[]
  visaApps      VisaApplication[]
  appointments  Appointment[]
  legalizations DocumentLegalization[]
  emergencies   EmergencyRegistration[]
  pouches       DiplomaticPouch[]
  clearances    StaffClearance[]
  transactions  FinancialTransaction[]
}

model Role {
  id          String   @id @default(cuid())
  name        String   @unique
  slug        String   @unique
  description String?
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users       UserRole[]
  permissions RolePermission[]
}

model Permission {
  id          String   @id @default(cuid())
  resource    String
  action      String
  description String?
  createdAt   DateTime @default(now())

  @@unique([resource, action])
  roles       RolePermission[]
}

model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
}

model UserRole {
  userId String
  roleId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
}
```

### 1.2 Authentication & Security Models

```prisma
model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime @default(now())
  ipAddress String?
  userAgent String?
}

model AuditLog {
  id           String   @id @default(cuid())
  userId       String?
  user         User?    @relation(fields: [userId], references: [id])
  action       String
  entityType   String
  entityId     String
  oldValues    Json?
  newValues    Json?
  ipAddress    String?
  userAgent    String?
  correlationId String? @index
  createdAt    DateTime @default(now())

  @@index([entityType, entityId])
  @@index([userId, createdAt])
  @@index([correlationId])
}
```

### 1.3 Citizen Services Models

```prisma
model Profile {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  gender      Gender?
  dateOfBirth DateTime?
  avatar      String?
  bio         String?
  address     Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CitizenProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  nationality     String
  passportNumber  String?  @unique
  passportExpiry  DateTime?
  nationalId      String?  @unique
  emergencyContacts Json?
  documents       CitizenDocument[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model CitizenDocument {
  id              String   @id @default(cuid())
  citizenProfileId String
  citizenProfile  CitizenProfile @relation(fields: [citizenProfileId], references: [id], onDelete: Cascade)
  type            DocumentType
  fileName        String
  filePath        String
  mimeType        String
  size            Int
  encrypted       Boolean  @default(true)
  encryptionKeyId String?
  metadata        Json?
  uploadedAt      DateTime @default(now())
  verifiedAt      DateTime?
  verifiedBy      String?
}

enum DocumentType {
  PASSPORT
  NATIONAL_ID
  BIRTH_CERTIFICATE
  MARRIAGE_CERTIFICATE
  DEATH_CERTIFICATE
  PROOF_OF_ADDRESS
  MEDICAL_CERTIFICATE
  POLICE_CLEARANCE
  OTHER
}
```

### 1.4 Passport Services Models

```prisma
enum PassportApplicationStatus {
  PENDING
  UNDER_REVIEW
  APPROVED
  REJECTED
  REQUEST_MORE_INFO
  ISSUED
  COLLECTED
}

enum PassportType {
  STANDARD
  OFFICIAL
  DIPLOMATIC
  EMERGENCY_TRAVEL
}

model PassportApplication {
  id              String   @id @default(cuid())
  applicationNumber String  @unique
  citizenProfileId String
  citizenProfile  CitizenProfile @relation(fields: [citizenProfileId], references: [id])
  type            PassportType
  status          PassportApplicationStatus @default(PENDING)
  currentPassportNumber String?
  currentPassportExpiry DateTime?
  reason          String
  documents       Json?
  reviewedBy      String?
  reviewedAt      DateTime?
  reviewNotes     String?
  issuedPassportNumber String? @unique
  issuedAt        DateTime?
  collectedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  auditLogs       AuditLog[]
}

model LostStolenPassport {
  id              String   @id @default(cuid())
  citizenProfileId String
  citizenProfile  CitizenProfile @relation(fields: [citizenProfileId], references: [id])
  passportNumber  String
  incidentDate    DateTime
  incidentType    IncidentType
  location        String
  policeReportNumber String?
  policeReportDate DateTime?
  status          ReportStatus @default(REPORTED)
  flaggedAt       DateTime  @default(now())
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum IncidentType {
  LOST
  STOLEN
  DAMAGED
}

enum ReportStatus {
  REPORTED
  FLAGGED
  REPLACED
  CANCELLED
}
```

### 1.5 Civil Registry Models

```prisma
enum CivilRegistryType {
  BIRTH
  MARRIAGE
  DEATH
}

enum CivilRegistryStatus {
  PENDING
  UNDER_REVIEW
  APPROVED
  REJECTED
  CERTIFICATE_ISSUED
}

model CivilRegistry {
  id              String   @id @default(cuid())
  registrationNumber String @unique
  type            CivilRegistryType
  status          CivilRegistryStatus @default(PENDING)
  
  // Birth fields
  childFirstName  String?
  childLastName   String?
  childGender     Gender?
  childDob        DateTime?
  childPob        String?
  fatherId        String?
  motherId        String?
  witness1Id      String?
  witness2Id      String?
  
  // Marriage fields
  spouse1Id       String?
  spouse2Id       String?
  marriageDate    DateTime?
  marriagePlace   String?
  officerId       String?
  
  // Death fields
  deceasedId      String?
  deathDate       DateTime?
  deathPlace      String?
  causeOfDeath    String?
  nextOfKinId     String?
  
  // Common
  documents       Json?
  reviewedBy      String?
  reviewedAt      DateTime?
  reviewNotes     String?
  certificateNumber String? @unique
  certificateIssuedAt DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  auditLogs       AuditLog[]
}
```

### 1.6 Visa Processing Models

```prisma
enum VisaType {
  TOURIST
  BUSINESS
  STUDENT
  WORK
  DIPLOMATIC
  OFFICIAL
  TRANSIT
  MEDICAL
  FAMILY_REUNION
}

enum VisaStatus {
  SUBMITTED
  VETTING
  UNDER_REVIEW
  APPROVED
  REJECTED
  REQUEST_MORE_INFO
  ESCALATED
  APPEALED
  ISSUED
}

enum VettingResult {
  CLEAR
  FLAGGED
  REQUIRES_REVIEW
  ON_WATCHLIST
}

model VisaApplication {
  id              String   @id @default(cuid())
  applicationNumber String @unique
  applicantId     String
  applicant       CitizenProfile @relation(fields: [applicantId], references: [id])
  type            VisaType
  status          VisaStatus @default(SUBMITTED)
  purpose         String
  intendedEntryDate DateTime?
  intendedDuration Int? // days
  portOfEntry     String?
  documents       Json?
  biometrics      Json?
  
  // Vetting
  vettingResult   VettingResult?
  vettingDetails  Json?
  vettedAt        DateTime?
  vettedBy        String?
  
  // Review
  reviewedBy      String?
  reviewedAt      DateTime?
  reviewNotes     String?
  decision        String?
  decisionLetter  String?
  
  // Dual approval
  requiresDualApproval Boolean @default(false)
  firstApproverId  String?
  firstApprovedAt  DateTime?
  secondApproverId String?
  secondApprovedAt DateTime?
  
  // Appeal
  appealReason    String?
  appealStatus    AppealStatus?
  appealDecidedAt DateTime?
  appealDecidedBy String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  auditLogs       AuditLog[]
}

enum AppealStatus {
  PENDING
  UNDER_REVIEW
  UPHELD
  OVERTURNED
}
```

### 1.7 Appointment & Queue Management Models

```prisma
enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  CHECKED_IN
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum ServiceType {
  PASSPORT
  VISA
  CIVIL_REGISTRY
  LEGALIZATION
  EMERGENCY
  OTHER
}

model Appointment {
  id              String   @id @default(cuid())
  appointmentNumber String @unique
  citizenProfileId String
  citizenProfile  CitizenProfile @relation(fields: [citizenProfileId], references: [id])
  serviceType     ServiceType
  serviceId       String? // Reference to specific application
  status          AppointmentStatus @default(SCHEDULED)
  scheduledAt     DateTime
  estimatedDuration Int // minutes
  windowStart     DateTime
  windowEnd       DateTime
  checkedInAt     DateTime?
  queueToken      String? @unique
  queuePosition   Int?
  windowNumber    Int?
  officerId       String?
  startedAt       DateTime?
  completedAt     DateTime?
  cancelledAt     DateTime?
  cancellationReason String?
  otpCode         String?
  otpExpiresAt    DateTime?
  otpVerified     Boolean @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([scheduledAt, status])
  @@index([citizenProfileId, status])
}

model StaffSchedule {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  date        DateTime
  shiftStart  DateTime
  shiftEnd    DateTime
  windowNumber Int
  serviceTypes ServiceType[]
  maxAppointments Int @default(20)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([userId, date, windowNumber])
}
```

### 1.8 Document Legalization Models

```prisma
enum LegalizationStatus {
  SUBMITTED
  VERIFYING
  PROCESSING
  COMPLETED
  REJECTED
}

enum LegalizationType {
  APOSTILLE
  LEGALIZATION
}

model DocumentLegalization {
  id              String   @id @default(cuid())
  requestNumber   String   @unique
  citizenProfileId String
  citizenProfile  CitizenProfile @relation(fields: [citizenProfileId], references: [id])
  type            LegalizationType
  status          LegalizationStatus @default(SUBMITTED)
  documentType    String
  documentNumber  String
  destinationCountry String
  urgency         UrgencyLevel @default(STANDARD)
  documents       Json?
  verifiedBy      String?
  verifiedAt      DateTime?
  sealNumber      String? @unique
  sealAppliedAt   DateTime?
  trackingNumber  String? @unique
  completedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum UrgencyLevel {
  STANDARD
  EXPEDITED
  EMERGENCY
}
```

### 1.9 Emergency Services Models

```prisma
enum EmergencyStatus {
  REGISTERED
  MONITORING
  ASSISTANCE_PROVIDED
  EVACUATION_PENDING
  EVACUATED
  CLOSED
}

enum VulnerabilityLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

model EmergencyRegistration {
  id              String   @id @default(cuid())
  registrationNumber String @unique
  citizenProfileId String
  citizenProfile  CitizenProfile @relation(fields: [citizenProfileId], references: [id])
  status          EmergencyStatus @default(REGISTERED)
  location        String
  latitude        Float?
  longitude       Float?
  dependents      Int @default(0)
  medicalNeeds    String?
  vulnerability   VulnerabilityLevel @default(LOW)
  contactMethod   ContactMethod[]
  lastContactAt   DateTime?
  welfareChecks   WelfareCheck[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum ContactMethod {
  EMAIL
  SMS
  WHATSAPP
  PHONE
  SIGNAL
}

model WelfareCheck {
  id              String   @id @default(cuid())
  registrationId  String
  registration    EmergencyRegistration @relation(fields: [registrationId], references: [id], onDelete: Cascade)
  conductedBy     String
  conductedAt     DateTime @default(now())
  status          WelfareStatus
  notes           String?
  nextCheckDue    DateTime?
}

enum WelfareStatus {
  CONTACTED
  NO_RESPONSE
  ASSISTANCE_NEEDED
  EVACUATION_NEEDED
}

model EmergencyAlert {
  id              String   @id @default(cuid())
  alertNumber     String   @unique
  title           String
  message         String
  severity        AlertSeverity
  targetArea      String?
  targetCountries String[]
  sentBy          String
  sentAt          DateTime @default(now())
  recipients      Int @default(0)
  delivered       Int @default(0)
  failed          Int @default(0)
}

enum AlertSeverity {
  INFO
  WARNING
  CRITICAL
  EVACUATION
}
```

### 1.10 Diplomatic Administration Models

```prisma
enum PouchStatus {
  CREATED
  IN_TRANSIT
  DELIVERED
  OVERDUE
  COMPROMISED
}

model DiplomaticPouch {
  id              String   @id @default(cuid())
  pouchNumber     String   @unique
  status          PouchStatus @default(CREATED)
  senderId        String
  sender          User     @relation(fields: [senderId], references: [id])
  carrierId       String?
  carrier         User?    @relation(fields: [carrierId], references: [id])
  receiverId      String?
  receiver        User?    @relation(fields: [receiverId], references: [id])
  contents        Json
  classification  ClassificationLevel
  sealedAt        DateTime?
  dispatchedAt    DateTime?
  deliveredAt     DateTime?
  handoffs        PouchHandoff[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum ClassificationLevel {
  UNCLASSIFIED
  CONFIDENTIAL
  SECRET
  TOP_SECRET
}

model PouchHandoff {
  id            String   @id @default(cuid())
  pouchId       String
  pouch         DiplomaticPouch @relation(fields: [pouchId], references: [id], onDelete: Cascade)
  fromUserId    String
  fromUser      User     @relation(fields: [fromUserId], references: [id])
  toUserId      String
  toUser        User     @relation(fields: [toUserId], references: [id])
  location      String
  timestamp     DateTime @default(now())
  verified      Boolean  @default(false)
  notes         String?
}

enum ClearanceLevel {
  NONE
  BASIC
  SECRET
  TOP_SECRET
  SCI
}

enum ClearanceStatus {
  ACTIVE
  EXPIRED
  REVOKED
  PENDING_RENEWAL
}

model StaffClearance {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  level           ClearanceLevel
  status          ClearanceStatus @default(ACTIVE)
  grantedAt       DateTime
  expiresAt       DateTime
  grantedBy       String
  reviewedAt      DateTime?
  reviewedBy      String?
  renewalRequested Boolean @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 1.11 Financial Ledger Models

```prisma
enum TransactionStatus {
  PENDING
  COMPLETED
  REFUNDED
  VOIDED
  FAILED
}

enum Currency {
  USD
  EUR
  GBP
  LOCAL
}

model FinancialTransaction {
  id              String   @id @default(cuid())
  transactionNumber String @unique
  serviceType     ServiceType
  serviceId       String
  amount          Decimal  @db.Decimal(10, 2)
  currency        Currency @default(USD)
  payerId         String
  payer           CitizenProfile @relation(fields: [payerId], references: [id])
  officerId       String
  officer         User     @relation(fields: [officerId], references: [id])
  status          TransactionStatus @default(PENDING)
  paymentMethod   PaymentMethod
  reference       String?
  receiptNumber   String? @unique
  reconciledAt    DateTime?
  reconciledBy    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum PaymentMethod {
  CASH
  CARD
  BANK_TRANSFER
  ONLINE
}

model DailyReconciliation {
  id              String   @id @default(cuid())
  date            DateTime @unique
  totalCollected  Decimal  @db.Decimal(15, 2)
  totalReceipts   Int
  discrepancies   Json?
  status          ReconciliationStatus @default(PENDING)
  reviewedBy      String?
  reviewedAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum ReconciliationStatus {
  PENDING
  MATCHED
  DISCREPANCY
  RESOLVED
}
```

---

## 2. API Design

### 2.1 Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | User login | Public |
| POST | `/api/auth/refresh` | Refresh access token | Refresh Token |
| POST | `/api/auth/logout` | Revoke refresh token | Access Token |
| POST | `/api/auth/forgot-password` | Request password reset | Public |
| POST | `/api/auth/reset-password` | Reset password with token | Public |

### 2.2 User & Role Management

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| GET | `/api/users/me` | Get current user profile | Authenticated |
| PUT | `/api/users/me` | Update own profile | Authenticated |
| GET | `/api/users/:id` | Get user by ID (admin) | `user:read` |
| GET | `/api/roles` | List all roles | `role:read` |
| POST | `/api/roles` | Create role | `role:create` |
| PUT | `/api/roles/:id` | Update role | `role:update` |
| DELETE | `/api/roles/:id` | Delete role | `role:delete` |
| GET | `/api/permissions` | List all permissions | `permission:read` |

### 2.3 Citizen Services

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| POST | `/api/citizens/profile` | Create citizen profile | `citizen:create` |
| GET | `/api/citizens/profile` | Get own profile | `citizen:read` |
| PUT | `/api/citizens/profile` | Update own profile | `citizen:update` |
| POST | `/api/citizens/documents` | Upload document | `citizen:document:create` |
| GET | `/api/citizens/documents` | List documents | `citizen:document:read` |
| DELETE | `/api/citizens/documents/:id` | Delete document | `citizen:document:delete` |

### 2.4 Passport Services

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| POST | `/api/passport/applications` | Submit passport application | `passport:create` |
| GET | `/api/passport/applications` | List own applications | `passport:read` |
| GET | `/api/passport/applications/:id` | Get application details | `passport:read` |
| PUT | `/api/passport/applications/:id/status` | Update status (officer) | `passport:review` |
| POST | `/api/passport/lost-stolen` | Report lost/stolen passport | `passport:report` |
| POST | `/api/passport/emergency-travel` | Request emergency travel doc | `passport:emergency` |

### 2.5 Civil Registry

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| POST | `/api/civil-registry/birth` | Register birth | `civil:birth:create` |
| POST | `/api/civil-registry/marriage` | Register marriage | `civil:marriage:create` |
| POST | `/api/civil-registry/death` | Register death | `civil:death:create` |
| GET | `/api/civil-registry/:id` | Get registration | `civil:read` |
| GET | `/api/civil-registry/certificate/:id` | Generate certificate | `civil:certificate` |

### 2.6 Visa Processing

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| POST | `/api/visa/applications` | Submit visa application | `visa:create` |
| GET | `/api/visa/applications` | List applications | `visa:read` |
| GET | `/api/visa/applications/:id` | Get application details | `visa:read` |
| PUT | `/api/visa/applications/:id/review` | Officer review | `visa:review` |
| POST | `/api/visa/applications/:id/decision` | Adjudicate decision | `visa:decide` |
| POST | `/api/visa/applications/:id/dual-approval` | Dual approval | `visa:dual-approve` |

### 2.7 Appointments

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| GET | `/api/appointments/slots` | Get available slots | `appointment:read` |
| POST | `/api/appointments/book` | Book appointment | `appointment:create` |
| GET | `/api/appointments/my` | List my appointments | `appointment:read` |
| PUT | `/api/appointments/:id/cancel` | Cancel appointment | `appointment:cancel` |
| POST | `/api/appointments/:id/checkin` | QR check-in | `appointment:checkin` |
| GET | `/api/appointments/queue` | Get queue (officer) | `appointment:queue` |
| POST | `/api/appointments/queue/next` | Call next | `appointment:queue` |

### 2.8 Document Legalization

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| POST | `/api/legalization/requests` | Submit request | `legalization:create` |
| GET | `/api/legalization/requests` | List requests | `legalization:read` |
| GET | `/api/legalization/requests/:id` | Get request | `legalization:read` |
| PUT | `/api/legalization/requests/:id/process` | Process request | `legalization:process` |

### 2.9 Emergency Services

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| POST | `/api/emergency/registrations` | Register for emergency | `emergency:register` |
| GET | `/api/emergency/registrations` | List registrations | `emergency:read` |
| POST | `/api/emergency/alerts` | Send alert (admin) | `emergency:alert` |
| GET | `/api/emergency/evacuation-list` | Get evacuation list | `emergency:evacuation` |

### 2.10 Diplomatic Administration

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| POST | `/api/diplomatic/pouches` | Create pouch | `pouch:create` |
| GET | `/api/diplomatic/pouches` | List pouches | `pouch:read` |
| PUT | `/api/diplomatic/pouches/:id/handoff` | Handoff pouch | `pouch:handoff` |
| POST | `/api/diplomatic/clearances` | Request clearance | `clearance:create` |
| GET | `/api/diplomatic/clearances` | List clearances | `clearance:read` |

### 2.11 Financial

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| POST | `/api/financial/transactions` | Record transaction | `financial:create` |
| GET | `/api/financial/transactions` | List transactions | `financial:read` |
| GET | `/api/financial/reconciliation/daily` | Daily reconciliation | `financial:reconcile` |
| GET | `/api/financial/reports/monthly` | Monthly report | `financial:report` |

### 2.12 Audit

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| GET | `/api/audit/logs` | Query audit logs | `audit:read` |
| GET | `/api/audit/logs/:id` | Get log entry | `audit:read` |
| GET | `/api/audit/export` | Export audit logs | `audit:export` |

---

## 3. Security Architecture

### 3.1 Authentication Flow

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

### 3.2 RBAC Permission Model

```
Permission Format: resource:action
Examples:
  - citizen:read
  - citizen:create
  - citizen:update
  - citizen:delete
  - passport:read
  - passport:create
  - passport:review
  - visa:decide
  - visa:dual-approve
  - audit:read
  - audit:export
  - role:create
  - role:update
  - role:delete
  - financial:reconcile
  - emergency:alert
```

### 3.3 Encryption Strategy

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

### 3.4 Rate Limiting

| Tier | Limit | Window |
|------|-------|--------|
| Anonymous IP | 100 req | 1 minute |
| Authenticated User | 1000 req | 1 minute |
| Auth Endpoints | 10 req | 1 minute |
| File Upload | 5 req | 1 minute |

---

## 4. Service Layer Architecture

### 4.1 Module Structure

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

### 4.2 Core Services

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

## 5. Infrastructure & Deployment

### 5.1 Docker Compose (Development)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: embassy_mgmt
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

### 5.2 Environment Variables

```env
# Database
DATABASE_URL=postgresql://embassy:password@localhost:5433/embassy_mgmt
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

## 6. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Auth, Users, Roles, Permissions, Audit Logging

**Deliverables:**
- [ ] Prisma schema with all core models
- [ ] Database migrations
- [ ] JWT authentication (register, login, refresh, logout)
- [ ] RBAC system with roles/permissions
- [ ] Audit logging middleware
- [ ] Password hashing (bcrypt cost 12)
- [ ] Rate limiting
- [ ] Unit tests for auth module

### Phase 2: Citizen Services (Weeks 3-5)
**Goal**: Citizen Profile, Passport, Civil Registry

**Deliverables:**
- [ ] Citizen profile CRUD with document upload
- [ ] Document encryption at rest
- [ ] Passport application workflow
- [ ] Lost/stolen passport reporting
- [ ] Emergency travel document
- [ ] Birth/Marriage/Death registration
- [ ] Certificate generation with digital seal
- [ ] Integration tests

### Phase 3: Visa & Appointments (Weeks 6-8)
**Goal**: Visa Processing Engine, Appointment & Queue Management

**Deliverables:**
- [ ] Visa application with document upload
- [ ] Automated vetting against watchlists
- [ ] Officer review workflow
- [ ] Dual approval for high-stakes visas
- [ ] Appeal tracking
- [ ] Appointment booking with OTP verification
- [ ] QR code check-in
- [ ] Real-time queue management
- [ ] Wait time estimates
- [ ] Load tests for queue system

### Phase 4: Advanced Services (Weeks 9-11)
**Goal**: Legalization, Emergency, Diplomatic, Financial

**Deliverables:**
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

**Deliverables:**
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

## 7. Testing Strategy

### 7.1 Test Pyramid

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

### 7.2 Test Coverage Targets

| Layer | Target |
|-------|--------|
| Unit Tests | > 90% |
| Integration Tests | > 80% |
| E2E Tests | Critical paths 100% |

### 7.3 Test Categories

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

## 8. Monitoring & Observability

### 8.1 Structured Logging

```json
{
  "timestamp": "2026-07-23T10:30:00.000Z",
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

### 8.2 Key Metrics

| Metric | Type | Alert Threshold |
|--------|------|-----------------|
| http_request_duration_ms | Histogram | p95 > 500ms |
| http_requests_total | Counter | error_rate > 1% |
| db_connection_pool_usage | Gauge | > 80% |
| queue_depth | Gauge | > 100 |
| audit_log_lag_seconds | Gauge | > 60s |
| encryption_operations_duration_ms | Histogram | p95 > 100ms |

### 8.3 Health Checks

```typescript
GET /health/live   // Liveness - process is running
GET /health/ready  // Readiness - DB, Redis, Vault accessible
GET /health/metrics // Prometheus metrics
```

---

## 9. Compliance Checklist

### 9.1 GDPR Compliance

- [ ] Right to access (GET /api/citizens/profile)
- [ ] Right to rectification (PUT /api/citizens/profile)
- [ ] Right to erasure (anonymize, retain audit logs)
- [ ] Right to data portability (export endpoint)
- [ ] Data processing agreements
- [ ] Privacy by design (encryption, minimization)
- [ ] DPIA for high-risk processing

### 9.2 Vienna Convention Compliance

- [ ] Consular functions properly formatted document generation
- [ ] Official seal management
- [ ] Chain of custody for diplomatic pouches
- [ ] Staff clearance tracking
- [ ] Inviolability of archives

### 9.3 Audit Requirements

- [ ] Immutable append-only logs
- [ ] Tamper detection (hash chaining)
- [ ] 7-year retention
- [ ] Export capability
- [ ] Real-time alerting on anomalies

---

## 10. API Versioning Strategy

```
URL Path Versioning: /api/v1/...
Header Versioning: Accept: application/vnd.embassy.v1+json

Deprecation Policy:
- 12 months notice
- Sunset header in responses
- Migration guide in docs
```

---

## 11. Error Handling Standards

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

// Validation error
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

## 12. Future Extensibility

### 12.1 Microservice Decomposition Points

When scale demands, these modules can become independent services:

| Module | Data Ownership | Communication |
|--------|---------------|---------------|
| Auth | Users, Roles, Tokens | gRPC for token validation |
| Citizen Services | Profiles, Documents | Event-driven |
| Passport | Applications | Async via message queue |
| Visa | Applications, Vetting | Sync for decisions |
| Appointments | Schedules, Queue | Real-time WebSocket |
| Financial | Transactions, Reconciliation | Event sourcing |
| Audit | Logs | Append-only stream |

### 12.2 Event Schema (for future event-driven architecture)

```json
{
  "eventId": "evt-uuid",
  "eventType": "passport.application.submitted",
  "timestamp": "2026-07-23T10:30:00Z",
  "version": "1.0",
  "payload": {
    "applicationId": "app-001",
    "citizenId": "citizen-001",
    "type": "STANDARD"
  },
  "metadata": {
    "correlationId": "corr-abc",
    "causationId": "cmd-xyz"
  }
}
```

---

*Document Version: 1.0*
*Last Updated: 2026-07-23*
*Project: Embassy Management System (EMS)*