# Dashboard Refresh — Implementation Plan

## Overview
Major frontend refresh focused on dashboards: Recharts visualizations, dark mode, lucide-react icons, loading skeletons, role-specific views, date-range filtering, sidebar role gating, and visual polish. All 7 features were selected by the user.

---

## Phase 1 — Foundation

### 1a. Install dependencies
| Package | Purpose |
|---------|---------|
| `recharts` | React-native chart library |
| `date-fns` | Date formatting for charts & date range |
| `clsx` | Conditional class composition |

### 1b. Create shared components
- **`StatCard`** (`components/ui/StatCard.tsx` + `.module.css`)
  - Props: `icon: LucideIcon`, `label`, `value`, `trend?`, `color?`, `loading?`
  - Card with icon on left, value+label on right, optional up/down trend arrow
  - Skeleton variant when `loading={true}` (pulsing placeholder)
- **`Skeleton`** (`components/ui/Skeleton.tsx` + `.module.css`)
  - Variants: `text`, `card`, `chart`, `circle`
  - CSS-only pulsing animation via `@keyframes`
- **`DateRangePicker`** (`components/ui/DateRangePicker.tsx` + `.module.css`)
  - Preset buttons: `7d`, `30d`, `90d`, `Custom`
  - Custom mode shows two date inputs
  - Emits `{ startDate: string; endDate: string }`
- **`ThemeToggle`** (`components/ui/ThemeToggle.tsx` + `.module.css`)
  - Sun/moon icon button using lucide-react

### 1c. Files to create
```
frontend/src/components/ui/StatCard.tsx
frontend/src/components/ui/StatCard.module.css
frontend/src/components/ui/Skeleton.tsx
frontend/src/components/ui/Skeleton.module.css
frontend/src/components/ui/DateRangePicker.tsx
frontend/src/components/ui/DateRangePicker.module.css
frontend/src/components/ui/ThemeToggle.tsx
frontend/src/components/ui/ThemeToggle.module.css
```

---

## Phase 2 — Dark Mode

### 2a. Theme context & CSS variables
- Create `ThemeContext.tsx` (`frontend/src/context/ThemeContext.tsx`)
  - Value: `'light' | 'dark' | 'system'`
  - Persisted to `localStorage`
  - On mount: reads `prefers-color-scheme`, sets `data-theme` attribute on `<html>`
  - Toggle cycles: light → dark → system

- Extend `index.css` `:root` with dark tokens using `:root[data-theme="dark"]` selector:
  - `--color-bg-dark: #0f172a`, `--color-surface-dark: #1e293b`, etc.
  - Override existing variables under dark selector:
    ```css
    :root[data-theme="dark"] {
      --color-bg: #0f172a;
      --color-surface: #1e293b;
      --color-border: #334155;
      --color-text: #f1f5f9;
      ...
    }
    ```

### 2b. Wire into App
- Wrap `<App>` with `<ThemeProvider>`
- Add `<ThemeToggle>` to `<Header>` next to logout button

### 2c. Update all existing `.module.css` files
Already use `var(--color-*)` — no changes needed for colors to work.
Verify that any hardcoded colors are replaced with variables.
No CSS file changes strictly required — the cascade handles it.

### 2d. Ensure images/logos
No brand images to worry about — pure CSS color scheme.

---

## Phase 3 — Loading Skeletons

### 3a. Replace `<LoadingSpinner>` on DashboardPage
- Replace `if (isLoading) return <LoadingSpinner />`
- Return skeleton grid: 6 `<Skeleton variant="card" />` for stat cards
- Chart area shows `<Skeleton variant="chart" />`

### 3b. (Optional) Replace on other list pages
- List pages: `<Skeleton variant="table" />` mimicking DataTable rows
- Can do later if time permits; dashboard is the priority

---

## Phase 4 — Lucide Icons & Visual Polish

### 4a. Sidebar icon swap
Replace emoji characters with lucide-react icons in `Sidebar.tsx`:
- `📊` → `<BarChart3 />`
- `👤` → `<User />`
- `🏛️` → `<Building2 />`
- `🛂` → `<Passport />`
- `📅` → `<CalendarDays />`
- `📋` → `<FileText />`
- `⚖️` → `<Scale />`
- `🚨` → `<AlertTriangle />`
- `📦` → `<Package />`
- `💰` → `<DollarSign />`
- `📜` → `<ScrollText />`
- `🔒` → `<Shield />`

### 4b. StatCard icon variant
Each stat card on dashboard gets a relevant icon:
- `totalUsers` → `<Users />`
- `totalVisas` → `<Passport />`
- `totalAppointments` → `<CalendarCheck />`
- `totalServiceRequests` → `<FileText />`
- etc.

