# Phase 4: Caregiver Dashboard & Doctor Reports - Pattern Map

**Mapped:** 2026-06-29
**Files analyzed:** 12 new/modified files
**Analogs found:** 12 / 12

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/src/db/schema/reminderSchedule.schema.ts` | schema | CRUD | `backend/src/db/schema/reminderSchedule.schema.ts` (self — add column) | exact |
| `backend/src/repositories/reminderSchedule.repository.ts` | repository | CRUD | `backend/src/repositories/reminderSchedule.repository.ts` (self — patch update()) | exact |
| `backend/src/controllers/reminders.controller.ts` | controller | request-response | `backend/src/controllers/reminders.controller.ts` (self — patch updateReminder) | exact |
| `backend/src/repositories/report.repository.ts` | repository | CRUD / batch | `backend/src/repositories/reminderSchedule.repository.ts` | role-match |
| `backend/src/services/report.service.ts` | service | batch / transform | `backend/src/services/labResult.service.ts` | role-match |
| `backend/src/controllers/report.controller.ts` | controller | request-response | `backend/src/controllers/labResult.controller.ts` | exact |
| `backend/src/routes/report.routes.ts` | route | request-response | `backend/src/routes/labResult.routes.ts` | exact |
| `backend/src/test/report.service.test.ts` | test | — | `backend/src/test/labResult.service.test.ts` | exact |
| `frontend/app/(app)/pengingat/page.tsx` | page (patch) | event-driven / polling | `frontend/app/(app)/catatan/page.tsx` | role-match |
| `frontend/app/(app)/laporan/page.tsx` | page | request-response | `frontend/app/(app)/catatan/page.tsx` | role-match |
| `frontend/app/(app)/laporan/preview/page.tsx` | page | request-response | `frontend/app/(app)/beranda/page.tsx` | role-match |
| `frontend/components/laporan/LaporanDateRangeSelector.tsx` | component | request-response | `frontend/components/lab/InputManualForm.tsx` | role-match |
| `frontend/components/laporan/LaporanPreviewContent.tsx` | component | transform | `frontend/components/lab/LabTrendChart.tsx` | role-match |
| `frontend/components/laporan/sections/*.tsx` | component | transform | `frontend/components/lab/LabResultList.tsx` | role-match |

---

## Pattern Assignments

### `backend/src/db/schema/reminderSchedule.schema.ts` (schema, CRUD — add `updatedAt`)

**Analog:** Self — existing file, add one field following the `createdAt` pattern.

**Existing imports + field to add** (lines 1–24, add after line 23):
```typescript
// Current file ends with:
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // ...
  lastNotificationSentAt: timestamp("last_notification_sent_at"),
});

// ADD after lastNotificationSentAt (or after createdAt, before Phase-2 fields):
updatedAt: timestamp("updated_at").notNull().defaultNow(),
```

**Migration file to create** (`backend/src/db/migrations/0008_phase4_reminder_updated_at.sql`):
```sql
ALTER TABLE "reminder_schedule" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;
```

**Critical note:** `defaultNow()` only fires on INSERT. Drizzle does NOT auto-update this on `.update()`. The repository must explicitly set it (see next section).

---

### `backend/src/repositories/reminderSchedule.repository.ts` (repository, CRUD — patch `update()`)

**Analog:** Self — lines 135–151, add `updatedAt: new Date()` to `.set({})`.

**Current `update()` pattern** (lines 135–151):
```typescript
export async function update(
  id: string,
  userId: string,
  data: Partial<Omit<NewReminderSchedule, "id" | "userId" | "createdAt">>,
): Promise<ReminderSchedule | undefined> {
  const [row] = await db
    .update(reminderSchedule)
    .set(data)                          // <-- PATCH: change to { ...data, updatedAt: new Date() }
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

**Patched `.set()` line:**
```typescript
.set({ ...data, updatedAt: new Date() })
```

**Existing mutation pattern to copy** (lines 202–207 — `markDispatched` as example of explicit timestamp set):
```typescript
await db
  .update(reminderSchedule)
  .set({ lastNotificationSentAt: new Date(), followUpSent: false })
  .where(eq(reminderSchedule.id, id as any));
```

---

### `backend/src/controllers/reminders.controller.ts` (controller, request-response — patch `updateReminder`)

**Analog:** Self — lines 51–66, add `sendToAllDevices` fire-and-forget call.

**Imports to add** (after line 6):
```typescript
import { sendToAllDevices } from "../services/notification.service.js";
```

**Current `updateReminder` function** (lines 51–66):
```typescript
export async function updateReminder(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = String(req.params.id);
    const fotoObat = req.file ? `/uploads/medication-photos/${req.file.filename}` : undefined;
    const data = { ...req.body, ...(fotoObat !== undefined && { fotoObat }) };

    const updated = await remindersService.updateReminder(req.user!.id, id, data);
    res.json(updated);                  // <-- INSERT push call BEFORE this line
  } catch (err) {
    next(err);
  }
}
```

**Lines to insert before `res.json(updated)`:**
```typescript
// CAREGIVER-02: fire-and-forget push to all devices — must not block response
sendToAllDevices(req.user!.id, {
  title: "Pengingat Diperbarui",
  body: "Jadwal pengingat telah diperbarui dari perangkat lain.",
}).catch(() => {});
```

**Push service signature** (from `backend/src/services/notification.service.ts` lines 70–90):
```typescript
export async function sendToAllDevices(
  userId: string,
  payload: NotificationPayload,   // { title: string; body: string; reminderId?: string; url?: string }
): Promise<void>
```

---

### `backend/src/repositories/report.repository.ts` (repository, batch — NEW)

**Analog:** `backend/src/repositories/reminderSchedule.repository.ts`

**Imports pattern** (copy from reminderSchedule.repository.ts lines 1–4):
```typescript
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "../lib/db.js";
import { fluidLog } from "../db/schema/fluidLog.schema.js";
import { medicationLog } from "../db/schema/medicationLog.schema.js";
```

**Query pattern — `eq` + `and` + `gte`/`lte` with userId filter** (from reminderSchedule.repository.ts lines 34–49):
```typescript
const [row] = await db
  .select()
  .from(reminderSchedule)
  .where(
    and(
      eq(reminderSchedule.id, id as any),
      eq(reminderSchedule.userId, userId as any),
    ),
  )
  .limit(1);
```

**Full report query pattern** (from RESEARCH.md Pattern 4 — copy verbatim):
```typescript
// getFluidSummaryByRange: use gte/lte on fluidLog.tanggal (TEXT, lexicographic ok)
// getMedicationAdherenceByRange: use gte/lte on medicationLog.waktuPengingat (timestamp)
//   with WIB-correct Date: new Date(startDate + "T00:00:00+07:00")
// getCAPDConditionsByRange: filter fluidLog WHERE tipe = 'keluar', group kondisiKeluar
```

**IDOR guard pattern** (every query must include `eq(table.userId, userId as any)` — mirrors all existing repositories).

---

### `backend/src/services/report.service.ts` (service, batch/transform — NEW)

**Analog:** `backend/src/services/labResult.service.ts`

**File header + injectable-core pattern** (labResult.service.ts lines 1–18):
```typescript
/**
 * report.service.ts — Report aggregation business logic
 *
 * Implements REPORT-01: generateReport aggregates fluid_log,
 * medication_log, and fluid_log.kondisiKeluar for a date range.
 *
 * Test seam: exports _generateReportCore with injectable dependencies.
 */
