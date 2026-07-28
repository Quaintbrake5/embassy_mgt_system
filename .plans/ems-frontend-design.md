# EMS Frontend — Design Specification + Subagent Orchestration Plan

## Tech Stack
- **Framework**: React 19 + Vite + TypeScript
- **Routing**: React Router v7
- **HTTP**: axios (interceptors for auth, error handling)
- **Server state**: TanStack Query (caching, retries, loading/error states)
- **CSS**: Vanilla CSS Modules (`.module.css`)
- **Auth**: JWT in localStorage (accessToken 15min + refreshToken 7d)

### Environment Config
```
VITE_API_URL=http://localhost:3010/api/v1
VITE_APP_NAME=Embassy Management System
```

All backend URLs use `import.meta.env.VITE_API_URL` as the base.

---

## Overall Subagent Architecture

**Guiding principles:**
- No single monolithic agent — ruled out
- Phase 0 (backend) and Phase A Wave 1 (scaffold) run in parallel
- Each subagent writes to disjoint file sets — zero file conflicts
- Subagents use `cavecrew-builder` for surgical edits, longer form for new file creation
- Fresh-context verifier at the end of each wave

### Dependency Graph
```
Wave 1 (parallel):
  Subagent A — Phase 0 backend (src/dto/, src/services/, src/controllers/, src/routes/)
  Subagent B — Phase A scaffold (frontend/ package.json, tsconfig, vite.config, index.html)

Wave 2 (parallel, starts after Subagent B completes):
  Subagent C — Phase A API + context layer (frontend/src/api/, frontend/src/context/, frontend/src/hooks/, frontend/src/types/, frontend/src/utils/)
  Subagent D — Phase A UI + pages + routing (frontend/src/components/, frontend/src/pages/, frontend/src/App.tsx, frontend/src/main.tsx, frontend/src/index.css)

Wave 3 (parallel, starts after Wave 2 completes):
  Subagent E — Phase B citizen modules (Dashboard, Profile, Visa, Appointment)
  Subagent F — Phase B citizen modules cont'd (ServiceRequest, Legalization) + Phase C embassy/users/roles
  Subagent G — Phase C admin modules (Emergency, Financial, Diplomatic, Audit)

Wave 4 (parallel verification):
  Subagent H — tsc --noEmit check + fix
  Subagent I — Vitest test scaffold for auth flow
```

---

## Wave 1 (Parallel — Round 1)

### Subagent A — Phase 0: Backend Email Verification

**Goal**: Implement `sendVerification` and `verifyEmail` backend endpoints by mirroring the existing `forgotPassword`/`resetPassword` token pattern.

**Files to edit** (all exist):
| File | Change |
|---|---|
| `src/dto/auth.dto.ts` | Add `SendVerificationDto` + `VerifyEmailDto` classes after `ResetPasswordDto`, before `AuthResponseDto` |
| `src/services/auth.service.ts` | Add `sendVerification(userId)` + `verifyEmail(token)` methods, add `IAuthService` interface entries |
| `src/controllers/auth.controller.ts` | Add `sendVerification` + `verifyEmail` handler methods |
| `src/routes/auth.routes.ts` | Add two routes: `POST /send-verification` (protected, authMiddleware) + `POST /verify-email` (public, validate(VerifyEmailDto)) |

**Pattern to follow** (exact):
- `SendVerificationDto`: empty sanitize (returns {}), empty validate (returns []) — identity from auth token
- `VerifyEmailDto`: token field, sanitize trims, validate requires 32+ char hex string
- `AuthService.sendVerification(userId)`: uses `generateToken(32)` from `crypto.utilities`, stores in Redis as `verify:{token}` with 3600s TTL (fallback: in-memory Map with 1h TTL), creates audit log action `'VERIFICATION_EMAIL_SENT'`, returns `{ message, token }`. Do NOT check if already verified — always regenerate.
- `AuthService.verifyEmail(token)`: looks up `verify:{token}` in Redis/in-memory Map, if not found/expired throws `AuthenticationError('Invalid or expired verification token')`, deletes token, updates user `emailVerified: true, status: 'ACTIVE'`, audit log `'EMAIL_VERIFIED'`, returns `{ message: "Email verified successfully" }`
- Controller handlers follow exact pattern of `forgotPassword`/`resetPassword` (sanitize → validate → service call → json response with `{ success: true, data: result }`)
- Import `SendVerificationDto` and `VerifyEmailDto` in controller and routes
- `IAuthService` interface needs two new method signatures

