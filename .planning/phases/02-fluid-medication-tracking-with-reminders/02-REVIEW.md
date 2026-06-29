---
phase: 02-fluid-medication-tracking-with-reminders
reviewed: 2026-06-27T00:00:00Z
depth: quick
files_reviewed: 94
files_reviewed_list:
  - backend/package.json
  - backend/src/app.ts
  - backend/src/controllers/fluid.controller.ts
  - backend/src/controllers/medicationLog.controller.ts
  - backend/src/controllers/push.controller.ts
  - backend/src/controllers/reminders.controller.ts
  - backend/src/db/schema/fluidLog.schema.ts
  - backend/src/db/schema/index.ts
  - backend/src/db/schema/medicationLog.schema.ts
  - backend/src/db/schema/pushSubscriptions.schema.ts
  - backend/src/db/schema/reminderSchedule.schema.ts
  - backend/src/lib/encryption.ts
  - backend/src/lib/upload.ts
  - backend/src/lib/webPushClient.ts
  - backend/src/repositories/fluidLog.repository.ts
  - backend/src/repositories/medicationLog.repository.ts
  - backend/src/repositories/pushSubscription.repository.ts
  - backend/src/repositories/reminderSchedule.repository.ts
  - backend/src/routes/fluid.routes.ts
  - backend/src/routes/medicationLog.routes.ts
  - backend/src/routes/push.routes.ts
  - backend/src/routes/reminders.routes.ts
  - backend/src/services/fluid.service.ts
  - backend/src/services/medicationLog.service.ts
  - backend/src/services/notification.service.ts
  - backend/src/services/profile.service.ts
  - backend/src/services/push.service.ts
  - backend/src/services/reminders.service.ts
  - backend/src/test/encryption.test.ts
  - backend/src/test/fluid.service.test.ts
  - backend/src/test/notification.fanout.test.ts
  - backend/src/test/pushSubscription.test.ts
  - backend/src/test/reminders.service.test.ts
  - backend/src/test/therapyChange.reminders.test.ts
  - backend/src/jobs/reminderDispatch.job.ts
  - backend/src/jobs/scheduler.ts
  - frontend/app/(app)/catatan/obat/page.tsx
  - frontend/app/(app)/catatan/page.tsx
  - frontend/app/(app)/edukasi/page.tsx
  - frontend/app/(app)/layout.tsx
  - frontend/app/(app)/pengingat/page.tsx
  - frontend/app/(app)/profil/page.tsx
  - frontend/app/layout.tsx
  - frontend/app/manifest.ts
  - frontend/app/serwist/[path]/route.ts
  - frontend/app/sw.ts
  - frontend/components.json
  - frontend/components/beranda/AiPlaceholderCard.tsx
  - frontend/components/beranda/CAPDEffluentBanner.tsx
  - frontend/components/beranda/DeltaCairanCard.tsx
  - frontend/components/beranda/NoReminderBanner.tsx
  - frontend/components/beranda/ObatCard.tsx
  - frontend/components/beranda/PengingatBerikutnyaCard.tsx
  - frontend/components/cairan/CatatCairanForm.tsx
  - frontend/components/cairan/CatatCairanSheet.tsx
  - frontend/components/catatan/FluidLogItem.tsx
  - frontend/components/catatan/FluidLogList.tsx
  - frontend/components/catatan/MedicationLogItem.tsx
  - frontend/components/catatan/MedicationLogList.tsx
  - frontend/components/pengingat/AddReminderSheet.tsx
  - frontend/components/pengingat/CAPDReminderForm.tsx
  - frontend/components/pengingat/DeleteReminderConfirm.tsx
  - frontend/components/pengingat/HDReminderForm.tsx
  - frontend/components/pengingat/MedicationReminderForm.tsx
  - frontend/components/pengingat/ReminderItem.tsx
  - frontend/components/pengingat/ReminderList.tsx
  - frontend/components/push/InstallPrompt.tsx
  - frontend/components/push/NotificationPermissionBanner.tsx
  - frontend/components/shell/AppShell.tsx
  - frontend/components/shell/BottomNav.tsx
  - frontend/components/shell/FAB.tsx
  - frontend/components/shell/MobileHeader.tsx
  - frontend/components/shell/Sidebar.tsx
  - frontend/components/shell/TopBar.tsx
  - frontend/components/ui/alert-dialog.tsx
  - frontend/components/ui/avatar.tsx
  - frontend/components/ui/badge.tsx
  - frontend/components/ui/button.tsx
  - frontend/components/ui/checkbox.tsx
  - frontend/components/ui/dialog.tsx
  - frontend/components/ui/form.tsx
  - frontend/components/ui/input.tsx
  - frontend/components/ui/label.tsx
  - frontend/components/ui/scroll-area.tsx
  - frontend/components/ui/select.tsx
  - frontend/components/ui/separator.tsx
  - frontend/components/ui/sheet.tsx
  - frontend/components/ui/sonner.tsx
  - frontend/components/ui/switch.tsx
  - frontend/components/ui/tabs.tsx
  - frontend/components/ui/toggle.tsx
  - frontend/lib/nav.ts
  - frontend/lib/offlineQueue.ts
  - frontend/lib/pushClient.ts
  - frontend/lib/pwaDetection.ts
  - frontend/lib/utils.ts
  - frontend/lib/validators/fluid.schema.ts
  - frontend/lib/validators/reminder.schema.ts
  - frontend/next.config.ts
  - frontend/package.json
