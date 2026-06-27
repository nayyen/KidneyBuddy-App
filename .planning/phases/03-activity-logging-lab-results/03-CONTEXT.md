# Phase 3: Activity Logging & Lab Results - Context

**Gathered:** 2026-06-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Patients can record daily activities with a name and estimated end time, see real-time status (Berlangsung/Selesai/Masih aktif) on the dashboard, receive a positively-framed amber notification when activity runs past the estimated end time (not "overdue"), and rate how they felt after completing an activity. Patients can also upload lab result files (PDF/JPG/PNG, ≤10MB) or manually enter lab parameters — both in a single sheet/modal — and view a trend chart of one selected parameter over a date range.

This phase activates the "Aktivitas" and "Lab" sub-tabs in the Catatan page (already defined but disabled in Phase 2) and integrates activity status into the existing Beranda dashboard without adding a new full card.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Activity Integration
- **D-01:** Phase 3 does NOT add a 5th full card to the Beranda dashboard. Instead, a small "Kegiatan hari ini" sub-section or compact module is embedded inside or between existing D-04 cards. The exact placement (e.g., below the Pengingat Berikutnya card, or as a section within the dashboard content area) is Claude's discretion — the constraint is "no new full card" to keep mobile UI (D-04) from getting crowded.
- **D-02:** The detail view and history for activities lives in the Catatan tab → Aktivitas sub-tab. The dashboard compact module shows only the current/most recent activity status (Berlangsung/Selesai/Masih aktif) with a "Mulai Kegiatan" button if none is active.

