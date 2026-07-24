# Plan: Embassy Management System — Prisma Schema

## Goal
Replace placeholder `prisma/schema.prisma` with a full schema mirroring the style/conventions of `../prisma/schema.prisma` (Cloud Computing root), adding enums and models for embassy domains from `rawfile.txt`.

## Reference Conventions (match exactly)
- PascalCase model names (User, Role, Permission)
- camelCase field names (firstName, email, roleId)
- `@id @default(uuid())` for PKs
- `@unique` for unique fields
- `@default(now())` for createdAt
- `@updatedAt` field named `Updated` (Pascal case — matches reference)
- Enum names: PascalCase (UserStatus, Gender)
- Enum values: UPPER_SNAKE_CASE (PENDING, ACTIVE, MALE, FEMALE)
- Relations: `@relation(fields: [...], references: [...])`
- Composite PKs: `@@id([a, b])`
- Indexes: `@@index([field])`
- `Json?` for metadata
- `onDelete: Cascade` on foreign relations
- `String?` for optional fields

## Enums (15 total)
1. **UserStatus** — PENDING, ACTIVE, INACTIVE, SUSPENDED
2. **Gender** — MALE, FEMALE, OTHER
3. **VisaType** — TOURIST, BUSINESS, WORK, STUDENT, DIPLOMATIC, TRANSIT, MEDIA, MEDICAL, FAMILY_REUNION
4. **VisaStatus** — DRAFT, SUBMITTED, UNDER_REVIEW, MORE_INFO_REQUESTED, APPROVED, REJECTED, ESCALATED, ISSUED
5. **AppointmentStatus** — AVAILABLE, BOOKED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
6. **ServiceCategory** — PASSPORT, CIVIL_REGISTRY, EMERGENCY_ASSISTANCE, DOCUMENT_LEGALIZATION, VISA, NOTARIAL, CONSULAR_REPORT
7. **RequestStatus** — DRAFT, SUBMITTED, IN_PROGRESS, COMPLETED, CLOSED, CANCELLED
8. **DocumentType** — PASSPORT, BIOMETRIC, PHOTOGRAPH, NATIONAL_ID, BIRTH_CERTIFICATE, MARRIAGE_CERTIFICATE, DEATH_CERTIFICATE, TRAVEL_INSURANCE, INVITATION_LETTER, SUPPORTING_DOCUMENT, OTHER
9. **PaymentStatus** — PENDING, COMPLETED, FAILED, REFUNDED, CANCELLED
10. **DecisionType** — APPROVE, REJECT, REQUEST_MORE_INFO, ESCALATE_TO_HQ
11. **UrgencyLevel** — LOW, MEDIUM, HIGH, CRITICAL
12. **CheckStatus** — PENDING, IN_PROGRESS, CLEARED, FLAGGED, ERROR
13. **CaseStatus** — OPEN, IN_PROGRESS, RESOLVED, CLOSED
14. **PouchStatus** — CREATED, IN_TRANSIT, RECEIVED, CLOSED, LOST
15. **ClearanceLevel** — LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5

## Models (20 total)

### Core Auth (7 — same fields as reference)
- **User** — userid (PK), firstName, lastName, email (unique), phone (unique), passwordHash, roleId, emailVerified, lastLoginAt?, status (UserStatus), createdAt, Updated. Relations: audit[], profile?, token?, role?.
- **Role** — id (PK), name, slug (unique), description?, createdAt, Updated. Relations: rolePermissions[], user[].
- **Permission** — id (PK), name, slug (unique), description?, createdAt, Updated. Relations: rolePermissions[].
- **RolePermission** — roleId + permissionId (composite PK), createdAt, Updated. Relations: permission, role (onDelete: Cascade).
- **Profile** — id (PK, FK→User), gender (Gender), dateOfBirth?, avatar?, bio?, city?, state?, country?, postalCode?. Relation: user (onDelete: Cascade).
- **RefreshToken** — id (PK), token (unique), userId (unique), ipAddress?, userAgent?, isRevoked, expiresAt, revokedAt?, createdAt. Relation: user (onDelete: Cascade).
- **AuditLog** — id (PK), userId?, action, entity, entityId, description?, metaData (Json?), changes (Json?), ipAddress?, userAgent?, createdAt. Relation: user?. Index: [userId], [entity].

