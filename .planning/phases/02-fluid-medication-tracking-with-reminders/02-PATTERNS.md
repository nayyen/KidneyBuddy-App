# Phase 2: Fluid & Medication Tracking with Reminders - Pattern Map

**Mapped:** 2026-06-26
**Files analyzed:** 32 new/modified files
**Analogs found:** 28 / 32

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/src/db/schema/fluidLog.schema.ts` | schema | CRUD | `backend/src/db/schema/reminderSchedule.schema.ts` | exact |
| `backend/src/db/schema/medicationLog.schema.ts` | schema | CRUD | `backend/src/db/schema/loginAttempts.schema.ts` | role-match |
| `backend/src/db/schema/pushSubscriptions.schema.ts` | schema | CRUD | `backend/src/db/schema/refreshTokens.schema.ts` | role-match |
| `backend/src/db/schema/reminderSchedule.schema.ts` | schema | CRUD (extend) | itself | exact |
| `backend/src/db/schema/index.ts` | config | — | itself | exact |
| `backend/src/repositories/fluidLog.repository.ts` | repository | CRUD | `backend/src/repositories/user.repository.ts` | exact |
| `backend/src/repositories/medicationLog.repository.ts` | repository | CRUD | `backend/src/repositories/user.repository.ts` | exact |
| `backend/src/repositories/pushSubscription.repository.ts` | repository | CRUD | `backend/src/repositories/refreshToken.repository.ts` | role-match |
| `backend/src/repositories/reminderSchedule.repository.ts` | repository | CRUD (extend) | itself | exact |
| `backend/src/services/fluid.service.ts` | service | CRUD + transform | `backend/src/services/auth.service.ts` | role-match |
| `backend/src/services/medicationLog.service.ts` | service | CRUD | `backend/src/services/onboarding.service.ts` | role-match |
| `backend/src/services/reminders.service.ts` | service | CRUD | `backend/src/services/onboarding.service.ts` | role-match |
| `backend/src/services/notification.service.ts` | service | event-driven | none | no analog |
| `backend/src/services/push.service.ts` | service | CRUD | `backend/src/services/auth.service.ts` | role-match |
| `backend/src/controllers/fluid.controller.ts` | controller | request-response | `backend/src/controllers/onboarding.controller.ts` | exact |
| `backend/src/controllers/medicationLog.controller.ts` | controller | request-response | `backend/src/controllers/onboarding.controller.ts` | exact |
| `backend/src/controllers/reminders.controller.ts` | controller | request-response | `backend/src/controllers/onboarding.controller.ts` | exact |
| `backend/src/controllers/push.controller.ts` | controller | request-response | `backend/src/controllers/auth.controller.ts` | role-match |
| `backend/src/routes/fluid.routes.ts` | route | request-response | `backend/src/routes/auth.routes.ts` | exact |
| `backend/src/routes/medicationLog.routes.ts` | route | request-response | `backend/src/routes/auth.routes.ts` | exact |
| `backend/src/routes/reminders.routes.ts` | route | request-response | `backend/src/routes/auth.routes.ts` | exact |
| `backend/src/routes/push.routes.ts` | route | request-response | `backend/src/routes/auth.routes.ts` | exact |
| `backend/src/lib/encryption.ts` | utility | transform | none | no analog |
| `backend/src/lib/webPushClient.ts` | utility | event-driven | none | no analog |
| `backend/src/jobs/scheduler.ts` | config | event-driven | none | no analog |
| `backend/src/jobs/reminderDispatch.job.ts` | service | event-driven | none | no analog |
| `backend/src/jobs/reminderFollowUp.job.ts` | service | event-driven | none | no analog |
| `backend/src/app.ts` | config (extend) | — | itself | exact |
| `backend/src/server.ts` | config (extend) | — | itself | exact |
| `frontend/app/layout.tsx` | config (extend) | — | itself | exact |
| `frontend/app/manifest.ts` | config | — | none | no analog |
| `frontend/app/sw.ts` | config | event-driven | none | no analog |
| `frontend/next.config.ts` | config (extend) | — | none | no analog |
| `frontend/components/shell/AppShell.tsx` | component | request-response | `frontend/app/dashboard/page.tsx` | partial |
| `frontend/components/shell/BottomNav.tsx` | component | request-response | none | no analog |
| `frontend/components/shell/Sidebar.tsx` | component | request-response | none | no analog |
| `frontend/components/shell/FAB.tsx` | component | request-response | none | no analog |
| `frontend/components/shell/TopBar.tsx` | component | request-response | none | no analog |
| `frontend/components/beranda/DeltaCairanCard.tsx` | component | request-response | `frontend/app/dashboard/page.tsx` | partial |
| `frontend/components/beranda/CAPDEffluentBanner.tsx` | component | request-response | `frontend/app/dashboard/page.tsx` | partial |
| `frontend/components/cairan/CatatCairanForm.tsx` | component | CRUD | `frontend/app/onboarding/_components/FirstReminderStep.tsx` | exact |
| `frontend/components/push/InstallPrompt.tsx` | component | request-response | none | no analog |
| `frontend/app/dashboard/page.tsx` | frontend-page (modify) | request-response | itself | exact |
| `frontend/app/catatan/page.tsx` | frontend-page | request-response | `frontend/app/dashboard/page.tsx` | role-match |
| `frontend/app/pengingat/page.tsx` | frontend-page | CRUD | `frontend/app/dashboard/page.tsx` | role-match |
| `frontend/app/edukasi/page.tsx` | frontend-page | — | `frontend/app/dashboard/page.tsx` | role-match |
| `frontend/lib/pushClient.ts` | utility | event-driven | `frontend/lib/api.ts` | partial |
| `frontend/lib/offlineQueue.ts` | utility | event-driven | none | no analog |

---

## Pattern Assignments

### `backend/src/db/schema/fluidLog.schema.ts` (schema, CRUD)

**Analog:** `backend/src/db/schema/reminderSchedule.schema.ts`

**Core schema pattern** (lines 1-16 of analog):
```typescript
import { pgTable, uuid, text, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const reminderSchedule = pgTable("reminder_schedule", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.userId, { onDelete: "cascade" }),
  jenis: text("jenis").notNull(),
  nama: text("nama").notNull(),
  jamPengingat: text("jam_pengingat").notNull(),
  hariAktif: jsonb("hari_aktif").default([]),
  catatanWaktu: text("catatan_waktu"),
  aktif: boolean("aktif").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

**Phase 2 additions:** Add `numeric` import for `volume` column. Add index via second arg like `loginAttempts.schema.ts`. Use `text("tanggal")` for date strings (timezone-safe per RESEARCH.md Pattern 6). The `catatan` column must be TEXT (stores AES-256-GCM ciphertext after encryption in service layer — never encrypt here in schema).

---

### `backend/src/db/schema/medicationLog.schema.ts` (schema, CRUD)

**Analog:** `backend/src/db/schema/loginAttempts.schema.ts`

**Index pattern** (lines 1-26 of analog):
```typescript
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    succeeded: boolean("succeeded").notNull(),
    attemptedAt: timestamp("attempted_at").notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("idx_login_attempts_email").on(table.email),
    emailTimeIdx: index("idx_login_attempts_email_time").on(
      table.email,
      table.attemptedAt,
    ),
  }),
);
```

**Phase 2 additions:** Use index on `(user_id, waktu_pengingat)` for follow-up query. `status` column uses text for `'tertunda' | 'dikonfirmasi' | 'terlewat'` enum values. Add FK to `reminder_schedule.id` for linking.

---

### `backend/src/db/schema/pushSubscriptions.schema.ts` (schema, CRUD)

**Analog:** `backend/src/db/schema/reminderSchedule.schema.ts` (FK pattern to users)

Use `jsonb` for `subscription_object` (same as `hariAktif` jsonb usage in analog). Use `.unique()` on `endpoint` column (not on `userId` — per-device, not per-user). See RESEARCH.md Pattern 2 for full column set.

**Phase 2 additions:** `endpoint: text("endpoint").notNull().unique()` — this is the critical constraint. `subscriptionObject: jsonb("subscription_object").$type<PushSubscriptionJSON>().notNull()`.

---

### `backend/src/db/schema/reminderSchedule.schema.ts` (schema, extend)

**This is a migration, not a rewrite.** The existing file adds columns by modifying the Drizzle schema definition. The new TypeScript columns map to `ALTER TABLE` SQL.

**Existing file** (`backend/src/db/schema/reminderSchedule.schema.ts`, lines 1-16) — already read above.

**Phase 2 additions to schema object:**
```typescript
// Add these columns to the existing pgTable definition:
dosis: text("dosis"),
jenisObat: text("jenis_obat"),          // 'minum' | 'suntik' | null
fotoObat: text("foto_obat"),            // file path, nullable
konsentrasiCapd: text("konsentrasi_capd"),
followUpSent: boolean("follow_up_sent").notNull().default(false),
lastNotificationSentAt: timestamp("last_notification_sent_at"),
```

**CRITICAL:** After editing the schema file, run `drizzle-kit generate` and **verify the output SQL uses `ALTER TABLE ... ADD COLUMN`**, not `DROP TABLE`. Never run unreviewed migration SQL on this table.

---

### `backend/src/repositories/fluidLog.repository.ts` (repository, CRUD)

**Analog:** `backend/src/repositories/user.repository.ts`

**Core repository pattern** (lines 1-30 of analog):
```typescript
import { eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { users } from "../db/schema/users.schema.js";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export async function insertUser(data: NewUser): Promise<User> {
  const [row] = await db.insert(users).values(data).returning();
  return row;
}

export async function findByEmail(email: string): Promise<User | undefined> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return row;
}

export async function findById(userId: string): Promise<User | undefined> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.userId, userId as any))
    .limit(1);
  return row;
}
```

**Phase 2 additions:** Add `getDailyBalance(userId, date)` function using `and(eq(...userId), eq(...tanggal))`. Add `findByDate(userId, date)` for list view. Import `and`, `sql` from `drizzle-orm` for the balance aggregation. All functions filter by `userId` — never expose other users' data.

---

### `backend/src/repositories/pushSubscription.repository.ts` (repository, CRUD)

**Analog:** `backend/src/repositories/user.repository.ts`

Same InferInsertModel/InferSelectModel pattern. Key function: `upsertByEndpoint` — uses Drizzle's `.onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { subscriptionObject: ..., aktif: true, lastConfirmedAt: new Date() } })`.

---

### `backend/src/services/fluid.service.ts` (service, CRUD + transform)

**Analog:** `backend/src/services/auth.service.ts`

**Zod schema + parse + repo call pattern** (lines 1-52 of analog):
```typescript
import { z } from "zod";
import { AppError } from "../middleware/errorHandler.js";
import * as userRepository from "../repositories/user.repository.js";

export const registerSchema = z.object({
  namaLengkap: z.string().min(1, "Nama lengkap wajib diisi"),
  email: z.string().email("Format email tidak valid"),
  // ...
});

export async function register(payload: RegisterPayload) {
  const parsed = registerSchema.parse(payload);      // throws ZodError → caught by errorHandler
  const existing = await userRepository.findByEmail(parsed.email);
  if (existing) {
    throw new AppError(409, "EMAIL_EXISTS", "Email sudah terdaftar");
  }
  // ...
}
```

**Phase 2 additions:** Import `encrypt` from `../lib/encryption.js` — call `encrypt(parsed.catatan)` before passing to repository. Add CAPD condition rule: if `kondisiKeluar === 'keruh' || 'keruh_gumpalan' || 'berdarah'`, set `hasAbnormalCondition: true` in response. Daily balance calculation delegated to `fluidLog.repository.ts`.

---

### `backend/src/controllers/fluid.controller.ts` (controller, request-response)

**Analog:** `backend/src/controllers/onboarding.controller.ts`

**Thin controller pattern** (lines 1-15 of analog):
```typescript
import type { Request, Response, NextFunction } from "express";
import * as onboardingService from "../services/onboarding.service.js";

export async function getProgress(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const progress = await onboardingService.getProgress(req.user!.id);
    res.json(progress);
  } catch (err) {
    next(err);
  }
}
```

**Pattern rules:**
- Controller does zero business logic — only parse `req.body` / `req.query`, call service, call `res.json()` or `next(err)`.
- Use `req.user!.id` (set by `authenticate` middleware) for the current user's ID.
- Express 5: async errors auto-propagate to `next` without try/catch IF thrown directly, but the try/catch pattern shown here is still clearest — keep it.

---

### `backend/src/routes/fluid.routes.ts` (route, request-response)

**Analog:** `backend/src/routes/auth.routes.ts`

**Route pattern** (full file):
```typescript
import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// Public routes
router.post("/register", authController.register);

// Authenticated routes
router.get("/me", authenticate, authController.me);

export default router;
```

**Phase 2 additions:** ALL Phase 2 routes are authenticated — apply `authenticate` middleware to every route. Pattern: `router.get("/", authenticate, fluidController.list)`. Mount in `app.ts` as `app.use("/api/fluid", fluidRoutes)`.

---

### `backend/src/app.ts` (config, extend)

**Analog:** itself (lines 1-35 already read)

**Mount pattern:**
```typescript
app.use("/api/auth", authRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/profile", profileRoutes);
```

**Phase 2 additions:** Add `import helmet from "helmet"` and `app.use(helmet())` BEFORE route registration (after cors/cookieParser). Add four new mounts:
```typescript
app.use("/api/fluid", fluidRoutes);
app.use("/api/medication-log", medicationLogRoutes);
app.use("/api/reminders", remindersRoutes);
app.use("/api/push", pushRoutes);
```
Also add multer error handler before `app.use(errorHandler)` since multer throws its own error type.

---

### `backend/src/server.ts` (config, extend)

**Analog:** itself (lines 1-8 already read)

**Phase 2 additions:** Import and call `startScheduler()` after `app.listen()`:
```typescript
import { startScheduler } from "./jobs/scheduler.js";

app.listen(PORT, () => {
  console.log(`KidneyBuddy backend listening on port ${PORT}`);
  startScheduler(); // Start cron jobs after server is up
});
```

---

### `frontend/app/layout.tsx` (config, extend)

**Analog:** itself (lines 1-49 already read)

**Current pattern:**
```typescript
export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} ${dmSans.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
```

**Phase 2 additions:** Add `SerwistProvider` from `@serwist/turbopack/react` wrapping `{children}`. Auth pages already use `(auth)/` route group — create `(app)/layout.tsx` to house `AppShell` for authenticated pages instead of modifying root layout conditionally. Root layout stays clean (no `usePathname()`).

---

### `frontend/app/dashboard/page.tsx` (frontend-page, modify)

**Analog:** itself (full file already read)

**Patterns to keep:**
- `"use client"` directive
- `useAuth()` hook for auth state + redirect to `/login` if not authenticated
- `authFetch<T>("/api/...", accessToken)` for authenticated API calls
- `useEffect` for data fetching on mount with `isLoading` guard
- Existing reminder banner (D-05: keep until `reminderConfigured` is true)

**Phase 2 replacement:** Replace the `<main>` placeholder content with the D-04 card stack:
1. `<DeltaCairanCard />` — data from `authFetch("/api/fluid/daily-balance?date=today")`
2. `<ObatCard />` — data from `authFetch("/api/medication-log/today")`
3. `<PengingatBerikutnyaCard />` — data from `authFetch("/api/reminders/next")`
4. `<AiPlaceholderCard />` — static grey card, no API call

---

### `frontend/components/cairan/CatatCairanForm.tsx` (component, CRUD)

**Analog:** `frontend/app/onboarding/_components/FirstReminderStep.tsx`

**Form pattern** (lines 1-43 of analog):
```typescript
"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { firstReminderSchema, type FirstReminderFormData } from "@/lib/validators/onboarding.schema";

export default function FirstReminderStep({ onSubmit, isSaving }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FirstReminderFormData>({
    resolver: zodResolver(firstReminderSchema) as any,
    defaultValues: { jenis: "obat", nama: "", jamPengingat: "" },
  });

  const onFormSubmit: SubmitHandler<FirstReminderFormData> = (data) => onSubmit(data);

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      <input
        {...register("nama")}
        className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans ..."
      />
      {errors.nama && (
        <p className="mt-1 text-xs text-destructive font-sans">{errors.nama.message}</p>
      )}
    </form>
  );
}
```

**Phase 2 additions:**
- Add `watch("tipe")` and `watch("kondisiKeluar")` from react-hook-form for conditional field rendering.
- Show CAPD-specific fields (`konsentrasiCapd`, `kondisiKeluar`) only when `user.metodeTerapiAktif === 'CAPD'` (read from `useAuth()` hook's `user` object).
- Add `isLateEntry` checkbox that reveals a datetime picker for retroactive entries (FLUID-04).
- On submit, call `authFetch("/api/fluid", accessToken, { method: "POST", body: JSON.stringify(data) })`.

---

### `frontend/lib/pushClient.ts` (utility, event-driven)

**Analog:** `frontend/lib/api.ts`

**apiFetch wrapper pattern** (lines 1-57 of analog):
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function authFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  return apiFetch<T>(path, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
```

**Phase 2:** `pushClient.ts` uses `authFetch` from `@/lib/api` to POST subscription to `/api/push/subscribe`. The `subscribeAndRegister()` function must call `Notification.requestPermission()` synchronously in the click handler before any `await` (iOS constraint from RESEARCH.md Pitfall 2).

---

### `frontend/app/catatan/page.tsx`, `frontend/app/pengingat/page.tsx`, `frontend/app/edukasi/page.tsx` (frontend-pages)

**Analog:** `frontend/app/dashboard/page.tsx`

Same three-part pattern: `"use client"` + `useAuth()` + redirect guard + `authFetch` in `useEffect`. Each page wraps content inside the `AppShell` via the `(app)/layout.tsx` route group (no explicit shell import needed in page files).

---

## Shared Patterns

### Authentication on All Routes
**Source:** `backend/src/middleware/authenticate.ts` (lines 1-39)
**Apply to:** ALL Phase 2 route files — every new route must include `authenticate` middleware
```typescript
// Route pattern — authenticated:
router.get("/", authenticate, fluidController.list);
router.post("/", authenticate, fluidController.create);

// Controller pattern — access user ID:
const userId = req.user!.id;  // set by authenticate middleware
```

### Error Handling
**Source:** `backend/src/middleware/errorHandler.ts` (lines 1-55)
**Apply to:** All services and controllers
```typescript
// In service — throw typed errors:
throw new AppError(404, "NOT_FOUND", "Data tidak ditemukan");

// In controller — always call next(err):
} catch (err) {
  next(err);
}

// ZodError from schema.parse() auto-caught by errorHandler → 400 VALIDATION_ERROR
```

### Zod Validation in Services
**Source:** `backend/src/services/auth.service.ts` (lines 18-31)
**Apply to:** `fluid.service.ts`, `reminders.service.ts`, `medicationLog.service.ts`, `push.service.ts`
```typescript
export const createFluidSchema = z.object({
  tipe: z.enum(["masuk", "keluar"]),
  volume: z.number().positive("Volume harus positif"),
  satuan: z.enum(["ml", "kg"]).default("ml"),
  // ...
});

export async function createEntry(userId: string, payload: unknown) {
  const parsed = createFluidSchema.parse(payload); // throws ZodError on invalid
  // ...
}
```

### Frontend Auth + API Fetch
**Source:** `frontend/lib/hooks/useAuth.ts` + `frontend/lib/api.ts`
**Apply to:** All new frontend page components
```typescript
// In every authenticated page:
const { accessToken, user, isLoading, isAuthenticated } = useAuth();

useEffect(() => {
  if (isLoading) return;
  if (!isAuthenticated || !accessToken) { router.replace("/login"); return; }
  authFetch<T>("/api/...", accessToken).then(setData).catch(err => setError(err.message));
}, [isLoading, isAuthenticated, accessToken]);
```

### Form Component Pattern
**Source:** `frontend/app/onboarding/_components/FirstReminderStep.tsx` (full file)
**Apply to:** `CatatCairanForm.tsx`, reminder create/edit forms
```typescript
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Input styling (copy exactly):
// "w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground
//  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"

// Error message styling (copy exactly):
// <p className="mt-1 text-xs text-destructive font-sans">{errors.field.message}</p>

// Primary button styling (copy exactly):
// "w-full rounded-[10px] bg-primary px-4 py-2.5 text-sm font-semibold font-sans
//  text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
```

### Drizzle Schema Convention
**Source:** `backend/src/db/schema/reminderSchedule.schema.ts` + `users.schema.ts`
**Apply to:** All new schema files
```typescript
// Column naming: camelCase key → snake_case DB column
userId: uuid("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
createdAt: timestamp("created_at").notNull().defaultNow(),
// Use text() for string enums (not pgEnum) — simpler migration story
// Use jsonb() for array-like fields (.$type<T[]>() for type safety)
```

### Repository Convention
**Source:** `backend/src/repositories/user.repository.ts` (full file)
**Apply to:** All new repository files
```typescript
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type FluidLog = InferSelectModel<typeof fluidLog>;
export type NewFluidLog = InferInsertModel<typeof fluidLog>;

// Always destructure array: const [row] = await db.insert(...).returning();
// Always type-cast UUID where needed: eq(table.userId, userId as any)
```

### Schema Barrel Export
**Source:** `backend/src/db/schema/index.ts`
**Apply to:** Every new schema file must add an export line here:
```typescript
export { fluidLog } from "./fluidLog.schema.js";
export { medicationLog } from "./medicationLog.schema.js";
export { pushSubscriptions } from "./pushSubscriptions.schema.js";
```

---

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason | RESEARCH.md Reference |
|------|------|-----------|--------|-----------------------|
| `backend/src/services/notification.service.ts` | service | event-driven | No push notification code exists yet | RESEARCH.md Pattern 2 — fan-out with Promise.allSettled |
| `backend/src/lib/encryption.ts` | utility | transform | No encryption code in codebase | RESEARCH.md Pattern 4 — AES-256-GCM |
| `backend/src/lib/webPushClient.ts` | utility | event-driven | No web-push code in codebase | RESEARCH.md Pattern 2 — VAPID setup |
| `backend/src/jobs/scheduler.ts` | config | event-driven | No cron jobs in codebase | RESEARCH.md Pattern 3 — node-cron |
| `backend/src/jobs/reminderDispatch.job.ts` | service | event-driven | No cron jobs in codebase | RESEARCH.md Pattern 3 — dispatchDueReminders |
| `backend/src/jobs/reminderFollowUp.job.ts` | service | event-driven | No cron jobs in codebase | RESEARCH.md Pattern 3 — follow-up check |
| `frontend/app/manifest.ts` | config | — | No PWA manifest in codebase | RESEARCH.md Pattern 1 — MetadataRoute.Manifest |
| `frontend/app/sw.ts` | config | event-driven | No service worker in codebase | RESEARCH.md Pattern 1 — Serwist push handler |
| `frontend/next.config.ts` | config | — | No Serwist wrapper yet | RESEARCH.md Pattern 1 — withSerwist |
| `frontend/components/shell/BottomNav.tsx` | component | — | No nav component in codebase | CONTEXT.md D-01, DESIGN_SYSTEM_KidneyBuddy_v3.md |
| `frontend/components/shell/Sidebar.tsx` | component | — | No sidebar in codebase | CONTEXT.md D-09 |
| `frontend/components/shell/FAB.tsx` | component | — | No FAB in codebase | CONTEXT.md D-06 |
| `frontend/components/push/InstallPrompt.tsx` | component | — | No PWA install logic in codebase | RESEARCH.md Pattern 5 — iOS detection |
| `frontend/lib/offlineQueue.ts` | utility | event-driven | No IndexedDB/offline logic in codebase | RESEARCH.md FLUID-05 (idb library) |

---

## Key Constraints Summary for Planner

1. **Encryption boundary:** `encrypt()`/`decrypt()` is called in the **service layer**, never in the repository or controller. Only `catatan` free-text columns are encrypted — never `userId`, `tipe`, `tanggal`, `waktu` (indexed/queried columns).

2. **Push subscription unique key:** `UNIQUE(endpoint)`, not `UNIQUE(user_id)`. Upsert pattern on conflict of endpoint. One row per device, fan-out by looping over all rows for a `user_id`.

3. **iOS permission call:** Must be the **first expression** in the `onClick` handler — before any `await`, `if`, or function call.

4. **Cron persistence:** `node-cron` fires every minute, queries Postgres on every tick. No in-memory state. Boot-time catch-up call before starting cron.

5. **Route group structure:** Auth pages live in `(auth)/` (already exists). Authenticated app pages should live in `(app)/` with its own layout wrapping `AppShell`. Root `layout.tsx` stays shell-free.

6. **multer storage:** `diskStorage` writing to `/app/uploads/medication-photos/`. Limit: 10MB, MIME: `['image/jpeg', 'image/png']`.

7. **helmet placement:** `app.use(helmet())` must be added to `app.ts` **before** route registration.

---

## Metadata

**Analog search scope:** `backend/src/` (controllers, services, repositories, routes, db/schema, middleware, lib), `frontend/app/`, `frontend/lib/`
**Files scanned:** 18 source files read directly
**Pattern extraction date:** 2026-06-26
