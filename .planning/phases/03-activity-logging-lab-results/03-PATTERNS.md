# Phase 3: Activity Logging & Lab Results — Pattern Map

**Mapped:** 2026-06-28
**Files analyzed:** 24 (new/modified files from CONTEXT.md + RESEARCH.md)
**Analogs found:** 23 / 24 (recharts LineChart component has no codebase analog — uses RESEARCH.md pattern)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/src/db/schema/dailyActivity.schema.ts` | schema | CRUD | `backend/src/db/schema/fluidLog.schema.ts` | exact |
| `backend/src/db/schema/labResult.schema.ts` | schema | CRUD | `backend/src/db/schema/fluidLog.schema.ts` | exact |
| `backend/src/routes/activities.routes.ts` | route | request-response | `backend/src/routes/fluid.routes.ts` | exact |
| `backend/src/routes/labResults.routes.ts` | route | request-response + file-I/O | `backend/src/routes/medicationLog.routes.ts` | role-match |
| `backend/src/controllers/activities.controller.ts` | controller | request-response | `backend/src/controllers/fluid.controller.ts` | exact |
| `backend/src/controllers/labResults.controller.ts` | controller | request-response + file-I/O | `backend/src/controllers/medicationLog.controller.ts` | exact |
| `backend/src/services/activities.service.ts` | service | CRUD | `backend/src/services/fluid.service.ts` | exact |
| `backend/src/services/labResults.service.ts` | service | CRUD + file-I/O | `backend/src/services/fluid.service.ts` | role-match |
| `backend/src/repositories/dailyActivity.repository.ts` | repository | CRUD | `backend/src/repositories/fluidLog.repository.ts` | exact |
| `backend/src/repositories/labResult.repository.ts` | repository | CRUD + transform | `backend/src/repositories/fluidLog.repository.ts` | role-match |
| `backend/src/lib/upload.ts` (EXTEND) | utility | file-I/O | itself (new `labResultUpload` instance) | exact |
| `backend/src/jobs/activityEndReminder.job.ts` | job | event-driven | `backend/src/jobs/reminderDispatch.job.ts` | exact |
| `backend/src/jobs/scheduler.ts` (EXTEND) | job | event-driven | itself | exact |
| `backend/src/db/schema/index.ts` (EXTEND) | config | — | itself | exact |
| `backend/src/app.ts` (EXTEND) | config | — | itself | exact |
| `frontend/components/beranda/KegiatanModuleInline.tsx` | component | request-response | `frontend/components/beranda/DeltaCairanCard.tsx` | exact |
| `frontend/components/aktivitas/ActivityList.tsx` | component | request-response | `frontend/components/catatan/FluidLogList.tsx` | exact |
| `frontend/components/aktivitas/ActivityItem.tsx` | component | — | `frontend/components/catatan/FluidLogItem.tsx` | role-match |
| `frontend/components/aktivitas/MulaiKegiatanSheet.tsx` | component | request-response | `frontend/components/cairan/CatatCairanSheet.tsx` | exact |
| `frontend/components/aktivitas/FeelingsRatingSheet.tsx` | component | request-response | `frontend/components/cairan/CatatCairanSheet.tsx` | role-match |
| `frontend/components/lab/LabResultList.tsx` | component | request-response | `frontend/components/catatan/FluidLogList.tsx` | exact |
| `frontend/components/lab/LabResultItem.tsx` | component | — | `frontend/components/catatan/FluidLogItem.tsx` | role-match |
| `frontend/components/lab/TambahHasilLabSheet.tsx` | component | request-response + file-I/O | `frontend/components/pengingat/AddReminderSheet.tsx` | role-match |
| `frontend/components/lab/ManualLabForm.tsx` | component | request-response | `frontend/components/cairan/CatatCairanForm.tsx` | exact |
| `frontend/components/lab/UploadLabForm.tsx` | component | file-I/O | `frontend/components/cairan/CatatCairanForm.tsx` | role-match |
| `frontend/components/lab/LabTrendChart.tsx` | component | transform | no codebase analog | none |
| `frontend/components/lab/ArchiveLabConfirm.tsx` | component | request-response | `frontend/components/pengingat/DeleteReminderConfirm.tsx` | role-match |
| `frontend/app/(app)/catatan/page.tsx` (EXTEND) | page | — | itself | exact |
| `frontend/app/(app)/catatan/aktivitas/page.tsx` | page | request-response | `frontend/app/(app)/catatan/obat/page.tsx` | role-match |
| `frontend/app/(app)/catatan/lab/page.tsx` | page | request-response | `frontend/app/(app)/catatan/obat/page.tsx` | role-match |
| `frontend/app/(app)/beranda/page.tsx` (EXTEND) | page | — | itself | exact |
| `backend/src/test/activity.service.test.ts` | test | — | `backend/src/test/fluid.service.test.ts` | exact |
| `backend/src/test/activityEndReminder.test.ts` | test | — | `backend/src/test/fluid.service.test.ts` | role-match |
| `backend/src/test/labResult.service.test.ts` | test | — | `backend/src/test/fluid.service.test.ts` | exact |

---

## Pattern Assignments

### `backend/src/db/schema/dailyActivity.schema.ts` + `labResult.schema.ts` (schema, CRUD)

**Analog:** `backend/src/db/schema/fluidLog.schema.ts`

**Imports pattern** (lines 1-21):
```typescript
import {
  pgTable,
  uuid,
  text,
  boolean,   // dailyActivity uses this; labResult does not
  jsonb,     // labResult uses this; dailyActivity does not
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";
```

**Table definition pattern** (lines 23-68):
```typescript
export const fluidLog = pgTable(
  "fluid_log",                          // snake_case table name
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    // Date as text YYYY-MM-DD — timezone-safe (avoids Postgres date/tz conversion)
    tanggal: text("tanggal").notNull(),
    // Sensitive free-text: stored as AES-256-GCM ciphertext — encryption in service layer
    catatan: text("catatan"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userDateIdx: index("idx_fluid_log_user_date").on(table.userId, table.tanggal),
  })
);
```

**Critical conventions:**
- Column names in Drizzle: camelCase property → "snake_case" DB column string
- `tanggal` as `text` YYYY-MM-DD (not Postgres `date`) — timezone-safe pattern used project-wide
- AES-256-GCM encrypted fields: keep as `text` in schema; encryption/decryption happens in the service, never in the schema
- For `labResult.schema.ts`: `parameterLab: jsonb("parameter_lab").$type<LabParameter[]>().default([])` — typed JSONB array following Drizzle's `.$type<T>()` pattern
- Indexes: always index `(userId, <primary filter column>)` pairs

---

### `backend/src/routes/activities.routes.ts` + `labResults.routes.ts` (route, request-response)

**Analog:** `backend/src/routes/fluid.routes.ts`

**Full pattern** (lines 1-25):
```typescript
/**
 * fluid.routes.ts — /api/fluid route definitions
 *
 * ALL routes require authentication — fluid data is user-specific health data.
 */