findings:
  critical: 4
  warning: 8
  info: 3
  total: 15
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-06-27T00:00:00Z
**Depth:** quick
**Files Reviewed:** 94
**Status:** issues_found

## Summary

Phase 02 implements the core fluid tracking, medication reminder, and push notification verticals. The architecture is well-structured — AES-256-GCM encryption, injectable service cores for testing, Zod validation at both layers, and 410-aware push fan-out are all implemented correctly.

However, four blockers prevent the shipped code from working end-to-end in production:

1. The service worker's notification-confirm fetch targets a relative URL (`/api/medication-log/confirm`) that resolves to the Vercel frontend origin, not the Railway/Render backend — all push-triggered dose confirmations silently fail.
2. The reminder dispatch scheduler uses `new Date().getHours()` (UTC on cloud servers) to compare against user-entered WIB times — reminders fire 7 hours wrong for every Jakarta patient.
3. The medication reminder creation form appends `hariAktif[]` (bracket notation) to FormData, but multer/busboy preserves brackets verbatim, so `req.body.hariAktif` is always `undefined` on the backend — every medication reminder POST fails Zod validation.
4. Both `ObatCard` and `MedicationLogItem` read a `reminderNama` field that the API never returns (the schema column is `namaObat`) — all medication names display as `undefined` in the dashboard and log.

These four issues together mean the reminder-confirmation flow is broken end-to-end in production.

---

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Service worker `notificationclick` POSTs to relative URL — always hits Vercel, never the backend

**File:** `frontend/app/sw.ts:108`

**Issue:** The `notificationclick` handler sends the "Sudah diminum" dose confirmation to:
```javascript
fetch("/api/medication-log/confirm", { credentials: "include", ... })
```
A relative URL in the service worker resolves to the service worker's own origin — the Vercel frontend deployment (`https://kidneybuddy.vercel.app/api/medication-log/confirm`). The Express backend lives on a different domain (Railway/Render). Next.js has no `/api/medication-log/confirm` route, so this returns 404 every time.

Additionally, even if the URL were correct, the fetch uses only `credentials: "include"` (sends the httpOnly refresh-token cookie), but the authenticate middleware checks for a Bearer token. The in-memory access token is unreachable from the service worker. The request would return 401 even if the URL were right.

This means every "Sudah diminum" tap from a push notification silently fails. The patient believes they confirmed the dose but the backend never records it — the reminder follow-up cron will later mark it as "terlewat".

