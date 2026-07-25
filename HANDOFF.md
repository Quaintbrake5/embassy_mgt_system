# HANDOFF — Embassy Management System (EMS)

## Goal
Build a Node.js/TypeScript/Express 5 + Prisma 7.9 + PostgreSQL backend for an Embassy Management System with comprehensive consular services: authentication/authorization, citizen profiles, passport services, civil registry, visa processing, appointments, document legalization, emergency services, diplomatic logistics, and financial ledger with immutable audit logging.

## Current Progress

### ✅ Completed
1. **Prisma Schema** (`prisma/schema.prisma`) — Full schema written, validated, client generated:
   - **15 enums**: UserStatus, Gender, VisaType, VisaStatus, AppointmentStatus, ServiceCategory, RequestStatus, DocumentType, PaymentStatus, DecisionType, UrgencyLevel, CheckStatus, CaseStatus, PouchStatus, ClearanceLevel
   - **20 models**: User, Role, Permission, RolePermission, Profile, RefreshToken, AuditLog, Embassy, Department, ServiceType, ServiceRequest, VisaApplication, VisaDocument, VisaDecision, Appointment, Payment, VerificationCheck, WatchlistEntry, EmergencyCase, DiplomaticPouch, StaffClearance
   - Conventions: PascalCase models, camelCase fields, `userid` PK, `Updated` for `@updatedAt`, explicit `@relation` names, composite keys, cascade deletes, JSON metadata, indexes
   - Validated: `npx prisma validate` ✅
   - Generated: `npx prisma generate` → `src/generated/prisma` ✅

2. **Project Config** — All in place:
   - `prisma.config.ts` — datasource from `DATABASE_URL`, migrations path
   - `src/config/db.config.ts` — PrismaClient singleton with `@prisma/adapter-pg` connection pooling
   - `.env` — `DATABASE_URL` (port 5433), `PORT=3010`
   - `package.json` — deps: express 5, bcrypt 6, @prisma/client 7.9, prisma 7.9

3. **Kiro Specs** (`.kiro/specs/embassy-management-system/`) — All three files updated to match actual schema:
   - `requirements.md` — 12 FRs + 5 NFRs with EARS criteria, 20 models, 15 enums, API endpoints matching actual models
   - `design.md` — Architecture, exact Prisma models/relations, API design for all 20 models, service layer modules, security, infra, phases, testing, monitoring, compliance
   - `tasks.md` — 13-week plan, 7 phases, 100+ tasks with dependencies, acceptance criteria, NFR tracking, dependency graph

4. **Utilities** — `src/utils/bcrypt.utilities.ts` (cost 12) ready

### ⏳ Next Steps (Priority Order)

1. **Run Initial Migration**
   ```bash
   npx prisma migrate dev --schema=prisma/schema.prisma --name init
   ```

2. **Implement Express Server** (`src/server.ts`) — Currently empty
   - Add: `cors`, `express.json()`, `helmet`, rate limiting, structured logging, health checks
   - Router imports, API versioning (`/api/v1`)
   - Listen on `process.env.PORT || 3010`

3. **Add npm Scripts** to `package.json`:
   ```json
   "dev": "npx ts-node src/server.ts",
   "build": "npx tsc",
   "start": "node dist/server.js",
   "prisma:generate": "npx prisma generate --schema=prisma/schema.prisma",
   "prisma:migrate": "npx prisma migrate dev --schema=prisma/schema.prisma",
   "prisma:studio": "npx prisma studio --schema=prisma/schema.prisma"
   ```

3. **Build Route/Controller/Service Layers** per Phase 1 tasks (see `tasks.md`):
   - Auth: register, login, refresh, logout, forgot/reset password
   - RBAC middleware: JWT verification, permission extraction, rate limiting
   - Audit logging middleware: auto-log CRUD with old/new values
   - User/Role/Permission CRUD

## What Worked
- Mirroring parent project's Prisma conventions: generator output to `../src/generated/prisma`, no `url` in datasource, pg adapter singleton, `Updated` field for `@updatedAt`
- Enum-driven status workflows matching requirements (VisaStatus, AppointmentStatus, etc.)
- Kiro spec-driven approach: requirements → design → tasks with traceability

## What Didn't Work / Blockers
- None yet — schema phase complete
- Previous workflow attempts had syntax issues; direct file writes succeeded

## Key Files Reference
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Complete DB schema (source of truth) |
| `prisma.config.ts` | Prisma CLI config |
| `src/config/db.config.ts` | PrismaClient singleton with pg adapter |
| `src/server.ts` | Entry point (empty — needs Express setup) |
| `.env` | `DATABASE_URL`, `PORT` |
| `.kiro/specs/embassy-management-system/` | Requirements, Design, Tasks |

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

# Dev server (needs ts-node)
npx ts-node src/server.ts
```

---

## 🔄 IMMEDIATE NEXT ACTION
**Run the migration first**, then implement `src/server.ts` with basic Express 5 setup (middleware, health check, router mounting). After that, follow Phase 1 tasks in `tasks.md` sequentially.