### 4c. Stat card polish
- Gradient accent strip at top of each card (via `::before`)
- Hover lift: `transform: translateY(-2px); box-shadow: var(--shadow-md)`
- Count-up animation via CSS `@keyframes` (scale-in on mount)
- Color coding: each card has a semantic color class (`card--blue`, `card--green`, etc.)

---

## Phase 5 — Backend: Date Range & Chart Data

### 5a. Extend `DashboardService`
Add methods:
```typescript
interface ChartDataset {
  visaTrend: { date: string; count: number; status: string }[]
  appointmentTrend: { date: string; count: number; status: string }[]
  visaByType: { visaType: string; count: number }[]
  appointmentsByStatus: { status: string; count: number }[]
  serviceRequestsByStatus: { status: string; count: number }[]
  topEmbassies: { name: string; count: number }[]
}

getChartData(startDate?: string, endDate?: string): Promise<ChartDataset>
```

Implementation approach — **raw SQL via Prisma `$queryRawUnsafe`** for date-grouped aggregations:
```typescript
const visaTrend = await this.prisma.$queryRawUnsafe<{ date: string; count: bigint; status: string }[]>(
  `SELECT DATE("createdAt") as date, COUNT(*)::int as count, "status"
   FROM "VisaApplication"
   WHERE "createdAt" >= $1 AND "createdAt" <= $2
   GROUP BY DATE("createdAt"), "status"
   ORDER BY date ASC`,
  startDate, endDate
)
```

Status/type distributions via Prisma `groupBy`:
```typescript
const visaByType = await this.prisma.visaApplication.groupBy({
  by: ['visaType'],
  _count: { id: true },
  where: dateFilter,
})
```

### 5b. Extend `DashboardController`
- Current `getDashboard` method: pass `startDate`, `endDate` query params to service
- Return chart data alongside stats:
  ```typescript
  res.json({ success: true, data: { stats: adminStats, charts: chartData } })
  ```

### 5c. Update route
- `GET /dashboard?startDate=2026-01-01&endDate=2026-07-29`
- No structural route changes needed

### 5d. Update `DashboardStats` type (frontend)
Add `charts?: ChartDataset` field to the type. Define `ChartDataset` interface:
```typescript
export interface ChartDataset {
  visaTrend: { date: string; count: number; status: string }[]
  appointmentTrend: { date: string; count: number; status: string }[]
  visaByType: { visaType: string; count: number }[]
  appointmentsByStatus: { status: string; count: number }[]
  serviceRequestsByStatus: { status: string; count: number }[]
  topEmbassies: { name: string; count: number }[]
}
```

### 5e. Update `DashboardStats` interface (frontend)
```typescript
export interface DashboardStats {
  // existing fields...
  charts?: ChartDataset
}
```

---

## Phase 6 — Recharts Integration

### 6a. Admin dashboard chart area
Under "System Overview" section, add a charts row:
- **Line chart**: Visa trend + Appointment trend over time (dual line)
  - X-axis: date, Y-axis: count
  - Tooltip shows breakdown by status
  - `<LineChart>` + `<Line>` + `<XAxis>` + `<Tooltip>`
- **Pie chart**: Visa by type distribution
  - `<PieChart>` + `<Pie>` + `<Cell>` (colored by type)
- **Bar chart**: Top embassies by activity
  - `<BarChart>` + `<Bar>` horizontal layout

### 6b. Responsive layout
- Charts section: 2-column grid on desktop, 1-column on mobile
- `<ResponsiveContainer>` wrapper for each chart
- `width="100%" height={300}`

### 6c. Empty state for charts
- When no data for a period, show message: "No data for this period"
- Don't render empty `<Recharts>` containers (they look broken)

---

## Phase 7 — Role-Specific Dashboard Views

### 7a. Single page, conditional sections
Keep `DashboardPage.tsx` as the single page. Use role slug to gate sections:

