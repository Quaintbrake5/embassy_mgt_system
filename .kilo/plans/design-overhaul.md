# Design Overhaul — Frontend Visual Redesign

## Critical Bugs (fix first)

| # | Problem | Fix |
|---|---------|-----|
| 1 | Light theme CSS vars are **outside any selector** — broken `index.css` | Wrap light tokens in `:root { ... }` block, move dark tokens to `:root[data-theme="dark"] { ... }` |
| 2 | `Inter` font is never loaded — no `<link>` in `index.html` | Replace with actually-loaded fonts via Google Fonts |
| 3 | No flash-of-wrong-theme prevention | Add inline `<script>` in `index.html` `<head>` that reads `localStorage` and sets `data-theme` before paint |
| 4 | Header has `.left` className in JSX but no `.left {}` rule in CSS | Add `.left { display: flex; align-items: center; gap: var(--space-md); }` |

---

## Aesthetic Direction: "Modern Diplomatic"

**Tone**: Authoritative but warm, premium, trustworthy. Think embassy lobby meets modern SaaS — slate velvet, warm brass, crisp white paper.

**Concept metaphor**: An embassy's physical space translates to digital — grand entrance (dashboard), formal chambers (detail pages), secure corridors (auth flows). The design should feel *institutional* but *not cold*, *prestigious* but *not ostentatious*.

**Differentiator**: Gold accent line across the top of every page (like a gilded frame), serif headings for authority, and a warm cream/dark charcoal color story that breaks out of the blue-primary rut.

### Color Palette

```
Light theme:
  --color-bg:        #f5f3ee         (warm cream)
  --color-surface:   #ffffff          (clean white)
  --color-border:    #e6e0d4          (warm beige)
  --color-text:      #1c1917          (warm black)
  --color-text-secondary: #78716c     (warm gray)
  --color-primary:   #2d1b69          (deep violet — regal, diplomatic)
  --color-primary-hover: #3b2282
  --color-primary-light: #ede9fe
  --color-accent:    #c4953a          (warm gold — like embassy brass)
  --color-accent-light: #fef3c7
  --color-success:   #15803d
  --color-error:     #b91c1c
  --color-warning:   #a16207
  --shadow-sm: 0 1px 2px rgba(28, 25, 23, 0.06)
  --shadow-md: 0 4px 12px rgba(28, 25, 23, 0.08)
  --shadow-lg: 0 8px 30px rgba(28, 25, 23, 0.1)

Dark theme:
  --color-bg:        #0f0d14          (deep aubergine-black)
  --color-surface:   #1a1825          (dark violet-slate)
  --color-border:    #2d2a3e
  --color-text:      #f5f3f0
  --color-text-secondary: #a8a2b8
  --color-primary:   #7c6ee8          (brighter violet for dark mode)
  --color-primary-hover: #9589f0
  --color-primary-light: #2d2550
  --color-accent:    #d4a74a          (warm gold)
  --color-success:   #22c55e
  --color-error:     #ef4444
  --color-warning:   #f59e0b
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3)
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4)
  --shadow-lg: 0 8px 30px rgba(0,0,0,0.5)
```

### Typography

| Usage | Font | Why |
|-------|------|-----|
| **Headings (h1-h3, section titles)** | `DM Serif Display` | Serif = authority, tradition. Pairs warm+stately |
| **Body text, labels, navigation** | `Outfit` | Clean, warm sans-serif. Rounded terminals feel approachable |
| **Dashboard stat values, data** | `JetBrains Mono` | Monospace for numbers = precision, data density |

