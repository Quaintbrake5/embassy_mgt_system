# EMS Frontend — Priority Plan & Implementation Order

Derived from LLM Council verdict (5 advisors + peer review + chairman synthesis).

## Current State

| Metric | Value |
|--------|-------|
| Backend API routes | 90 |
| Frontend API functions | 34 (38% coverage) |
| Frontend API path mismatches | 7 (wrong URLs) |
| Rendered pages | 35 (list/detail views with DataTable) |
| Missing mutation pages | 10+ domains (no create/edit forms) |
| Missing CSS modules | 10 list pages (default styles) |
| Tests passing | 35/35 (auth flow + utils, no E2E) |

---

## Overall Subagent Architecture

**Guiding principles:**
- Each subagent writes to disjoint file sets — zero file conflicts
- Subagents use `general` for new file creation, `explore` for investigation before edits
- Fresh-context TypeScript verifier runs after each wave
- Skills loaded per subagent provide pattern-matching guardrails

### Subagent Types Used
| Type | When to Use |
|------|-------------|
| `general` | Multi-step tasks: creating new pages, writing API modules, building mutation forms |
| `explore` | Investigation before edits: reading existing files to understand patterns |
| `code-simplifier` | Only when user explicitly requests simplification |

### Dependency Graph
```
Wave 1 (sequential):
  Subagent 1 — P0: OpenAPI check (explore, 30m)
  Subagent 2 — P1: Fix 7 paths + tests (general, 1h)

Wave 2 (parallel, after Wave 1):
  Subagent 3A — P2: API wrappers (half — users, roles, perms, profile, embassies, visa, svc types)
  Subagent 3B — P2: API wrappers (half — appts, emergency, diplomatic, legalization, financial, audit)

Wave 3 (parallel, after Wave 2):
  Subagent 4A — P3a: User/Role mutation modals (users create/edit, roles CRUD, permission assignment)
  Subagent 4B — P3b: Domain mutation modals (service types, departments, legalization process)

Wave 4 (parallel, after Wave 3):
  Subagent 5A — P4a: Queue + Appointment ops (queue view, check-in, no-show, cancel, OTP flow)
  Subagent 5B — P4b: Admin ops (evacuation list, alerts, pouch handoff, clearance CRUD, audit export)
  Subagent 5C — P4c: Visa Decision workflow (decision buttons on VisaDetail, officer my-decisions page)

Wave 5 (parallel verification, after Wave 4):
  Subagent 6A — TypeScript fix pass: cd frontend && npx tsc --noEmit, fix all type errors
  Subagent 6B — Test pass: npx vitest run, fix broken tests

Wave 6 (deferred, after Wave 5):
  Subagent 7 — Polish: CSS modules for 10 list pages (deferred until P0-P4 are stable)
```

### Skills Reference Per Subagent

| Subagent | Skills | Rationale |
|----------|--------|-----------|
| **1** (OpenAPI check) | `codebase-research`, `environment-awareness` | Investigate backend swagger output, check tooling |
| **2** (Fix paths + tests) | `pattern-matching`, `verification-before-completion` | Surgical edits to existing api files, guard with tests |
| **3A/3B** (API wrappers) | `codebase-research`, `pattern-matching`, `security-protocol` | Follow existing auth.api.ts pattern; Bearer token, error interceptor, no secrets leaked |
| **4A** (User/Role modals) | `pattern-matching`, `no-gold-plating`, `ui-engineering` | Clone existing modal patterns — no over-engineering |
| **4B** (Domain modals) | `pattern-matching`, `no-gold-plating`, `karpathy-guidelines` | Same pattern, copy-paste safe, minimal diffs |
| **5A** (Queue + Appt ops) | `codebase-research`, `ui-ux-pro-max`, `design-integration` | Queue is the most UX-heavy page — use existing DataTable + action buttons |
| **5B** (Admin ops) | `pattern-matching`, `no-gold-plating` | Mostly form modals from existing patterns |
| **5C** (Visa Decision) | `codebase-research`, `security-protocol`, `ui-engineering` | Dual-approval workflow — read backend dto to get field types right |
| **6A** (TS fix) | `verification-before-completion` | Run tsc --noEmit, fix errors, zero any/@ts-ignore |
| **6B** (Test fix) | `verification-before-completion` | Run vitest, fix regressions |
| **7** (Polish) | `ui-ux-pro-max`, `frontend-design` | CSS module creation, visual polish |