**Do NOT touch**: prisma schema, other DTOs/routes/controllers/services, test files, or any config.

**Definition of done**: `npx tsc --noEmit` passes with zero errors.

**Skill**: Use `cavecrew-builder` for each file edit since the scope is well-specified and ≤4 files.

---

### Subagent B — Phase A Wave 1: Frontend Scaffold

**Goal**: Create the Vite + React 19 + TypeScript frontend project with all dependencies installed and config files set up.

**Actions**:
1. `mkdir frontend` in project root (NOT inside src/)
2. Run `npm create vite@latest frontend -- --template react-ts` (or manually scaffold to avoid prompts)
3. Set package.json `name` to `embassy-mgt-system-frontend`, `type` to `module`
4. Install deps: `npm install axios react-router-dom @tanstack/react-query`
5. Install dev deps: `npm install -D vitest @testing-library/react @testing-library/jest-dom msw`
6. Clean up Vite boilerplate (remove default App.css, logo.svg, assets/)
7. Write `frontend/tsconfig.json` with strict mode, path aliases `@/*` → `./src/*`
8. Write `frontend/vite.config.ts` with proxy: `"/api"` → `http://localhost:3010`
9. Write `frontend/.env` with `VITE_API_URL=http://localhost:3010/api/v1` and `VITE_APP_NAME=Embassy Management System`
10. Write `frontend/index.html` with root div and script tag pointing to `/src/main.tsx`
11. Add npm scripts to `frontend/package.json`: `dev`, `build`, `preview`, `typecheck`, `test`

**Directory structure to create (empty files ok for now)**:
```
frontend/src/
  api/
  hooks/
  context/
  components/layout/
  components/ui/
  components/guards/
  pages/auth/
  pages/dashboard/
  pages/profile/
  pages/embassies/
  pages/users/
  pages/roles/
  pages/visas/
  pages/appointments/
  pages/services/
  pages/legalization/
  pages/emergency/
  pages/diplomatic/
  pages/financial/
  pages/audit/
  types/
  utils/
```