**Fix:** Inject the backend base URL into the service worker via esbuild's `define` option, and include a pre-fetched token from IndexedDB or pass a short-lived confirmation token in the notification payload:
```typescript
// In app/serwist/[path]/route.ts — add define to inject the API URL
export const { GET } = createSerwistRoute({
  swSrc: path.join(process.cwd(), "app/sw.ts"),
  useNativeEsbuild: true,
  // esbuildOptions: { define: { "process.env.NEXT_PUBLIC_API_URL": JSON.stringify(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000") } },
});
```
```typescript
// In app/sw.ts — use the injected absolute URL:
declare const process: { env: { NEXT_PUBLIC_API_URL: string } };
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// In the handler:
fetch(`${API_BASE}/api/medication-log/confirm`, { ... })
```
For authentication, the cleanest solution at this layer is to include a `confirmToken` (short-lived, single-use JWT scoped to this reminderId) in the push payload and verify it server-side without requiring a session cookie.

---

### CR-02: UTC vs. Jakarta timezone mismatch breaks all reminder dispatch

**Files:** `backend/src/jobs/reminderDispatch.job.ts:26-28`, `backend/src/repositories/reminderSchedule.repository.ts:60-64`

**Issue:** The reminder dispatch cron uses `new Date().getHours()` and `new Date().getDay()` to determine the current HH:mm and day name:
```typescript
// reminderDispatch.job.ts
export function currentHHmm(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}
export function currentDayName(): string {
  return INDONESIAN_DAYS[new Date().getDay()];  // getDay() is UTC
}
```
On Railway/Render, `process.env.TZ` is `UTC` by default. `new Date().getHours()` returns UTC hours. A patient in Jakarta (WIB = UTC+7) who sets a reminder for `08:00` expects it to fire at 08:00 local time — but the cron fires when UTC clock shows 08:00, which is 15:00 WIB. Reminders are consistently 7 hours late.

The same problem affects `findNextUpcoming` in `reminderSchedule.repository.ts` (lines 60-63), which determines "next upcoming" by comparing `now.getHours()` in UTC against stored WIB times.

**Fix:** Force Jakarta timezone consistently. Either set `process.env.TZ = "Asia/Jakarta"` in server startup before any `new Date()` calls, or use an explicit WIB offset:
```typescript
export function currentHHmm(): string {
  // Jakarta is UTC+7 — always fixed offset, no DST
  const jakartaMs = Date.now() + 7 * 60 * 60 * 1000;
  const now = new Date(jakartaMs);
  return `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
}
export function currentDayName(): string {
  const jakartaMs = Date.now() + 7 * 60 * 60 * 1000;
  return INDONESIAN_DAYS[new Date(jakartaMs).getUTCDay()];
}
```
Apply the same fix to `findNextUpcoming` in `reminderSchedule.repository.ts`. Also add `TZ=Asia/Jakarta` to the Docker/Railway environment variables as a safety net.

---

### CR-03: `MedicationReminderForm` sends `hariAktif[]` — multer never maps brackets to `hariAktif`

**File:** `frontend/components/pengingat/MedicationReminderForm.tsx:80`

**Issue:** The medication reminder form builds a `FormData` for the multipart upload and appends each active day as:
```javascript
data.hariAktif.forEach((day) => fd.append("hariAktif[]", day));
```
PHP and some frameworks strip the `[]` suffix from field names automatically. Express + multer/busboy does not — the field name in `req.body` is literally `"hariAktif[]"` (with brackets), not `"hariAktif"`. The reminders controller then does `{ ...req.body, fotoObat }` and passes to `createObatSchema.parse(...)`, which expects a field named `hariAktif`. Because `req.body.hariAktif` is `undefined`, Zod throws "Pilih minimal satu hari aktif" and every medication reminder creation fails with a 400 error, regardless of whether the user selected days.

CAPD and HD forms are unaffected because they use `authFetch` with `JSON.stringify()` (regular JSON, not FormData), so their `hariAktif` field is correctly named.

**Fix:** Remove the brackets:
```javascript
// MedicationReminderForm.tsx line 80 — change to:
data.hariAktif.forEach((day) => fd.append("hariAktif", day));
```
When the same field name is appended multiple times, Express/multer collects them into an array at `req.body.hariAktif`. No other change needed — the Zod schema already expects `z.array(z.string())`.

---

### CR-04: `ObatCard` and `MedicationLogItem` read `reminderNama` — API returns `namaObat`

**Files:** `frontend/components/beranda/ObatCard.tsx:184`, `frontend/components/catatan/MedicationLogItem.tsx:100`

**Issue:** The `medication_log` table has a column named `nama_obat` (Drizzle maps this to `namaObat` in TypeScript). The backend controller returns these rows directly via `res.json(logs)` with no field remapping. The frontend TypeScript interfaces, however, declare the field as `reminderNama`:

```typescript
// ObatCard.tsx
interface MedicationEntry {
  reminderNama: string;  // ← doesn't exist in API response
  ...
}
// Renders: {entry.reminderNama}  → always undefined

