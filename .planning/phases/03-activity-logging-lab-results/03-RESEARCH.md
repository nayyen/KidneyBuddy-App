# Phase 3: Activity Logging & Lab Results — Research

**Researched:** 2026-06-27
**Domain:** Activity state machine, push notification extension, JSONB trend queries, recharts visualization, lab file upload, soft-delete pattern
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Phase 3 does NOT add a 5th full card to the Beranda dashboard. A compact "Kegiatan hari ini" module (KegiatanModuleInline) is embedded between existing cards. Placement: between PengingatBerikutnyaCard and AiPlaceholderCard.
- **D-02:** Detail view and history for activities lives in Catatan/Aktivitas sub-tab. Dashboard module shows current/most recent status + "Mulai Kegiatan" button when idle.
- **D-03:** Pre-end-time reminder push is delivered via existing cron scheduler + VAPID (same mechanism as reminder dispatch). A single push before estimated end time.
- **D-04:** Recurring "Masih aktif" notifications are in-app banner/toast only — NOT push notifications. Prevents flooding cron queue with high-frequency non-critical alerts.
- **D-05:** "Masih aktif" framing is amber (#EF9F27), text "Masih aktif · [durasi] lebih". Never "Terlambat" or "Overdue" language. Motivational copy: "Kamu sudah beraktivitas lebih dari rencana 😊".
- **D-06:** Lab result entry uses a single sheet with two internal tabs: "Input Manual" (Tab 1) and "Unggah Dokumen" (Tab 2).
- **D-07:** Both tabs share a single "Tambah Hasil Lab" button entry point. No separate buttons.
- **D-08:** Lab results cannot be permanently deleted — only archived (soft delete). Default list shows `status = 'aktif'` only.
- **D-09:** Trend chart displays one parameter at a time. User selects from dropdown.
- **D-10:** Multi-parameter overlay is NOT used (different scales break chart).
- **D-11:** Chart is built from manual entry data only (tipe_input = 'manual'). Uploaded documents are not parsed.
- **D-12:** Use recharts for the chart component. Not yet in `frontend/package.json` — planner must add `recharts@3`.

### Claude's Discretion

- Activity entry form fields: Name (text, required), estimated end time (time picker, required). No optional category/notes unless planner chooses to include them.
- "Masih aktif" timer polling: setInterval (client-side, simpler than SSE).
- Chart date range presets: "7 hari terakhir", "30 hari terakhir", "3 bulan terakhir", "Semua data". No custom date range in MVP.
- Lab parameter name normalization: HTML5 `<datalist>` autocomplete with CKD-common suggestions (Kreatinin, Hemoglobin, Ureum, eGFR, Kalium, Natrium, Albumin).
- Upload file storage: local Docker volume, `lab-results/` subfolder inside existing upload volume.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within Phase 3 scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ACTIVITY-01 | User can start logging a daily activity with name and estimated end time from the dashboard, showing real-time status (Berlangsung/Selesai/Masih aktif) | `daily_activities` schema + API + KegiatanModuleInline component + setInterval polling |
| ACTIVITY-02 | User receives a reminder a few minutes before estimated end time (push), and an informative in-app notification every 10 minutes after end time (in-app only, D-04), positively framed ("Masih aktif · [durasi] lebih", amber) | `activityEndReminder.job.ts` cron job + `reminder_sent` flag + client setInterval |
| ACTIVITY-03 | After marking activity complete, user is prompted to rate how they felt (Nyaman/Biasa/Lelah/Berat) with optional note | `FeelingsRatingSheet` + PATCH `/api/activities/:id/complete` with perasaan/catatan |
| LAB-01 | User can upload a lab result file (PDF/JPG/PNG, max 10MB) with exam date | New multer instance with PDF MIME support + `POST /api/lab-results/upload` |
| LAB-02 | User can manually enter lab parameters (name, value, unit, date) as alternative to file upload | ManualLabForm + `POST /api/lab-results` with `tipe_input: 'manual'` |
| LAB-03 | User can view trend chart of selected parameter over chosen date range, from manual data | recharts LineChart + JSONB `jsonb_array_elements` query + `GET /api/lab-results/trend` |
| LAB-04 | Lab results cannot be permanently deleted, only archived | `status: 'aktif' | 'diarsipkan'` field + `PATCH /api/lab-results/:id/archive` |

</phase_requirements>

---

## Summary

Phase 3 adds two distinct feature verticals to an existing working codebase: activity logging with a real-time status state machine, and lab result management with trend visualization. Both verticals follow established Phase 2 patterns precisely — they extend rather than replace existing infrastructure.

The activity feature introduces a new `daily_activities` PostgreSQL table (not defined in the PRD, so the schema must be designed by the planner), a new `activityEndReminder.job.ts` cron job mounted alongside the existing scheduler jobs, and client-side `setInterval` for the in-app "Masih aktif" elapsed-time counter. The critical WIB timezone handling from Phase 2's cron jobs applies here too — the `estimasi_selesai` timestamp must be compared using `Date.now() + 7*3600*1000` WIB offset.

The lab result feature adds a `lab_results` table (partially defined in PRD §8.5), extends the existing multer file upload infrastructure to accept PDF in addition to JPEG/PNG (requiring a second multer instance since the existing `medicationPhotoUpload` instance only permits images), and introduces the first recharts usage in the project. Trend queries use Postgres `jsonb_array_elements` to unnest the `parameter_lab` JSON array and filter by parameter name — this requires raw SQL via Drizzle's `sql` tag, not the type-safe fluent API.

**Primary recommendation:** Follow the Phase 2 layered architecture (Route → Controller → Service → Repository) for both feature verticals without deviation. The only genuinely new technical territory is the JSONB trend query pattern and recharts integration — everything else is an extension of already-working infrastructure.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Activity status state machine (Berlangsung/Selesai) | API / Backend | — | Status transitions (start, complete) are server-persisted; client computes display label from server state |
| "Masih aktif" elapsed-time badge display | Browser / Client | — | Client derives elapsed minutes from `estimasi_selesai` timestamp returned by API; no server call needed per tick |
| Pre-end-time push notification (D-03) | API / Backend (cron) | — | Same cron/VAPID mechanism as reminder dispatch; must not fire from client |
| Lab file upload (PDF/JPG/PNG) | API / Backend | — | multer middleware on Express; file never passes through Next.js |
| Lab parameter trend query | API / Backend | — | JSONB query using `jsonb_array_elements`; complex aggregation not delegated to client |
| recharts visualization | Browser / Client | — | Chart renders from pre-computed API response; no heavy computation client-side |
| Feelings rating after activity | API / Backend (persist) + Browser (UX) | — | FeelingsRatingSheet is client UX; PATCH endpoint persists `perasaan` + encrypted `catatan_perasaan` |
| Catatan/Aktivitas and Catatan/Lab sub-tab routing | Frontend Server (Next.js) | Browser | Next.js App Router pages; sub-tab state managed client-side via useState |
| Lab archive (soft delete) | API / Backend | — | Status field update; never a hard DELETE |

---

## Standard Stack

### Core (no changes from Phase 2)

All Phase 2 backend packages are reused as-is. Phase 3 adds only one new npm dependency.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.x (already installed) | Schema definition for `daily_activities` and `lab_results` | Established project ORM — CLAUDE.md |
| multer | 2.2.x (already installed) | Lab file upload (new instance for PDF+JPG+PNG) | Existing file upload infrastructure |
| node-cron | 4.5.x (already installed) | Activity end-time reminder cron job | Established scheduler pattern |
| web-push / notification.service | 3.6.x (already installed) | VAPID push for pre-end-time activity notification | Existing push infrastructure |
| zod | 3.24.x (already installed) | Activity and lab result payload validation | Established validation pattern |
| react-hook-form | 7.54.x (already installed) | Activity form + lab manual entry form | Established form pattern |
| recharts | **3.x (new install required)** | Lab trend LineChart visualization | CONTEXT.md D-12 locked decision; CLAUDE.md recommended |

### New Dependency: recharts

| Property | Value |
|----------|-------|
| Install command | `npm install recharts@3` (run in `frontend/`) |
| Version to pin | `recharts@3` (resolves to 3.9.0 as of 2026-06-27) |
| Location | `frontend/package.json` dependencies only |
| @types/recharts | NOT required — recharts 3.x includes its own TypeScript types |

**Version verification:** `npm view recharts version` → `3.9.0` [VERIFIED: npm registry]

### Supporting: shadcn components

All required shadcn components are already installed. No new `npx shadcn add` commands needed.

| Component | Status | Verified |
|-----------|--------|---------|
| `sheet` | Installed | `frontend/components/ui/sheet.tsx` |
| `tabs` | Installed | `frontend/components/ui/tabs.tsx` |
| `form` | Installed | `frontend/components/ui/form.tsx` |
| `input` | Installed | `frontend/components/ui/input.tsx` |
| `select` | Installed | `frontend/components/ui/select.tsx` |
| `button` | Installed | `frontend/components/ui/button.tsx` |
| `alert-dialog` | Installed | `frontend/components/ui/alert-dialog.tsx` |
| `badge` | Installed | `frontend/components/ui/badge.tsx` |
| `label` | Installed | `frontend/components/ui/label.tsx` |
| `separator` | Installed | `frontend/components/ui/separator.tsx` |
| `scroll-area` | Installed | `frontend/components/ui/scroll-area.tsx` |

[VERIFIED: codebase grep — `ls frontend/components/ui/`]

**Installation command (frontend only):**
```bash
cd frontend && npm install recharts@3
```

---

## Package Legitimacy Audit

> slopcheck was unavailable at research time. Manual registry verification performed.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| recharts | npm | 11 yrs (2015-08-07) | Tens of millions/month (industry-standard React charting library) | github.com/recharts/recharts | unavailable | Approved — verified via npm view; MIT license; active maintainers; no postinstall script; official GitHub repo matches npm metadata |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable at research time. `recharts` has been cross-verified via:*
- *npm registry (`npm view recharts`): package exists, 3.9.0 current, created 2015, modified 2026-06-23*
- *Repository URL matches npm metadata: `git+https://github.com/recharts/recharts.git`*
- *No `postinstall` script detected*
- *Widely used React charting library with 11+ years of history*

*All packages tagged [ASSUMED] by fallback rule — planner may skip `checkpoint:human-verify` for recharts given the cross-verification above.*

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (Client)
│
│  [MulaiKegiatanSheet] ──POST──→  /api/activities
│  [KegiatanModuleInline] ←───── GET /api/activities/active  (poll on mount)
│  [setInterval 60s] ←────────── local: (Date.now() - estimasiSelesaiMs) / 60000
│  ["Tandai Selesai" tap] ─PATCH→ /api/activities/:id/complete  { perasaan, catatan }
│
│  [TambahHasilLabSheet] ──POST──→ /api/lab-results         (manual, JSON body)
│                         ──POST──→ /api/lab-results/upload  (multipart/form-data)
│  [LabResultList] ←──────────── GET /api/lab-results
│  [ArchiveLabConfirm] ──PATCH──→ /api/lab-results/:id/archive
│  [LabTrendChart]
│    └─ param dropdown ←───────── GET /api/lab-results/parameters
│    └─ chart data ←────────────  GET /api/lab-results/trend?parameter=X&range=Y
│
▼
Express Backend
│
│  /api/activities   → activities.routes → activities.controller → activities.service
│                                          → dailyActivity.repository  → Postgres
│
│  /api/lab-results  → labResults.routes → labResults.controller → labResults.service
│                                          → labResult.repository      → Postgres
│
│  [scheduler.ts]
│    ├── dispatchDueReminders (existing)
│    ├── sendFollowUpReminders (existing)
│    └── dispatchActivityEndReminders (NEW) ──→ daily_activities table
│                                              └──→ notification.service.sendToAllDevices
│
▼
PostgreSQL
├── daily_activities (NEW)
└── lab_results (NEW)
      └── parameter_lab: jsonb  ──→  trend query via jsonb_array_elements
```

### Recommended Project Structure (Phase 3 additions)

```
backend/src/
├── db/schema/
│   ├── dailyActivity.schema.ts   # NEW: daily_activities table
│   └── labResult.schema.ts       # NEW: lab_results table
├── routes/
│   ├── activities.routes.ts      # NEW: /api/activities
│   └── labResults.routes.ts      # NEW: /api/lab-results
├── controllers/
│   ├── activities.controller.ts  # NEW
│   └── labResults.controller.ts  # NEW
├── services/
│   ├── activities.service.ts     # NEW: Zod schemas + business logic
│   └── labResults.service.ts     # NEW: Zod schemas + business logic
├── repositories/
│   ├── dailyActivity.repository.ts   # NEW: SQL only
│   └── labResult.repository.ts       # NEW: SQL only
├── lib/
│   └── upload.ts                 # EXTEND: add labResultUpload multer instance
└── jobs/
    ├── scheduler.ts              # EXTEND: mount activityEndReminder.job
    └── activityEndReminder.job.ts  # NEW

frontend/
├── components/
│   ├── beranda/
│   │   └── KegiatanModuleInline.tsx    # NEW
│   ├── aktivitas/
│   │   ├── ActivityList.tsx            # NEW
│   │   ├── ActivityItem.tsx            # NEW
│   │   ├── MulaiKegiatanSheet.tsx      # NEW
│   │   └── FeelingsRatingSheet.tsx     # NEW
│   └── lab/
│       ├── LabResultList.tsx           # NEW
│       ├── LabResultItem.tsx           # NEW
│       ├── TambahHasilLabSheet.tsx     # NEW
│       ├── ManualLabForm.tsx           # NEW
│       ├── UploadLabForm.tsx           # NEW
│       ├── LabTrendChart.tsx           # NEW
│       └── ArchiveLabConfirm.tsx       # NEW
└── app/(app)/
    ├── beranda/page.tsx          # EXTEND: add KegiatanModuleInline
    ├── catatan/page.tsx          # EXTEND: enable aktivitas + lab tabs
    └── catatan/
        ├── aktivitas/page.tsx    # NEW: renders ActivityList + sheets
        └── lab/page.tsx          # NEW: renders LabResultList + chart + sheets
```

### Pattern 1: daily_activities Drizzle Schema

The PRD does not define a DailyActivity entity. This is the recommended schema following project conventions.

```typescript
// Source: project convention (backend/src/db/schema/fluidLog.schema.ts pattern)
import {
  pgTable, uuid, text, boolean, timestamp, index
} from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const dailyActivities = pgTable(
  "daily_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),

    namaKegiatan: text("nama_kegiatan").notNull(),

    // Full timestamp — date + time combined (not time-string-only)
    // Stored as UTC; WIB conversion applied at query time in cron job
    waktuMulai: timestamp("waktu_mulai").notNull(),

    // Full timestamp for the estimated end — combined today's date + HH:mm from form
    estimasiSelesai: timestamp("estimasi_selesai").notNull(),

    // 'berlangsung' | 'selesai'
    status: text("status").notNull().default("berlangsung"),

    // Optional: when user tapped "Tandai Selesai" (null until completed)
    waktuSelesai: timestamp("waktu_selesai"),

    // ACTIVITY-03 feelings rating — null until completed
    // 'nyaman' | 'biasa' | 'lelah' | 'berat' | null
    perasaan: text("perasaan"),

    // Free-text note after activity — encrypted AES-256-GCM (same as fluid_log.catatan)
    catatanPerasaan: text("catatan_perasaan"),

    // Push notification flag — true once pre-end-time push has been sent (prevent double-fire)
    reminderSent: boolean("reminder_sent").notNull().default(false),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    // Lookup for active activity per user + cron job queries
    userStatusIdx: index("idx_daily_activities_user_status").on(
      table.userId, table.status
    ),
    // Cron job: find activities near end time
    endTimeIdx: index("idx_daily_activities_estimasi_end").on(
      table.estimasiSelesai, table.status, table.reminderSent
    ),
  })
);
```

[ASSUMED] — schema design based on project conventions and phase requirements; not from an external authoritative source.

### Pattern 2: lab_results Drizzle Schema

Based on PRD §8.5 LabResult entity definition.

```typescript
// Source: PRD §8.5 LabResult entity definition + project conventions
import {
  pgTable, uuid, text, jsonb, timestamp, index
} from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