import { z } from "zod";
import * as reportRepository from "../repositories/report.repository.js";
```

**Zod validation pattern** (labResult.service.ts lines 22–62 — adapt for date range):
```typescript
// Mirror this pattern for report query params:
export const reportQuerySchema = z.object({
  dari: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  sampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
}).refine(d => d.sampai >= d.dari, { message: "Tanggal akhir harus setelah tanggal mulai" })
  .refine(d => {
    const diff = (new Date(d.sampai).getTime() - new Date(d.dari).getTime()) / 86400000;
    return diff <= 90;
  }, { message: "Rentang maksimum adalah 90 hari" });
```

**Injectable core export pattern** (labResult.service.ts lines 130–156):
```typescript
// Inject repository functions as params so tests can use in-memory fakes:
export async function _generateReportCore(
  userId: string,
  dari: string,
  sampai: string,
  getFluidFn: typeof reportRepository.getFluidSummaryByRange,
  getMedFn: typeof reportRepository.getMedicationAdherenceByRange,
  getCAPDFn: typeof reportRepository.getCAPDConditionsByRange,
) { ... }

// Production wrapper:
export const reportService = {
  generateReport: (userId: string, dari: string, sampai: string) =>
    _generateReportCore(userId, dari, sampai,
      reportRepository.getFluidSummaryByRange,
      reportRepository.getMedicationAdherenceByRange,
      reportRepository.getCAPDConditionsByRange,
    ),
};
```

---

### `backend/src/controllers/report.controller.ts` (controller, request-response — NEW)

**Analog:** `backend/src/controllers/labResult.controller.ts`

**File header pattern** (labResult.controller.ts lines 1–7):
```typescript
/**
 * report.controller.ts — Thin controller for GET /api/report
 *
 * Pattern: follows labResult.controller.ts — parse req, delegate to service, json/next(err).
 * No business logic here.
 */