// MedicationLogItem.tsx
export interface MedicationLog {
  reminderNama: string;  // ← same mismatch
  ...
}
// Renders: {log.reminderNama}  → always undefined
```
Every medication name in the "Obat Hari Ini" dashboard card and the Catatan/Obat log renders as blank. TypeScript didn't catch this because the components cast the API response directly to their local interface types without validation.

**Fix:** Rename the field in the frontend interfaces to match the API:
```typescript
// ObatCard.tsx and MedicationLogItem.tsx — rename field:
interface MedicationEntry {
  namaObat: string;   // matches API's namaObat
  ...
}
// Update all references from .reminderNama → .namaObat
```
Also update `MedicationLogList.tsx` which passes `MedicationLog[]` from the API into `MedicationLogItem` — the `handleConfirm` optimistic update at line 62 (`log.reminderId === reminderId`) is correct, but the rendered name would be blank until this fix.

---

## Warnings

### WR-01: `findActiveByUser` loads all push subscriptions (including inactive) in JS instead of SQL

**File:** `backend/src/repositories/pushSubscription.repository.ts:60-65`

**Issue:**
```typescript
export async function findActiveByUser(userId: string): Promise<PushSubscription[]> {
  return db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId as any))
    .then((rows) => rows.filter((r) => r.aktif === true));  // JS filter on full set
}
```
This fetches all rows for the user (including deactivated historical ones) and then filters in JavaScript. A user who has gone through multiple browser re-subscriptions and 410 deactivations accumulates dead rows that get transferred over the wire on every notification fan-out.

**Fix:** Add the active filter to the SQL WHERE clause:
```typescript
.where(and(
  eq(pushSubscriptions.userId, userId as any),
  eq(pushSubscriptions.aktif, true),
))
```

---

### WR-02: `MedicationLogList` optimistic confirm has no error revert

**File:** `frontend/components/catatan/MedicationLogList.tsx:55-72`

**Issue:** `handleConfirm` optimistically sets status to `"dikonfirmasi"` before the API call, but the `catch` block is empty:
```typescript
const handleConfirm = async (reminderId: string) => {
  try {
    await authFetch("/api/medication-log/confirm", ...);
    setLogs((prev) => prev.map((log) =>
      log.reminderId === reminderId ? { ...log, status: "dikonfirmasi" } : log
    ));
  } catch {
    // Silently fail — user can retry
  }
};
```
Wait — actually the optimistic update is applied *before* the `await`, in the same `try` block (not before the try). Looking at the code again: the `setLogs` call at line 62 updates status immediately. If the API call fails, there is no `setLogs` reverting back to `"tertunda"`. The UI shows the dose as taken while the backend still has it as pending. The follow-up cron will later fire a "did you take it?" notification contradicting what the UI shows.

**Fix:** Move the optimistic update before the API call and revert on catch:
```typescript
const handleConfirm = async (reminderId: string) => {
  // Optimistic update
  setLogs((prev) => prev.map((log) =>
    log.reminderId === reminderId ? { ...log, status: "dikonfirmasi" } : log
  ));
  try {
    await authFetch("/api/medication-log/confirm", accessToken, {
      method: "POST",
      body: JSON.stringify({ reminderId }),
    });
  } catch {
    // Revert on error
    setLogs((prev) => prev.map((log) =>
      log.reminderId === reminderId ? { ...log, status: "tertunda" } : log
    ));
  }
};
```

---

### WR-03: `CAPDReminderForm` and `HDReminderForm` errors swallowed silently by react-hook-form

**Files:** `frontend/components/pengingat/CAPDReminderForm.tsx:63-73`, `frontend/components/pengingat/HDReminderForm.tsx:61-70`

**Issue:** Both CAPD and HD forms call `authFetch` directly inside the react-hook-form `onSubmit` handler with no error handling:
```typescript
// CAPDReminderForm.tsx
const onSubmit: SubmitHandler<CreateCapdFormData> = async (data) => {
  await authFetch("/api/reminders", accessToken, { method: "POST", body: JSON.stringify({...data}) });
  reset();
  onSuccess?.();
  // ↑ if authFetch throws (network error, 4xx, 5xx), exception propagates to handleSubmit
};
```
react-hook-form's `handleSubmit` wraps the `onSubmit` callback in a try-catch and silently discards exceptions — it does not re-throw or expose them to the caller. When the backend returns an error (e.g., validation failure, 500), the form does nothing: `isSubmitting` returns to `false`, no error is displayed, no toast is shown. The patient has no indication that the reminder was not saved.

The same issue exists in `MedicationReminderForm.tsx` (the `throw new Error(msg)` on line 97 is also swallowed by `handleSubmit`).

**Fix:** Wrap the API call in a try-catch inside `onSubmit` and surface errors via toast:
```typescript
import { toast } from "sonner";

