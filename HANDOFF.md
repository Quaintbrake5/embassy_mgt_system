# HANDOFF — Embassy Management System

## Goal
Build a Node.js/TypeScript/Express 5 + Prisma 7.9 + PostgreSQL backend for an Embassy Management System (EMS), following the patterns in the parent Cloud Computing project (`../prisma/schema.prisma`, `../src/config/db.config.ts`).

## Current Progress

### ✅ Completed
1. **Prisma Schema** (`prisma/schema.prisma`) — Full schema written, validated, and client generated:
   - **15 enums**: UserStatus, Gender, VisaType, VisaStatus, AppointmentStatus, ServiceCategory, RequestStatus, DocumentType, PaymentStatus, DecisionType, UrgencyLevel, CheckStatus, CaseStatus, PouchStatus, ClearanceLevel
   - **20 models**: Core auth (User, Role, Permission, RolePermission, Profile, RefreshToken, AuditLog) + Embassy domain (Embassy, Department, ServiceType, ServiceRequest, VisaApplication, VisaDocument, VisaDecision, Appointment, Payment, VerificationCheck, WatchlistEntry, EmergencyCase, DiplomaticPouch, StaffClearance)
   - Conventions match reference schema: PascalCase models, camelCase fields, `@id @default(uuid())`, `@updatedAt` on `Updated`, composite keys, cascade deletes, JSON metadata, indexes
   - Validated: `npx prisma validate --schema=prisma/schema.prisma` → ✅
   - Generated: `npx prisma generate --schema=prisma/schema.prisma` → ✅ to `src/generated/prisma`

2. **Project config** already in place:
   - `prisma.config.ts` — datasource URL from `process.env.DATABASE_URL`, migrations path `prisma/migrations`
   - `src/config/db.config.ts` — PrismaClient singleton with `@prisma/adapter-pg` connection pooling
   - `.env` — `DATABASE_URL` (port 5433), `PORT=3010`
   - `package.json` — deps: express 5, bcrypt 6, @prisma/client 7.9, prisma 7.9

### ⏳ Next Steps (Priority Order)
1. **Run initial migration**
   ```bash
   npx prisma migrate dev --schema=prisma/schema.prisma --name init
   ```

2. **Implement Express server** (`src/server.ts`) — currently empty
   - Add: `cors`, `express.json()`, router imports, listen on `process.env.PORT || 3010`

3. **Add npm scripts** to `package.json`:
   ```json
   "dev": "npx ts-node src/server.ts",
   "build": "npx tsc",
   "start": "node dist/server.js",
   "prisma:generate": "npx prisma generate --schema=prisma/schema.prisma",
   "prisma:migrate": "npx prisma migrate dev --schema=prisma/schema.prisma",
   "prisma:studio": "npx prisma studio --schema=prisma/schema.prisma"
   ```

4. **Build route/controller/service layers** for each domain:
   - Auth (register, login, refresh, logout, RBAC middleware)
   - Embassy/Department CRUD
   - ServiceType & ServiceRequest (passport, civil registry, legalization, etc.)
   - VisaApplication + VisaDecision (four-eyes workflow)
   - Appointment (slot booking, QR check-in)
   - Payment (fee collection, reconciliation)
   - VerificationCheck / WatchlistEntry (security screening)
   - EmergencyCase, DiplomaticPouch, StaffClearance

5. **Add Prisma seed** (`prisma/seed.ts`) for roles/permissions/embassy demo data

## What Worked
- Mirroring parent project's Prisma conventions (generator output to `../src/generated/prisma`, no `url` in datasource, pg adapter singleton)
- Using PascalCase `Updated` field for `@updatedAt` (matches reference)
- Enum-driven status workflows (VisaStatus, AppointmentStatus, etc.) matching rawfile.txt requirements

## What Didn't Work / Blockers
- None yet — schema phase complete

## Key Files to Know
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Complete DB schema (source of truth) |
| `prisma.config.ts` | Prisma CLI config |
| `src/config/db.config.ts` | PrismaClient singleton with pg adapter |
| `src/server.ts` | Entry point (empty — needs Express setup) |
| `.env` | `DATABASE_URL=postgresql://postgres:pass@localhost:5433/embassy_mgt_system` |

## Commands Reference
```bash
# Generate client after schema changes
npx prisma generate --schema=prisma/schema.prisma

# Run migrations
npx prisma migrate dev --schema=prisma/schema.prisma --name <name>

# Push schema (no migration)
npx prisma db push --schema=prisma/schema.prisma

# Open Prisma Studio
npx prisma studio --schema=prisma/schema.prisma

# Type-check
npx tsc --noEmit

# Dev server (needs nodemon/ts-node)
npx ts-node src/server.ts
```

---

## 🔄 SESSION CONTEXT (for continuation)

### What was done this session
- Analyzed codebase structure and existing files
- Created `CLAUDE.md` with project guidance for future Claude instances
- Discovered existing `HANDOFF.md` with detailed project state
- Verified Prisma schema is complete and client generated

### Immediate next action
**Run the initial migration** to create the database:
```bash
npx prisma migrate dev --schema=prisma/schema.prisma --name init (Migrations have already been made; skip this for now)
```

### Then
Implement `src/server.ts` with basic Express 5 setup (cors, json parser, health check route, listen on port 3010).