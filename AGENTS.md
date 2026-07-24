# AGENTS.md — Embassy Management System (EMS) Backend

## Quick Context
Node.js/TypeScript + Express 5 + Prisma 7.9 + PostgreSQL. Prisma Client is **generated locally** to `src/generated/prisma` (not from `@prisma/client`). Entry point: `src/server.ts` (currently empty). Server directories (`routes/`, `controllers/`, `services/`, `middleware/`) exist but are empty — this is an early-stage project.

## Commands (exact)

| Task | Command |
|------|---------|
| Generate Prisma Client | `npx prisma generate --schema=prisma/schema.prisma` |
| Run migration | `npx prisma migrate dev --schema=prisma/schema.prisma --name <name>` |
| Push schema (no migration) | `npx prisma db push --schema=prisma/schema.prisma` |
| Prisma Studio | `npx prisma studio --schema=prisma/schema.prisma` |
| Validate schema | `npx prisma validate --schema=prisma/schema.prisma` |
| Type-check | `npx tsc --noEmit` |
| Compile TS | `npx tsc` |
| Dev server | `npx ts-node src/server.ts` |

## Schema

- **Generator**: `provider = "prisma-client"`, `output = "../src/generated/prisma"`.
- **Datasource**: `provider = "postgresql"` — **no `url = env("...")`** in schema (Prisma 7+). URL goes in `prisma.config.ts` via `defineConfig({ datasource: { url: process.env["DATABASE_URL"] } })`.
- **Config file**: `prisma.config.ts` imports `dotenv/config` and exports `defineConfig` from `"prisma/config"` (not `"prisma"` — that import path breaks).
- **5 models across 6 groups**: Core auth (User, Role, Permission, RolePermission, Profile, RefreshToken, AuditLog), Embassy domain (Embassy, Department), Services (ServiceType, ServiceRequest), Visa (VisaApplication, VisaDocument, VisaDecision), Booking (Appointment, Payment), Security (VerificationCheck, WatchlistEntry, StaffClearance, EmergencyCase, DiplomaticPouch).
- **15 enums**: UserStatus, Gender, VisaType, VisaStatus, AppointmentStatus, ServiceCategory, RequestStatus, DocumentType, PaymentStatus, DecisionType, UrgencyLevel, CheckStatus, CaseStatus, PouchStatus, ClearanceLevel.
- **Conventions**: PascalCase models, camelCase fields, `String @id @default(uuid())`, `DateTime @updatedAt` field named `Updated`, enum values in UPPER_SNAKE_CASE.

## Critical Architecture

- **No `url = env(...)` in schema datasource** — causes P1012. URL is set in `prisma.config.ts`.
- **DB adapter**: `@prisma/adapter-pg` in `src/config/db.config.ts` (connection pooling). PrismaClient import: `from '../generated/prisma/client'`.
- **Global singleton**: `db.config.ts` uses `global.prisma` to prevent duplicate instances on hot reload.
- **Environment**: Both `prisma.config.ts` and `db.config.ts` import `dotenv/config`. DB: `localhost:5433`, database `embassy_mgt_system`, user `postgres`.
- **Always run `npx prisma generate`** after any schema change.
- **Bcrypt utility**: `src/utils/bcrypt.utilities.ts` — static `hashPassword(password, 12)` and `comparePassword(plain, hashed)`. Uses bcrypt v6 (ESM-compatible wrapper).

## Next Steps (Priority)

1. Run migration: `npx prisma migrate dev --schema=prisma/schema.prisma --name init`
2. Implement Express app in `src/server.ts` (cors, json body parser, route mounting, listen on `PORT`)
3. Add npm scripts to `package.json`: `dev`, `build`, `start`, `prisma:generate`, `prisma:migrate`, `prisma:studio`
4. Build route → controller → service layers per domain (auth, embassy, visa, appointment, payment, security)
5. Add seed data in `prisma/seed.ts` (admin role, permissions, embassy demo data)
