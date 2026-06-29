# Phase 4: Caregiver Dashboard & Doctor Reports - Research

**Researched:** 2026-06-29
**Domain:** Real-time sync via polling, doctor-visit PDF/print report generation, cross-table date-range aggregation queries
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Sync mechanism is **short-interval polling** — frontend polls `GET /api/reminders` every 30 seconds. No WebSockets, no Redis, no 4th container.
- **D-02:** Change detection uses `max(updated_at)` on `reminder_schedule` rows. No new DB column beyond `updated_at`.
- **D-03:** Notification on the non-updating device is **VAPID push + in-app Sonner toast**. Push fan-out via existing `sendToAllDevices(userId, payload)`. Copy: "Jadwal pengingat diperbarui dari perangkat lain." (toast), "Pengingat Diperbarui" / "Jadwal pengingat telah diperbarui dari perangkat lain." (push).
- **D-04:** Report format is a **print-friendly webpage** — dedicated `/laporan/preview` route with CSS `@print` media queries. `window.print()` for PDF. No server-side PDF library.
- **D-05:** Date range selection: presets "7 hari", "30 hari", "3 bulan" + custom date-from/date-to picker. Max 90 days.
- **D-06:** Doctor note held in **component state only** — NOT persisted to DB. Passed as URI-encoded URL param `catatan`. Max 500 chars.
- **D-07:** Report sections: (1) Ringkasan Cairan, (2) Kepatuhan Obat, (3) Kondisi CAPD (CAPD only), (4) Anomali Terdeteksi (placeholder Phase 4).
- **D-08:** **No role distinction** — caregiver shares one account. Dashboard is identical. CAREGIVER-01 satisfied by existing multi-device JWT auth. No new `role` logic.
- **D-09:** Anomaly section in report shows placeholder: "Deteksi anomali akan tersedia setelah fitur AI diaktifkan." Phase 5 replaces with real data.

### Claude's Discretion

- Exact report layout/typography — must be print-friendly (no dark backgrounds, font size >= 12pt for print body cells, 9pt minimum for footnotes).
- Polling implementation detail — `setInterval(30000)` in `useEffect` with cleanup.
- Push subscription scope for "reminder updated" — all subscriptions for `user_id` (sendToAllDevices blindly is acceptable).
- Medication adherence calculation: (confirmed medication logs / total scheduled doses in range) x 100%. If no reminders in range, show "Tidak ada data."

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within Phase 4 scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAREGIVER-01 | Caregiver sees a dashboard identical to the patient's, including daily tracking data, latest AI summary, and anomaly alerts | D-08: No work needed — same credentials, same JWT auth, same endpoints. Dashboard already renders correctly for any logged-in device. AI/anomaly placeholders exist. |
| CAREGIVER-02 | When either patient or caregiver updates a reminder schedule while both are logged in, the change applies in real time on both devices, with a notification on the device that didn't make the change | Requires: (a) `updated_at` added to `reminder_schedule` schema via migration, (b) `updateReminder` controller wired to call `sendToAllDevices`, (c) 30s polling in `pengingat/page.tsx`. |
| REPORT-01 | User can generate a doctor-visit report for a selected date range summarizing fluid in/out, medication adherence, CAPD condition frequency, and detected anomalies | New `GET /api/report` endpoint. Date-range aggregation across `fluid_log`, `medication_log`. CAPD conditions from `fluid_log.kondisiKeluar`. Anomaly = placeholder text. |
| REPORT-02 | User can add an optional note to a generated report before showing it to the doctor; underlying data cannot be edited | Frontend-only — textarea in `/laporan/page.tsx`, passed as URL param to `/laporan/preview`, rendered in print output. Not persisted. |
</phase_requirements>

---

## Summary

Phase 4 has a deliberately narrow scope: it adds polling-based caregiver sync to the existing pengingat page, and builds a two-screen print-report flow (`/laporan` → `/laporan/preview`). No new entities are introduced. The dashboard itself (CAREGIVER-01) requires zero implementation work because the shared-account model already serves an identical data view to any logged-in device.

**Critical schema gap (verified by code inspection):** The `reminder_schedule` table does NOT have an `updated_at` column in either the Drizzle schema file or any existing migration. D-02 requires `max(updated_at)` for change detection. Phase 4 Wave 0 must add this column before any polling logic can be wired. This is the only migration needed for Phase 4 — no other tables change.

**Second critical gap (verified by code inspection):** The `updateReminder` controller in `reminders.controller.ts` calls `remindersService.updateReminder()` but does NOT call `sendToAllDevices()` afterward. CAREGIVER-02's push notification requirement means this controller must be patched to fire a VAPID push after every successful reminder update.

The report (`/api/report`) aggregates three data sources: `fluid_log` (daily in/out by YYYY-MM-DD text), `medication_log` (timestamp-based adherence), and `fluid_log.kondisiKeluar` (CAPD condition frequency). All three have existing indexes that cover the date-range queries. No new backend packages are required — the full stack is already in place.