**Definition of done**: `npm install` completes without errors, `cd frontend && npx tsc --noEmit` passes (may fail on empty files, that's ok), `npm run dev` starts without crashing.

**Do NOT**: write any React components, API files, or page logic. Scaffold only.

---

## Wave 2 (Parallel — starts after Subagent B scaffold completes)

### Subagent C — Phase A API + Context Layer

**Goal**: Build the entire data/state layer — axios client with interceptors, all api modules, auth/toast contexts, hooks, types, and utils. Writes only to `api/`, `context/`, `hooks/`, `types/`, `utils/`.

**Files to write** (all within `frontend/src/`):

| File | Description |
|---|---|
| `types/index.ts` | All TypeScript types: User, AuthResponse, PaginatedResponse<T>, ApiError, Toast, module-specific types (Visa, Appointment, Embassy, etc.) |
| `utils/formatters.ts` | Date formatters, currency formatter, enum label mapper, full name joiner |
| `utils/validators.ts` | `required`, `isEmail`, `minLength`, `isPhone`, `isStrongPassword` functions |
| `api/client.ts` | Axios instance with: request interceptor (attach Bearer token from localStorage), response success interceptor (unwrap `response.data.data` — return inner payload, reject if `success===false`), response error interceptor (401→refresh→retry, 403→toast, 404→toast, 429→toast, 500→toast, network→toast) |
| `api/auth.api.ts` | `login`, `register`, `refresh`, `logout`, `forgotPassword`, `resetPassword`, `sendVerification`, `verifyEmail` |
| `api/users.api.ts` | `getUsers`, `getUser` |
| `api/roles.api.ts` | `getRoles`, `getRole` |
| `api/permissions.api.ts` | `getPermissions` |
| `api/profile.api.ts` | `getProfile`, `updateProfile`, `changePassword` |
| `api/embassies.api.ts` | `getEmbassies`, `getEmbassy`, `createEmbassy`, `updateEmbassy` |
| `api/serviceTypes.api.ts` | `getServiceTypes` |
| `api/serviceRequests.api.ts` | `getServiceRequests`, `getServiceRequest`, `createServiceRequest`, `updateServiceRequest` |
| `api/visa.api.ts` | `getVisas`, `getVisa`, `createVisa`, `updateVisa` |
| `api/visaDocuments.api.ts` | `uploadDocument`, `deleteDocument` |
| `api/visaDecisions.api.ts` | `getVisaDecisions`, `makeDecision` |
| `api/appointments.api.ts` | `getAppointments`, `getAppointment`, `createAppointment`, `verifyOtp` |
| `api/legalization.api.ts` | `getLegalizations`, `getLegalization` |
| `api/emergency.api.ts` | `getEmergencies`, `getEmergency`, `createEmergency` |
| `api/diplomatic.api.ts` | `getPouches`, `getPouch`, `getClearances`, `getClearance` |
| `api/financial.api.ts` | `getTransactions`, `getReconciliation`, `getReports` |
| `api/audit.api.ts` | `getAuditLogs` |
| `context/AuthContext.tsx` | React Context + Provider: stores user, tokens, login/logout/refresh methods. On mount: checks localStorage for accessToken, decodes JWT to get user+roles (no API call), if expired calls refresh. |
| `context/ToastContext.tsx` | React Context + useReducer: addToast(type, message, duration?), dismiss(id). Toast types: success/error/warning/info. Auto-dismiss: 4s (error: 6s). |
| `hooks/useAuth.ts` | `useContext(AuthContext)` wrapper — throws if used outside provider |
| `hooks/useToast.ts` | `useContext(ToastContext)` wrapper — throws if used outside provider |

**Key patterns**:
- API functions: thin wrappers, `client.get('/path', { params }).then(r => r.data)`
- Client interceptor unwraps `response.data.data` — so `r.data` in `.then(r => r.data)` gets the inner payload, not the envelope
- `client.ts` exports `client` as default and also exports `setAuthTokens` and `clearAuthTokens` for the AuthContext to use
- AuthContext uses `useReducer` for state management
- ToastContext uses `useReducer` with auto-generated IDs, auto-dismiss via setTimeout

**Definition of done**: All files compile with `npx tsc --noEmit` (may show unused-variable warnings for now but zero errors).

**Do NOT**: write any React components (no JSX), page files, or CSS. No `App.tsx`, `main.tsx`, or routing.

---

### Subagent D — Phase A UI Components + Pages + Routing

**Goal**: Build all reusable UI components, auth pages, layout components, routing, and global styles. Writes only to `components/`, `pages/`, `App.tsx`, `main.tsx`, `index.css`.

**Files to write** (all within `frontend/src/`):

**Global styles:**
| File | Description |
|---|---|
| `index.css` | CSS reset + custom properties: color palette (primary, success, error, warning, info, surface, text), spacing scale (4/8/12/16/24/32/48), typography (font-family, sizes), shadows, border-radius, z-index scale, status color map |

**UI components:**
| File | Description |
|---|---|
| `components/ui/LoadingSpinner.tsx` | Centered spinner SVG. Props: `size?: 'sm' | 'md' | 'lg'` |
| `components/ui/ErrorBoundary.tsx` | React error boundary class component. Fallback: error message + "Try Again" button that resets. Logs to console. |
| `components/ui/NotFoundPage.tsx` | 404 page with message + "Back to Dashboard" link. Props: `message?: string` for custom messages. |
| `components/ui/Toast.tsx` + `Toast.module.css` | Toast notification item. Slide-in animation from right. Icon per type. Close button. Auto-dismiss progress bar. |
| `components/ui/DataTable.tsx` + `DataTable.module.css` | Generic table: Column<T> interface (key, label, sortable?, render?), DataTableProps<T> (columns, data, totalPages, currentPage, onPageChange, isLoading?, emptyMessage?). Pagination: [<] [1] [2] [3] … [N] [>]. Disabled at boundaries. |
| `components/ui/StatusBadge.tsx` | Color-coded badge. Props: `status: string`. Color map from CSS custom properties. |
| `components/ui/Modal.tsx` + `Modal.module.css` | Overlay modal with backdrop click-to-close, Escape key close, portal rendering. Props: `open, onClose, title, children`. |
| `components/ui/ConfirmDialog.tsx` | Confirmation modal built on Modal. Props: `open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel`. |
| `components/ui/FormField.tsx` + `FormField.module.css` | Label + children + error message. Props: `label, error?, children, required?`. Error shown in red below input. |
| `components/ui/PageHeader.tsx` + `PageHeader.module.css` | Title + optional subtitle + optional action buttons slot. Props: `title, subtitle?, children?` (children for action buttons). |
| `components/ui/OtpInput.tsx` + `OtpInput.module.css` | 6 individual input boxes. Auto-focus next on digit. Backspace goes previous. Paste 6 digits. States: default/filled/error/shake animation/disabled. Props: `value, onChange, onComplete, disabled?, error?`. |
| `components/ui/FileUpload.tsx` | Drag-drop zone + click browse. File type validation: PDF/JPEG/PNG, max 10MB. Upload progress bar. File list with remove. Props: `onUpload, onRemove, uploadedFiles, accept?: string, maxSize?: number`. |
| `components/ui/SearchBar.tsx` | Text input with magnifying glass icon, 300ms debounce, clear button. Props: `value, onChange, placeholder?`. |
| `components/ui/FilterDropdown.tsx` | Dropdown with "All" option. Props: `label, options: {value, label}[], value, onChange`. |

**Layout components:**
| File | Description |
|---|---|
| `components/layout/AppLayout.tsx` + `AppLayout.module.css` | Sidebar (left) + Header (top) + `<Outlet />` (content). Email verification banner at top. ErrorBoundary wrapping Outlet. |
| `components/layout/Sidebar.tsx` | Navigation links grouped by role. Reads user from AuthContext. Links: Dashboard, Profile, Visas, Appointments, Services, Legalization, Emergency, Users (admin), Roles (admin), Embassies (admin), Diplomatic (diplo), Financial (finance), Audit (admin). Active link highlighting. Collapsible on mobile. |
| `components/layout/Header.tsx` | App name left, user avatar/menu right (Profile, Change Password, Logout). |

**Guards:**
| File | Description |
|---|---|
| `components/guards/ProtectedRoute.tsx` | Checks localStorage for accessToken. Absent → redirect `/login`. Expired → attempt refresh. Refresh fails → clear tokens → redirect `/login` with toast. Success → `<Outlet />`. |
| `components/guards/RoleGate.tsx` | Reads user permissions from AuthContext. Props: `resource: string, action?: string`. If lacks permission → "Access Denied" page. Authorized → `<Outlet />`. |

**Auth pages:**
| File | Description |
|---|---|
| `pages/auth/LoginPage.tsx` + `LoginPage.module.css` | Email + password form. Validation on blur + submit. Loading state. Error handling. On success: store tokens → redirect `/`. |
| `pages/auth/RegisterPage.tsx` + `LoginPage.module.css` | firstName, lastName, email, password, phone form. On success: store tokens → if `emailVerified === false` redirect `/verify-email?pending=true`. |
| `pages/auth/ForgotPasswordPage.tsx` | Email input. On submit: POST forgotPassword → show success message "Check your email". |
| `pages/auth/ResetPasswordPage.tsx` | Reads `token` from URL search params. New password + confirm password. On submit: POST resetPassword with token. Success → redirect `/login` with toast. |
| `pages/auth/VerifyEmailPage.tsx` | Two modes: (1) `?pending=true` — shows "Registration successful! Check your inbox" with resend button + 60s cooldown + "Continue to dashboard" button. (2) `?token=xxx` — on mount POST verifyEmail with token, loading/success (redirect after 2s)/error (show resend button). |

**App entry:**
| File | Description |
|---|---|
| `App.tsx` | Full route tree as specified in Section 2 of the design spec. Wraps in AuthProvider > ToastProvider > QueryClientProvider > BrowserRouter. Public routes outside layout, protected routes inside ProtectedRoute > AppLayout. RoleGate around admin modules. Catch-all 404. |
| `main.tsx` | ReactDOM.createRoot + render `<App />`. Import `index.css`. |

**Key patterns to follow**:
- `PageHeader` at top of every page
- `DataTable` + `LoadingSpinner` + error state for every list page
- Mutation pattern: success toast + invalidateQueries + navigate; error toast
- Form validation: `useState` for form + errors, validate on blur + submit
- CSS Modules only (no global style leakage, no inline styles in component files)
- All pages handle: loading → spinner, empty → message, error → retry, success → content

**Definition of done**: `npx tsc --noEmit` passes, all import paths resolve, no `any` or `@ts-ignore`.

**Do NOT**: write API files (Subagent C handles those). Only import from `../../api/...` and `../../context/...` and `../../hooks/...`.

---

## Wave 3 — Module Pages (Phases B + C)

### Subagent E — Citizen Modules Part 1 (Dashboard, Profile, Visa)

**Files**: 
- `pages/dashboard/DashboardPage.tsx` + `.module.css`
- `pages/profile/ProfilePage.tsx`
- `pages/visas/VisaListPage.tsx` + `.module.css`
- `pages/visas/VisaDetailPage.tsx` + `.module.css`
- `pages/visas/VisaFormPage.tsx` + `.module.css`

**DashboardPage**: Role-aware. Admin → stats cards (users, embassies, pending visas, recent activity). Officer → pending tasks, today's appointments. Citizen → my visas, my appointments. Uses `useQuery` for each widget data.

**ProfilePage**: Read-only display of user info (firstName, lastName, email, phone, role, status). Change password button → inline form with currentPassword, newPassword, confirmPassword using `changePassword` mutation.

**Visa modules**: List with search + status filter. Detail with visa info, documents (FileUpload), decisions. Form with multi-step (personal info, passport, visa type, documents, review). Uses `useBlocker` for unsaved changes warning.

### Subagent F — Citizen Modules Part 2 + Admin Core

**Files**:
- `pages/appointments/AppointmentListPage.tsx` + `.module.css`
- `pages/appointments/AppointmentBookPage.tsx` + `.module.css`
- `pages/appointments/AppointmentDetailPage.tsx` + `.module.css`
- `pages/services/ServiceRequestListPage.tsx` + `.module.css`
- `pages/services/ServiceRequestDetailPage.tsx` + `.module.css`
- `pages/services/ServiceRequestFormPage.tsx` + `.module.css`
- `pages/legalization/LegalizationListPage.tsx` + `.module.css`
- `pages/legalization/LegalizationDetailPage.tsx` + `.module.css`
- `pages/embassies/EmbassyListPage.tsx` + `.module.css`
- `pages/embassies/EmbassyDetailPage.tsx` + `.module.css`
- `pages/embassies/EmbassyFormPage.tsx` + `.module.css`

**AppointmentBookPage**: Multi-step: select embassy → select date/time → confirm with OTP (OtpInput component). OTP step shows phone number hint, 6 boxes, auto-verify on complete.

### Subagent G — Admin Modules

**Files**:
- `pages/users/UserListPage.tsx` + `.module.css`
- `pages/users/UserDetailPage.tsx` + `.module.css`
- `pages/roles/RoleListPage.tsx` + `.module.css`
- `pages/roles/RoleDetailPage.tsx` + `.module.css`
- `pages/emergency/EmergencyListPage.tsx` + `.module.css`
- `pages/emergency/EmergencyDetailPage.tsx` + `.module.css`
- `pages/diplomatic/PouchListPage.tsx` + `.module.css`
- `pages/diplomatic/PouchDetailPage.tsx` + `.module.css`
- `pages/diplomatic/ClearanceListPage.tsx` + `.module.css`
- `pages/diplomatic/ClearanceDetailPage.tsx` + `.module.css`
- `pages/financial/TransactionListPage.tsx` + `.module.css`
- `pages/financial/ReconciliationPage.tsx` + `.module.css`
- `pages/financial/ReportsPage.tsx` + `.module.css`
- `pages/audit/AuditLogPage.tsx` + `.module.css`

---

## Wave 4 — Verification

### Subagent H — TypeScript Compilation Fix

- Run `cd frontend && npx tsc --noEmit`
- Fix all type errors (import paths, missing exports, incorrect prop types)
- Zero `any`, zero `@ts-ignore`, zero `TODO`
- Verify backend also: `npx tsc --noEmit` in root

### Subagent I — Test Scaffold

- `frontend/src/__tests__/setup.ts` — vitest setup with `@testing-library/jest-dom` matchers
- `frontend/vitest.config.ts` — extends vite.config.ts
- Test: `LoginPage` renders form, validates empty fields, calls API on submit
- Test: `RegisterPage` renders form, validates password strength
- Test: axios interceptor unwraps response envelope correctly
- Test: AuthContext stores tokens, decodes JWT, handles missing token
- Run `npx vitest run` — all pass

---

## Quality Gates (enforced per wave)

1. Backend: `npx tsc --noEmit` — zero errors
2. Frontend: `cd frontend && npx tsc --noEmit` — zero errors
3. No `any`, no `// @ts-ignore`, no `// TODO` placeholders
4. Every list page handles: loading, empty, error, populated states
5. Every mutation handles: success toast + invalidation + error toast
6. CSS Modules used (no global style leakage)
7. All error messages are user-friendly (no raw API errors exposed)
8. RoleGate applied where API requires permissions
9. Critical auth flows covered by Vitest tests
10. No `console.log` debug statements in committed code

---

## Skills Reference for Each Subagent

| Subagent | Skills |
|---|---|
| A (Phase 0 backend) | codebase-research, pattern-matching, cavecrew-builder |
| B (Scaffold) | environment-awareness, pattern-matching |
| C (API/Context) | codebase-research, pattern-matching, security-protocol |
| D (UI/Pages/Routing) | codebase-research, pattern-matching, design-integration, ui-ux-pro-max |
| E-G (Modules) | pattern-matching, karpathy-guidelines, no-gold-plating |
| H (TypeScript fix) | verification-before-completion |
| I (Tests) | test-driven-development |

---

## Implementation Order (Summary)

```
Round 1 (Parallel):
  [A] Phase 0 backend email verification  →  4 files, ~10min
  [B] Frontend scaffold                   →  ~15 files, ~5min

Round 2 (Parallel, after B):
  [C] API + Context layer                 →  ~22 files
  [D] UI Components + Pages + Routing     →  ~35 files

Round 3 (Parallel, after C+D):
  [E] Citizen modules (Dashboard, Profile, Visa)
  [F] Citizen modules cont'd + Admin core (Appointment, Service, Legalization, Embassy)
  [G] Admin modules (Users, Roles, Emergency, Financial, Diplomatic, Audit)

Round 4 (Parallel verification):
  [H] TypeScript fix pass
  [I] Test scaffold + auth flow tests
```