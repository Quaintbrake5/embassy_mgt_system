# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Node.js/TypeScript backend project** for an **Embassy Management System (EMS)** using **Express.js v5** with **Prisma ORM v7.9** for PostgreSQL database management. The project is structured for a cloud computing course (Aptech) and includes comprehensive consular services: authentication/authorization, citizen profiles, passport services, civil registry, visa processing, appointments, document legalization, emergency services, diplomatic logistics, and financial ledger with immutable audit logging.

## Tech Stack

- **Runtime**: Node.js with TypeScript (ES2020, CommonJS)
- **Framework**: Express.js v5
- **Database**: PostgreSQL 15+ with Prisma ORM v7.9
- **Authentication**: JWT (jsonwebtoken) with RS256, bcrypt for password hashing (cost ≥ 12)
- **Validation**: validator.js (to be added)
- **Environment**: dotenv for configuration
- **Adapter**: @prisma/adapter-pg with PostgreSQL driver for connection pooling

## Project Structure

```
embassy_mgt_system/
├── prisma/
│   ├── schema.prisma          # Prisma schema (14 core models, 20+ enums)
│   └── migrations/            # Database migrations (to be created)
├── src/
│   ├── config/
│   │   └── db.config.ts       # Prisma client configuration with pg adapter
│   ├── utils/
│   │   └── bcrypt.utilities.ts # Password hashing utilities (bcrypt cost 12)
│   ├── index.ts               # Entry point (empty - needs implementation)
│   └── server.ts              # Express server (empty - needs implementation)
├── .env                       # Environment variables (DATABASE_URL, PORT)
├── prisma.config.ts           # Prisma CLI configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

## Database Schema (Prisma)

The schema defines **14 core models** with extensive relationships:

### Authentication & Authorization
- **User** - Core user entity with roles, status, email verification
- **Role** - User roles with slug-based identification
- **Permission** - Granular permissions with slugs (resource:action format)
- **RolePermission** - Many-to-many join table between Role and Permission

### Consular Services
- **Profile** - Extended user profile (gender, DOB, avatar, bio, address)
- **ServiceType** - Consular service definitions with categories, fees, duration
- **ServiceRequest** - Citizen service requests with status tracking
- **VisaApplication** - Visa applications with types, statuses, decisions
- **VisaDocument** - Document uploads for visas and service requests
- **VisaDecision** - Adjudication decisions with dual-approval support
- **Appointment** - Appointment scheduling with QR check-in and queue management
- **Payment** - Financial transactions for services and visas

### Emergency & Diplomatic
- **EmergencyCase** - Crisis/evacuation registrations with urgency levels
- **DiplomaticPouch** - Chain-of-custody tracking for diplomatic pouches
- **StaffClearance** - Diplomatic staff security clearances with levels
- **WatchlistEntry** - Security watchlist with risk levels

### Compliance & Audit
- **AuditLog** - Immutable audit trail for all entity changes
- **VerificationCheck** - Automated vetting checks for visa applications

### Key Enums (20+)
UserStatus, Gender, VisaType, VisaStatus, AppointmentStatus, ServiceCategory, RequestStatus, DocumentType, PaymentStatus, DecisionType, UrgencyLevel, CheckStatus, CaseStatus, PouchStatus, ClearanceLevel

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Generate Prisma client (run after schema changes)
npx prisma generate --schema=prisma/schema.prisma

# Run database migrations
npx prisma migrate dev --schema=prisma/schema.prisma

# Push schema changes without migrations (development only)
npx prisma db push --schema=prisma/schema.prisma

# Open Prisma Studio (database GUI)
npx prisma studio --schema=prisma/schema.prisma

# TypeScript type checking
npx tsc --noEmit

# Run development server (needs nodemon/ts-node script)
npx ts-node src/index.ts
```

### Building
```bash
# Compile TypeScript
npx tsc

# Run compiled JavaScript
node dist/index.js
```