**Primary recommendation:** Start with the schema migration for `updated_at` (blocks D-02), then patch `updateReminder` to send push, then build the report endpoint and report UI screens in parallel.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CAREGIVER-01: Identical dashboard | Browser/Client | — | Same data, same endpoints, same React components. No tier change needed. |
| CAREGIVER-02: 30s polling | Browser/Client | — | `setInterval` in `useEffect` on `pengingat/page.tsx`. Pure frontend. |
| CAREGIVER-02: Change detection (max updated_at) | API/Backend | Database | `GET /api/reminders` already returns reminder rows; client computes max. DB schema must add the column. |
| CAREGIVER-02: Push notification on update | API/Backend | — | `updateReminder` controller calls `sendToAllDevices()` after successful DB write. |
| REPORT-01: Date-range aggregation | API/Backend | Database | `GET /api/report` queries three tables with date filters. All aggregation server-side. |
| REPORT-01: Report rendering | Browser/Client | — | `LaporanPreviewContent` assembles sections from API response. |
| REPORT-02: Doctor note | Browser/Client | — | Component state + URL param. Never touches the API layer. |
| Print PDF output | Browser/Client | — | `window.print()` + CSS `@media print`. No server rendering. |

---

## Standard Stack

### Core (all already installed — no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm` | 0.45.x | Date-range aggregation queries for report | Already the project ORM — `gte`/`lte`/`sql` for aggregation |
| `zod` | 4.x | Validate report query params (`dari`, `sampai`, date format, 90-day max) | Already installed both frontend + backend |
| `react-hook-form` | 7.x | Date range form on `/laporan/page.tsx` | Already installed — consistent with existing forms |
| `sonner` | already installed | Sonner toast for in-app change notification | Already configured in AppShell |
| `web-push` / `notification.service.ts` | already installed | VAPID push from `updateReminder` | `sendToAllDevices()` already exists and tested |
| `lucide-react` | already installed | Icons in empty states and print button | Project icon library |

### Supporting (shadcn component — not npm package)

| Component | Source | Purpose | Install Needed |
|-----------|--------|---------|---------------|
| `textarea` | shadcn official CLI | Doctor note input on `/laporan/page.tsx` | YES — `npx shadcn@latest add textarea` (verify: `ls frontend/components/ui/textarea.tsx` → currently absent) |
| `separator` | shadcn official CLI | Report header divider line | Already installed — `frontend/components/ui/separator.tsx` confirmed present |

**Installation (only one item):**
```bash
# In frontend/
npx shadcn@latest add textarea
```

**Version verification:** No new npm packages are added. `textarea` is a shadcn UI primitive generated from the official shadcn registry — not a registry download from an untrusted source.

---

## Package Legitimacy Audit

> Phase 4 installs NO new npm packages. Only a shadcn component primitive is added.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `shadcn textarea` | shadcn official registry (not npm) | — | — | github.com/shadcn-ui/ui | N/A | Approved — official shadcn component, not a third-party npm package |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*No npm packages are installed in Phase 4. The package legitimacy gate does not apply.*

---

## Architecture Patterns

### System Architecture Diagram

```
[Patient or Caregiver Browser]
        |
        | GET /api/reminders (every 30s)         POST /api/reminders/:id (update)
        |                                               |
        v                                               v
[Express Backend]                          [Express Backend]
  authenticate middleware                    authenticate middleware
  listReminders(userId)                      updateReminder(userId, id, data)
  → returns reminder rows                    → DB write
  (client computes max updated_at)           → sendToAllDevices(userId, push payload)
        |                                               |
        v                                               v
[PostgreSQL]                               [VAPID Push Service]
  reminder_schedule                          → all device subscriptions for userId
  (with updated_at column added)

[Report Flow]
  Patient Browser
        |
        | /laporan → date range select + doctor note
        | router.push(/laporan/preview?dari=X&sampai=Y&catatan=Z)
        |
        v
  /laporan/preview
        | GET /api/report?dari=X&sampai=Y
        |
        v
  [Express Backend]
    authenticate
    reportService.aggregate(userId, startDate, endDate)
        |
        +-- fluid_log (tanggal gte/lte text comparison)
        |     grouped by tanggal → daily masuk/keluar
        +-- medication_log (waktuPengingat timestamp range)
        |     count total vs dikonfirmasi
        +-- fluid_log.kondisiKeluar (CAPD patients only)
              group count by condition
        |
        v
  JSON response → LaporanPreviewContent renders 4 sections
        |
        v
  window.print() → Browser PDF Dialog → User shows to doctor
```

### Recommended Project Structure (Phase 4 additions only)

```
backend/src/
├── db/schema/
│   └── reminderSchedule.schema.ts    (ADD updatedAt column)
├── db/migrations/
│   └── 0008_phase4_reminder_updated_at.sql  (new)
├── repositories/
│   └── report.repository.ts          (new — date-range aggregate queries)
├── services/
│   └── report.service.ts             (new — business logic for report sections)
├── controllers/
│   └── report.controller.ts          (new — GET /api/report handler)
│   └── reminders.controller.ts       (PATCH — add sendToAllDevices call)
├── routes/
│   └── report.routes.ts              (new)
└── test/
    └── report.service.test.ts        (new — injectable core pattern)

frontend/
├── app/(app)/laporan/
│   ├── page.tsx                      (new — date range select + doctor note)
│   └── preview/
│       └── page.tsx                  (new — print preview + print button)
└── components/laporan/
    ├── LaporanDateRangeSelector.tsx  (new)
    ├── LaporanPreviewContent.tsx     (new — assembles all 4 sections)
    └── sections/
        ├── RingkasanCairan.tsx       (new)
        ├── KepatuhanObat.tsx         (new)
        ├── KondisiCAPD.tsx           (new)
        └── Anomali.tsx               (new — placeholder only)
```