// Type for a single lab parameter entry in the JSON array
type LabParameter = {
  nama: string;    // e.g., "Kreatinin"
  nilai: number;   // e.g., 2.5
  satuan: string;  // e.g., "mg/dL"
};

export const labResults = pgTable(
  "lab_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),

    // Date as text YYYY-MM-DD — same timezone-safe pattern as fluid_log
    tanggalPemeriksaan: text("tanggal_pemeriksaan").notNull(),

    // 'manual' | 'dokumen'
    tipeInput: text("tipe_input").notNull(),

    // Path to uploaded file — null for manual entries
    filePath: text("file_path"),

    // JSON array of {nama, nilai, satuan} objects
    // NOT encrypted — queryability required for trend chart (jsonb_array_elements)
    // SECURITY NOTE: medical values stored unencrypted in Postgres; accessible only via auth API
    parameterLab: jsonb("parameter_lab")
      .$type<LabParameter[]>()
      .default([]),

    // Free-text note — encrypted AES-256-GCM before INSERT (like fluid_log.catatan)
    catatanTambahan: text("catatan_tambahan"),

    // 'aktif' | 'diarsipkan' — soft delete only (D-08, LAB-04)
    status: text("status").notNull().default("aktif"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    // List queries filter by user + status
    userStatusIdx: index("idx_lab_results_user_status").on(
      table.userId, table.status
    ),
    // Trend queries filter by user + tipe_input + tanggal
    userDateIdx: index("idx_lab_results_user_date").on(
      table.userId, table.tanggalPemeriksaan
    ),
  })
);
```

[ASSUMED] — schema design; `parameter_lab` encryption tradeoff is this researcher's recommendation, not from authoritative source.

### Pattern 3: labResultUpload Multer Instance (upload.ts extension)

The existing `medicationPhotoUpload` in `backend/src/lib/upload.ts` only accepts JPEG and PNG. Lab results also need PDF. Add a second multer instance rather than modifying the existing one.

```typescript
// Source: project convention (backend/src/lib/upload.ts extended)