import type { Request, Response, NextFunction } from "express";
import { reportService } from "../services/report.service.js";
import { AppError } from "../middleware/errorHandler.js";
```

**Query param extraction + validation pattern** (labResult.controller.ts lines 41–55):
```typescript
export async function getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dari = typeof req.query.dari === "string" ? req.query.dari : undefined;
    const sampai = typeof req.query.sampai === "string" ? req.query.sampai : undefined;
    // ... zod parse then service call
    const report = await reportService.generateReport(req.user!.id, dari, sampai);
    res.json(report);
  } catch (err) {
    next(err);
  }
}
```

**404 + error response pattern** (labResult.controller.ts lines 85–96):
```typescript
if (!result) {
  res.status(404).json({ code: "NOT_FOUND", message: "Data tidak ditemukan" });
  return;
}
```

---

### `backend/src/routes/report.routes.ts` (route — NEW)

**Analog:** `backend/src/routes/labResult.routes.ts`

**Full file pattern** (labResult.routes.ts lines 1–46 — simplified to single GET):
```typescript
/**
 * report.routes.ts — /api/report route definitions
 */
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { getReport } from "../controllers/report.controller.js";

const router = Router();

// GET /api/report?dari=YYYY-MM-DD&sampai=YYYY-MM-DD
router.get("/", authenticate, getReport);

export default router;
```

**App.ts mount pattern** (follow existing pattern — add after labResultRoutes mount):
```typescript
import reportRoutes from "./routes/report.routes.js";
app.use("/api/report", reportRoutes);
```

---

### `backend/src/test/report.service.test.ts` (test — NEW)

**Analog:** `backend/src/test/labResult.service.test.ts`

**Test file header + framework pattern** (labResult.service.test.ts lines 1–24):
```typescript
/**
 * report.service.test.ts — TDD tests for doctor report generation (REPORT-01)
 *
 * Run: cd backend && node --import tsx --test src/test/report.service.test.ts
 *
 * Pattern: follows labResult.service.test.ts — injectable core functions.
 */
import { describe, it } from "node:test";
import assert from "node:assert";

const { _generateReportCore, reportQuerySchema } = await import("../services/report.service.js");
```

**In-memory store factory pattern** (labResult.service.test.ts lines 28–52):
```typescript
// Create fake repository functions that return controlled data:
function createFakeFluidFn(rows) {
  return async (_userId, _dari, _sampai) => rows;
}
// ... same for medication and CAPD
```

**Schema validation test pattern** (labResult.service.test.ts lines 56–80):
```typescript
describe("report schema validation", () => {
  it("valid date range passes", () => { ... });
  it("end before start is rejected", () => { ... });
  it("range > 90 days is rejected", () => { ... });
  it("invalid date format is rejected", () => { ... });
});
```

---

### `frontend/app/(app)/pengingat/page.tsx` (page — patch, add polling `useEffect`)

**Analog:** Self — add a new `useEffect` block following `catatan/page.tsx` event-listener pattern.

**Existing useEffect pattern to extend** (pengingat/page.tsx lines 18–22 — auth guard useEffect):
```typescript
useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    router.replace("/login");
  }
}, [isLoading, isAuthenticated, router]);
```

**New polling useEffect to ADD** (after existing useEffects, before return):
```typescript
// CAREGIVER-02: 30s polling for reminder schedule changes from other devices
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
}, [accessToken]);   // <-- only [accessToken], NOT reminderRefreshKey (avoids multiple intervals)
```

**Existing `authFetch` import** (already used in EmptyState — add to page-level imports):
```typescript
import { authFetch } from "@/lib/api";
```

**`toast` import** (pengingat/page.tsx line 8 — already present):
```typescript
import { toast } from "sonner";
```

---

### `frontend/app/(app)/laporan/page.tsx` (page — NEW)

**Analog:** `frontend/app/(app)/catatan/page.tsx`

**Auth guard + useAuth pattern** (catatan/page.tsx lines 29–44):
```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

