---
phase: 02-fluid-medication-tracking-with-reminders
plan: "04"
subsystem: fluid-tracking
tags: [fluid-log, capd, encryption, offline-queue, beranda, tdd]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [fluid-log-api, daily-balance-api, catat-cairan-ui, delta-cairan-card, capd-effluent-banner, offline-queue]
  affects: [dashboard, catatan-page]
tech_stack:
  added:
    - idb (IndexedDB wrapper for offline queue)
  patterns:
    - AES-256-GCM application-layer encryption (catatan before INSERT)
    - Injectable dependency pattern for unit testing without live DB
    - fluid:saved CustomEvent for cross-component refresh coordination
    - CAPD effluent non-dismissable alert (patient safety pattern)
key_files:
  created:
    - backend/src/db/schema/fluidLog.schema.ts
    - backend/src/repositories/fluidLog.repository.ts
    - backend/src/services/fluid.service.ts
    - backend/src/controllers/fluid.controller.ts
    - backend/src/routes/fluid.routes.ts
    - backend/src/test/fluid.service.test.ts
    - frontend/lib/validators/fluid.schema.ts
    - frontend/lib/offlineQueue.ts
    - frontend/components/cairan/CatatCairanForm.tsx
    - frontend/components/cairan/CatatCairanSheet.tsx
    - frontend/components/beranda/DeltaCairanCard.tsx
    - frontend/components/beranda/CAPDEffluentBanner.tsx
    - frontend/components/beranda/NoReminderBanner.tsx
    - frontend/components/beranda/AiPlaceholderCard.tsx
    - frontend/components/catatan/FluidLogItem.tsx
    - frontend/components/catatan/FluidLogList.tsx
  modified:
    - backend/src/db/schema/index.ts
    - backend/src/app.ts
    - frontend/app/(app)/dashboard/page.tsx
    - frontend/app/(app)/catatan/page.tsx
    - frontend/components/shell/AppShell.tsx
decisions:
  - "fluid_log.tanggal stored as text YYYY-MM-DD (timezone-safe, avoids pg timestamp timezone drift for patient-reported times)"
  - "catatan encrypted via AES-256-GCM in Node before INSERT, decrypted after SELECT — key never enters Postgres query logs"
  - "drizzle-kit push hung on WSL2 interactive TTY — created fluid_log table via direct docker exec psql SQL instead"
  - "getDailyBalance extended to return hasAbnormalCondition in same SQL query (avoid second round-trip for CAPD banner)"
  - "POST /api/fluid/acknowledge-abnormal logs audit event to stdout rather than creating a new DB table (insufficient data volume to justify schema change)"
  - "CatatCairanSheet mounted in AppShell (not individual pages) so FAB and Sidebar share state across navigation"
  - "fluid:saved CustomEvent used for cross-component coordination (DeltaCairanCard, FluidLogList, dashboard page)"
metrics:
  duration: "~3h (split across two sessions)"
  completed: "2026-06-26"
  tasks_completed: 5
  files_created: 16
  files_modified: 5
---

# Phase 02 Plan 04: Fluid Tracking Vertical Slice Summary

**One-liner:** AES-256-GCM encrypted fluid_log with CAPD effluent detection, server-computed daily balance, offline IndexedDB queue, and Beranda DeltaCairanCard + non-dismissable CAPDEffluentBanner.

## What Was Built

### Backend

**fluid_log table** (`backend/src/db/schema/fluidLog.schema.ts`):
- `id uuid PK`, `user_id uuid FK→users`, `tanggal text` (YYYY-MM-DD, timezone-safe), `waktu text` (HH:mm)
- `tipe text` (masuk|keluar), `sumber text`, `konsentrasi_capd text`, `volume numeric(8,2)`, `satuan text default ml`
- `kondisi_keluar text`, `catatan text` (stores AES-256-GCM ciphertext), `is_late_entry boolean default false`
- Composite index `idx_fluid_log_user_date` on `(user_id, tanggal)`

**fluid.service.ts** — three production entry points:
- `createEntry(userId, payload)`: validates via zod, encrypts catatan, inserts, returns `{entry, hasAbnormalCondition}`
- `getDailyBalance(userId, date)`: delegates to repo, returns `{masuk, keluar, delta, unit, hasAbnormalCondition}`
- `getEntriesByDate(userId, date)`: fetches rows, decrypts catatan per row, computes `hasAbnormalCondition` per entry

Injectable cores `_createEntryCore` / `_getDailyBalanceCore` exported for unit testing without live DB.

**Routes** (`/api/fluid`):
- `POST /` — create entry (authenticated)
- `GET /daily-balance?date=` — server-computed balance (authenticated)
- `POST /acknowledge-abnormal` — CAPD alert acknowledgment audit log (T-02-04-05)
- `GET /?date=` — list entries for date (authenticated)

### Frontend

**CatatCairanForm.tsx** — react-hook-form + zodResolver:
- Masuk/Keluar toggle, fluid source select (CAPD hidden for non-CAPD users)
- CAPD concentration + kondisiKeluar fields (shown only when keluar + CAPD source)
- Inline Alert Darurat when abnormal kondisi selected
- isLateEntry checkbox → datetime-local picker for retroactive entries
- Online: POST /api/fluid; Offline: enqueue to IndexedDB

**CatatCairanSheet.tsx** — bottom Sheet wrapping CatatCairanForm, dispatches `fluid:saved` event