const LAB_UPLOAD_DIR = process.env.LAB_UPLOAD_DIR ?? "/app/uploads/lab-results";

try {
  fs.mkdirSync(LAB_UPLOAD_DIR, { recursive: true });
} catch {
  // Same silent-fail pattern as medication photo upload
}

const labStorage = multer.diskStorage({
  destination: (_req, _file, cb) => { cb(null, LAB_UPLOAD_DIR); },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${timestamp}-${rand}${ext}`);
  },
});

const labFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = ["application/pdf", "image/jpeg", "image/png"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Format file tidak didukung. Gunakan PDF, JPG, atau PNG.") as any, false);
  }
};

export const labResultUpload = multer({
  storage: labStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per PRD 8.5
  fileFilter: labFileFilter,
});
```

**Critical:** The multer error handler in `backend/src/app.ts` currently checks for `"Hanya file JPEG atau PNG yang diizinkan"` (the medication photo message). The lab upload error message is different (`"Format file tidak didukung..."`) — the error handler must be updated to catch both, or a general multer error pattern should be used. [VERIFIED: codebase — `backend/src/app.ts` lines 51-70]

### Pattern 4: activityEndReminder.job.ts (new cron job)

```typescript
// Source: project convention (backend/src/jobs/reminderDispatch.job.ts pattern)
// Follows WIB offset pattern from CR-02 fix

export async function dispatchActivityEndReminders(): Promise<void> {
  const now = new Date(Date.now() + 7 * 3600 * 1000); // WIB
  const BUFFER_MINUTES = 5; // "beberapa menit sebelum" — Claude's discretion

  // Find berlangsung activities whose estimasi_selesai is within
  // [now + BUFFER_MINUTES - 1 min, now + BUFFER_MINUTES] AND reminder_sent = false
  const windowStart = new Date(now.getTime() + (BUFFER_MINUTES - 1) * 60 * 1000);
  const windowEnd   = new Date(now.getTime() +  BUFFER_MINUTES        * 60 * 1000);

  const due = await dailyActivityRepository.findDueForEndReminder(windowStart, windowEnd);
  for (const activity of due) {
    await sendToAllDevices(activity.userId, {
      title: "Kegiatan Hampir Selesai",
      body: `'${activity.namaKegiatan}' diperkirakan selesai dalam beberapa menit.`,
      url: "/catatan",
    });
    await dailyActivityRepository.markReminderSent(activity.id);
  }
}
```

Mount in `scheduler.ts`:
```typescript
import { dispatchActivityEndReminders } from "./activityEndReminder.job.js";

schedule("* * * * *", () => {
  dispatchActivityEndReminders().catch((err) =>
    logger.error({ err }, "activity end reminder dispatch failed"),
  );
});
```

[ASSUMED] — job design based on project conventions; BUFFER_MINUTES=5 is Claude's discretion.

### Pattern 5: JSONB Trend Query (requires raw SQL)

Drizzle ORM's fluent API does not support `jsonb_array_elements`. Use the `sql` tag for trend queries.

```typescript
// Source: Drizzle ORM sql tag pattern — [CITED: orm.drizzle.team/docs/sql]
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";

export async function getTrendData(
  userId: string,
  parameter: string,
  fromDate: string, // YYYY-MM-DD
): Promise<Array<{ tanggal: string; nilai: number; satuan: string }>> {
  const result = await db.execute(sql`
    SELECT
      lr.tanggal_pemeriksaan  AS tanggal,
      (elem->>'nilai')::numeric AS nilai,
      elem->>'satuan'           AS satuan
    FROM lab_results lr
    CROSS JOIN LATERAL jsonb_array_elements(lr.parameter_lab) AS elem
    WHERE lr.user_id       = ${userId}::uuid
      AND lr.tipe_input    = 'manual'
      AND lr.status        = 'aktif'
      AND elem->>'nama'    = ${parameter}
      AND lr.tanggal_pemeriksaan >= ${fromDate}
    ORDER BY lr.tanggal_pemeriksaan ASC
  `);
  return result.rows as Array<{ tanggal: string; nilai: number; satuan: string }>;
}

// Also needed for distinct parameter names (dropdown population)
export async function getDistinctParameters(userId: string): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT DISTINCT elem->>'nama' AS nama
    FROM lab_results lr
    CROSS JOIN LATERAL jsonb_array_elements(lr.parameter_lab) AS elem
    WHERE lr.user_id    = ${userId}::uuid
      AND lr.tipe_input = 'manual'
      AND lr.status     = 'aktif'
    ORDER BY 1
  `);
  return result.rows.map((r: any) => r.nama as string);
}
```

[ASSUMED] — raw SQL pattern; the `CROSS JOIN LATERAL jsonb_array_elements` is a well-established Postgres pattern but not verified against official Drizzle docs in this session.

### Pattern 6: recharts LineChart (from UI-SPEC)

```tsx
// Source: 03-UI-SPEC.md Screen 7 + CONTEXT.md D-09/D-12
import {
  ResponsiveContainer, LineChart, Line,
  CartesianGrid, XAxis, YAxis, Tooltip
} from "recharts";