---

## Priority Order

### P0 — Check OpenAPI Codegen Potential

**Subagent**: 1 (explore)
**Skills**: `codebase-research`, `environment-awareness`
**File(s) read-only**: `src/server.ts` (backend), OpenAPI route registration

The backend has `GET /api-docs` (swagger-ui-express). Check if it publishes a downloadable OpenAPI JSON spec. If yes, regenerate the frontend API client from it — this single step could fix all 7 wrong paths and all 49 missing functions.

**Action**: Fetch `GET /api-docs.json` or `GET /api-docs/-json`. If available, use `openapi-generator` or `orval` to regenerate `frontend/src/api/`. If not available or incomplete, proceed with P1.

---

### P1 — Fix 7 Broken API Paths

**Subagent**: 2 (general)
**Skills**: `pattern-matching`, `verification-before-completion`
**Files**: `frontend/src/api/profile.api.ts`, `financial.api.ts`, `emergency.api.ts`

| Frontend File | Current (Wrong) | Correct |
|---------------|-----------------|---------|
| `profile.api.ts` | `GET /profile` | `GET /profile/me` |
| `profile.api.ts` | `PUT /profile` | `PUT /profile/me` |
| `financial.api.ts` | `GET /financial/reconciliation` | `GET /financial/reconciliation/daily` |
| `financial.api.ts` | `GET /financial/reports` | `GET /financial/reports/monthly` |
| `emergency.api.ts` | `GET /emergency` | `GET /emergency/cases` |
| `emergency.api.ts` | `GET /emergency/:id` | `GET /emergency/cases/:id` |
| `emergency.api.ts` | `POST /emergency` | `POST /emergency/cases` |

**Guard**: Write a Vitest test for each corrected path asserting the correct URL is called — add to `frontend/src/__tests__/client.test.ts`.

**Test for each path fix**: mock axios, assert `client.get/post(url)` matches the corrected path exactly.

---

### P2 — Add Missing API Functions

**Subagent 3A**: Users, Roles, Permissions, Profile, Embassies, Visa, Service Types
**Subagent 3B**: Appointments, Emergency, Diplomatic, Legalization, Financial, Audit (remaining)
**Skills**: `codebase-research`, `pattern-matching`, `security-protocol`
**Files**: `frontend/src/api/*.api.ts` (append to existing modules)

Write API wrapper functions for every backend route that lacks one:

| Domain | Functions to Add | Consumed By |
|--------|-----------------|-------------|
| **Users** | `createUser`, `updateUser`, `deleteUser`, `updateUserStatus`, `assignRole`, `getCurrentUser`, `updateCurrentUser` | UserListPage, UserDetailPage |
| **Roles** | `createRole`, `updateRole`, `deleteRole`, `assignPermissions` | RoleListPage, RoleDetailPage |
| **Permissions** | `createPermission`, `updatePermission`, `deletePermission`, `getPermission` | PermissionListPage (if exists) |
| **Profile** | `createProfile`, `deleteProfile`, `getProfileById` | ProfilePage |
| **Embassies** | `deleteEmbassy`, `getDepartments`, `createDepartment`, `updateDepartment`, `deleteDepartment` | EmbassyListPage, EmbassyDetailPage |
| **Visa Decisions** | `getMyDecisions` | VisaDetailPage |
| **Visa Documents** | `getDocumentById` | VisaDetailPage |
| **Appointments** | `getSlots`, `cancelAppointment`, `getQueue`, `callNext`, `completeAppointment`, `markNoShow` | AppointmentBookPage, new Queue page |
| **Service Types** | `createServiceType`, `getServiceType`, `getByCategory`, `updateServiceType`, `deleteServiceType` | ServiceRequest pages |
| **Service Requests** | `updateServiceRequestStatus` | ServiceRequestDetailPage |
| **Financial** | `createTransaction`, `getTransaction` | TransactionListPage |
| **Emergency** | `updateCaseStatus`, `getEvacuationList`, `broadcastAlert` | EmergencyDetailPage, new pages |
| **Diplomatic** | `handoffPouch`, `createClearance`, `updateClearance` | PouchDetailPage, Clearance pages |
| **Legalization** | `createLegalization`, `processLegalization` | LegalizationListPage, LegalizationDetailPage |
| **Audit** | `getAuditLog`, `exportAuditLogs` | AuditLogPage |