Google Fonts link in `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;600&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## Phase 1 — Fix Critical Bugs (`index.css` + `index.html`)

### 1a. Rewrite `index.css`
- Properly wrap light theme vars in `:root { }`
- Wrap dark vars in `:root[data-theme="dark"] { }`
- Add new tokens: `--color-accent`, `--color-accent-light`, `--font-heading`, `--font-mono`
- Add theme transition: `transition: background-color 0.3s, color 0.3s, border-color 0.3s;` on `html`
- Remove `Inter` from font-family, replace with `Outfit` for body, `DM Serif Display` for headings
- Expand spacing scale: add `--space-3xl: 64px`
- Add `--radius-xl: 16px`
- Add `--transition-fast: 150ms`, `--transition-normal: 250ms`, `--transition-slow: 400ms`
- Add `--shadow-gold: 0 2px 8px rgba(196, 149, 58, 0.15)` for accent glow
- Add `sr-only` utility class for accessibility
- Ensure all color variables cascade properly
- Replace hardcoded StatCard purple/yellow colors with `--color-accent` and `--color-warning` vars

### 1b. Fix `index.html`
- Add theme flash prevention inline `<script>` in `<head>`:
  ```html
  <script>
    (function() {
      var theme = localStorage.getItem('theme') || 'system';
      var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    })();
  </script>
  ```
- Add Google Fonts preconnect + stylesheet links in `<head>`

---

## Phase 2 — Layout Overhaul (responsive + sidebar)

### 2a. Collapsible sidebar
- Add `sidebarCollapsed` state at `AppLayout` level
- Pass `collapsed` + `onToggle` to `Sidebar`
- Collapsed: width 64px, only icons visible, logo shrinks to icon
- Animate width transition via CSS
- Mobile (<768px): sidebar becomes off-canvas overlay with backdrop blur
- Add hamburger button to `Header` for mobile toggle

### 2b. `AppLayout.module.css` updates
- `.sidebar` width transitions: `transition: width var(--transition-normal)`
- `.main` margin-left transitions in sync
- Mobile: `.main` margin-left: 0, `.sidebar` transforms offscreen
- Add backdrop overlay for mobile sidebar

### 2c. `Sidebar` visual redesign
- Logo area: add decorative gold border-bottom, larger logo text
- Nav items: add subtle left border on active state instead of background fill
- Add section labels between groups (e.g., "Main", "Administration", "Security")
- Avatar/user info at bottom of sidebar (collapsed shows just avatar)
- Role badges (tiny colored dot indicating user role)
- Hover state: slight translateX(2px) on nav link text

### 2d. `Header` visual redesign
- Replace "Welcome, {name}" with breadcrumbs or contextual page indicator
- User avatar circle (initials) instead of just text
- Gold accent bottom border (1px `--color-accent`)
- ThemeToggle: animated rotation when cycling, `aria-label` support
- Logout button: icon-only variant with tooltip

---

## Phase 3 — Dashboard Page Redesign

### 3a. Layout architecture (asymmetric, not grid-of-same-cards)

Replace the flat grid of identical cards with a deliberate asymmetric composition:

```
╔══════════════════╗ ╔══════════════════╗ ╔══════════════╗
║   Welcome back   ║ ║   Date Range    ║ ║              ║
║   {user name}    ║ ║   [7d][30d][90d]║ ║  Notifications║
║   Subtitle text  ║ ║   [Custom]      ║ ║              ║
╚══════════════════╝ ╚══════════════════╝ ╚══════════════╝

╔═══════════════════════════════════════════╗
║           KEY METRICS (3 wide)            ║
║  ┌──────┐ ┌──────┐ ┌──────┐             ║
║  │Visa  │ │Appt  │ │Svc   │             ║
║  │Pending│ │Today │ │Active│             ║
║  └──────┘ └──────┘ └──────┘             ║
╚═══════════════════════════════════════════╝

╔══════════════════════════════╗ ╔════════════════════╗
║   Visa Trend (Line Chart)    ║ ║  Visas by Type     ║
║   Full width area            ║ ║  (Pie)             ║
║                              ║ ║                    ║
╚══════════════════════════════╝ ╚════════════════════╝