export default function LaporanPage() {
  const router = useRouter();
  const { accessToken, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground font-sans text-sm">Memuat...</p>
      </div>
    );
  }

  if (!isAuthenticated || !accessToken) return null;

  return ( /* LaporanDateRangeSelector + doctor note textarea */ );
}
```

**Page header pattern** (pengingat/page.tsx lines 44–57 — h1 style):
```tsx
<h1 className="font-heading font-bold" style={{ fontSize: 14, color: "#1a2e2c" }}>
  Laporan Dokter
</h1>
```

**Navigation to preview** (use `useRouter().push` with `encodeURIComponent`):
```typescript
router.push(`/laporan/preview?dari=${dari}&sampai=${sampai}&catatan=${encodeURIComponent(note)}`);
```

---

### `frontend/app/(app)/laporan/preview/page.tsx` (page — NEW)

**Analog:** `frontend/app/(app)/catatan/page.tsx`

**Auth guard pattern:** Identical to `laporan/page.tsx` above.

**URL param extraction** (Next.js App Router searchParams):
```typescript
// In a Server Component wrapper or useSearchParams() hook:
const dari = searchParams.get("dari") ?? "";
const sampai = searchParams.get("sampai") ?? "";
const catatan = searchParams.get("catatan") ?? "";  // auto-decoded by Next.js
```

**API fetch + loading pattern** (LabTrendChart.tsx lines 57–78 pattern adapted):
```typescript
const [report, setReport] = useState<ReportData | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  if (!accessToken || !dari || !sampai) return;
  authFetch<ReportData>(`/api/report?dari=${dari}&sampai=${sampai}`, accessToken)
    .then(setReport)
    .catch(() => { /* show error state */ })
    .finally(() => setLoading(false));
}, [accessToken, dari, sampai]);
```

**Print button pattern:**
```tsx
<button
  className="no-print font-sans font-medium"
  onClick={() => window.print()}
  style={{ backgroundColor: "#2a9d8f", color: "#ffffff", borderRadius: 20, ... }}
>
  Cetak / Simpan PDF
</button>
```

---

### `frontend/components/laporan/LaporanDateRangeSelector.tsx` (component — NEW)

**Analog:** `frontend/components/lab/InputManualForm.tsx`

**react-hook-form + zod pattern** (InputManualForm.tsx lines 13–60):
```typescript
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const dateRangeSchema = z.object({
  preset: z.enum(["7d", "30d", "3m", "custom"]).default("30d"),
  dari: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  sampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  catatan: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
}).refine(d => d.sampai >= d.dari, { ... })
  .refine(d => { /* max 90 days */ }, { ... });

const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } =
  useForm<DateRangeFormData>({ resolver: zodResolver(dateRangeSchema) as any });
```

**Field registration + error display pattern** (InputManualForm.tsx lines 62–100):
```tsx
<input
  type="date"
  {...register("dari")}
  style={{ /* matches existing field styles */ }}
/>
{errors.dari && (
  <p style={{ color: "#e76f51", fontSize: 11 }}>{errors.dari.message}</p>
)}
```

**Preset button pattern** (LabTrendChart.tsx days-selector concept):
```tsx
{[
  { label: "7 hari", value: "7d" },
  { label: "30 hari", value: "30d" },
  { label: "3 bulan", value: "3m" },
].map((p) => (
  <button
    key={p.value}
    type="button"
    onClick={() => applyPreset(p.value)}
    style={{ backgroundColor: preset === p.value ? "#2a9d8f" : "#f0faf9", ... }}
  >
    {p.label}
  </button>
))}
```

---

### `frontend/components/laporan/LaporanPreviewContent.tsx` + `sections/*.tsx` (components — NEW)

**Analog:** `frontend/components/lab/LabResultList.tsx` (data display component)

**Component prop pattern** (LabTrendChart.tsx lines 40–48):
```typescript
interface LaporanPreviewContentProps {
  report: ReportData;
  catatan?: string;
  dari: string;
  sampai: string;
}

export default function LaporanPreviewContent({
  report, catatan, dari, sampai,
}: LaporanPreviewContentProps) { ... }
```

**Section card pattern** (must use literal className for print CSS targeting):
```tsx
<div className="laporan-section-card bg-white border rounded-xl p-4 mb-6">
  <h2 className="font-heading font-bold" style={{ fontSize: 14, color: "#1a2e2c" }}>
    Ringkasan Cairan
  </h2>
  {/* section content */}
