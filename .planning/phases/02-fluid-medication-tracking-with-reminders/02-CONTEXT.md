# Phase 2: Fluid & Medication Tracking with Reminders - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Patients across all therapy types (CAPD/HD/transplant) can log fluid intake/output and medication intake with automatic daily balance calculation, install KidneyBuddy as a real PWA to their home screen, and receive reliable push reminders — delivered via per-device VAPID push subscriptions, with iOS gated correctly behind an Add-to-Home-Screen prompt — that survive backend restarts. Caregivers on separate devices receive the same push reminders independently via their own subscription.

This phase also establishes the **main responsive UI shell** (bottom nav mobile / 2-column tablet / sidebar desktop) that every later phase's screens reuse. The layout system must be fully correct here; it will not be revisited.

</domain>

<decisions>
## Implementation Decisions

### Navigation Structure
- **D-01:** Bottom navigation has **5 tabs**: Beranda / Catatan / Pengingat / Edukasi / Profil — in that order.
- **D-02:** "Catatan" tab is the consolidated logging area. In Phase 2 it shows **Cairan and Obat sub-tabs only**. Sub-tab slots for Aktivitas (Phase 3) and Lab (Phase 3) are designed in but empty — not hidden, just shown as "coming soon" placeholders or simply added when Phase 3 builds them.
- **D-03:** "Edukasi" and "Komunitas" (Edukasi tab) tabs are present in the nav shell from Phase 2 onward; their content is built in Phase 6. Phase 2 renders a placeholder state on those pages.

### Dashboard (Beranda) Content
- **D-04:** The main dashboard (Beranda) shows these cards in order from top to bottom:
  1. **Delta cairan card** (utama, large) — selisih cairan masuk/keluar hari ini, number prominent, colored by threshold (normal=teal, caution=amber, critical=red).
  2. **Obat card** — daftar obat hari ini yang belum dikonfirmasi (quick-confirm in-card).
  3. **Pengingat berikutnya card** — next upcoming reminder with time and name.
  4. AI summary placeholder (grey card, "Ringkasan AI tersedia di Phase 5") — build the slot now so Phase 5 can drop in without layout surgery.
- **D-05:** "No reminder configured" banner from Phase 1 onboarding (ONBOARD-03) remains visible on Beranda until at least one reminder is configured, then disappears.

### FAB (Floating Action Button)
- **D-06:** FAB is **always "Catat Cairan"** across all pages on mobile (375–767px). Label: "Catat" (short) with a fluid-drop icon. Color: primary teal gradient. It is the single entry point for fluid logging regardless of which tab is active.

### Responsive Layout — Three Distinct Layouts
- **D-07 (Mobile 375–767px):** Single-column layout. 5-tab bottom navigation fixed at bottom. Centered FAB sits above bottom nav (standard Material-style placement). Compact header with app name + notification bell icon.
- **D-08 (Tablet 768–1023px):** 2-column dashboard/list layout (metric cards side by side, 2-column grid for list views like Catatan). Bottom navigation **unchanged** from mobile (still 5-tab bottom nav). FAB still present, centered above bottom nav. Header same as mobile.
- **D-09 (Desktop 1024px+):** Primary navigation moves to a **left sidebar** (bottom nav gone entirely). Sidebar contains: logo/brand at top, vertical nav items (Beranda/Catatan/Pengingat/Edukasi/Profil), and a primary "Catat Cairan" button fixed at the bottom of the sidebar. Content area uses multi-column layout, max-width 1280px, centered. Header becomes a top bar (persistent, shows page title + user avatar).