### Database
The `.env` file contains:
- `DATABASE_URL` - PostgreSQL connection string (port 5433, database: embassy_mgt_system)
- `PORT` - Server port (3010)

## Architecture Notes

1. **Prisma Client Generation**: Output is configured to `../src/generated/prisma` relative to schema location. Import path in code: `../generated/prisma/client`

2. **Database Adapter**: Uses `@prisma/adapter-pg` with PostgreSQL driver for connection pooling. The `db.config.ts` creates a singleton Prisma client with the adapter.

3. **Global Prisma Singleton**: The `db.config.ts` declares a global `prisma` variable to prevent multiple instances in development (hot reload).

4. **Environment Loading**: Both `prisma.config.ts` and `db.config.ts` import `dotenv/config` to load `.env` variables.

5. **Server Entry Points**: Both `src/index.ts` and `src/server.ts` exist but are empty - this is where Express app should be initialized.

## Key Files to Know

- **`prisma/schema.prisma`** - Single source of truth for database schema (comprehensive EMS model)
- **`src/config/db.config.ts`** - Database connection setup with Prisma adapter
- **`prisma.config.ts`** - Prisma CLI config with migration path and datasource URL
- **`src/utils/bcrypt.utilities.ts`** - Password hashing utilities (bcrypt cost 12, ready to use)

## Next Steps for Development

Based on the requirements specification (`.kiro/specs/embassy-management-system/requirements.md`), the implementation follows a 13-week, 5-phase approach:

### Phase 1 (Weeks 1-2): Auth, Users, Roles, Audit
- Implement Express server in `src/server.ts`
- Create API routes for authentication (register, login, refresh token, logout)
- Add role/permission middleware for authorization (RBAC)
- Create Prisma migrations: `npx prisma migrate dev --name init` (created the first migrations)
- Implement audit logging middleware
- Add request validation using `validator` package

### Phase 2 (Weeks 3-5): Citizen Profile, Passport, Civil Registry
- Citizen profile CRUD with document upload
- Passport application workflows (renewal, lost/stolen, emergency travel)
- Civil registry services (birth, marriage, death registration)

### Phase 3 (Weeks 6-8): Visa Processing, Appointments
- Visa application submission with document upload
- Automated vetting against watchlists
- Officer adjudication with dual-approval for high-stakes decisions
- Appointment booking with OTP verification, QR check-in, queue management

### Phase 4 (Weeks 9-11): Legalization, Emergency, Diplomatic, Financial
- Document legalization/apostille with Hague Convention routing
- Emergency registration, alerts, evacuation prioritization
- Diplomatic pouch chain-of-custody, staff clearances
- Financial transactions, daily reconciliation, monthly reports

### Phase 5 (Weeks 12-13): Testing, Security Hardening, Documentation
- Unit, integration, and E2E tests
- Security audit and penetration testing
- Load testing for performance validation
- Compliance audit (GDPR, Vienna Convention)
- API documentation and deployment guides

## External Dependencies (Required for Full Implementation)

1. **PostgreSQL 15+** database (configured on localhost:5433)
2. **Redis** for caching/sessions/queues
3. **Object storage** (S3/MinIO) for document storage
4. **SMTP server** for email notifications
5. **SMS gateway** for OTP/notifications
6. **HashiCorp Vault** or equivalent for encryption keys (AES-256-GCM for PII)

## Non-Functional Requirements to Implement

- **Security**: TLS 1.3, rate limiting (100 req/min per IP, 1000 req/min per user), CORS restricted to embassy domains
- **Performance**: <200ms p95 API response, connection pooling (max 20), 1000 concurrent users
- **Reliability**: 99.9% uptime, daily backups with point-in-time recovery, health checks
- **Compliance**: GDPR data handling, Vienna Convention, 7-year audit log retention, data residency
- **Observability**: Structured JSON logging with correlation IDs, distributed tracing, metrics, alerting