</div>
```

**Empty state pattern** (LabResultList.tsx — "no data" state):
```tsx
{data.length === 0 && (
  <p style={{ color: "#7a8c8a", fontSize: 12 }}>Tidak ada data pada rentang ini.</p>
)}
```

**Anomaly placeholder section** (D-09):
```tsx
// sections/Anomali.tsx
export default function Anomali() {
  return (
    <div className="laporan-section-card bg-white border rounded-xl p-4 mb-6">
      <h2 className="font-heading font-bold" style={{ fontSize: 14, color: "#1a2e2c" }}>
        Anomali Terdeteksi
      </h2>
      <p style={{ color: "#7a8c8a", fontSize: 12, marginTop: 8 }}>
        Deteksi anomali akan tersedia setelah fitur AI diaktifkan.
      </p>
    </div>
  );
}
```

---

## Shared Patterns

### Authentication Middleware
**Source:** `backend/src/middleware/authenticate.ts` (full file, 39 lines)
**Apply to:** `report.routes.ts` — `router.get("/", authenticate, getReport)`
```typescript
// authenticate extracts JWT from Authorization: Bearer <token>
// sets req.user = { id: payload.sub }
// returns 401 JSON { error: { code: "UNAUTHORIZED" | "TOKEN_INVALID", message } } on failure
import { authenticate } from "../middleware/authenticate.js";
```

### authFetch (Frontend Token-Authenticated Fetch)
**Source:** `frontend/lib/api.ts` lines 73–99
**Apply to:** All frontend pages and components that call `/api/report` or `/api/reminders`
```typescript
import { authFetch } from "@/lib/api";
// Usage: authFetch<ResponseType>("/api/report?dari=X&sampai=Y", accessToken)
// Handles 401 → auto-refresh → retry
```

### Error Handling (Controller Layer)
**Source:** `backend/src/controllers/labResult.controller.ts` lines 19–30
**Apply to:** `report.controller.ts`
```typescript
export async function getReport(req, res, next): Promise<void> {
  try {
    // ... logic
  } catch (err) {
    next(err);   // Express 5: errors forwarded to errorHandler middleware
  }
}
```

### Sonner Toast
**Source:** `frontend/app/(app)/pengingat/page.tsx` line 8 + lines 24–27
**Apply to:** `pengingat/page.tsx` polling, `laporan/page.tsx` error states
```typescript
import { toast } from "sonner";
toast("Jadwal pengingat diperbarui dari perangkat lain.");   // info
toast.success("...");   // success variant
```

### IDOR Prevention (userId Filter)
**Source:** Every existing repository (pattern: `eq(table.userId, userId as any)`)
**Apply to:** `report.repository.ts` — all three query functions must include userId filter
```typescript
.where(and(
  eq(fluidLog.userId, userId as any),
  gte(fluidLog.tanggal, startDate),
  lte(fluidLog.tanggal, endDate),
))
```

### Print CSS Classes
**Source:** RESEARCH.md Pattern 5 (no existing analog — new pattern)
**Apply to:** `LaporanPreviewContent.tsx` and all `sections/*.tsx`
```css
/* In frontend/app/globals.css — add: */
@media print {
  .no-print { display: none !important; }
  .laporan-section-card { page-break-inside: avoid; border-left: 3px solid #2a9d8f !important; }
  .laporan-preview-content { font-size: 12pt; }
  @page { size: A4 portrait; margin: 20mm 15mm 20mm 15mm; }
}
```
**Critical:** Class names must be literal strings in JSX — never computed. Add `laporan-section-card`, `laporan-preview-content`, `no-print` to Tailwind safelist if needed.

---

## No Analog Found

All files have close analogs in the codebase. No files require falling back to RESEARCH.md patterns exclusively.

---

## Metadata

**Analog search scope:** `backend/src/controllers/`, `backend/src/services/`, `backend/src/repositories/`, `backend/src/routes/`, `backend/src/db/schema/`, `backend/src/test/`, `frontend/app/(app)/`, `frontend/components/lab/`, `frontend/lib/`
**Files scanned:** 14 source files
**Pattern extraction date:** 2026-06-29