// chartData shape: Array<{ tanggal: string; nilai: number }>
// tanggal formatted as "DD/MM" for display

<ResponsiveContainer width="100%" height={200}>
  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
    <CartesianGrid
      strokeDasharray="3 3"
      stroke="rgba(0, 0, 0, 0.05)"
      vertical={false}
    />
    <XAxis
      dataKey="tanggal"
      tick={{ fontSize: 10, fontFamily: "DM Sans", fill: "#7a8c8a" }}
      axisLine={false}
      tickLine={false}
    />
    <YAxis
      tick={{ fontSize: 10, fontFamily: "DM Sans", fill: "#7a8c8a" }}
      axisLine={false}
      tickLine={false}
      width={40}
    />
    <Tooltip
      contentStyle={{
        backgroundColor: "#ffffff",
        border: "0.5px solid #f0faf9",
        borderRadius: 10,
        fontFamily: "DM Sans",
        fontSize: 12,
        color: "#1a2e2c",
      }}
      formatter={(value: number) => [`${value} ${unit}`, selectedParameter]}
      labelFormatter={(label: string) => `Tanggal: ${label}`}
    />
    <Line
      type="monotone"
      dataKey="nilai"
      stroke="#2a9d8f"
      strokeWidth={2}
      dot={{ fill: "#2a9d8f", stroke: "#ffffff", strokeWidth: 2, r: 4 }}
      activeDot={{ fill: "#2a9d8f", stroke: "#ffffff", strokeWidth: 2, r: 6 }}
    />
  </LineChart>