**offlineQueue.ts** — idb-backed queue:
- `enqueue(entry)` → adds to `fluidQueue` object store
- `flush(onSync?, onError?)` → POSTs queued entries with auth header, `_isFlushing` guard
- `registerOnlineListener()` → auto-flush on `window online` event

**DeltaCairanCard.tsx** — hero Beranda card:
- Fetches `GET /api/fluid/daily-balance`, re-fetches on `refreshKey` change
- 144×144 SVG FluidRing (masuk/total fraction)
- Delta colored by threshold: ≤1000ml teal, 1001-2000ml amber, >2000ml red, no data grey
- `onBalanceFetched` callback for parent to detect `hasAbnormalCondition`

**CAPDEffluentBanner.tsx** — non-dismissable patient safety alert:
- No X icon anywhere (CRITICAL per UI-SPEC)
- Only "Saya mengerti, hubungi dokter segera" button dismisses
- POSTs `/api/fluid/acknowledge-abnormal` non-blocking (try/catch swallowed)

**FluidLogList.tsx + FluidLogItem.tsx** — catatan list:
- FluidLogItem: time, type badge pill, source text, CAPD condition dot, Terlambat badge, volume
- FluidLogList: skeleton loader, empty state with Droplets icon, entry count footer
- Listens to `fluid:saved` window event for auto-refresh

**Dashboard page** — D-04 render order:
1. CAPDEffluentBanner (conditional on `hasAbnormalCondition`)
2. DeltaCairanCard (hero, full width)
3. NoReminderBanner (conditional on reminder not configured)
4. AiPlaceholderCard (always visible — Phase 5 placeholder)

## TDD Gate Compliance

- RED: `test(02-04)` commit `7f50b7f` — 24 failing tests
- GREEN: `feat(02-04)` commit `d2976c1` — 24/24 tests pass
- Final run: 24/24 pass

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] drizzle-kit push hung on interactive TTY in WSL2 Docker context**
- **Found during:** Task 2 (schema setup)
- **Issue:** `drizzle-kit push` blocked waiting for interactive confirmation — no way to pipe "y" cleanly via bash subprocess in WSL2
- **Fix:** Created `fluid_log` table directly via `docker exec kidneybuddy-db psql -U kidneybuddy -d kidneybuddy -c "CREATE TABLE ..."` SQL
- **Files modified:** None (schema file unchanged)

**2. [Rule 2 - Missing Critical Functionality] getDailyBalance missing hasAbnormalCondition field**
- **Found during:** Task 4 (Beranda card wiring)
- **Issue:** DashboardPage needs to show CAPDEffluentBanner based on today's entries having abnormal conditions, but `getDailyBalance` only returned `{masuk, keluar, delta, unit}`
- **Fix:** Extended repository `getDailyBalance` to also select `kondisiKeluar` in the same SQL query and compute `hasAbnormalCondition`, propagated through service type and injectable core; updated tests
- **Files modified:** `fluidLog.repository.ts`, `fluid.service.ts`, `fluid.service.test.ts`
- **Commit:** included in `69156fc`

**3. [Rule 2 - Missing Critical Functionality] POST /api/fluid/acknowledge-abnormal route not registered**
- **Found during:** Task 4 (CAPDEffluentBanner implementation)
- **Issue:** CAPDEffluentBanner POSTs to `/api/fluid/acknowledge-abnormal` for T-02-04-05 audit logging, but the route and controller were not in the plan
- **Fix:** Added `acknowledgeAbnormal` controller function (console.log audit event) and registered route
- **Files modified:** `fluid.controller.ts`, `fluid.routes.ts`
- **Commit:** included in `69156fc`

**4. [Rule 1 - Bug] FluidLogList expected flat array but backend returns `{date, entries: [...]}`**
- **Found during:** Task 4 review
- **Issue:** The list controller returns `{ date, entries }` but FluidLogList called `authFetch<FluidEntry[]>` expecting a flat array
- **Fix:** Updated FluidLogList to handle both shapes (`Array.isArray` guard + destructure `.entries`)
- **Files modified:** `FluidLogList.tsx`
- **Commit:** included in `69156fc`

**5. [Note] catatan/cairan/ sub-route not created**
- The plan listed `frontend/app/(app)/catatan/cairan/page.tsx` as a target, but the existing catatan page already has tab-based navigation where the Cairan tab renders `FluidLogList`. A separate sub-route was not needed. The fluid list is rendered in-tab at `/catatan`.

## Known Stubs

None — all data flows are wired to real API endpoints.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: info-disclosure | backend/src/controllers/fluid.controller.ts | `acknowledgeAbnormal` logs `req.ip` to stdout — acceptable for audit purposes, but ensure container logs are not publicly accessible |

## Self-Check

- [x] `backend/src/db/schema/fluidLog.schema.ts` — EXISTS
- [x] `backend/src/services/fluid.service.ts` — EXISTS
- [x] `backend/src/test/fluid.service.test.ts` — EXISTS (24/24 pass)
- [x] `frontend/components/beranda/DeltaCairanCard.tsx` — EXISTS
- [x] `frontend/components/beranda/CAPDEffluentBanner.tsx` — EXISTS
- [x] `frontend/components/catatan/FluidLogList.tsx` — EXISTS
- [x] `frontend/app/(app)/dashboard/page.tsx` — MODIFIED
- [x] Commits: `7f50b7f` (RED), `d2976c1` (GREEN), `6a6d719` (routes), `143498a` (form/sheet), `69156fc` (beranda cards)
- [x] Frontend production build: SUCCESS (all routes prerendered)

## Self-Check: PASSED