**Pattern**: Follow existing wrappers in `auth.api.ts` — thin functions using `client.get/post/put/delete`:

```typescript
export const createUser = async (data: CreateUserDto): Promise<User> => {
  const response = await client.post('/users', data);
  return response.data;
};
```

**Rule**: Do NOT write a function without a consuming component. Write the function when you build the page that needs it.

---

### P3 — Mutation Pages

**Subagent 4A** (User/Role mutations): `pages/users/` modals, `pages/roles/` modals
**Subagent 4B** (Domain mutations): `pages/services/` modals, `pages/embassies/` department form, `pages/legalization/` process modal
**Skills**: `pattern-matching`, `no-gold-plating`, `ui-engineering`, `karpathy-guidelines`
**Files**: New modals in existing page directories + page updates

Add create/edit forms (modals preferred, standalone pages for complex forms):

| Wave | Pages | Pattern | Component Reuse |
|------|-------|---------|-----------------|
| P3a | User create/edit/role-assign + UserDetail status update | Modal + dropdown | reuses Modal, FormField, ConfirmDialog |
| P3b | Role create/edit + permission assignment sheet | Modal + checkboxes | reuses Modal, FormField |
| P3c | Service Type CRUD, Department CRUD (on Embassy detail) | Modal (clone ServiceRequestFormPage pattern) | reuses Modal, FormField, DataTable |
| P3d | Legalization create + process decision | Modal + status dropdown | reuses Modal, StatusBadge |

**Implementation pattern for each mutation modal**:
```typescript
const mutation = useMutation({
  mutationFn: (data) => createUser(data),
  onSuccess: () => {
    toast.addToast('success', 'User created successfully');
    queryClient.invalidateQueries({ queryKey: ['users'] });
    onClose();
  },
  onError: (error) => {
    toast.addToast('error', error instanceof ApiError ? error.message : 'Failed to create user');
  }
});
```

---

### P4 — Operational Admin Pages

**Subagent 5A**: Queue + Appointment ops (QueuePage, check-in/no-show UI)
**Subagent 5B**: Admin ops (EvacuationListPage, AlertForm, PouchHandoffModal, ClearanceForm, AuditDetailPage)
**Subagent 5C**: Visa Decision workflow (decision buttons on VisaDetail, officer decisions page)
**Skills**: `codebase-research`, `ui-ux-pro-max`, `design-integration`, `security-protocol`, `no-gold-plating`

| Page | Backend Routes | Key Component(s) | Subagent |
|------|----------------|------------------|----------|
| Appointment Queue | `GET /appointments/queue`, `POST /queue/next`, `PUT .../checkin`, `.../complete`, `.../no-show` | DataTable + action buttons per row | 5A |
| Appointment Cancel UI | `PUT /appointments/:id/cancel` | ConfirmDialog on list page | 5A |
| Evacuation List | `GET /emergency/evacuation-list` | DataTable + StatusBadge | 5B |
| Emergency Alert | `POST /emergency/alerts` | Form | 5B |
| Diplomatic Pouch Handoff | `PUT /diplomatic/pouches/:id/handoff` | FormField modal | 5B |
| Clearance Create/Edit | `POST /diplomatic/clearances`, `PUT .../:id` | Form | 5B |
| Audit Log Detail/Export | `GET /audit/:id`, `GET /audit/export` | Detail view + export button | 5B |
| Visa Decision Workflow | `GET /visa/decisions/officer/me` | Decision action buttons on VisaDetail | 5C |

**Files created**:
- `frontend/src/pages/appointments/QueuePage.tsx` + `QueuePage.module.css`
- `frontend/src/pages/emergency/EvacuationListPage.tsx` + `.module.css`
- `frontend/src/pages/emergency/AlertBroadcastPage.tsx` + `.module.css`
- `frontend/src/pages/audit/AuditDetailPage.tsx` + `.module.css`
- Updates to existing pages: VisaDetailPage (decision buttons), AppointmentListPage (cancel), PouchDetailPage (handoff), ClearanceListPage (create)

---

### P5 — Polish (Deferred)

**Subagent**: 7
**Skills**: `ui-ux-pro-max`, `frontend-design`
**Files**: 10 new `*.module.css` files