</ResponsiveContainer>
```

[CITED: 03-UI-SPEC.md Screen 7]

### Pattern 7: Activity Status Interval (client-side)

```tsx
// Source: CONTEXT.md D-04, 03-UI-SPEC.md Screen 1
// No server calls per tick — derives elapsed time from stored estimasiSelesai timestamp

const [minutesElapsed, setMinutesElapsed] = useState(0);

useEffect(() => {
  if (!activity || activity.status !== "berlangsung") return;

  const updateElapsed = () => {
    const estimasiMs = new Date(activity.estimasiSelesai).getTime();
    const elapsed = Math.floor((Date.now() - estimasiMs) / 60000);
    setMinutesElapsed(Math.max(0, elapsed));
  };

  updateElapsed(); // immediate on mount
  const interval = setInterval(updateElapsed, 60_000);
  return () => clearInterval(interval); // MUST clear on unmount
}, [activity]);

// Usage: minutesElapsed > 0 → "Masih aktif · [minutesElapsed] menit lebih"
//        minutesElapsed ≤ 0 → "Berlangsung"
```

[ASSUMED] — pattern design based on requirements; no external source.

### API Endpoints Summary

**Activities (`/api/activities`):**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/activities` | Start new activity |
| GET | `/api/activities` | List today's + recent activities |
| GET | `/api/activities/active` | Current in-progress activity (KegiatanModuleInline) |
| PATCH | `/api/activities/:id/complete` | Mark complete, save feelings + note |