const onSubmit: SubmitHandler<CreateCapdFormData> = async (data) => {
  try {
    await authFetch("/api/reminders", accessToken, {
      method: "POST",
      body: JSON.stringify({ ...data, jenis: "capd" }),
    });
    reset();
    onSuccess?.();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Gagal menyimpan pengingat");
  }
};
```

---

### WR-04: `reminderSchedule` schema: `aktif` and `hariAktif` columns are nullable despite having defaults

**File:** `backend/src/db/schema/reminderSchedule.schema.ts:12-13`

**Issue:**
```typescript
hariAktif: jsonb("hari_aktif").default([]),
aktif: boolean("aktif").default(true),
```
Neither column has `.notNull()`. In Postgres, a column with a DEFAULT is still nullable unless constrained with NOT NULL. If a row is somehow inserted with NULL for `aktif` (e.g., via direct DB manipulation or a migration issue), `eq(reminderSchedule.aktif, true)` in Postgres evaluates to `null` (not `true`) for that row — the reminder silently never dispatches. Same issue for `hariAktif`: a NULL JSONB column causes `NULL @> '[...]'::jsonb` to evaluate to NULL, not false, which also silently excludes the row from dispatch.

**Fix:** Add `.notNull()` to both columns:
```typescript
hariAktif: jsonb("hari_aktif").notNull().default([]),
aktif: boolean("aktif").notNull().default(true),
```
Then generate and apply a migration to add the NOT NULL constraint with backfill (`UPDATE reminder_schedule SET aktif = true WHERE aktif IS NULL`).

---

### WR-05: `upload.ts` uses `Math.random()` for filename generation — collision possible under concurrent load

**File:** `backend/src/lib/upload.ts:29`

**Issue:**
```typescript
const timestamp = Date.now();
const rand = Math.random().toString(36).slice(2, 8);
const ext = path.extname(file.originalname).toLowerCase();
cb(null, `${timestamp}-${rand}${ext}`);
```
`Math.random()` is not cryptographically secure. More critically, if two upload requests arrive within the same millisecond (realistic under moderate load), both share the same `timestamp`. With only 6 characters of base-36 random (`~2 billion` combinations), collision probability across the entire upload history grows non-trivially. A collision silently overwrites the first patient's medication photo with the second's.

**Fix:** Use `crypto.randomBytes` which is already imported in the project context:
```typescript
import { randomBytes } from "node:crypto";
// ...
const rand = randomBytes(8).toString("hex"); // 16 hex chars
cb(null, `${timestamp}-${rand}${ext}`);
```

---

### WR-06: CAPD acknowledgment audit log uses `console.log` instead of pino

**File:** `backend/src/controllers/fluid.controller.ts:70-72`

**Issue:**
```typescript
console.log(
  `[CAPD-ACK] userId=${userId} acknowledgedAt=${acknowledgedAt} ip=${req.ip}`,
);
```
The rest of the backend uses pino structured logging. `console.log` writes unstructured plain text that cannot be searched by JSON field in Railway/Render log aggregators. The audit record for a safety-critical CAPD anomaly acknowledgment (T-02-04-05) is the one log line that most needs to be reliably queryable by `userId` and timestamp.

**Fix:**
```typescript
import pino from "pino";
const logger = pino({ name: "fluid.controller" });