import { Router } from "express";
import * as fluidController from "../controllers/fluid.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// POST /api/fluid — log a new fluid entry
router.post("/", authenticate, fluidController.create);
// GET /api/fluid/daily-balance?date=YYYY-MM-DD
router.get("/daily-balance", authenticate, fluidController.getDailyBalance);
// GET /api/fluid?date=YYYY-MM-DD
router.get("/", authenticate, fluidController.list);

export default router;
```

**For `labResults.routes.ts`** — file upload routes use multer middleware inline:
```typescript
// Copy pattern from backend/src/routes/medicationLog.routes.ts (verify current file for exact multer usage)
// labResultUpload.single("file") placed between authenticate and controller:
router.post("/upload", authenticate, labResultUpload.single("file"), labResultController.upload);
```

---

### `backend/src/controllers/activities.controller.ts` + `labResults.controller.ts` (controller, request-response)

**Analog:** `backend/src/controllers/fluid.controller.ts`

**Full thin-controller pattern** (lines 1-27):
```typescript
/**
 * Thin controller — parse req, delegate to service, json/next(err).
 * No business logic here.
 */
import type { Request, Response, NextFunction } from "express";
import * as fluidService from "../services/fluid.service.js";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await fluidService.createEntry(req.user!.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);    // Express 5: all errors forwarded to central error middleware
  }
}