**Lab Results (`/api/lab-results`):**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/lab-results` | Create manual lab entry |
| POST | `/api/lab-results/upload` | Upload lab document (multipart) |
| GET | `/api/lab-results` | List active lab results |
| PATCH | `/api/lab-results/:id/archive` | Soft delete |
| GET | `/api/lab-results/parameters` | Distinct manual-entry parameter names for dropdown |
| GET | `/api/lab-results/trend` | Trend chart data: `?parameter={name}&range={7d\|30d\|3m\|all}` |

### Anti-Patterns to Avoid

- **In-memory setInterval/setTimeout for push**: The pre-end-time push (D-03) must go through the cron job querying Postgres, not a `setTimeout` set at activity creation time. Container restarts drop all `setTimeout` references.
- **Querying `parameter_lab` with Drizzle fluent API**: Drizzle cannot express `jsonb_array_elements` in its fluent query builder. Use the `sql` tag directly.
- **Reusing medicationPhotoUpload for lab files**: The existing multer instance rejects PDFs. A separate `labResultUpload` instance is required.
- **Storing `estimasiSelesai` as time-only HH:mm string**: The cron job needs a full timestamp to compare against `now`. Combine the form's HH:mm with today's WIB date on the backend before storing.
- **Using `new Date()` in cron without WIB offset**: Same as Phase 2 CR-02 — always use `Date.now() + 7*3600*1000` for WIB-aware comparisons.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Lab trend chart | Custom SVG/canvas chart | recharts (D-12, locked) | Recharts handles responsive layout, tooltips, axis formatting, animations — all edge cases are handled |
| File type validation | Manual magic-byte check at upload | multer `fileFilter` + MIME check | multer's fileFilter handles the rejection path cleanly; magic-byte sniffing is a future enhancement, not MVP requirement |
| JSONB parameter search | JavaScript-side filter of all lab results | Postgres `jsonb_array_elements` via `sql` tag | DB-side filtering scales; pulling all rows to filter in JS is O(n) per query |
| Push fan-out to devices | New push loop | `sendToAllDevices(userId, payload)` from `notification.service.ts` | Already handles partial delivery, 410 subscription expiry, per-device fan-out |
| Date range calculation | Manual date arithmetic | Simple `DATE_TRUNC` / subtraction in the trend SQL query | Less error-prone; avoids DST edge cases |
| Activity elapsed time display | Server round-trip per minute | `setInterval(60000)` + local `Date.now() - estimasiSelesaiMs` | Network-free; `estimasiSelesai` is already in the client after activity fetch |

**Key insight:** The codebase already has all the hard infrastructure (multer, cron, push, encryption, Drizzle). Phase 3 work is 90% plumbing two new entity stacks through well-established patterns.

---

## Common Pitfalls

### Pitfall 1: WIB Timezone in Activity End-Time Comparison

**What goes wrong:** The cron job compares `estimasi_selesai` against `new Date()` (UTC). Jakarta patients' activities scheduled at e.g. 15:00 WIB fire at 08:00 UTC — the cron fires 7 hours early.

**Why it happens:** Railway/Render servers default to `TZ=UTC`. `new Date()` returns UTC time.

**How to avoid:** Use `new Date(Date.now() + 7 * 3600 * 1000)` for all time comparisons in `activityEndReminder.job.ts`. This is identical to the fix in `reminderDispatch.job.ts` (verified in codebase). [VERIFIED: codebase — `backend/src/jobs/reminderDispatch.job.ts` lines 27-29]

**Warning signs:** Activities' push notifications arrive 7 hours before the expected time.

### Pitfall 2: Double-Fire of Pre-End-Time Push

**What goes wrong:** The cron job runs every minute. Without a guard, `dispatchActivityEndReminders` sends the "Kegiatan Hampir Selesai" push on every tick while the activity is in the 5-minute window.

**Why it happens:** No deduplication state.

**How to avoid:** Use the `reminder_sent` boolean column on `daily_activities`. Set it to `true` after the first successful push. The repository query filters `WHERE reminder_sent = false`. This is the same pattern as `last_notification_sent_at` in `reminder_schedule`. [VERIFIED: codebase — `backend/src/db/schema/reminderSchedule.schema.ts` line 23]

**Warning signs:** User receives 5+ identical push notifications within a 5-minute window.

### Pitfall 3: setInterval Not Cleaned Up on Component Unmount

**What goes wrong:** `KegiatanModuleInline` or `ActivityItem` mounts a `setInterval(60000)`. User navigates away. The component unmounts but the interval continues running, trying to call `setState` on an unmounted component. In React 19, this silently leaks memory.

**How to avoid:** Always return the cleanup function from `useEffect`:
```tsx
useEffect(() => {
  const interval = setInterval(updateElapsed, 60_000);
  return () => clearInterval(interval);
}, [dependency]);
```

**Warning signs:** Console warnings about setting state on unmounted components; memory usage grows over a session.

### Pitfall 4: multer Error Handler Message Mismatch

**What goes wrong:** `backend/src/app.ts` lines 62-65 check for the exact string `"Hanya file JPEG atau PNG yang diizinkan"`. The lab result multer error message is different (`"Format file tidak didukung. Gunakan PDF, JPG, atau PNG."`). The mismatch means lab upload errors fall through to the generic 500 error handler instead of returning a clean 400.

**How to avoid:** Update the multer error handler in `app.ts` to handle both error messages (or add a second `else if` block). Alternatively, check for a common prefix pattern or a custom error code property. [VERIFIED: codebase — `backend/src/app.ts` lines 60-65]

**Warning signs:** Lab file upload errors return HTTP 500 with a generic message instead of a 400 with the Indonesian copy.

### Pitfall 5: recharts ResponsiveContainer Renders at 0px Height

**What goes wrong:** `<ResponsiveContainer width="100%" height={200}>` renders correctly when the parent has defined width. If the parent container has `display: none` or is inside a hidden tab, the container computes to 0×0 and recharts renders nothing.

**How to avoid:** Ensure recharts only mounts when the Lab tab is active. The `catatan/page.tsx` conditional rendering (`{activeTab === "lab" && ...}`) already handles this — recharts mounts only when the tab is visible. Do not try to render the chart inside a CSS-hidden container.

**Warning signs:** Chart appears blank; browser dev tools show the SVG has width/height of 0.

### Pitfall 6: Combining HH:mm Form Input with Today's Date for estimasiSelesai

**What goes wrong:** The `<input type="time">` in `MulaiKegiatanSheet` returns an HH:mm string (e.g., `"14:30"`). Storing this as-is means the cron job cannot compare it against a timestamp.

**How to avoid:** In `activities.service.ts`, combine the HH:mm string with today's WIB date to produce a full ISO timestamp before inserting. Example:
```typescript
// In activities.service.ts, during POST /api/activities handling
const todayWib = new Date(Date.now() + 7 * 3600 * 1000);
const [hours, minutes] = estimasiSelesaiHHmm.split(":").map(Number);
todayWib.setUTCHours(hours - 7, minutes, 0, 0); // back to UTC for storage
const estimasiSelesaiTs = todayWib;
```

Also validate that `estimasiSelesaiTs` is in the future at the time of submission.

**Warning signs:** `estimasi_selesai` column in Postgres contains only time strings; cron job comparisons fail.

### Pitfall 7: estimasiSelesai Validation Must Be Server-Side

**What goes wrong:** Frontend validates that estimated end time is in the future. User submits. Between validation and the server receiving the request, time passes. Or the client clock is wrong.

**How to avoid:** Re-validate in `activities.service.ts` that the combined `estimasiSelesai` timestamp is at least 1 minute in the future (from the server's perspective). Return 400 with `"Estimasi waktu tidak boleh di masa lalu"` if not.

**Warning signs:** Activities created with past estimated end times appear immediately as "Masih aktif" without ever being "Berlangsung".

### Pitfall 8: Lab Upload Endpoint Returns File Path, Not URL

**What goes wrong:** The lab file is stored on a Docker volume at `/app/uploads/lab-results/filename.pdf`. The `file_path` stored in `lab_results.file_path` is an absolute filesystem path, not a publicly accessible URL. The frontend cannot use it as a `<a href>` link.

**How to avoid:** Either (a) serve the `/app/uploads/` directory as a static file route in Express (`app.use("/uploads", express.static("/app/uploads"))`), or (b) return just the relative path and construct the full URL on the frontend. Option (a) is already established for medication photos — verify whether `app.ts` already serves `/uploads` or if it needs to be added. [ASSUMED — verify against `backend/src/app.ts`]

**Warning signs:** Lab file links return 404; `filePath` in the API response is an absolute filesystem path.

---

## Code Examples

### Starting an Activity (Zod Schema)

```typescript
// Source: project convention (fluid.service.ts pattern)
export const createActivitySchema = z.object({
  namaKegiatan: z
    .string()
    .min(1, "Nama kegiatan wajib diisi")
    .max(100),
  estimasiSelesai: z
    .string()
    .min(1, "Estimasi waktu selesai wajib diisi")
    .regex(/^\d{2}:\d{2}$/, "Format waktu tidak valid (HH:mm)"),
});
```

### Completing an Activity (Zod Schema)

```typescript
export const completeActivitySchema = z.object({
  // null when user taps "Lewati"
  perasaan: z.enum(["nyaman", "biasa", "lelah", "berat"]).optional().nullable(),
  catatan: z.string().max(200).optional().nullable(),
});
```

### Manual Lab Entry (Zod Schema)

```typescript
export const createManualLabSchema = z.object({
  tanggalPemeriksaan: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  namaParameter: z.string().min(1, "Nama parameter wajib diisi"),
  nilai: z.number({ invalid_type_error: "Nilai harus berupa angka positif" }).positive(),
  satuan: z.string().min(1, "Satuan wajib diisi (mis: mg/dL, g/dL)"),
  catatanTambahan: z.string().max(500).optional().nullable(),
});
```

### Date Range to fromDate Conversion

```typescript
// Converts UI range preset to a YYYY-MM-DD string for the trend query
function rangeToFromDate(range: "7d" | "30d" | "3m" | "all"): string | null {
  if (range === "all") return null; // no date filter
  const now = new Date(Date.now() + 7 * 3600 * 1000); // WIB
  if (range === "7d") now.setDate(now.getDate() - 7);
  else if (range === "30d") now.setDate(now.getDate() - 30);
  else if (range === "3m") now.setMonth(now.getMonth() - 3);
  return now.toISOString().slice(0, 10);
}
```

### catatan/page.tsx Sub-Tab Enable (key change)

```typescript
// EXTEND: enable aktivitas and lab tabs (both currently enabled: false)
const TABS: Tab[] = [
  { id: "cairan", label: "Cairan", enabled: true },
  { id: "obat", label: "Obat", enabled: true },
  { id: "aktivitas", label: "Aktivitas", enabled: true },  // CHANGE: false → true
  { id: "lab", label: "Lab", enabled: true },              // CHANGE: false → true
];
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| recharts 2.x | recharts 3.x (3.9.0) | mid-2024 | Breaking changes in some prop APIs — use 3.x docs, not 2.x tutorials |
| `next-pwa` | `@serwist/next` | 2023+ | Not relevant to Phase 3 but documented for reference |