### Activity Notifications
- **D-03:** The "reminder beberapa menit sebelum estimasi selesai" (ACTIVITY-02) is delivered as a **push notification** via the existing cron scheduler + VAPID infrastructure (same mechanism as reminder dispatch).
- **D-04:** The recurring "Masih aktif" notifications after the estimated end time has passed (every 10 minutes, FR-PS-018) are delivered as **in-app banner/toast only** — NOT push notifications. This prevents flooding the cron queue and background push delivery with high-frequency non-critical alerts. The amber "Masih aktif · [durasi] lebih" banner is shown in the app UI (on dashboard and Catatan/Aktivitas view) and refreshed in real time.
- **D-05:** The "Masih aktif" framing is amber (#EF9F27), with the text "Masih aktif · [durasi] lebih" — never "Terlambat" or "Overdue" language anywhere. Copy: "Kamu sudah beraktivitas lebih dari rencana 😊" (from FR-PS-018). The tone is positive/motivating.

### Lab Result Input Flow
- **D-06:** Lab result entry uses a **single sheet/modal** with two internal tabs:
  - Tab 1: "Input Manual" — enter lab parameter name, value, unit, date
  - Tab 2: "Unggah Dokumen" — file picker (PDF/JPG/PNG ≤10MB) + exam date
- **D-07:** Both tabs share the same sheet entry point ("Tambah Hasil Lab" button). No separate buttons or separate sheets for each mode.
- **D-08:** Lab results cannot be permanently deleted — only archived (soft delete). The list shows only `status = 'aktif'` entries by default; archived entries hidden unless user specifically navigates to "arsip".

### Lab Trend Chart
- **D-09:** Trend chart displays **one parameter at a time**. User selects a parameter from a dropdown (e.g., "Kreatinin", "Hemoglobin", "Ureum") → the chart updates to show that parameter's values over the selected date range.
- **D-10:** Multi-parameter overlay is explicitly NOT used — different lab parameters have vastly different value scales (e.g., Kreatinin in mg/dL vs Hemoglobin in g/dL) which would break chart scaling and make the visualization unreadable.
- **D-11:** Chart is built from **manual entry data only** (LAB-02/LAB-03). Uploaded documents (LAB-01) are not parsed for parameter values — only manual entries appear in the trend chart.
- **D-12:** Use **recharts** for the chart component — already recommended in CLAUDE.md stack. Not yet installed in `frontend/package.json`; planner must add it.

### Claude's Discretion
- **Activity entry form fields** — Name (text, required), estimated end time (time picker or datetime, required). Optional category/notes are not in REQUIREMENTS — planner decides whether to include them or keep minimal.
- **Activity "Masih aktif" timer polling** — Since in-app banner updates duration in real time ("15 menit lebih", "16 menit lebih"), planner decides whether to use setInterval/client-side polling or server-sent events. setInterval is simpler given the app's architecture.
- **Chart date range options** — Planner decides the available range presets (e.g., "7 hari terakhir", "30 hari", "3 bulan", "Custom"). LAB-03 says "rentang tanggal yang dapat dipilih" — presets + custom is the sensible default.
- **Lab parameter name normalization** — Common CKD lab parameters (Kreatinin, Hemoglobin, Ureum, GFR/eGFR, Kalium, Natrium, Albumin) can be offered as autocomplete suggestions when entering the parameter name in manual input. This helps group entries for trend charting. Planner decides if autocomplete is feasible in this phase.
- **Upload file storage** — Local Docker volume (same as medication photos from Phase 2), consistent with the file storage decision in research/ARCHITECTURE.md. `lab_results/` subfolder inside the upload volume.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `PRD.md` §5.1 — FR-PS-007 (lab file upload), FR-PS-008 (manual lab entry), FR-PS-009 (lab trend chart), FR-PS-017 (daily activity logging + feelings rating), FR-PS-018 (positive "Masih aktif" framing, 10-min in-app notification)
- `PRD.md` §8.5 — LabResult data entity (lab_id, user_id, Tanggal Pemeriksaan, Tipe Input, File Path, Parameter Lab JSON array, Catatan Tambahan, Status aktif/diarsipkan); note: no DailyActivity entity in PRD — planner must define this schema
- `.planning/REQUIREMENTS.md` — ACTIVITY-01, ACTIVITY-02, ACTIVITY-03, LAB-01, LAB-02, LAB-03, LAB-04 (exact v1 requirements this phase satisfies)
- `.planning/ROADMAP.md` — Phase 3 section: goal, success criteria (5 items), requirement list

### Visual & design system
- `DESIGN_SYSTEM_KidneyBuddy_v3.md` — BATCH 4 screens: "Daftar Hasil Lab" (screen 14), "Upload & Input Manual Lab" (screen 15), "Grafik Tren Parameter Lab" (screen 16); also illustration 14 "Hasil Lab" for empty state; amber #EF9F27 for "Masih aktif" framing
- `KidneyBuddy_Design/` — VISUAL REFERENCE ONLY — check if any of the BATCH 4 screens are implemented in the Figma Make export; do NOT port code directly

### Phase 2 artifacts (Phase 3 builds on top of)
- `.planning/phases/02-fluid-medication-tracking-with-reminders/02-CONTEXT.md` — D-04 (Beranda card order), D-02 (Catatan sub-tabs already defined), activity/lab slot context
- `frontend/app/(app)/catatan/page.tsx` — sub-tab `aktivitas` and `lab` already defined with `enabled: false`; Phase 3 sets `enabled: true` and renders their content
- `frontend/app/(app)/catatan/` — `cairan/` and `obat/` sub-pages exist; Phase 3 adds `aktivitas/` and `lab/` following the same pattern
- `backend/src/lib/upload.ts` — multer file upload handler already configured (medication photos); Phase 3 extends to accept PDF/JPG/PNG for lab results (may need new diskStorage destination or subfolder)
- `backend/src/jobs/scheduler.ts` + `backend/src/jobs/reminderDispatch.job.ts` — cron infrastructure; Phase 3's "before end time" push notification for activities integrates here (add an `activityEndReminder.job.ts` alongside reminderDispatch)
- `backend/src/lib/webPushClient.ts` + `backend/src/services/notification.service.ts` — VAPID push dispatch; reuse for activity end-time push

### Technical constraints
- `.planning/research/STACK.md` — recharts@3.x for trend charts; multer@2.2.x for file uploads; MIME validation (`['application/pdf', 'image/jpeg', 'image/png']`); 10MB file size limit
- `.planning/research/PITFALLS.md` — file upload storage: local Docker volume for MVP; no bytea blob in Postgres
- `CLAUDE.md` — recharts recommended in Supporting Libraries table; lab trend chart uses recharts with shadcn chart wrapper

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/app/(app)/catatan/page.tsx` — sub-tab system with `enabled` flag; Phase 3 sets `enabled: true` for `aktivitas` and `lab`; sub-tab pill row and content switching already implemented
- `frontend/components/catatan/FluidLogList.tsx` + `FluidLogItem.tsx` — list item pattern with date/time display; activity and lab list items follow the same visual pattern
- `backend/src/lib/upload.ts` — multer config; Phase 3 adds a new multer instance or extends the existing one for lab file uploads (PDF/JPG/PNG, 10MB limit)
- `backend/src/jobs/scheduler.ts` — `startScheduler()` mounts cron jobs; Phase 3 adds `activityEndReminder.job.ts` mounted here (runs every minute, checks for activities with `end_time` ≤ now + buffer minutes and dispatches push)
- `backend/src/services/notification.service.ts` — `sendToAllDevices(userId, payload)` fan-out; used for activity end-time push
- `frontend/components/beranda/DeltaCairanCard.tsx` — card component pattern (useEffect + authFetch + skeleton loading); activity module on dashboard follows same fetch pattern
- `frontend/lib/pushClient.ts` — subscribeAndRegister + ensureFreshSubscription; no changes needed for Phase 3 push
- `backend/src/middleware/authenticate.ts` — JWT auth middleware; ALL Phase 3 routes require it

### Established Patterns
- **Drizzle schema:** `pgTable("snake_case", { camelCase: type("snake_case").notNull()... })` — follow for `daily_activities` and `lab_results` tables
- **Layered backend:** Route → Controller (thin) → Service (Zod + business logic) → Repository (SQL only) — no SQL in controllers
- **Form pattern:** react-hook-form + zod resolver + shadcn Form/FormField — use for activity form and lab manual input form
- **Sheet pattern:** shadcn Sheet with inner `div flex-1 min-h-0 overflow-y-auto` for scrollable content (from Phase 2 hotfix); CatatCairanSheet and AddReminderSheet are reference implementations
- **Multer single-value preprocess:** `z.preprocess((v) => Array.isArray(v) ? v : v ? [v] : [], z.array(...))` — MUST use for any FormData array field on backend (anti-pattern from Phase 2's .continue-here.md)
- **Toast error pattern:** Wrap `onSubmit` in try-catch with `toast.error(msg)` — never let RHF swallow errors silently (anti-pattern from Phase 2's .continue-here.md)
- **WIB timezone:** Any new cron job that compares times must use WIB offset (`Date.now() + 7*3600*1000`) — UTC-only comparison is wrong for Jakarta patients (CR-02 fix from Phase 2)

### Integration Points
- `frontend/app/(app)/layout.tsx` → `AppShell.tsx` → `Beranda page` — activity compact module slots inside existing Beranda layout (D-01/D-02 constraint: no new full card)
- `frontend/app/(app)/catatan/page.tsx` — enable `aktivitas` and `lab` sub-tabs; render content for each
- `backend/src/app.ts` — mount new routes: `/api/activities` and `/api/lab-results`; follow existing mount pattern
- `backend/src/db/schema/index.ts` — export new `dailyActivities` and `labResults` tables
- `backend/src/server.ts` → `startScheduler()` — mount `activityEndReminder.job.ts` alongside existing cron jobs

</code_context>

<specifics>
## Specific Ideas

- "Masih aktif" badge copy: **"Masih aktif · [X] menit lebih"** (amber, FR-PS-018). The dashboard module and Catatan/Aktivitas view both show this badge when activity is past estimated end time.
- Motivational text when "Masih aktif": **"Kamu sudah beraktivitas lebih dari rencana 😊"** (from PRD FR-PS-018 verbatim).
- Lab input sheet tab order: **Tab 1 = Input Manual** (primary flow for trend chart data), **Tab 2 = Unggah Dokumen** — manual first because it feeds the trend chart; upload is supplementary.
- Chart library: **recharts** — not yet in `frontend/package.json`; install `recharts@3.x` + `@types/recharts` if needed.
- Feelings rating after activity: 4 options — **Nyaman / Biasa / Lelah / Berat** (from ACTIVITY-03/PRD). Rendered as a bottom sheet prompt (modal/sheet) that appears automatically after user taps "Tandai Selesai".

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 3 scope.

</deferred>

---

*Phase: 3-activity-logging-lab-results*
*Context gathered: 2026-06-27*