### Claude's Discretion
- **Nav icon set** — Use standard health/medical icons that are universally recognizable. Beranda=house, Catatan=clipboard/pencil, Pengingat=bell, Edukasi=book, Profil=person. Standard shadcn/Lucide icon names are fine; planner picks the specific icon.
- **Active state indicator** — Bottom nav active tab: filled icon + teal label text (same as CAPD identity teal). Sidebar active item: left border teal accent + teal text + subtle teal background.
- **Empty states** — When no fluid entries logged today, the delta card shows "0 ml balance" in a neutral grey, not red. Only deviate from neutral when data exists and crosses a threshold.
- **Header on desktop** — Top bar shows: page title (left), notification bell + user avatar (right). No logo in top bar — logo lives in sidebar.
- **Breakpoint enforcement** — Implement breakpoints using Tailwind's `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px) — but ROADMAP breakpoints are 375/768/1024/1280px. The close alignment is fine; use Tailwind's nearest breakpoints, verify at the exact specified widths per RESPONSIVE-04.
- **CAPD effluent non-dismissable warning** — When CAPD patient logs keruh/berdarah effluen, a full-width red banner appears at the TOP of Beranda (above all cards) and does not disappear until the user actively dismisses it with a button ("Saya mengerti, hubungi dokter segera"). The form where it was logged also shows inline the warning immediately on submit.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `PRD.md` §7.2 — Responsive layout breakpoints (mobile/tablet/desktop — the source of RESPONSIVE-01..04 requirements; explicit mention of left sidebar at 1024px+)
- `PRD.md` §8.2 — FluidLog entity attributes (type, source, CAPD concentration, condition, volume, unit, timestamp)
- `PRD.md` §8.4 — ReminderSchedule entity attributes (full columns including push-related fields Phase 2 adds)
- `.planning/REQUIREMENTS.md` — FLUID-01..05, REMIND-01..08, NOTIF-01..03, RESPONSIVE-01..04 (exact v1 requirements this phase satisfies)
- `.planning/ROADMAP.md` — Phase 2 section: goal, success criteria (6 items), requirement list

### Visual & design system
- `DESIGN_SYSTEM_KidneyBuddy_v3.md` — color tokens (teal/amber/cream/destructive red), typography (Plus Jakarta Sans headings, DM Sans body), component specs (BottomNav, FAB, Card, Badge, Alert Darurat for the non-dismissable effluent warning)
- `KidneyBuddy_Design/` — Figma Make Vite export; **VISUAL REFERENCE ONLY** — the BottomNav and CatatCairan screens are among the 5 designed screens, reference for layout/component patterns but DO NOT port code directly