**recharts 3.x notes:** [ASSUMED — training data; verify against recharts changelog if specific API issues arise]
- The `recharts` v3 API for `<Line>`, `<XAxis>`, `<YAxis>`, `<Tooltip>` is substantially the same as v2 for the patterns used in this phase
- The `CartesianGrid vertical={false}` prop works in v3
- `ResponsiveContainer` behavior is unchanged

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `daily_activities` schema design (columns, types, indexes) | Architecture Patterns Pattern 1 | Schema may need adjustments during planning; no data migration risk since this is a new table |
| A2 | `lab_results.parameter_lab` JSONB not encrypted for queryability | Architecture Patterns Pattern 2 | If security review decides encryption is required, the trend query approach changes entirely (no more server-side JSONB query) |
| A3 | `catatan_perasaan` in daily_activities should be encrypted | Architecture Patterns Pattern 1 | CLAUDE.md lists fluid_log, medication_log, lab_result — activity catatan is NOT in that list; may be unnecessary overhead |
| A4 | Pre-end-time push buffer = 5 minutes | Architecture Patterns Pattern 4 | User may not have time to prepare — could be 3 or 10 minutes; no user preference configured |
| A5 | `activityEndReminder.job.ts` uses minute-granularity cron window matching | Architecture Patterns Pattern 4 | If two cron ticks fall within the 1-minute window (e.g., under load), `reminder_sent` flag prevents double dispatch |
| A6 | recharts 3.x API is compatible with the UI-SPEC code examples | Code Examples | Minor prop differences may exist; verify against recharts 3.x docs if build errors appear |
| A7 | Serving uploaded lab files via existing static `/uploads` route | Common Pitfalls Pitfall 8 | If no static serve route exists in app.ts, lab files are unreachable from frontend — planner must check and add if missing |
| A8 | `estimasiSelesai` stored as UTC timestamp in Postgres | Architecture Patterns | Consistent with Postgres timestamp convention; WIB display applied at read time |

---

## Open Questions (RESOLVED)

1. **Should `catatan_perasaan` in `daily_activities` be encrypted?**
   - What we know: CLAUDE.md explicitly lists `fluid_log, medication_log, lab_result` as encrypted tables. `daily_activities` is not listed.
   - RESOLVED: Encrypt `catatan_perasaan` as a conservative default using the existing `encrypt()` helper — plan 03-01 applies AES-256-GCM encryption to this column, consistent with all other user-entered health text.

2. **Does `backend/src/app.ts` already serve `/app/uploads/` as a static route?**
   - What we know: medication photo uploads are stored there, but how they are served to frontend is not clear from the code read.
   - RESOLVED: Plan 03-05 Task 1 explicitly adds `app.use("/uploads", express.static(path.join(process.cwd(), "uploads")))` to `app.ts` if not already present, covering both medication photos and lab files.

3. **What is the `GET /api/activities` list scope — just today, or recent history?**
   - What we know: CONTEXT.md D-02 says "detail view and history for activities lives in Catatan/Aktivitas sub-tab"; UI-SPEC says "sorted: active activities first, then by most recent descending" with "Group label 'Hari ini'"
   - RESOLVED: Plan 03-01 Task 3 returns today's activities by default (`tanggal = today in WIB`) with an optional `?date=YYYY-MM-DD` param for history navigation, consistent with the `/api/fluid?date=...` pattern.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20 | Backend + Frontend | Assumed available (Phase 1/2 ran) | ≥20 | — |
| PostgreSQL 16 | Both new tables | Available (Phase 1/2 DB running) | 16 | — |
| recharts@3 | LabTrendChart component | NOT installed | — | None — must install |
| multer@2.2.x | Lab file upload | Available (already installed) | 2.2.x | — |
| node-cron@4.5.x | activityEndReminder.job | Available (already installed) | 4.5.x | — |
| `tabs.tsx` shadcn component | TambahHasilLabSheet internal tabs | Installed | — | — |

**Missing dependencies with no fallback:**
- `recharts@3` — planner must `npm install recharts@3` in `frontend/` as the first task of the frontend wave

**Missing dependencies with fallback:**
- None

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (node:test) |
| Config file | None — invoked directly |
| Quick run command | `cd backend && node --import tsx --test src/test/activity.service.test.ts src/test/labResult.service.test.ts` |
| Full suite command | `cd backend && node --import tsx --test src/test/*.test.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ACTIVITY-01 | `createActivity` validates payload, stores berlangsung status, combines HH:mm with today's date | unit | `node --import tsx --test src/test/activity.service.test.ts` | ❌ Wave 0 |
| ACTIVITY-01 | `getActiveActivity` returns the current berlangsung activity for a user | unit | same | ❌ Wave 0 |
| ACTIVITY-02 | `dispatchActivityEndReminders` sends push to activities near end time, sets reminder_sent=true | unit | `node --import tsx --test src/test/activityEndReminder.test.ts` | ❌ Wave 0 |
| ACTIVITY-02 | `dispatchActivityEndReminders` does NOT re-fire if reminder_sent=true | unit | same | ❌ Wave 0 |
| ACTIVITY-03 | `completeActivity` sets status='selesai', persists perasaan, encrypts catatan_perasaan | unit | `node --import tsx --test src/test/activity.service.test.ts` | ❌ Wave 0 |
| ACTIVITY-03 | `completeActivity` with no perasaan (skipped) sets selesai without feelings data | unit | same | ❌ Wave 0 |
| LAB-01 | Lab upload endpoint returns 400 for file > 10MB and for non-PDF/JPG/PNG types | unit | `node --import tsx --test src/test/labResult.service.test.ts` | ❌ Wave 0 |
| LAB-02 | `createManualLab` validates payload, stores parameter_lab JSONB, encrypts catatanTambahan | unit | same | ❌ Wave 0 |
| LAB-03 | `getTrendData` returns correct parameter values for given user + parameter name + range | unit | same | ❌ Wave 0 |
| LAB-03 | `getDistinctParameters` returns only distinct parameter names from manual entries | unit | same | ❌ Wave 0 |
| LAB-04 | `archiveLab` sets status='diarsipkan'; does NOT delete row from DB | unit | same | ❌ Wave 0 |
| LAB-04 | `getLabResults` returns only status='aktif' rows by default | unit | same | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd backend && node --import tsx --test src/test/activity.service.test.ts src/test/labResult.service.test.ts`
- **Per wave merge:** `cd backend && node --import tsx --test src/test/*.test.ts`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `backend/src/test/activity.service.test.ts` — covers ACTIVITY-01, ACTIVITY-03
- [ ] `backend/src/test/activityEndReminder.test.ts` — covers ACTIVITY-02 cron job unit tests
- [ ] `backend/src/test/labResult.service.test.ts` — covers LAB-01 through LAB-04