### Pattern 1: Drizzle Schema Column Addition + Migration

**What:** Adding `updatedAt` to an existing table using Drizzle schema + `drizzle-kit generate`.

**When to use:** Whenever a new column is needed on an existing table. Drizzle-kit generates the SQL migration; we then also add it to the update call in the repository.

**Example:**
```typescript
// In reminderSchedule.schema.ts — ADD this field:
// Source: [VERIFIED: Drizzle ORM docs — drizzle.team/docs/column-types/pg]
updatedAt: timestamp("updated_at").notNull().defaultNow(),
```

```sql
-- Generated migration (0008_phase4_reminder_updated_at.sql):
ALTER TABLE "reminder_schedule" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
```

**IMPORTANT:** After adding the column to the schema, the `update()` function in `reminderSchedule.repository.ts` must explicitly set `updatedAt: new Date()` on every update call. Drizzle does NOT auto-update `updated_at` on mutation — that is a Prisma feature, not a Drizzle feature. [ASSUMED — based on Drizzle ORM design; consistent with existing codebase pattern where `createdAt` is the only auto-set timestamp]

### Pattern 2: Push Notification on Reminder Update (CAREGIVER-02)

**What:** After `updateReminder` succeeds, call `sendToAllDevices()` to push a VAPID notification to all device subscriptions for the user.

**When to use:** Any time a shared resource is mutated and all devices for the user need to be notified.

```typescript
// In reminders.controller.ts — patch updateReminder:
// Source: backend/src/services/notification.service.ts (existing sendToAllDevices)
import { sendToAllDevices } from "../services/notification.service.js";

export async function updateReminder(req, res, next) {
  try {
    const id = String(req.params.id);
    const fotoObat = req.file ? `/uploads/medication-photos/${req.file.filename}` : undefined;
    const data = { ...req.body, ...(fotoObat !== undefined && { fotoObat }) };

    const updated = await remindersService.updateReminder(req.user!.id, id, data);

    // CAREGIVER-02: push to all OTHER devices (fan-out to all — acceptable per D-03)
    sendToAllDevices(req.user!.id, {
      title: "Pengingat Diperbarui",
      body: "Jadwal pengingat telah diperbarui dari perangkat lain.",
    }).catch(() => {}); // fire-and-forget — don't block the response on push delivery

    res.json(updated);
  } catch (err) {
    next(err);
  }
}
```

**Note:** `sendToAllDevices` is fire-and-forget here — push delivery failure must not cause the reminder update API call to fail.

### Pattern 3: 30-Second Polling with Change Detection (CAREGIVER-02)

**What:** `setInterval` in `useEffect` comparing `max(updated_at)` between polls to detect reminder changes on another device.

**When to use:** Lightweight real-time sync where WebSocket is unavailable (3-container constraint).

```typescript
// In frontend/app/(app)/pengingat/page.tsx — add to existing useEffect block:
// Source: CONTEXT.md D-01/D-02/D-03 + existing KegiatanModuleInline polling pattern
useEffect(() => {
  if (!accessToken) return;

  let lastMaxUpdatedAt: string | null = null;

  const poll = async () => {
    try {
      const data = await authFetch<Array<{ updated_at: string }>>(
        "/api/reminders",
        accessToken,
      );
      const reminders = Array.isArray(data) ? data : [];
      const maxUpdatedAt =
        reminders.length > 0
          ? reminders.reduce(
              (max, r) => (r.updated_at > max ? r.updated_at : max),
              reminders[0].updated_at,
            )
          : null;

      if (lastMaxUpdatedAt !== null && maxUpdatedAt !== null && maxUpdatedAt > lastMaxUpdatedAt) {
        toast("Jadwal pengingat diperbarui dari perangkat lain.");
        setReminderRefreshKey((k) => k + 1);
      }

      lastMaxUpdatedAt = maxUpdatedAt;
    } catch {
      // Silently ignore poll failures — next tick retries
    }
  };

  poll();
  const interval = setInterval(poll, 30_000);
  return () => clearInterval(interval);
}, [accessToken]);
```

**Key design decision:** `lastMaxUpdatedAt` is a local `let` inside the `useEffect` closure, not a `useState`. This avoids triggering a re-render on every poll, which would be a performance problem for a 30-second interval.

### Pattern 4: Report Date-Range Aggregation Query

**What:** Drizzle queries aggregating fluid and medication data for a date range.

**When to use:** `GET /api/report?dari=YYYY-MM-DD&sampai=YYYY-MM-DD`