export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const date =
      typeof req.query.date === "string"
        ? req.query.date
        : new Date().toISOString().slice(0, 10);
    const entries = await fluidService.getEntriesByDate(req.user!.id, date);
    res.json({ date, entries });
  } catch (err) {
    next(err);
  }
}
```

**PATCH endpoint pattern** (for `activities.controller.ts` complete + `labResults.controller.ts` archive):
```typescript
export async function complete(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const result = await activitiesService.completeActivity(req.user!.id, id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
```

---

### `backend/src/services/activities.service.ts` + `labResults.service.ts` (service, CRUD)

**Analog:** `backend/src/services/fluid.service.ts`

**Imports pattern** (lines 1-21):
```typescript
import { z } from "zod";
import { encrypt as realEncrypt, decrypt as realDecrypt } from "../lib/encryption.js";
import * as fluidLogRepository from "../repositories/fluidLog.repository.js";
import type { NewFluidLog } from "../repositories/fluidLog.repository.js";
```

**Zod schema pattern** (lines 40-76):
```typescript
export const createFluidSchema = z.object({
  tipe: z.enum(["masuk", "keluar"], {
    errorMap: () => ({ message: "Tipe harus 'masuk' atau 'keluar'" }),
  }),
  volume: z
    .number({
      required_error: "Volume wajib diisi",
      invalid_type_error: "Volume harus berupa angka",
    })
    .positive("Volume harus lebih dari 0 ml"),
  catatan: z.string().max(2000).optional().nullable(),
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
    .optional(),
});
```

**Injectable-deps test seam pattern** (lines 127-180):
```typescript
// Core function with injectable dependencies (for unit testing without live DB)
export async function _createEntryCore(
  userId: string,
  rawPayload: unknown,
  insertFn: InsertFn,
  encryptFn: EncryptFn,
  _decryptFn: DecryptFn,
): Promise<FluidEntryResult> {
  const parsed = createFluidSchema.parse(rawPayload); // throws ZodError → 400
  const encryptedCatatan = parsed.catatan ? encryptFn(parsed.catatan) : null;
  const insertData: NewFluidLog = { userId: userId as any, ...parsed, catatan: encryptedCatatan };
  const created = await insertFn(insertData);
  return { entry: { ...created, catatan: created.catatan ? _decryptFn(created.catatan) : null } };
}

// Production entry point
export async function createEntry(userId: string, payload: unknown) {
  return _createEntryCore(userId, payload, repository.insertEntry, realEncrypt, realDecrypt);
}
```

**WIB timestamp combination** (CRITICAL — from RESEARCH.md Pitfall 6, for `activities.service.ts`):
```typescript
// In createActivity: combine HH:mm form field with today's WIB date → full UTC timestamp
const todayWib = new Date(Date.now() + 7 * 3600 * 1000);
const [hours, minutes] = estimasiSelesaiHHmm.split(":").map(Number);
todayWib.setUTCHours(hours - 7, minutes, 0, 0); // back to UTC for storage
const estimasiSelesaiTs = todayWib;
// Validate it's in the future (server-side — re-validate even if frontend did it)
if (estimasiSelesaiTs <= new Date()) {
  throw new Error("Estimasi waktu tidak boleh di masa lalu");
}
```

---

### `backend/src/repositories/dailyActivity.repository.ts` + `labResult.repository.ts` (repository, CRUD)

**Analog:** `backend/src/repositories/fluidLog.repository.ts`

**Full pattern** (lines 1-68):
```typescript
/**
 * All queries filter by userId — never expose other users' data.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { fluidLog } from "../db/schema/fluidLog.schema.js";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type FluidLog = InferSelectModel<typeof fluidLog>;
export type NewFluidLog = InferInsertModel<typeof fluidLog>;

export async function insertEntry(data: NewFluidLog): Promise<FluidLog> {
  const [row] = await db.insert(fluidLog).values(data).returning();
  return row;
}

export async function findByDate(userId: string, date: string): Promise<FluidLog[]> {
  return db
    .select()
    .from(fluidLog)
    .where(and(eq(fluidLog.userId, userId as any), eq(fluidLog.tanggal, date)))
    .orderBy(fluidLog.waktu);
}
```

**`labResult.repository.ts` — JSONB trend query** (requires raw SQL via `sql` tag — Drizzle fluent API cannot express `jsonb_array_elements`):
```typescript
import { sql } from "drizzle-orm";
import { db } from "../lib/db.js";

export async function getTrendData(
  userId: string,
  parameter: string,
  fromDate: string | null,
): Promise<Array<{ tanggal: string; nilai: number; satuan: string }>> {
  const dateFilter = fromDate
    ? sql`AND lr.tanggal_pemeriksaan >= ${fromDate}`
    : sql``;
  const result = await db.execute(sql`
    SELECT
      lr.tanggal_pemeriksaan  AS tanggal,
      (elem->>'nilai')::numeric AS nilai,
      elem->>'satuan'           AS satuan
    FROM lab_results lr
    CROSS JOIN LATERAL jsonb_array_elements(lr.parameter_lab) AS elem
    WHERE lr.user_id    = ${userId}::uuid
      AND lr.tipe_input = 'manual'
      AND lr.status     = 'aktif'
      AND elem->>'nama' = ${parameter}
      ${dateFilter}
    ORDER BY lr.tanggal_pemeriksaan ASC
  `);
  return result.rows as Array<{ tanggal: string; nilai: number; satuan: string }>;
}

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

**Soft delete pattern** (for `labResult.repository.ts`):
```typescript
// Status update only — never a hard DELETE (LAB-04/D-08)
export async function archiveById(userId: string, id: string): Promise<void> {
  await db
    .update(labResults)
    .set({ status: "diarsipkan" })
    .where(and(eq(labResults.id, id as any), eq(labResults.userId, userId as any)));
}
```

---

### `backend/src/lib/upload.ts` (EXTEND — add `labResultUpload` instance)

**Analog:** itself (`backend/src/lib/upload.ts`)

**Existing pattern to copy verbatim** (lines 1-60) — then add below the existing export:
```typescript
// Existing: UPLOAD_DIR / storage / fileFilter / medicationPhotoUpload (lines 1-60)

// --- New: lab result upload instance (PDF + JPG + PNG, same 10MB limit) ---

const LAB_UPLOAD_DIR = process.env.LAB_UPLOAD_DIR ?? "/app/uploads/lab-results";

try {
  fs.mkdirSync(LAB_UPLOAD_DIR, { recursive: true });
} catch {
  // Same silent-fail pattern as medication photo upload (line 16-20)
}

const labStorage = multer.diskStorage({
  destination: (_req, _file, cb) => { cb(null, LAB_UPLOAD_DIR); },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${timestamp}-${rand}${ext}`);   // same filename pattern as line 27-32
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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: labFileFilter,
});
```

**ALSO update `backend/src/app.ts`** — the multer error handler at lines 60-65 currently only catches `"Hanya file JPEG atau PNG yang diizinkan"`. Add a second catch for the lab error message, or generalize to `err instanceof multer.MulterError || err.message.includes("tidak didukung") || err.message.includes("diizinkan")`.

---

### `backend/src/jobs/activityEndReminder.job.ts` (job, event-driven)

**Analog:** `backend/src/jobs/reminderDispatch.job.ts`

**Imports + WIB pattern** (lines 1-30):
```typescript
import pino from "pino";
import { sendToAllDevices, type NotificationPayload } from "../services/notification.service.js";

const logger = pino({ name: "reminderDispatch.job" });

export function currentHHmm(): string {
  // WIB offset — Railway/Render servers default to TZ=UTC
  const jakartaNow = new Date(Date.now() + 7 * 3600 * 1000);
  return `${String(jakartaNow.getUTCHours()).padStart(2, "0")}:${String(jakartaNow.getUTCMinutes()).padStart(2, "0")}`;
}
```

**Injectable-deps + per-reminder error isolation pattern** (lines 44-93):
```typescript
export async function _dispatchCore(time: string, day: string, deps: DispatchDeps): Promise<void> {
  const due = await deps.findDue(time, day);
  if (due.length === 0) return;

  for (const reminder of due) {
    try {
      await deps.sendToAll(reminder.userId, { title: "...", body: "...", url: "/pengingat" });
      await deps.markDispatched(reminder.id);
      logger.info({ reminderId: reminder.id }, "reminder dispatched");
    } catch (err) {
      // Per-reminder errors must not abort the batch
      logger.error({ reminderId: reminder.id, err }, "failed to dispatch reminder — skipping");
    }
  }
}
```

**For `activityEndReminder.job.ts`** — adapt the WIB time comparison for full timestamps (not HH:mm):
```typescript
export async function dispatchActivityEndReminders(): Promise<void> {
  const now = new Date(Date.now() + 7 * 3600 * 1000); // WIB
  const BUFFER_MINUTES = 5;
  const windowStart = new Date(now.getTime() + (BUFFER_MINUTES - 1) * 60 * 1000);
  const windowEnd   = new Date(now.getTime() +  BUFFER_MINUTES        * 60 * 1000);

  // Query: berlangsung activities with estimasi_selesai in [windowStart, windowEnd] AND reminder_sent = false
  // reminderSent=false guard is equivalent to markDispatched — prevents double-fire
  const due = await dailyActivityRepository.findDueForEndReminder(windowStart, windowEnd);
  for (const activity of due) {
    try {
      await sendToAllDevices(activity.userId, {
        title: "Kegiatan Hampir Selesai",
        body: `'${activity.namaKegiatan}' diperkirakan selesai dalam beberapa menit.`,
        url: "/catatan",
      });
      await dailyActivityRepository.markReminderSent(activity.id);
      logger.info({ activityId: activity.id }, "activity end reminder dispatched");
    } catch (err) {
      logger.error({ activityId: activity.id, err }, "activity end reminder failed — skipping");
    }
  }
}
```

**Mount in `scheduler.ts`** — follow lines 23-34 of existing scheduler:
```typescript
import { dispatchActivityEndReminders } from "./activityEndReminder.job.js";

// Add inside startScheduler():
schedule("* * * * *", () => {
  dispatchActivityEndReminders().catch((err) =>
    logger.error({ err }, "activity end reminder dispatch failed"),
  );
});
```

---

### `frontend/components/beranda/KegiatanModuleInline.tsx` (component, request-response)

**Analog:** `frontend/components/beranda/DeltaCairanCard.tsx`

**Fetch + state pattern** (lines 62-93):
```typescript
"use client";
import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";

export default function KegiatanModuleInline({ accessToken, refreshKey = 0 }) {
  const [activity, setActivity] = useState<ActiveActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActive = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await authFetch<ActiveActivity | null>(
        "/api/activities/active",
        accessToken,
      );
      setActivity(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat kegiatan");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchActive();
  }, [fetchActive, refreshKey]);
  // ... render
}
```

**setInterval for elapsed time** (from RESEARCH.md Pattern 7 — D-04 constraint: in-app only, no server call per tick):
```typescript
const [minutesElapsed, setMinutesElapsed] = useState(0);

useEffect(() => {
  if (!activity || activity.status !== "berlangsung") return;

  const updateElapsed = () => {
    const estimasiMs = new Date(activity.estimasiSelesai).getTime();
    const elapsed = Math.floor((Date.now() - estimasiMs) / 60000);
    setMinutesElapsed(Math.max(0, elapsed));
  };

  updateElapsed();
  const interval = setInterval(updateElapsed, 60_000);
  return () => clearInterval(interval); // MUST clean up on unmount
}, [activity]);
// minutesElapsed > 0 → show amber "Masih aktif · [minutesElapsed] menit lebih"
```

**Inline module styling** (not a full card — D-01 constraint; style consistent with card neighbors):
```typescript
// Embed between PengingatBerikutnyaCard and AiPlaceholderCard in beranda/page.tsx
// No new card wrapper — renders as a section within the dashboard content area
// Background: #fdf9f3 (cream) with amber (#EF9F27) badge for "Masih aktif" status
```

---

### `frontend/components/aktivitas/ActivityList.tsx` (component, request-response)

**Analog:** `frontend/components/catatan/FluidLogList.tsx`

**Full pattern to copy** (lines 1-200):
```typescript
"use client";
import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";

export default function ActivityList({ accessToken, date, refreshKey = 0 }) {
  const [entries, setEntries] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await authFetch<Activity[]>(`/api/activities?date=${targetDate}`, accessToken);
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat catatan");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, targetDate]);

  useEffect(() => { fetchEntries(); }, [fetchEntries, refreshKey]);
  // Skeleton loading → error state with retry → empty state → entry list
  // (copy exact same three-state render pattern from FluidLogList.tsx lines 97-199)
}
```

**Skeleton loading pattern** (lines 97-113 of FluidLogList.tsx):
```typescript
if (isLoading) {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse"
          style={{ background: "#f0faf9", borderRadius: 13, height: 48 }} />
      ))}
    </div>
  );
}
```

**Empty state pattern** (lines 140-174 of FluidLogList.tsx):
```typescript
if (entries.length === 0) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f0faf9",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <IconComponent size={22} style={{ color: "#2a9d8f" }} />
      </div>
      <p className="font-heading font-bold" style={{ fontSize: 14, color: "#1a2e2c" }}>
        Belum ada kegiatan hari ini
      </p>
    </div>
  );
}
```

---

### `frontend/components/aktivitas/MulaiKegiatanSheet.tsx` (component, request-response)

**Analog:** `frontend/components/cairan/CatatCairanSheet.tsx`

**Shell pattern** (lines 1-66 — entire file):
```typescript
"use client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import MulaiKegiatanForm from "./MulaiKegiatanForm"; // inline form (not separate file)

interface MulaiKegiatanSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string;
  onSaved?: () => void;
}

export default function MulaiKegiatanSheet({ isOpen, onOpenChange, accessToken, onSaved }) {
  if (!accessToken) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] rounded-t-2xl sm:max-w-md sm:rounded-2xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[85dvh]"
      >
        <SheetHeader className="pb-2 sm:px-6 sm:pt-5 sm:pb-3 shrink-0">
          <SheetTitle className="font-heading text-base font-bold text-foreground text-left">
            Mulai Kegiatan
          </SheetTitle>
        </SheetHeader>
        <div className="pl-4 pb-4 pr-2 sm:pl-6 sm:pb-6 sm:pr-4 overflow-y-auto flex-1 min-h-0">
          {/* Form with react-hook-form + zod — copy CatatCairanForm pattern */}
          <MulaiKegiatanForm accessToken={accessToken}
            onSuccess={() => { onOpenChange(false); onSaved?.(); }}
            onClose={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**`overflow-y-auto flex-1 min-h-0` on the inner div is mandatory** — from Phase 2 hotfix (prevents sheet content overflow on short screens).

---

### `frontend/components/lab/TambahHasilLabSheet.tsx` (component, request-response + file-I/O)

**Analog:** `frontend/components/pengingat/AddReminderSheet.tsx` (for the internal tab switching pattern)

**Internal tab switching pattern** (lines 43-60 of AddReminderSheet.tsx):
```typescript
"use client";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type LabInputTab = "manual" | "dokumen";

export default function TambahHasilLabSheet({ isOpen, onOpenChange, accessToken, onSaved }) {
  const [activeTab, setActiveTab] = useState<LabInputTab>("manual"); // Manual = Tab 1 (D-06/D-07)

  const handleClose = () => {
    setActiveTab("manual"); // Reset tab on close
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="bottom"
        className="max-h-[92dvh] rounded-t-2xl sm:max-w-md sm:rounded-2xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[85dvh]">
        <SheetHeader className="pb-2 sm:px-6 sm:pt-5 sm:pb-3 shrink-0">
          <SheetTitle className="font-heading text-base font-bold text-foreground text-left">
            Tambah Hasil Lab
          </SheetTitle>
        </SheetHeader>
        {/* Internal tab pills — not shadcn Tabs component, just styled buttons */}
        <div className="flex gap-2 px-4 pt-1 shrink-0">
          {(["manual", "dokumen"] as LabInputTab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ /* amber pill for active, neutral for inactive */ }}>
              {tab === "manual" ? "Input Manual" : "Unggah Dokumen"}
            </button>
          ))}
        </div>
        <div className="pl-4 pb-4 pr-2 sm:pl-6 sm:pb-6 sm:pr-4 overflow-y-auto flex-1 min-h-0">
          {activeTab === "manual" ? (
            <ManualLabForm accessToken={accessToken} onSuccess={handleClose} />
          ) : (
            <UploadLabForm accessToken={accessToken} onSuccess={handleClose} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

---

### `frontend/components/lab/ManualLabForm.tsx` (component, request-response)

**Analog:** `frontend/components/cairan/CatatCairanForm.tsx`

**react-hook-form + zod pattern** (lines 68-80):
```typescript
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { authFetch } from "@/lib/api";

const { register, handleSubmit, formState: { errors, isSubmitting }, reset } =
  useForm<ManualLabFormData>({
    resolver: zodResolver(manualLabSchema) as any,
    defaultValues: { tanggalPemeriksaan: new Date().toISOString().slice(0, 10) },
  });
```

**Submit pattern with toast error** (from Phase 2 anti-pattern fix):
```typescript
const onSubmit = async (data: ManualLabFormData) => {
  try {
    await authFetch("/api/lab-results", accessToken, {
      method: "POST",
      body: JSON.stringify({
        tanggalPemeriksaan: data.tanggalPemeriksaan,
        parameterLab: [{ nama: data.namaParameter, nilai: data.nilai, satuan: data.satuan }],
        catatanTambahan: data.catatanTambahan ?? null,
        tipeInput: "manual",
      }),
    });
    toast.success("Hasil lab berhasil disimpan");
    reset();
    onSuccess?.();
  } catch (err) {
    // MUST use toast.error — never let react-hook-form swallow errors silently
    toast.error(err instanceof Error ? err.message : "Gagal menyimpan hasil lab");
  }
};
```

**CKD parameter autocomplete** (`<datalist>` — Claude's discretion per CONTEXT.md):
```typescript
<datalist id="ckd-params">
  {["Kreatinin", "Hemoglobin", "Ureum", "eGFR", "Kalium", "Natrium", "Albumin"].map(p => (
    <option key={p} value={p} />
  ))}
</datalist>
<input list="ckd-params" {...register("namaParameter")} />
```

---

### `frontend/components/lab/LabTrendChart.tsx` (component, transform)

**No codebase analog** — uses RESEARCH.md Pattern 6 directly.

**recharts LineChart pattern** (from `03-RESEARCH.md` Pattern 6):
```tsx
"use client";
import {
  ResponsiveContainer, LineChart, Line,
  CartesianGrid, XAxis, YAxis, Tooltip
} from "recharts";

// CRITICAL: Only render when parent tab is visible (Pitfall 5 — ResponsiveContainer 0px)
// catatan/page.tsx conditional rendering handles this: {activeTab === "lab" && <LabTrendChart />}

export default function LabTrendChart({ data, selectedParameter, unit }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
        <XAxis dataKey="tanggal"
          tick={{ fontSize: 10, fontFamily: "DM Sans", fill: "#7a8c8a" }}
          axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fontFamily: "DM Sans", fill: "#7a8c8a" }}
          axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={{ backgroundColor: "#ffffff", border: "0.5px solid #f0faf9",
            borderRadius: 10, fontFamily: "DM Sans", fontSize: 12, color: "#1a2e2c" }}
          formatter={(value: number) => [`${value} ${unit}`, selectedParameter]}
          labelFormatter={(label: string) => `Tanggal: ${label}`} />
        <Line type="monotone" dataKey="nilai" stroke="#2a9d8f" strokeWidth={2}
          dot={{ fill: "#2a9d8f", stroke: "#ffffff", strokeWidth: 2, r: 4 }}
          activeDot={{ fill: "#2a9d8f", stroke: "#ffffff", strokeWidth: 2, r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

### `frontend/app/(app)/catatan/page.tsx` (EXTEND)

**Analog:** itself

**Key change** (lines 18-23):
```typescript
// CHANGE: enabled: false → true for aktivitas and lab
const TABS: Tab[] = [
  { id: "cairan", label: "Cairan", enabled: true },
  { id: "obat", label: "Obat", enabled: true },
  { id: "aktivitas", label: "Aktivitas", enabled: true },  // CHANGE
  { id: "lab", label: "Lab", enabled: true },              // CHANGE
];
```

**Render pattern for new tabs** (follow existing `activeTab === "cairan"` conditional pattern below line 60):
```typescript
{activeTab === "aktivitas" && accessToken && (
  <ActivityList accessToken={accessToken} refreshKey={aktivitasRefreshKey} />
)}
{activeTab === "lab" && accessToken && (
  // recharts only mounts here — satisfies Pitfall 5
  <LabPage accessToken={accessToken} />
)}
```

---

### `backend/src/test/activity.service.test.ts` + `labResult.service.test.ts` (test)

**Analog:** `backend/src/test/fluid.service.test.ts`

**Test file structure pattern** (lines 1-60):
```typescript
/**
 * Run: cd backend && node --import tsx --test src/test/activity.service.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert";

// Set ENCRYPTION_KEY before module imports (validated at load time)
const TEST_KEY = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
process.env.ENCRYPTION_KEY = TEST_KEY;

const { encrypt, decrypt } = await import("../lib/encryption.js");
const { _createEntryCore, createFluidSchema } = await import("../services/fluid.service.js");

// In-memory store for test isolation (no live Postgres needed)
function createInMemoryStore() {
  const rows: StoredEntry[] = [];
  const insertEntry = async (data: ...) => { const row = { id: crypto.randomUUID(), ...data, createdAt: new Date() }; rows.push(row); return row; };
  return { rows, insertEntry };
}

describe("createActivity", () => {
  it("stores berlangsung status and combines HH:mm with today date", async () => {
    const store = createInMemoryStore();
    const result = await _createActivityCore("user-1", { namaKegiatan: "Jalan pagi", estimasiSelesai: "14:30" },
      store.insertEntry, encrypt, decrypt);
    assert.strictEqual(result.activity.status, "berlangsung");
    assert.ok(result.activity.estimasiSelesai instanceof Date);
  });
});
```

---

## Shared Patterns

### Authentication Middleware
**Source:** `backend/src/middleware/authenticate.ts`
**Apply to:** ALL Phase 3 routes (`activities.routes.ts`, `labResults.routes.ts`)
```typescript
// Every route handler:
router.post("/", authenticate, controller.create);
router.get("/", authenticate, controller.list);
// authenticate sets req.user!.id — controllers use req.user!.id, never req.body.userId
```

### Encryption (AES-256-GCM)
**Source:** `backend/src/lib/encryption.ts` (used in `fluid.service.ts` lines 19, 142-143)
**Apply to:**
- `activities.service.ts`: `catatan_perasaan` before INSERT, decrypt after SELECT
- `labResults.service.ts`: `catatan_tambahan` before INSERT, decrypt after SELECT
```typescript
import { encrypt as realEncrypt, decrypt as realDecrypt } from "../lib/encryption.js";
// Before INSERT:
const encryptedCatatan = parsed.catatan ? encryptFn(parsed.catatan) : null;
// After SELECT (in return object):
catatan: row.catatan ? realDecrypt(row.catatan) : null,
```

### WIB Timezone
**Source:** `backend/src/jobs/reminderDispatch.job.ts` (lines 27-30)
**Apply to:** `activityEndReminder.job.ts` (timestamp comparison), `activities.service.ts` (combine HH:mm with today's WIB date)
```typescript
// For HH:mm display:
const jakartaNow = new Date(Date.now() + 7 * 3600 * 1000);
// For full timestamp comparison in cron:
const nowWib = new Date(Date.now() + 7 * 3600 * 1000);
```

### Error Forwarding (Express 5)
**Source:** All existing controllers (e.g., `fluid.controller.ts` lines 24-26)
**Apply to:** All Phase 3 controllers
```typescript
// Express 5 — async errors auto-forwarded; but wrap in try/catch for explicit control:
try {
  const result = await service.method(req.user!.id, req.body);
  res.status(201).json(result);
} catch (err) {
  next(err); // → central error handler in app.ts
}
```

### Toast Error in Frontend Forms
**Source:** `frontend/components/cairan/CatatCairanForm.tsx` (Phase 2 anti-pattern fix)
**Apply to:** `ManualLabForm.tsx`, `UploadLabForm.tsx`, `MulaiKegiatanSheet.tsx`, `FeelingsRatingSheet.tsx`
```typescript
// MUST wrap onSubmit in try/catch with toast.error — never let RHF swallow errors:
} catch (err) {
  toast.error(err instanceof Error ? err.message : "Gagal menyimpan data");
}
```

### `authFetch` API calls
**Source:** `frontend/components/catatan/FluidLogList.tsx` (line 71-75), `frontend/components/beranda/DeltaCairanCard.tsx` (line 77-80)
**Apply to:** All Phase 3 frontend components that call the backend
```typescript
import { authFetch } from "@/lib/api";
const data = await authFetch<ReturnType>("/api/activities/active", accessToken);
```

### IDOR Prevention in Repositories
**Source:** `backend/src/repositories/fluidLog.repository.ts` (lines 29-35)
**Apply to:** All Phase 3 repository functions
```typescript
// ALWAYS include userId in WHERE clause — never a bare id-only lookup:
.where(and(eq(table.id, id as any), eq(table.userId, userId as any)))
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/components/lab/LabTrendChart.tsx` | component | transform | No charting component exists in the codebase yet — recharts is not installed. Use RESEARCH.md Pattern 6 directly. |

---

## Metadata

**Analog search scope:** `backend/src/` (controllers, services, repositories, routes, jobs, db/schema, lib), `frontend/components/` (beranda, cairan, catatan, pengingat), `frontend/app/(app)/`
**Files scanned:** 18 source files read directly
**Pattern extraction date:** 2026-06-28