### Technical research — high-risk areas for this phase
- `.planning/research/PITFALLS.md` — iOS push gating (Add-to-Home-Screen mandatory before push), subscription silent expiry, in-process cron restart risk, at-rest encryption gap, microservices boundary collapse; all directly apply to Phase 2
- `.planning/research/STACK.md` — web-push@3.6.x (VAPID), node-cron (in-process scheduler backed by Postgres, NOT in-memory), at-rest encryption (app-layer AES-256-GCM preferred over pgcrypto per STACK.md "What NOT to Use"), multer@2.2.x, serwist@9.5.x for service worker
- `.planning/research/ARCHITECTURE.md` — PushSubscription entity (9th entity, not in PRD's 8; one-to-many per user, keyed by device endpoint); ReminderSchedule full column set; fan-out notification pattern (loop over push_subscriptions rows, handle 410 Gone by deactivating that row only)

### Phase 1 artifacts (foundation this phase builds on)
- `.planning/phases/01-foundation-auth-onboarding/01-01-SUMMARY.md` — what Walking Skeleton built (users table, auth routes, apiFetch, design tokens in globals.css)
- `.planning/phases/01-foundation-auth-onboarding/01-SKELETON.md` — architectural decisions (Express 5 layered architecture, Drizzle schema patterns, Postgres-backed lockout pattern to extend for push subscription store)
- `backend/src/db/schema/reminderSchedule.schema.ts` — Phase 1 reminder_schedule table (minimal subset); Phase 2 EXTENDS this table — do not recreate, add columns (dose, photo, follow-up tracking, push subscription FK) via migration
- `backend/src/middleware/authenticate.ts` — JWT auth middleware; ALL Phase 2 routes require authentication
- `frontend/lib/hooks/useAuth.ts` — auth state hook; Phase 2 components use this for user context
- `frontend/lib/api.ts` — apiFetch wrapper; Phase 2 uses this pattern for all API calls

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/middleware/authenticate.ts` — JWT auth middleware, use on ALL Phase 2 routes
- `frontend/lib/api.ts` — apiFetch wrapping NEXT_PUBLIC_API_URL + credentials:'include'; use for all new API calls
- `frontend/lib/hooks/useAuth.ts` — useAuth hook (user, login, logout, isLoading); Phase 2 components read `user.metodeTerapiAktif` to show CAPD-specific fields conditionally
- `backend/src/db/schema/reminderSchedule.schema.ts` — existing schema to extend (jenis, nama, jamPengingat, hariAktif, aktif, createdAt); add dose, photo, follow-up tracking, push subscription link via migration
- `frontend/app/globals.css` — design tokens already defined (#fdf9f3 cream bg, #2a9d8f teal, #ef9f27 amber, #1a2e2c dark text, etc.); use these, do not redefine

### Established Patterns
- **Drizzle schema pattern** — `pgTable("snake_case", { camelCase: type("snake_case").notNull()... })` — match this in all new Phase 2 tables (fluid_log, push_subscriptions, medication extension)
- **Layered backend** — Route → Controller (thin, parse req/res) → Service (zod validation + business logic) → Repository (SQL only) — no SQL in controllers or services
- **Conditional therapy UI** — `user.metodeTerapiAktif` from `/api/auth/me` drives conditional rendering; CAPD fields appear only when `metodeTerapiAktif === 'CAPD'`. Same pattern extends to fluid log form (CAPD concentration + condition fields) and reminder form (CAPD exchange vs HD dialysis reminder types)
- **Form pattern** — react-hook-form + zod resolver + shadcn Form/FormField/FormItem/FormControl/FormMessage — established in register/login/onboarding forms; reuse for fluid log and reminder forms
- **Design token pattern** — Bahasa Indonesia labels, no pure black (#000000), cream background, teal primary buttons, amber warnings

### Integration Points
- `frontend/app/dashboard/page.tsx` — currently shows "Halo, {name}" + logout. Phase 2 replaces this placeholder with the real Beranda dashboard (D-04 cards). Must wrap in the new responsive shell.
- `frontend/app/layout.tsx` — root layout. Phase 2 adds the responsive shell here: mobile bottom nav + tablet/desktop conditional via Tailwind breakpoints. All pages get the shell via layout.
- `backend/src/app.ts` — route mounting; Phase 2 adds /api/fluid, /api/reminders, /api/push routes. Follow existing mount pattern.
- `backend/src/db/schema/index.ts` — export barrel; all new Phase 2 tables exported here

</code_context>

<specifics>
## Specific Ideas

- Dashboard delta card: the fluid balance number should be **visually prominent** (large font, Plus Jakarta Sans 800, colored). Green/teal = normal, amber = approaching limit, red = over limit. Exact thresholds are Claude's discretion (planner derives from PRD or research).
- Tab "Catatan" in Phase 2 has **two sub-tabs**: "Cairan" and "Obat" visible. Design the sub-tab component to be extensible (add "Aktivitas" and "Lab" in Phase 3 without redesign).
- The FAB label on mobile is "Catat" (short, fits on the button) with a fluid-drop icon — not the full "Catat Cairan". On desktop sidebar the button is full-width with full text "Catat Cairan".
- CAPD effluent warning (from D-Claude's Discretion): red `Alert Darurat` component from DESIGN_SYSTEM_KidneyBuddy_v3.md — use the existing Alert Darurat spec, do not invent a new component.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 2 scope.

</deferred>

---

*Phase: 2-fluid-medication-tracking-with-reminders*
*Context gathered: 2026-06-26*