```typescript
// report.repository.ts
// Source: fluidLog.repository.ts (existing getDailyBalance pattern)
import { sql, and, eq, gte, lte } from "drizzle-orm";
import { db } from "../lib/db.js";
import { fluidLog } from "../db/schema/fluidLog.schema.js";
import { medicationLog } from "../db/schema/medicationLog.schema.js";

// Fluid daily summary: group by tanggal (YYYY-MM-DD text — lexicographic comparison is correct)
export async function getFluidSummaryByRange(
  userId: string,
  startDate: string,  // "YYYY-MM-DD"
  endDate: string,    // "YYYY-MM-DD"
): Promise<Array<{ tanggal: string; masuk: number; keluar: number }>> {
  const rows = await db
    .select({
      tanggal: fluidLog.tanggal,
      tipe: fluidLog.tipe,
      volume: fluidLog.volume,
    })
    .from(fluidLog)
    .where(
      and(
        eq(fluidLog.userId, userId as any),
        gte(fluidLog.tanggal, startDate),
        lte(fluidLog.tanggal, endDate),
      ),
    )
    .orderBy(fluidLog.tanggal);

  // Group by tanggal in application layer (simpler than raw SQL GROUP BY with Drizzle)
  const byDate = new Map<string, { masuk: number; keluar: number }>();
  for (const row of rows) {
    if (!byDate.has(row.tanggal)) byDate.set(row.tanggal, { masuk: 0, keluar: 0 });
    const day = byDate.get(row.tanggal)!;
    if (row.tipe === "masuk") day.masuk += Number(row.volume);
    else if (row.tipe === "keluar") day.keluar += Number(row.volume);
  }
  return Array.from(byDate.entries())
    .map(([tanggal, d]) => ({ tanggal, ...d }))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

// Medication adherence: count confirmed vs total in range
export async function getMedicationAdherenceByRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<{ total: number; confirmed: number; byReminder: Array<{ namaObat: string; total: number; confirmed: number }> }> {
  const startTs = new Date(startDate + "T00:00:00+07:00"); // WIB midnight
  const endTs   = new Date(endDate   + "T23:59:59+07:00"); // WIB end of day

  const logs = await db
    .select({
      namaObat: medicationLog.namaObat,
      status: medicationLog.status,
    })
    .from(medicationLog)
    .where(
      and(
        eq(medicationLog.userId, userId as any),
        gte(medicationLog.waktuPengingat, startTs),
        lte(medicationLog.waktuPengingat, endTs),
      ),
    );

  // Group in application layer
  const total = logs.length;
  const confirmed = logs.filter((l) => l.status === "dikonfirmasi").length;

  const byReminderMap = new Map<string, { total: number; confirmed: number }>();
  for (const log of logs) {
    if (!byReminderMap.has(log.namaObat)) byReminderMap.set(log.namaObat, { total: 0, confirmed: 0 });
    const m = byReminderMap.get(log.namaObat)!;
    m.total++;
    if (log.status === "dikonfirmasi") m.confirmed++;
  }
  const byReminder = Array.from(byReminderMap.entries()).map(([namaObat, v]) => ({ namaObat, ...v }));

  return { total, confirmed, byReminder };
}

// CAPD condition frequency (only for CAPD patients)
export async function getCAPDConditionsByRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<{ jernih: number; keruh: number; keruh_gumpalan: number; berdarah: number }> {
  const rows = await db
    .select({ kondisiKeluar: fluidLog.kondisiKeluar })
    .from(fluidLog)
    .where(
      and(
        eq(fluidLog.userId, userId as any),
        eq(fluidLog.tipe, "keluar"),
        gte(fluidLog.tanggal, startDate),
        lte(fluidLog.tanggal, endDate),
      ),
    );

  const counts = { jernih: 0, keruh: 0, keruh_gumpalan: 0, berdarah: 0 };
  for (const row of rows) {
    const k = row.kondisiKeluar as keyof typeof counts;
    if (k && k in counts) counts[k]++;
  }
  return counts;
}
```

### Pattern 5: Print CSS Targeting via Data Classes

**What:** CSS `@media print` rules must target elements by literal `className` strings, not only Tailwind utilities.

**When to use:** Any component that must render differently in print vs screen context.

**Example (from UI-SPEC):**
```css
/* In globals.css or laporan-print.css */
@media print {
  .no-print { display: none !important; }
  .laporan-preview-content { /* ... */ }
  .laporan-section-card {
    border-left: 3px solid #2a9d8f !important;
    page-break-inside: avoid;
  }
  @page { size: A4 portrait; margin: 20mm 15mm 20mm 15mm; }
}
```

**JSX pattern:**
```tsx
// Data classes must be literal strings — Tailwind print: variant is supplemental only
<div className="laporan-section-card bg-white border rounded-xl p-4 mb-6">
  {/* ... */}
</div>
```

### Anti-Patterns to Avoid