### Embassy Domain (2)
- **Embassy** — id (PK), name, code (unique), country, city, address, phone?, email?, operatingHours?, createdAt, Updated. Relations: departments[].
- **Department** — id (PK), name, slug (unique), description?, embassyId (FK→Embassy), createdAt, Updated. Relations: embassy. Index: [embassyId].

### Service & Visa (5)
- **ServiceType** — id (PK), name, slug (unique), category (ServiceCategory), description?, fee (Decimal?), duration?, requiresAppointment, createdAt, Updated.
- **ServiceRequest** — id (PK), referenceNumber (unique), userId (FK→User), serviceTypeId (FK→ServiceType), embassyId (FK→Embassy), status (RequestStatus), details (Json?), submittedAt, createdAt, Updated. Relations: user, serviceType, embassy, appointments[], payments[], documents[]. Index: [userId], [serviceTypeId], [embassyId], [status].
- **VisaApplication** — id (PK), applicationNumber (unique), userId (FK→User), visaType (VisaType), embassyId (FK→Embassy), status (VisaStatus), submittedAt, decisionAt?, createdAt, Updated. Relations: user, embassy, documents[], decision?, payments[], verificationChecks[]. Index: [userId], [embassyId], [status].
- **VisaDocument** — id (PK), visaApplicationId? (FK→VisaApplication), serviceRequestId? (FK→ServiceRequest), documentType (DocumentType), fileName, fileHash?, fileUrl?, uploadedAt, createdAt. Relations: visaApplication?, serviceRequest?. Index: [visaApplicationId], [serviceRequestId].
- **VisaDecision** — id (PK), visaApplicationId (unique FK→VisaApplication), officerId (FK→User), secondaryOfficerId? (FK→User), decision (DecisionType), remarks?, rationale?, decidedAt, createdAt, Updated. Relations: visaApplication, officer, secondaryOfficer?. Index: [officerId].

### Appointment & Payment (2)
- **Appointment** — id (PK), serviceRequestId (FK→ServiceRequest), userId (FK→User), embassyId (FK→Embassy), slotDate, slotTime, status (AppointmentStatus), qrCode?, checkInAt?, tokenNumber?, createdAt, Updated. Relations: serviceRequest, user, embassy. Index: [serviceRequestId], [userId], [embassyId], [status].
- **Payment** — id (PK), serviceRequestId? (FK→ServiceRequest), visaApplicationId? (FK→VisaApplication), userId (FK→User), amount (Decimal), currency, status (PaymentStatus), paymentMethod?, transactionId?, paidAt?, createdAt. Relations: serviceRequest?, visaApplication?, user. Index: [userId], [serviceRequestId], [visaApplicationId].

### Security & Vetting (2)
- **VerificationCheck** — id (PK), visaApplicationId (FK→VisaApplication), checkType, result (Json?), status (CheckStatus), checkedBy? (FK→User), checkedAt?, createdAt. Relations: visaApplication, checkedBy?. Index: [visaApplicationId], [checkedBy].
- **WatchlistEntry** — id (PK), fullName, documentNumber?, nationality?, reason, riskLevel (UrgencyLevel), listedAt, listedBy (FK→User), expiresAt?, isActive, createdAt, Updated. Relation: listedBy. Index: [listedBy].

### Emergency & Diplomatic (3)
- **EmergencyCase** — id (PK), referenceNumber (unique), userId (FK→User), embassyId (FK→Embassy), urgency (UrgencyLevel), caseType, description?, status (CaseStatus), resolvedAt?, createdAt, Updated. Relations: user, embassy. Index: [userId], [embassyId], [status].
- **DiplomaticPouch** — id (PK), pouchNumber (unique), originEmbassyId (FK→Embassy), destinationEmbassyId (FK→Embassy), status (PouchStatus), dispatchDate?, receivedDate?, chainOfCustody (Json?), createdAt, Updated. Relations: originEmbassy, destinationEmbassy. Index: [originEmbassyId], [destinationEmbassyId].
- **StaffClearance** — id (PK), userId (unique FK→User), clearanceLevel (ClearanceLevel), issuedBy (FK→User), issuedAt, expiresAt?, isActive, createdAt, Updated. Relations: user, issuer. Index: [issuedBy].

## Verification
1. `npx prisma validate --schema=prisma/schema.prisma`
2. `npx prisma generate --schema=prisma/schema.prisma`