- CSS modules for 10 unstyled list pages
- i18n / dark mode
- E2E tests via Vitest + MSW

---

### Wave 5 — Verification (after Wave 4)

**Subagent 6A — TypeScript Fix Pass**
- Run `cd frontend && npx tsc --noEmit`
- Fix all type errors (import paths, missing exports, incorrect prop types)
- Zero `any`, zero `@ts-ignore`

**Subagent 6B — Test Pass**
- Run `npx vitest run`
- Fix any regressions from path changes
- Verify existing 35 tests still pass

---

## Implementation Order Summary

```
    ┌──────────────────────┐
    │  Wave 1 (sequential) │
    │  Subagent 1: P0      │──OpenAPI check──┐
    │  Subagent 2: P1      │──Fix paths+tests│
    └──────────┬───────────┘                 │
               │                             │
    ┌──────────▼───────────┐                 │
    │  Wave 2 (parallel)   │                 │
    │  Subagent 3A: P2/2   │──API wrappers───┤
    │  Subagent 3B: P2/2   │──API wrappers───┘
    └──────────┬───────────┘
               │
    ┌──────────▼───────────┐
    │  Wave 3 (parallel)   │
    │  Subagent 4A: P3a    │──User/Role modals
    │  Subagent 4B: P3b    │──Domain modals
    └──────────┬───────────┘
               │
    ┌──────────▼───────────┐
    │  Wave 4 (parallel)   │
    │  Subagent 5A: P4a    │──Queue/Appt ops
    │  Subagent 5B: P4b    │──Admin ops
    │  Subagent 5C: P4c    │──Visa decisions
    └──────────┬───────────┘
               │
    ┌──────────▼───────────┐
    │  Wave 5 (parallel)   │
    │  Subagent 6A: TS fix │──tsc --noEmit
    │  Subagent 6B: Tests  │──vitest run
    └──────────┬───────────┘
               │
    ┌──────────▼───────────┐
    │  Wave 6 (deferred)   │
    │  Subagent 7: Polish  │──CSS → i18n → E2E
    └──────────────────────┘
```

## Architecture Decisions

1. **Use modals for CRUD, not standalone routes** — saves routing complexity. Only use dedicated pages for multi-step flows (VisaForm, Legalization).
2. **Write API function when building its consumer** — prevents orphaned wrappers.
3. **Add contract tests alongside each path fix** — prevents regression.
4. **Keep error handling consistent** — all mutations: success toast + `queryClient.invalidateQueries` + optional navigate; error toast on failure.
5. **Subagents write to disjoint file sets** — no file conflicts between parallel agents.
6. **Run TypeScript check between waves** — catch type errors early before piling on more code.

## Files Likely to Change

| Area | Files | Subagent |
|------|-------|----------|
| API wrappers (path fix) | `profile.api.ts`, `financial.api.ts`, `emergency.api.ts` | 2 |
| API wrappers (new functions) | `users.api.ts`, `roles.api.ts`, `permissions.api.ts`, `profile.api.ts`, `embassies.api.ts`, `visaDecisions.api.ts`, `visaDocuments.api.ts`, `appointments.api.ts`, `serviceTypes.api.ts`, `serviceRequests.api.ts`, `financial.api.ts`, `emergency.api.ts`, `diplomatic.api.ts`, `legalization.api.ts`, `audit.api.ts` | 3A, 3B |
| New mutation modals | pages for users, roles, permissions, service types, departments (in existing page dirs) | 4A, 4B |
| New pages | QueuePage, EvacuationListPage, AlertBroadcastPage, AuditDetailPage, VisaDecisionPage | 5A, 5B, 5C |
| Route updates | `frontend/src/App.tsx` (new routes for queue, alerts, etc.) | 5A, 5B, 5C |
| Tests | `frontend/src/__tests__/client.test.ts` (path contract tests) | 2 |
| CSS (deferred) | 10 new `.module.css` files for list pages | 7 |

## Quality Gates (enforced per wave)

1. `cd frontend && npx tsc --noEmit` — zero errors after each wave
2. `npx vitest run` — existing 35 tests + new contract tests pass
3. No broken paths (each corrected path has a test)
4. No `any` or `@ts-ignore` in new code
5. Every mutation page handles: success toast + invalidation + error toast
6. CSS Modules for any new page (no inline styles)
7. No `console.log` debug statements in committed code