```
┌─────────────────────────────────────┐
│  PageHeader: Dashboard              │
│  DateRangePicker (if admin)         │
├─────────────────────────────────────┤
│  MY ACTIVITY (ALL roles)            │
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │ Visa │ │ Appt │ │ SR   │       │
│  └──────┘ └──────┘ └──────┘       │
├─────────────────────────────────────┤
│  CHARTS & OVERVIEW (admin only)    │
│  ┌──────────────────┐ ┌─────────┐  │
│  │ Line chart        │ │ Pie     │  │
│  │ visas/appts trend │ │ by type │  │
│  └──────────────────┘ └─────────┘  │
│  ┌────────────────────────────────┐ │
│  │ Stat cards (6-8)              │ │
│  └────────────────────────────────┘ │
├─────────────────────────────────────┤
│  QUEUE OVERVIEW (officer only)     │
│  ┌──────┐ ┌──────┐ ┌──────────┐   │
│  │ Pend │ │ Today│ │ Service  │   │
│  │ Dec  │ │ Appts│ │ Requests │   │
│  └──────┘ └──────┘ └──────────┘   │
├─────────────────────────────────────┤
│  RECENT ACTIVITY (ALL roles)       │
│  Timeline-style list               │
└─────────────────────────────────────┘
```

### 7b. My Activity section (all roles)
- `myPendingVisas` → StatCard with `<Passport />` icon, links to `/visas`
- `myUpcomingAppointments` → StatCard with `<CalendarCheck />` icon, links to `/appointments`
- `myRecentServiceRequests` → StatCard with `<FileText />` icon, links to `/services`

### 7c. Admin charts section
- Charts (from Phase 6)
- Stat cards: totalUsers, newUsersThisWeek, totalVisas, pendingVisas, totalAppointments, todayAppointments, totalServiceRequests, pendingServiceRequests, totalEmbassies
- Each card links to the relevant list page

### 7d. Officer queue section
- `pendingVisaDecisions` → StatCard color-coded orange, links to visa list filtered by `UNDER_REVIEW`
- `todayAppointments` → StatCard color-coded blue
- `pendingServiceRequests` → StatCard color-coded yellow

### 7e. Recent Activity feed
- Render a list of recent events (audit log data or derived from stats)
- Show: "User X submitted visa application #123", "Appointment booked for 2026-07-30", etc.
- Alternatively, skip if audit log endpoint isn't easily combined — use as stretch goal

---

## Phase 8 — Sidebar Role Filtering & RoleGate

### 8a. Define nav item role requirements
In `Sidebar.tsx`, add roles array to each nav item:
```typescript
const navItems = [
  { label: 'Dashboard', icon: BarChart3, path: '/', roles: ['*'] },
  { label: 'Profile', icon: User, path: '/profile', roles: ['*'] },
  { label: 'Embassies', icon: Building2, path: '/embassies', roles: ['admin', 'diplomatic'] },
  { label: 'Users', icon: Users, path: '/users', roles: ['admin'] },
  { label: 'Roles', icon: Shield, path: '/roles', roles: ['admin'] },
  { label: 'Visas', icon: Passport, path: '/visas', roles: ['*'] },
  { label: 'Appointments', icon: CalendarDays, path: '/appointments', roles: ['*'] },
  { label: 'Services', icon: FileText, path: '/services', roles: ['*'] },
  { label: 'Legalization', icon: Scale, path: '/legalization', roles: ['admin', 'diplomatic', 'officer'] },
  { label: 'Emergency', icon: AlertTriangle, path: '/emergency', roles: ['*'] },
  { label: 'Pouches', icon: Package, path: '/diplomatic/pouches', roles: ['diplomatic', 'admin'] },
  { label: 'Clearances', icon: Shield, path: '/diplomatic/clearances', roles: ['diplomatic', 'admin'] },
  { label: 'Financial', icon: DollarSign, path: '/financial', roles: ['finance', 'admin'] },
  { label: 'Audit Log', icon: ScrollText, path: '/audit', roles: ['admin'] },
]
```

### 8b. Filter in render
```tsx
const userRole = user?.role?.slug ?? ''
const visibleItems = navItems.filter(item =>
  item.roles.includes('*') || item.roles.includes(userRole)
)
```

### 8c. Implement RoleGate
In `RoleGate.tsx`:
```tsx
export function RoleGate({ requiredRoles, children }: Props) {
  const { user } = useAuth()
  if (!user?.role?.slug) return null
  if (requiredRoles.includes('*') || requiredRoles.includes(user.role.slug)) {
    return children
  }
  return <Navigate to="/" replace />
}
```
Then wrap route `<Outlet />` in App.tsx with `<RoleGate>` where needed.

---

## Phase 9 — Date Range Picker

### 9a. Component
- `DateRangePicker`: row of preset buttons + optional start/end date inputs
- Presets: `Last 7 days`, `Last 30 days` (default), `Last 90 days`, `All time`
- When preset changes, recalculate `startDate`/`endDate` and call `onChange`