- **Storing doctor note in DB:** Creates a new entity, adds a migration, changes the scope. D-06 explicitly prohibits this. Use component state + URL param only.
- **Using WebSocket for real-time:** Violates 3-container constraint. Polling at 30s is the decided approach.
- **Server-side PDF generation (pdfkit, puppeteer):** D-04 prohibits this. Browser `window.print()` is the only approach.
- **Blocking the reminder update response on push delivery:** `sendToAllDevices` must be fire-and-forget (`.catch(() => {})`). Push delivery failure must not cause a 500 on the update endpoint.
- **Passing updatedAt as auto-magic in Drizzle:** Drizzle does NOT auto-set `updated_at` on mutation. Must explicitly set `updatedAt: new Date()` in the update repository call. [ASSUMED — consistent with Drizzle's design philosophy and no evidence of trigger in existing schema]
- **Comparing `updated_at` as a number timestamp:** The column is a Postgres `timestamp` which Drizzle returns as a JavaScript `Date`. ISO string comparison works lexicographically for ISO dates but the frontend receives timestamps as strings from JSON. Ensure the API returns `updated_at` as an ISO string and the comparison uses string ordering (`>` on ISO strings is correct for UTC).
- **Using Tailwind `print:hidden` as the sole mechanism to hide shell elements:** The AppShell uses data attributes (`[data-bottom-nav]`, `[data-sidebar]`, etc.) per UI-SPEC. The print CSS must target these attributes. Tailwind's `print:hidden` can supplement but cannot be the sole mechanism for elements that don't receive the Tailwind class.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Push notification fan-out | Custom push loop | `sendToAllDevices(userId, payload)` in `notification.service.ts` | Already handles 410 Gone deactivation, partial delivery, per-device fan-out — all edge cases solved |
| Token-authenticated API fetch with auto-refresh | Custom fetch wrapper | `authFetch<T>()` from `frontend/lib/api.ts` | Already handles 401 token refresh retry — all report API calls use this |
| Date-range validation | Custom date logic | zod schema with `refine()` | End-before-start, max-90-day, empty-field — all three cases handled inline |
| PDF generation | `pdfkit`, `puppeteer` | Browser `window.print()` | D-04: no server PDF library. Print CSS already specified in UI-SPEC. Zero dependencies. |
| In-app toast notification | Custom toast component | `sonner` `toast()` call | Already configured in AppShell with correct position, duration defaults |
| Polling loop with cleanup | Custom interval manager | `setInterval` + `clearInterval` in `useEffect` return | React lifecycle handles cleanup; matches existing `KegiatanModuleInline` pattern exactly |

**Key insight:** Phase 4 is almost entirely reuse. Every infrastructure piece (push, polling, auth, toast, form patterns) already exists. The only genuine new code is the report aggregation service + the two new frontend routes.

---

## Critical Findings (Verified by Codebase Inspection)

### Finding 1: `updated_at` Column is MISSING from `reminder_schedule`

**[VERIFIED: codebase grep]** — Inspected `backend/src/db/schema/reminderSchedule.schema.ts` and all 8 migration files. The `reminder_schedule` table has:
- `created_at` (timestamp, NOT NULL, defaultNow)
- NO `updated_at` column

CONTEXT.md D-02 states "use existing `updated_at` timestamp on `reminder_schedule` rows." **The column does not exist.** Phase 4 Wave 0 MUST create migration `0008_phase4_reminder_updated_at.sql` adding this column before any polling logic can be wired.

Additionally, after adding the column to the schema, `reminderSchedule.repository.ts`'s `update()` function must explicitly set `updatedAt: new Date()` on every call.

### Finding 2: `updateReminder` Controller Does NOT Send Push Notifications

**[VERIFIED: codebase grep]** — Inspected `backend/src/controllers/reminders.controller.ts`. The `updateReminder` function calls `remindersService.updateReminder()` and returns `res.json(updated)` with no push notification. CAREGIVER-02 requires a push when a reminder is updated. The controller must be patched to call `sendToAllDevices()` (fire-and-forget) after the update.

### Finding 3: No `textarea` Component in shadcn UI Yet

**[VERIFIED: codebase ls]** — `ls frontend/components/ui/` shows `separator.tsx` exists but no `textarea.tsx`. Wave 0 must run `npx shadcn@latest add textarea` in `frontend/`.

---

## Common Pitfalls

### Pitfall 1: Updated_at Not Auto-Set on Drizzle Updates

**What goes wrong:** Developer adds `updatedAt` to the schema, runs the migration, but forgets to include `updatedAt: new Date()` in the `update()` repository call. The column stays at its initial value forever, making polling change detection always return false (no changes detected).

**Why it happens:** Drizzle ORM does not auto-set `updated_at` on mutation (unlike Prisma's `@updatedAt`). It only applies `defaultNow()` on INSERT.

**How to avoid:** In `reminderSchedule.repository.ts`'s `update()` function, always include `updatedAt: new Date()` in the `.set({})` object alongside the user's data. [ASSUMED — consistent with Drizzle design]

**Warning signs:** Both devices see the reminder list but toast/push notifications never fire. Console shows `maxUpdatedAt` never changes between polls.

### Pitfall 2: Push Blocking the HTTP Response

**What goes wrong:** Developer `await`s `sendToAllDevices()` before calling `res.json()`. If the push service is slow (VAPID auth takes 200–500ms), the reminder update endpoint appears slow to the updating device.

**Why it happens:** `sendToAllDevices` does an external HTTP call to the push server.

**How to avoid:** Always call `sendToAllDevices(...).catch(() => {})` without `await`. The response to the client must not wait for push delivery.

**Warning signs:** `/api/reminders/:id` PUT endpoint takes 300–800ms instead of <50ms.

### Pitfall 3: Doctor Note URL Encoding

**What goes wrong:** Note text contains special characters (`&`, `=`, `#`, `?`, `+`) that break URL param parsing in Next.js `searchParams`.

**Why it happens:** `router.push('/laporan/preview?catatan=...')` without proper encoding.

**How to avoid:** Use `encodeURIComponent(note)` when building the URL on the `/laporan/page.tsx` submit handler. On the preview page, `searchParams.get('catatan')` auto-decodes. Also enforce the 500-char max at form level to keep URL length manageable.

**Warning signs:** Note text appears truncated or garbled in the print preview. Special characters produce parsing errors.

### Pitfall 4: WIB Timezone Mismatch for Medication Log Date Range

**What goes wrong:** The report for "today" (e.g., 2026-06-29 in WIB = UTC+7) misses medication logs from 00:00–07:00 WIB because they were stored as 2026-06-28T17:00:00Z in Postgres UTC.

**Why it happens:** `medication_log.waktuPengingat` is stored as a UTC `timestamp`. A query like `WHERE waktu_pengingat >= '2026-06-29T00:00:00Z'` misses the first 7 hours of the WIB day.

**How to avoid:** Convert date range strings to WIB-aware Date objects: `new Date(startDate + 'T00:00:00+07:00')` and `new Date(endDate + 'T23:59:59+07:00')`. This correctly maps WIB midnight to UTC 17:00 of the previous day.

**Note:** `fluid_log.tanggal` is stored as a YYYY-MM-DD TEXT string in WIB-local time (by design, per project decision `[Phase ?]: fluid_log.tanggal stored as text YYYY-MM-DD (timezone-safe)`), so `fluid_log` queries just use plain string comparison `gte(tanggal, startDate)`. Only `medication_log.waktuPengingat` needs the UTC adjustment.

**Warning signs:** Medication adherence % in the report is lower than expected; the discrepancy is exactly the first 7 hours of the date range.

### Pitfall 5: Polling Fires on Every Page Render Instead of Once

**What goes wrong:** `setInterval` is placed in a `useEffect` with no dependency array or a wrong dependency that causes repeated setup/teardown, resulting in multiple concurrent intervals.

**Why it happens:** Incorrect `useEffect` dependency array.

**How to avoid:** The polling `useEffect` should depend only on `[accessToken]` (not on `reminderRefreshKey` or other state that changes on every poll). See the exact pattern in CONTEXT.md / UI-SPEC Screen 1.

**Warning signs:** Network tab shows more than one `/api/reminders` request every 30 seconds; count grows over time as the user stays on the page.

### Pitfall 6: Print CSS Targeting Fails Due to Tailwind Class Purging

**What goes wrong:** Print CSS selectors like `.laporan-section-card` don't match any elements because the className was dynamically constructed (e.g., using template literals) and Tailwind's PurgeCSS/safelist removed it, OR because the component uses only Tailwind `print:` variants which don't cover complex `@page` rules.

**Why it happens:** Tailwind purges unused CSS classes at build time. Dynamically constructed classNames (e.g., `${isprint ? 'laporan-section-card' : ''}`) may not appear in the purge pass.

**How to avoid:** Always write `className="laporan-section-card ..."` as a literal string, never a computed expression. Add `laporan-section-card`, `laporan-preview-content`, `adherence-metric-number`, `no-print` to Tailwind's `safelist` in `tailwind.config.ts` if needed.

---

## Code Examples

### Report Route Registration

```typescript
// In backend/src/app.ts — add after labResultRoutes:
// Source: existing pattern from app.ts (inspected)
import reportRoutes from "./routes/report.routes.js";
// ...
app.use("/api/report", reportRoutes);
```

### Report Route Definition

```typescript
// backend/src/routes/report.routes.ts
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { getReport } from "../controllers/report.controller.js";

const router = Router();
router.get("/", authenticate, getReport);
export default router;
```

### Report Controller

```typescript
// backend/src/controllers/report.controller.ts
import type { Request, Response, NextFunction } from "express";
import { reportService } from "../services/report.service.js";
import { AppError } from "../middleware/errorHandler.js";

export async function getReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { dari, sampai } = req.query;

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dari || !sampai || !dateRegex.test(String(dari)) || !dateRegex.test(String(sampai))) {
      throw new AppError(400, "INVALID_DATE", "Format tanggal tidak valid (YYYY-MM-DD)");
    }

    // Validate range
    if (String(sampai) < String(dari)) {
      throw new AppError(400, "INVALID_RANGE", "Tanggal akhir harus setelah tanggal mulai");
    }

    // Validate max 90 days
    const diffMs = new Date(String(sampai)).getTime() - new Date(String(dari)).getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > 90) {
      throw new AppError(400, "RANGE_TOO_LARGE", "Rentang maksimum adalah 90 hari");
    }

    const report = await reportService.generateReport(req.user!.id, String(dari), String(sampai));
    res.json(report);
  } catch (err) {
    next(err);
  }
}
```

### Migration File Content

```sql
-- 0008_phase4_reminder_updated_at.sql
ALTER TABLE "reminder_schedule" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
```

### Updated reminderSchedule.repository.ts update() call

```typescript
// Patch the existing update() function to set updatedAt explicitly
export async function update(
  id: string,
  userId: string,
  data: Partial<Omit<NewReminderSchedule, "id" | "userId" | "createdAt">>,
): Promise<ReminderSchedule | undefined> {
  const [row] = await db
    .update(reminderSchedule)
    .set({ ...data, updatedAt: new Date() })  // <-- ADDED: explicit updatedAt
    .where(
      and(
        eq(reminderSchedule.id, id as any),
        eq(reminderSchedule.userId, userId as any),
      ),
    )
    .returning();
  return row;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WebSocket for real-time sync | Short-interval polling (30s) | Project decision (D-01) | Fits 3-container constraint; max lag = 30s (acceptable for non-critical sync) |
| Server-side PDF (pdfkit/puppeteer) | Browser `window.print()` + CSS @print | Project decision (D-04) | Zero dependencies, works cross-platform, doctor sees print dialog; no server resources consumed |
| Long-polling or SSE | Short-interval REST polling | Architecture constraint | No persistent connection infrastructure needed; stateless Express works as-is |

**Deprecated/outdated approaches confirmed not applicable:**
- WebSocket: No suitable server to maintain persistent connections in 3-container setup without Redis/pub-sub
- Server-side PDF: Adds dependency, complex for Indonesian medical A4 format, slower than browser print
- Separate caregiver account model: Explicitly out of scope (REQUIREMENTS.md "Out of Scope" table)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Drizzle ORM does NOT auto-set `updated_at` on mutation (must explicitly set `updatedAt: new Date()` in `.set()`) | Architecture Patterns, Common Pitfalls | If Drizzle has a trigger/hook mechanism that auto-sets this, the explicit set is redundant but harmless |
| A2 | Comparing `updated_at` as ISO string on the frontend is correct (ISO strings sort lexicographically, which equals chronological order for UTC timestamps) | Code Examples (polling pattern) | Risk is low — ISO 8601 is designed for lexicographic ordering; only wrong if timezone offsets vary, which they don't (all UTC from Postgres) |
| A3 | `npx shadcn@latest add textarea` adds the textarea component without breaking existing shadcn setup (components.json already initialized in new-york style) | Standard Stack | Shadcn CLI is additive-only; breaking existing config is theoretically impossible for a single component add |
| A4 | WIB timezone offset is consistently UTC+7 (no DST in Indonesia) | Common Pitfalls (timezone) | Indonesia does not observe daylight saving time — risk is essentially zero |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

The assumptions table is small and low-risk. No user confirmation required before planning.

---

## Open Questions (RESOLVED)

1. **Should `sendToAllDevices` exclude the originating device?**
   - What we know: D-03 says "all OTHER push subscriptions for the same user_id" but also notes "sending to all blindly is acceptable since the updating device will also re-fetch via poll and can suppress toast if it was the originator."
   - What's unclear: Current `sendToAllDevices` sends to ALL subscriptions including the origin device. This means the device that updates a reminder also receives a push saying "updated from another device" — confusing UX.
   - Recommendation: Accept the "send to all" approach per D-03 Claude's Discretion. The Sonner toast fires only when `maxUpdatedAt` increases from a poll on the PENGINGAT page (not on the origin device that just updated and re-fetched). The push notification may appear on the origin device but is benign. If this becomes a UX concern, the endpoint could accept the subscription endpoint as a `X-Device-Endpoint` header and filter it out in the push fan-out — but this is explicitly called out as out of scope for Phase 4.

2. **Report query performance for 90-day ranges**
   - What we know: `fluid_log` has `idx_fluid_log_user_date` on `(user_id, tanggal)` and `medication_log` has `idx_medication_log_user_waktu` on `(user_id, waktu_pengingat)`. Both cover the date-range queries.
   - What's unclear: At MVP scale (one patient, max ~365 entries/year), this is never a concern. For 100 concurrent users each generating a 90-day report, the queries would run ~90 rows each from `fluid_log` and `medication_log`. No performance risk exists.
   - Recommendation: No additional indexes needed. Existing indexes are sufficient.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend + Frontend | Already verified (Phase 2/3 executed) | 20 LTS | — |
| PostgreSQL 16 | Report aggregation queries | Already running | 16 | — |
| `web-push` library | CAREGIVER-02 push | Already installed | 3.6.x | — |
| `sonner` | In-app toast notification | Already installed | Phase 2/3 confirmed | — |
| `drizzle-kit` | Migration generation | Already installed | 0.31.x | — |
| `shadcn CLI` | `textarea` component add | Already initialized | latest | Manual component creation |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

All required infrastructure is in place. Phase 4 adds no new runtime dependencies.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js native test runner (`node:test`) with `tsx` |
| Config file | none (inline `--test` flag in `package.json` scripts) |
| Quick run command | `cd backend && node --import tsx --test src/test/report.service.test.ts` |
| Full suite command | `cd backend && node --import tsx --test src/test/*.test.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAREGIVER-02 | `updated_at` is set on reminder update | unit | `node --import tsx --test src/test/reminders.service.test.ts` | ❌ Wave 0 (extend or create) |
| CAREGIVER-02 | Push is sent (fire-and-forget) when reminder is updated | unit | `node --import tsx --test src/test/reminders.controller.test.ts` | ❌ Wave 0 |
| CAREGIVER-02 | Polling detects `maxUpdatedAt` change correctly | unit | `node --import tsx --test src/test/polling.util.test.ts` (optional) | manual-only |
| REPORT-01 | `generateReport` returns correct fluid summary | unit | `node --import tsx --test src/test/report.service.test.ts` | ❌ Wave 0 |
| REPORT-01 | Medication adherence % is calculated correctly | unit | `node --import tsx --test src/test/report.service.test.ts` | ❌ Wave 0 |
| REPORT-01 | CAPD condition frequency counts are correct | unit | `node --import tsx --test src/test/report.service.test.ts` | ❌ Wave 0 |
| REPORT-01 | Date range > 90 days returns 400 | unit | `node --import tsx --test src/test/report.service.test.ts` | ❌ Wave 0 |
| REPORT-01 | WIB-correct date range conversion for medicationLog | unit | `node --import tsx --test src/test/report.service.test.ts` | ❌ Wave 0 |
| REPORT-02 | Doctor note passed via URL param renders in preview | manual | browser test | manual-only |
| REPORT-02 | Print output hides AppShell elements | manual | browser print preview | manual-only |

### Sampling Rate

- **Per task commit:** `cd backend && node --import tsx --test src/test/report.service.test.ts`
- **Per wave merge:** `cd backend && node --import tsx --test src/test/*.test.ts`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `backend/src/test/report.service.test.ts` — covers REPORT-01 (fluid summary, adherence, CAPD, date validation, WIB timezone)
- [ ] Extend or create `backend/src/test/reminders.controller.test.ts` (or service test) to cover CAREGIVER-02 `updated_at` mutation + push fire-and-forget

*(Existing test infrastructure (`node:test` + `tsx`) is already in place — no framework install needed.)*

---

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1` per `.planning/config.json`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `authenticate` middleware on all `/api/report` and `/api/reminders/:id` routes — already in place |
| V3 Session Management | yes (inherited) | JWT access + httpOnly refresh cookie — already implemented |
| V4 Access Control | yes | All queries filter by `req.user!.id` — user cannot access another user's report data (IDOR prevention) |
| V5 Input Validation | yes | zod schema on report query params (`dari`, `sampai` format, 90-day max) |
| V6 Cryptography | no | No new encrypted fields in Phase 4 (note is not persisted; report is computed data) |

### Known Threat Patterns for Phase 4

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on report endpoint | Information Disclosure | `WHERE user_id = req.user!.id` on all report queries — never expose other users' data |
| URL param injection via doctor note | Tampering | `encodeURIComponent(note)` on submit; note is displayed as plain text (no markdown parsing, no innerHTML) — XSS risk is zero since it's React text node |
| Oversized report query (denial of service) | Denial of Service | 90-day max validated server-side (zod + AppError 400) before any DB query |
| Push notification spam via rapid reminder updates | Denial of Service | Acceptable at MVP scale — one patient account, no rate limit needed. If abused: `express-rate-limit` already installed and can be added to `/api/reminders/:id` PUT |
| Accessing `/laporan/preview` without a valid session | Elevation of Privilege | `/laporan/preview` is under `(app)` layout which has auth guard (`useAuth` redirect) — same guard as all other authenticated pages |

---

## Sources

### Primary (HIGH confidence)

- `backend/src/db/schema/reminderSchedule.schema.ts` — verified no `updated_at` column [VERIFIED: codebase inspection]
- `backend/src/db/migrations/` (0000–0007) — verified no reminder_schedule `updated_at` in any migration [VERIFIED: codebase inspection]
- `backend/src/controllers/reminders.controller.ts` — verified no `sendToAllDevices` call in `updateReminder` [VERIFIED: codebase inspection]
- `backend/src/services/notification.service.ts` — verified `sendToAllDevices(userId, payload)` exists and is tested [VERIFIED: codebase inspection]
- `frontend/components/ui/separator.tsx` — confirmed present [VERIFIED: codebase ls]
- `frontend/components/ui/textarea.tsx` — confirmed ABSENT [VERIFIED: codebase ls]
- `backend/src/db/schema/fluidLog.schema.ts` — confirmed `tanggal` is YYYY-MM-DD text, `kondisiKeluar` column exists [VERIFIED: codebase inspection]
- `backend/src/db/schema/medicationLog.schema.ts` — confirmed `waktuPengingat` is timestamp, `status` column exists [VERIFIED: codebase inspection]
- `backend/src/repositories/fluidLog.repository.ts` — confirmed `idx_fluid_log_user_date` index on (user_id, tanggal) [VERIFIED: codebase inspection]
- `backend/src/repositories/medicationLog.repository.ts` — confirmed `idx_medication_log_user_waktu` index on (user_id, waktu_pengingat) [VERIFIED: codebase inspection]
- `frontend/app/(app)/pengingat/page.tsx` — confirmed current polling implementation is absent; setInterval is not present [VERIFIED: codebase inspection]
- `backend/package.json` test script — confirmed Node.js `node:test` with `tsx` [VERIFIED: codebase inspection]
- `.planning/config.json` — confirmed `nyquist_validation: true`, `security_enforcement: true` [VERIFIED: codebase inspection]

### Secondary (MEDIUM confidence)

- CONTEXT.md D-01 through D-09 — user decisions, HIGH confidence (output from `/gsd-discuss-phase`)
- UI-SPEC.md — design contract specifying exact polling pattern, print CSS, component inventory [VERIFIED: read in this session]
- REQUIREMENTS.md CAREGIVER-01, CAREGIVER-02, REPORT-01, REPORT-02 — exact requirement text [VERIFIED: read in this session]

### Tertiary (LOW confidence)

- Drizzle ORM not auto-setting `updated_at` on mutation [ASSUMED — consistent with training knowledge and Drizzle design philosophy but not verified via Context7 in this session]

---

## Metadata

**Confidence breakdown:**
- Critical gap (missing updated_at): HIGH — directly verified in schema + all migrations
- Critical gap (missing push in updateReminder): HIGH — directly verified in controller source
- Standard stack: HIGH — all packages already installed, versions confirmed from Phase 2/3
- Report aggregation queries: HIGH — existing repository patterns directly applicable, indexes confirmed
- Architecture: HIGH — existing patterns (polling, push, auth) all verified
- Pitfalls: MEDIUM-HIGH — timezone pitfall verified against schema design; others from direct code analysis
- Drizzle auto-update behavior: ASSUMED (A1)

**Research date:** 2026-06-29
**Valid until:** 2026-08-01 (stable stack — all packages already locked)