╔══════════════════════════╗ ║ ╔════════════════════╗
║  System Overview (Stats) ║ ║ ║  Top Embassies    ║
║  4 featured stat cards   ║ ║ ║  (Bar)            ║
║  side by side            ║ ║ ║                    ║
╚══════════════════════════╝ ║ ╚════════════════════╝
```

The key differentiator: **not** a uniform grid of boxes. Use varied card widths, some spanning 2 columns, some offset. Create visual rhythm.

### 3b. StatCard redesign
- Remove icon background color fill — use outline style icons instead
- Add subtle gold left-border accent (2px left border in `--color-accent`)
- Value: `font-family: var(--font-mono)`, `font-size: var(--font-size-3xl)` for presence
- Label: `font-family: var(--font-body)`, uppercase, tracked out (letter-spacing: 0.05em)
- Hover: subtle scale(1.02) + deeper shadow
- Add count-up animation: value fades in with number counter (CSS-only or React on mount)
- Remove the colored variant classes — use a single elegant card style

### 3c. Chart area redesign
- ChartCard: add gold top border accent (like the StatCard)
- Line chart: warm gold line color, soft violet area fill, customized dot
- Pie: remove labels from pie itself, use a custom legend below
- Bar chart: gold bars with rounded tops, grid lines subtle
- Dark mode: all chart elements adapt via CSS var or Recharts theme
- Add a shared chart palette that references CSS variables:
  ```ts
  const chartTheme = {
    line: 'var(--color-accent)',
    area: 'var(--color-primary)',
    grid: 'var(--color-border)',
    text: 'var(--color-text-secondary)',
    tooltip: { background: 'var(--color-surface)', border: 'var(--color-border)' }
  }
  ```
- Chart loading state: shimmer skeleton matching each chart shape
- Empty state: centered icon with elegant message

### 3d. Section headings redesign
- Replace boring section heading with:
  - Serif (`DM Serif Display`) text
  - Small decorative gold line below (not full-width border, just ~60px gold bar)
  - More generous padding above each section

### 3e. Add page entrance animation
- Dashboard sections stagger in with `animation-delay` and `translateY(20px) → translateY(0)` fade-up
- Stat card numbers count up on mount
- Charts fade in with a slight scale

---

## Phase 4 — Animation & Micro-interactions

### 4a. Page transitions
- Wrap route `<Outlet>` with a CSS-animated mount: fade-in + slide-up
- Use CSS `@keyframes pageEnter` triggered by adding a class on mount

### 4b. Sidebar animations
- Nav items stagger-in on page load (CSS animation-delay based on index)
- Active nav item: left border slide-in animation
- Collapse/expand animated

### 4c. StatCard micro-interactions
- Value count-up on mount (via `useEffect` + `requestAnimationFrame` or `setInterval`)
- Card hover: `scale(1.02)` + enhanced shadow + gold border glow

### 4d. Theme toggle animation
- Rotate icon on cycle: `transform: rotate(180deg)` transition
- Smooth color transition on body: `transition: background-color 0.3s ease, color 0.3s ease`

### 4e. Loading skeletons
- Replace simple pulse with shimmer effect:
  ```css
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .skeleton {
    background: linear-gradient(90deg, var(--color-border) 25%, var(--color-surface) 50%, var(--color-border) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }
  ```

---

## Phase 5 — Component Polish

### 5a. `Skeleton` component
- Replace pulse with shimmer gradient animation
- Add `variant="table"` (row-like), `variant="avatar"` (circle), `variant="stat"` (value-sized)
- Accept optional `count` prop to render N identical skeletons

### 5b. `StatCard` component
- Add `onClick` prop for navigation (so cards can link to pages)
- Value count-up animation
- Remove hardcoded color fallbacks — use CSS variable references
- Add `size` prop: 'sm' | 'md' | 'lg' controlling value font size

### 5c. `DateRangePicker` component
- Style native date inputs with consistent chrome
- Add smooth active preset transition (selected preset slides/switches)
- Custom date inputs: use a calendar-like appearance

### 5d. `ThemeToggle` component
- Add `aria-label="Switch to dark/light/system theme"`
- Rotate icon on change
- `title` attribute with current state description

### 5e. `PageHeader` component
- Add optional `actions` slot
- Title in `DM Serif Display`
- Subtitle in `Outfit` regular
- Add decorative bottom border similar to section headings

---

## Phase 6 — Asset & Polish

### 6a. Favicon & theme-color
- Add `<link rel="icon">` in `index.html` (simple shield/emblem SVG favicon)
- Add `<meta name="theme-color">` that changes with theme (light: `#f5f3ee`, dark: `#0f0d14`)

### 6b. Custom scrollbar
- Add `::-webkit-scrollbar` styles in `index.css` matching theme (thin, uses `--color-border`)

### 6c. Selection color
- `::selection { background: var(--color-primary-light); color: var(--color-primary); }`

### 6d. Focus outlines
- `:focus-visible` styles using gold ring: `outline: 2px solid var(--color-accent); outline-offset: 2px;`

---

## File Change Summary

| File | Change |
|------|--------|
| `frontend/index.html` | Add theme flash script, Google Fonts links, favicon, `theme-color` meta |
| `frontend/src/index.css` | Complete rewrite of `:root` vars, dark theme, new tokens, fonts, transitions, utilities |
| `frontend/src/App.tsx` | Possibly pass sidebar state, no major changes |
| `frontend/src/context/ThemeContext.tsx` | Add transition class on body, minor cleanup |
| `frontend/src/components/layout/AppLayout.tsx` | Add sidebar collapse state, responsive toggle |
| `frontend/src/components/layout/AppLayout.module.css` | Responsive layout, sidebar transitions, mobile overlay |
| `frontend/src/components/layout/Sidebar.tsx` | Collapse/expand, nav groups, user section, gold accents |
| `frontend/src/components/layout/Sidebar.module.css` | Full rewrite: collapsed state, mobile, gold accents, groups |
| `frontend/src/components/layout/Header.tsx` | Breadcrumbs, user avatar, gold border, hamburger |
| `frontend/src/components/layout/Header.module.css` | Gold accent, avatar styles, responsive |
| `frontend/src/components/layout/RoleGate.tsx` | No changes needed |
| `frontend/src/pages/dashboard/DashboardPage.tsx` | Asymmetric layout, chart theme, entrance animations, count-up |
| `frontend/src/pages/dashboard/DashboardPage.module.css` | Responsive charts, staggered grid, section decor, animations |
| `frontend/src/components/ui/StatCard.tsx` | Count-up animation, `onClick` prop, gold accent, mono value |
| `frontend/src/components/ui/StatCard.module.css` | Gold left border, mono values, hover scale, hardcoded color fix |
| `frontend/src/components/ui/Skeleton.tsx` | Shimmer animation, more variants, `count` prop |
| `frontend/src/components/ui/Skeleton.module.css` | Shimmer keyframes, additional variant styles |
| `frontend/src/components/ui/ThemeToggle.tsx` | `aria-label`, rotation animation |
| `frontend/src/components/ui/ThemeToggle.module.css` | Rotate animation, focus ring |
| `frontend/src/components/ui/DateRangePicker.tsx` | Minor styling tweaks |
| `frontend/src/components/ui/DateRangePicker.module.css` | Calendar-like custom inputs |
| `frontend/src/components/ui/PageHeader.tsx` | No structural changes, CSS update |
| `frontend/src/components/ui/PageHeader.module.css` | Serif title, gold decoration |

---

## Execution Order

| Step | Phase | Files |
|------|-------|-------|
| 1 | 1a | `index.css` — token rewrite, dark theme fix, new colors |
| 2 | 1b | `index.html` — flash script, fonts, favicon |
| 3 | 2a-c | `Sidebar.tsx` + `.module.css` — collapse, groups, gold accents |
| 4 | 2d | `Header.tsx` + `.module.css` — avatar, gold, hamburger |
| 5 | 2a,2b | `AppLayout.tsx` + `.module.css` — collapse state, responsive |
| 6 | 5a | `Skeleton.tsx` + `.module.css` — shimmer, variants |
| 7 | 5b | `StatCard.tsx` + `.module.css` — gold accent, count-up, mono |
| 8 | 5c,d,e | `DateRangePicker`, `ThemeToggle`, `PageHeader` — polish |
| 9 | 3a-e | `DashboardPage.tsx` + `.module.css` — asymmetric layout, charts, animations |
| 10 | 4a-e | Entrance animations, page transitions, staggered reveals |
| 11 | 6a-d | Favicon, scrollbar, selection, focus styles |

---

## Files NOT Changed

- All backend files (no changes needed)
- `frontend/src/types/index.ts` (no design changes needed)
- `frontend/src/api/*` (no design changes needed)
- `frontend/package.json` (no new deps needed — all changes are CSS/JS native)
- `frontend/src/components/guards/RoleGate.tsx` (no visual changes needed)
- `frontend/vite.config.ts` (no changes needed)