### 9b. Wire into DashboardPage
- `DateRangePicker` appears above the "System Overview" section (admin only)
- On change: `queryClient.invalidateQueries({ queryKey: ['dashboard', range] })`
- Query key includes the date range so React Query treats it as distinct data
- `getDashboardStats` function updated to pass date params:
  ```typescript
  export const getDashboardStats = (params?: { startDate?: string; endDate?: string }) =>
    client.get('/dashboard', { params }).then((r) => r.data as DashboardStats)
  ```

---

## Execution Order

| Step | Phase | Description | Files |
|------|-------|-------------|-------|
| 1 | 1 | Install recharts, date-fns, clsx | `package.json` |
| 2 | 1 | Create StatCard + Skeleton components | 4 new files |
| 3 | 2 | Create ThemeContext + dark CSS variables | `ThemeContext.tsx`, `index.css` |
| 4 | 2 | Wire ThemeToggle into Header | `Header.tsx` |
| 5 | 4 | Replace emoji with lucide icons in Sidebar | `Sidebar.tsx` |
| 6 | 3 | Replace LoadingSpinner with skeletons on Dashboard | `DashboardPage.tsx` |
| 7 | 5 | Backend: add date range + chart data to DashboardService | `dashboard.service.ts` |
| 8 | 5 | Backend: update controller, route | `dashboard.controller.ts` |
| 9 | 5 | Frontend: update types for charts | `types/index.ts` |
| 10 | 6 | Add Recharts charts section (admin) | `DashboardPage.tsx` |
| 11 | 7 | Role-specific sections, stat card polish | `DashboardPage.tsx`, `.module.css` |
| 12 | 8 | Sidebar role filtering + RoleGate | `Sidebar.tsx`, `RoleGate.tsx`, `App.tsx` |
| 13 | 9 | Create DateRangePicker component + wire | `DateRangePicker.tsx`, `DashboardPage.tsx` |

---

## Files Changed

### New files (12)
| File | Purpose |
|------|---------|
| `frontend/src/components/ui/StatCard.tsx` | Reusable stat card with icon/color/skeleton |
| `frontend/src/components/ui/StatCard.module.css` | StatCard styles |
| `frontend/src/components/ui/Skeleton.tsx` | Loading skeleton placeholder |
| `frontend/src/components/ui/Skeleton.module.css` | Skeleton animation styles |
| `frontend/src/components/ui/DateRangePicker.tsx` | Preset date range selector |
| `frontend/src/components/ui/DateRangePicker.module.css` | DateRangePicker styles |
| `frontend/src/components/ui/ThemeToggle.tsx` | Light/dark/system toggle button |
| `frontend/src/components/ui/ThemeToggle.module.css` | Toggle styles |
| `frontend/src/context/ThemeContext.tsx` | Theme state + localStorage + system preference |

### Existing files changed (20)
| File | Change |
|------|--------|
| `frontend/package.json` | Add recharts, date-fns, clsx |
| `frontend/src/index.css` | Add dark theme CSS variables |
| `frontend/src/App.tsx` | Wrap with ThemeProvider, fix RoleGate usage |
| `frontend/src/pages/dashboard/DashboardPage.tsx` | Full rewrite: skeletons, charts, date range, role sections, stat cards |
| `frontend/src/pages/dashboard/DashboardPage.module.css` | Extended: chart area, date range bar, timelines |
| `frontend/src/components/layout/Sidebar.tsx` | lucide icons, role filtering |
| `frontend/src/components/layout/Header.tsx` | Add ThemeToggle |
| `frontend/src/components/layout/Header.module.css` | ThemeToggle alignment |
| `frontend/src/components/layout/AppLayout.tsx` | Role-aware sidebar |
| `frontend/src/components/layout/RoleGate.tsx` | Full implementation |
| `frontend/src/api/dashboard.api.ts` | Accept date range params |
| `frontend/src/types/index.ts` | Add ChartDataset, update DashboardStats |
| `src/services/dashboard.service.ts` | Add getChartData, date filter params |
| `src/controllers/dashboard.controller.ts` | Pass query params, return chart data |
| `src/routes/dashboard.routes.ts` | No changes needed |

---

## Risk & Notes

- **`$queryRawUnsafe`** uses raw SQL — ensure proper parameterization via `$1, $2` placeholders (already planned)
- **Recharts SSR** — Vite handles this fine since it's client-rendered
- **Dark mode persistence** — `localStorage` key `theme`, only 3 values (`light`/`dark`/`system`)
- **No API breaking changes** — existing `getAdminStats()` etc. remain; chart data is additive
- **Sidebar role filtering** depends on `user.role.slug` being populated — verify the auth flow populates it