*All three test files follow the `_core` injectable-deps pattern from `fluid.service.test.ts` and `reminderDispatch.test.ts` — no live Postgres connection needed.*

---

## Security Domain

> `security_enforcement: true` in `.planning/config.json`. ASVS Level 1.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `authenticate` middleware on ALL Phase 3 routes |
| V3 Session Management | no (inherited — JWT handled in Phase 1) | — |
| V4 Access Control | yes | All queries filter by `req.user!.id` — no cross-user data access possible |
| V5 Input Validation | yes | zod validation in activities.service + labResults.service for all POST/PATCH payloads |
| V6 Cryptography | yes | `catatan_perasaan` + `catatan_tambahan` encrypted AES-256-GCM before INSERT via existing `encrypt()` helper |
| V9 File Upload | yes | multer fileFilter (MIME type check) + 10MB limit for lab file uploads |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR — user A archives user B's lab result | Tampering | Repository always filters `WHERE user_id = ${userId}` — verified against existing pattern |
| File upload type bypass (MIME spoofing) | Tampering | multer fileFilter checks `file.mimetype` (set by multer from Content-Type); MIME-based check stops most misuse; magic-byte sniffing is a post-MVP hardening |
| Lab result manipulation via PATCH /archive | Tampering | Repository confirms `user_id` matches before update; no admin bypass |
| Unencrypted health notes at rest | Information Disclosure | `catatan_perasaan` + `catatan_tambahan` encrypted before INSERT; `parameter_lab` JSONB not encrypted (queryability tradeoff — see Assumptions A2) |
| JSONB injection via parameter name input | Tampering | Parameterized SQL via Drizzle `sql` tag (all values interpolated safely as `${value}`, never string-concatenated into SQL) |
| Uploaded file path traversal | Elevation of Privilege | multer `diskStorage` with controlled destination + `path.extname` from original filename; no user-supplied directory component |

### CLAUDE.md Encryption Mandate Compliance

CLAUDE.md states: "fluid_log, medication_log, lab_result wajib dienkripsi at-rest". Phase 3 compliance:
- `lab_results.catatan_tambahan` — ENCRYPT with existing `encrypt()` before INSERT ✓
- `lab_results.parameter_lab` — NOT encrypted (JSONB, required for trend queries) — flag as known tradeoff
- `daily_activities.catatan_perasaan` — ENCRYPT (conservative extension of the same principle, same helper)
- `daily_activities` table — not in CLAUDE.md's named list; other fields (namaKegiatan, perasaan enum) are not sensitive enough to require encryption

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 3 |
|-----------|------------------|
| Microservices: Frontend (Next.js), Backend (Express), Database (Postgres) — no direct DB access from frontend | All Phase 3 API calls go through `/api/activities` and `/api/lab-results` on the Express backend |
| AI calls from Backend only | Not applicable to Phase 3 |
| No 4th container | Lab files stored on local Docker volume (not a new storage service); no Redis added |
| recharts for trend charts | D-12 locked; already the CLAUDE.md recommendation |
| AES-256-GCM application-layer encryption for sensitive health data | `catatan_perasaan` and `catatan_tambahan` encrypted before INSERT |
| multer 2.2.x, limits 10MB, MIME filter for PDF/JPG/PNG | labResultUpload instance configured per spec |
| Layered backend: Route → Controller → Service → Repository | Two full stacks: activities.* + labResults.* |
| react-hook-form + zod for forms | MulaiKegiatanSheet + ManualLabForm + UploadLabForm all use this pattern |
| WIB timezone: cron comparisons use Date.now() + 7*3600*1000 | activityEndReminder.job.ts must use this offset |

---

## Sources

### Primary (HIGH confidence)
- Codebase grep (2026-06-27) — `backend/src/lib/upload.ts`, `backend/src/app.ts`, `backend/src/jobs/scheduler.ts`, `backend/src/jobs/reminderDispatch.job.ts`, `backend/src/services/fluid.service.ts`, `backend/src/db/schema/` (all files), `frontend/app/(app)/catatan/page.tsx`, `frontend/app/(app)/beranda/page.tsx`, `frontend/components/ui/` — HIGH confidence, directly read
- `.planning/phases/03-activity-logging-lab-results/03-CONTEXT.md` — user decisions, HIGH confidence (primary authority)
- `.planning/phases/03-activity-logging-lab-results/03-UI-SPEC.md` — component and screen contracts, HIGH confidence (approved UI design)
- `CLAUDE.md` — project constraints and stack, HIGH confidence (primary project authority)
- `npm view recharts version` → `3.9.0` [VERIFIED: npm registry, 2026-06-27]
- `npm view recharts time.created` → `2015-08-07` [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- PRD.md §8.5 (LabResult entity), §5.1 (FR-PS-007, FR-PS-008, FR-PS-009, FR-PS-017, FR-PS-018) — project PRD, not directly read in this session but referenced via CONTEXT.md canonical refs

### Tertiary (LOW confidence — training data)
- recharts 3.x API compatibility with UI-SPEC code examples — based on training data; recharts 3.x released after knowledge cutoff of detailed recharts API knowledge
- Drizzle `sql` tag usage pattern for `jsonb_array_elements` — training data; verify against official Drizzle docs if issues arise

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm or codebase grep
- Architecture: HIGH — directly derived from reading the existing codebase and extending established patterns
- Pitfalls: HIGH — 7 of 8 pitfalls are grounded in direct codebase reading; pitfall 8 (file serving) is ASSUMED
- JSONB trend query: MEDIUM — pattern is well-established Postgres, but not verified against Drizzle `sql` tag behavior specifically

**Research date:** 2026-06-27
**Valid until:** 2026-07-27 (30 days — stable stack, no fast-moving dependencies)