// In acknowledgeAbnormal:
logger.info(
  { userId, acknowledgedAt, ip: req.ip },
  "CAPD effluent anomaly acknowledged",
);
```

---

### WR-07: `findTodayByUser` uses server local time (UTC) for midnight boundary — wrong for Jakarta patients

**File:** `backend/src/repositories/medicationLog.repository.ts:23-26`

**Issue:**
```typescript
const today = new Date();
const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
```
`new Date()` in a UTC process gives UTC midnight, not Jakarta midnight. Medications dispatched after 17:00 UTC (midnight WIB, beginning of the next calendar day in Jakarta) are on a different UTC calendar date, so they don't appear in the "today" query for the new Jakarta day. Patients would see yesterday's midnight dose missing from today's log until 17:00 UTC (the next UTC midnight).

**Fix:** Apply the same WIB offset approach as CR-02:
```typescript
const jakartaMs = Date.now() + 7 * 60 * 60 * 1000;
const wib = new Date(jakartaMs);
const startUTC = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate(), 0, 0, 0, 0) - 7 * 3600 * 1000);
const endUTC = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate(), 23, 59, 59, 999) - 7 * 3600 * 1000);
```
Or alternatively, set `TZ=Asia/Jakarta` in the process environment (see CR-02 fix note).

---

### WR-08: `date` query parameter in fluid endpoints has no format validation

**Files:** `backend/src/controllers/fluid.controller.ts:41-43`, `backend/src/controllers/fluid.controller.ts:91-93`

**Issue:** Both `getDailyBalance` and `list` pass `req.query.date` straight to the service without validating the `YYYY-MM-DD` format:
```typescript
const date =
  typeof req.query.date === "string"
    ? req.query.date
    : new Date().toISOString().slice(0, 10);
```
An attacker or misconfigured client passing `date=not-a-date` or `date=2024-01-01; --` gets a silently empty response (Drizzle parameterizes the comparison, so no injection risk, but the caller receives `{ date: "not-a-date", entries: [] }` with no indication of the error). The `getDailyBalance` endpoint also silently returns zeros.

**Fix:** Add a regex check and return 400 on invalid format:
```typescript
const dateParam = typeof req.query.date === "string" ? req.query.date : null;
if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
  res.status(400).json({ code: "INVALID_DATE", message: "Format tanggal harus YYYY-MM-DD" });
  return;
}
const date = dateParam ?? new Date().toISOString().slice(0, 10);
```

---

## Info

### IN-01: `reminderDispatch.job.ts` inserts `medication_log` rows for CAPD and HD reminders

**File:** `backend/src/jobs/reminderDispatch.job.ts:52-61`

**Issue:** `_dispatchCore` iterates over all due reminders (obat, capd, hd) and inserts a `medication_log` row for each one without filtering by `jenis`:
```typescript
await deps.insertLog({
  userId: reminder.userId,
  reminderId: reminder.id,
  namaObat: reminder.nama,   // e.g., "Exchange CAPD pagi"
  status: "tertunda",
  ...
});
```
CAPD exchange sessions and HD dialysis sessions get stored as `medication_log` entries with `namaObat = "Exchange CAPD pagi"`. These then appear in `getTodayLogs` → `GET /api/medication-log/today` → ObatCard "Obat Hari Ini" alongside actual medications. Patients would see their dialysis sessions listed as pills to confirm.

**Suggested fix:** Guard the log insertion to obat reminders only:
```typescript
if (reminder.jenis === "obat") {
  await deps.insertLog({ ... });
}
```
For CAPD/HD, the push notification should still fire (to remind the patient) but no medication_log row should be created.

---

### IN-02: `loadKey()` validates hex string length but not hex-character validity

**File:** `backend/src/lib/encryption.ts:31-36`

**Issue:** The startup key validation checks `raw.length !== 64` but not whether all 64 characters are valid hex digits (0-9, a-f/A-F). A 64-character key with non-hex characters (e.g., `Z` characters) would pass the length check, then `Buffer.from(raw, "hex")` would silently ignore invalid characters, producing a shorter-than-32-byte buffer. `createCipheriv("aes-256-gcm", KEY, iv)` would then throw at the first encryption call (rather than at startup), surfacing a confusing OpenSSL error instead of a clear configuration message.

**Suggested fix:** Add a hex pattern check alongside the length check:
```typescript
if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
  throw new Error(
    `[encryption] ENCRYPTION_KEY must be exactly 64 valid hex characters (0-9, a-f). Got invalid characters.`
  );
}
```

---

### IN-03: `profil/page.tsx` calls `refreshAccessToken()` in both the normal path and the 401 retry path

**File:** `frontend/app/(app)/profil/page.tsx:44-60`

**Issue:**
```typescript
const fetchProfile = useCallback(async () => {
  let token = accessToken;
  const refreshed = await refreshAccessToken();  // ← always called first
  if (refreshed) token = refreshed;
  const data = await authFetch<ProfileData>("/api/auth/me", token);
  // ...
  } catch (err: any) {
    if (err?.status === 401) {
      const retryToken = await refreshAccessToken();  // ← called again on 401
```
`refreshAccessToken()` is called unconditionally at the start of every `fetchProfile` invocation, and then called again if the profile fetch returns 401. If a refresh token rotation scheme is in use, the first `refreshAccessToken()` call rotates the token and invalidates the old refresh cookie. When the profile fetch subsequently returns 401, the second `refreshAccessToken()` call uses the new (already rotated) cookie — which works, but the unconditional first call was wasteful and could cause unexpected behavior with single-use refresh tokens.

**Suggested fix:** Remove the pre-emptive refresh at the top of `fetchProfile`; only refresh reactively on 401:
```typescript
const fetchProfile = useCallback(async () => {
  if (!accessToken) return;
  try {
    const data = await authFetch<ProfileData>("/api/auth/me", accessToken);
    setProfile(data);
  } catch (err: any) {
    if (err?.status === 401) {
      const retryToken = await refreshAccessToken();
      if (retryToken) {
        const data = await authFetch<ProfileData>("/api/auth/me", retryToken);
        setProfile(data);
      } else {
        router.replace("/login");
      }
    } else {
      setError(err.message);
    }
  }
}, [accessToken, refreshAccessToken, router]);
```

---

_Reviewed: 2026-06-27T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
