# Phase 6: Community & Education - Pattern Map

**Mapped:** 2026-07-04
**Files analyzed:** 22 (backend: 13, frontend: 9)
**Analogs found:** 22 / 22

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/src/db/schema/communityPost.schema.ts` | model | CRUD | `backend/src/db/schema/labResult.schema.ts` | exact (soft-delete + indexed table) |
| `backend/src/db/schema/communityReply.schema.ts` | model | CRUD | `backend/src/db/schema/labResult.schema.ts` | role-match (simpler child table) |
| `backend/src/db/schema/communityReplyHelpful.schema.ts` | model | event-driven (toggle) | `backend/src/db/schema/aiDailySummary.schema.ts` | exact (composite `unique()` join constraint) |
| `backend/src/db/schema/educationContent.schema.ts` | model | CRUD (read-only) | `backend/src/db/schema/labResult.schema.ts` | role-match (no userId scope, static content) |
| `backend/src/repositories/communityPost.repository.ts` | service (repository) | CRUD | `backend/src/repositories/labResult.repository.ts` | exact |
| `backend/src/repositories/communityReply.repository.ts` | service (repository) | CRUD + event-driven toggle | `backend/src/repositories/labResult.repository.ts` | role-match (+ toggle logic novel, precedent in RESEARCH.md Code Examples) |
| `backend/src/repositories/educationContent.repository.ts` | service (repository) | CRUD (read/filter only) | `backend/src/repositories/labResult.repository.ts` (`findByUser` options pattern) | role-match |
| `backend/src/services/communityPost.service.ts` | service | request-response | `backend/src/services/labResult.service.ts` | exact (Zod schema + injectable core pattern) |
| `backend/src/services/communityReply.service.ts` | service | event-driven | `backend/src/services/labResult.service.ts` | role-match (+ toggle logic) |
| `backend/src/services/educationContent.service.ts` | service | request-response | `backend/src/services/labResult.service.ts` | role-match (simpler, no encryption) |
| `backend/src/controllers/community.controller.ts` | controller | request-response | `backend/src/controllers/labResult.controller.ts` | exact (thin controller pattern) |
| `backend/src/controllers/education.controller.ts` | controller | request-response | `backend/src/controllers/labResult.controller.ts` (list/getParameters style) | role-match |
| `backend/src/routes/community.routes.ts` | route | request-response | `backend/src/routes/labResult.routes.ts` | exact |
| `backend/src/routes/education.routes.ts` | route | request-response | `backend/src/routes/labResult.routes.ts` | exact |
| `backend/src/app.ts` (modified: mount new routers) | config | — | existing `app.use("/api/lab", labResultRoutes)` block | exact |
| `backend/src/seed/seed-education.ts` | utility (seed script) | batch | `backend/src/seed/seed-demo.ts` | exact |
| `backend/src/test/communityPost.service.test.ts` | test | request-response | `backend/src/test/labResult.service.test.ts` | exact (in-memory store pattern) |
| `backend/src/test/communityReply.service.test.ts` | test | event-driven | `backend/src/test/labResult.service.test.ts` | role-match |
| `backend/src/test/educationContent.service.test.ts` | test | request-response | `backend/src/test/labResult.service.test.ts` | role-match |
| `frontend/app/(app)/edukasi/page.tsx` (modified) | component (page) | request-response | itself (existing, Phase 5) + `frontend/app/(app)/catatan/page.tsx` (pill-row) | exact |
| `frontend/app/(app)/edukasi/komunitas/page.tsx` | component (page) | request-response | `frontend/app/(app)/catatan/page.tsx` | role-match (new route, same auth-guard/pill shell) |
| `frontend/components/edukasi/EducationList.tsx`, `EducationCard.tsx`, `EducationDetail.tsx` | component | request-response | `frontend/components/anomaly/AlertHistoryList.tsx` + `frontend/components/lab/LabResultList.tsx`-style list | exact (fetch/loading/empty/error states) |
| `frontend/components/komunitas/CommunityFeed.tsx`, `PostCard.tsx`, `CreatePostSheet.tsx`, `PostDetail.tsx`, `ReplyList.tsx`, `ReplyItem.tsx` | component | request-response + event-driven (toggle) | `frontend/components/anomaly/AlertHistoryList.tsx` (list+optimistic-update pattern) | exact |

## Pattern Assignments

### `backend/src/db/schema/communityPost.schema.ts` (model, CRUD)

**Analog:** `backend/src/db/schema/labResult.schema.ts` (full file, 68 lines)

**Full pattern to copy** (imports + table shape + indexes):
```typescript
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const labResults = pgTable(
  "lab_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    // ...domain columns...
    diarsipkan: boolean("diarsipkan").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_lab_user_date").on(table.userId, table.tanggalPemeriksaan),
    index("idx_lab_user_param").on(table.userId, table.namaParameter, table.diarsipkan),
  ],
);
```

Apply directly to `communityPosts`: `userId` FK cascade, `judul`/`isi`/`kategori`/`metodeTerapi` text columns, `diarsipkan` boolean default false (COMMUNITY-03), `createdAt` timestamp. Add indexes on `createdAt` (D-07 newest-first), `(kategori, diarsipkan)` and `(metodeTerapi, diarsipkan)` (D-05/D-06 filters), and `(userId)` (own-post archive lookups) — see RESEARCH.md Code Examples section for the exact drafted schema (lines 387-417 of 06-RESEARCH.md), which is ready to copy near-verbatim.

**No encryption:** unlike `labResult.schema.ts`'s `catatan` column (AES-256-GCM ciphertext, encrypted in service layer), community/education text columns are NOT encrypted — see Common Pitfall 1 in RESEARCH.md. Do not import `encrypt`/`decrypt` in the new service files.

---

### `backend/src/db/schema/communityReplyHelpful.schema.ts` (model, event-driven toggle)

**Analog:** `backend/src/db/schema/aiDailySummary.schema.ts` (full file, 43 lines) — the only existing precedent for `unique()` composite-constraint syntax in this repo.

**Composite-unique pattern** (lines 12-43):
```typescript
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const aiDailySummaries = pgTable(
  "ai_daily_summaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
    tanggal: text("tanggal").notNull(),
    // ...
  },
  (table) => [
    unique("uq_ai_daily_summary_user_date").on(table.userId, table.tanggal),
  ],
);
```

Apply to `communityReplyHelpful`: `replyId` (FK → `communityReplies.id`, cascade) + `userId` (FK → `users.userId`, cascade) + `unique("uq_community_reply_helpful_reply_user").on(table.replyId, table.userId)`. This is the DB-level enforcement backstop for D-09 ("one mark per user per reply"). See RESEARCH.md Pattern 2 (lines 283-307) for the fully drafted schema.

---

### `backend/src/repositories/communityPost.repository.ts` (repository, CRUD)

**Analog:** `backend/src/repositories/labResult.repository.ts` (full file, 179 lines)

**IDOR-safe archive pattern** (lines 79-91):
```typescript
export async function archiveById(
  userId: string,
  id: string,
): Promise<LabResult | null> {
  const [row] = await db
    .update(labResults)
    .set({ diarsipkan: true })
    .where(
      and(eq(labResults.userId, userId as any), eq(labResults.id, id as any)),
    )
    .returning();
  return row ?? null;
}
```
Copy verbatim for `communityPost.repository.ts::archiveById`, substituting `communityPosts` — the compound `and(eq(userId...), eq(id...))` WHERE clause is the exact IDOR guard COMMUNITY-03 requires (see RESEARCH.md Pitfall 2).

**Filtered list pattern** (lines 29-54, `findByUser`'s `options` object shape):
```typescript
export async function findByUser(
  userId: string,
  options?: { tanggal?: string; parameter?: string; includeArchived?: boolean },
): Promise<LabResult[]> {
  const conditions = [eq(labResults.userId, userId as any)];
  if (!options?.includeArchived) conditions.push(eq(labResults.diarsipkan, false));
  if (options?.tanggal) conditions.push(eq(labResults.tanggalPemeriksaan, options.tanggal));
  if (options?.parameter) conditions.push(eq(labResults.namaParameter, options.parameter));
  return db.select().from(labResults).where(and(...conditions)).orderBy(desc(labResults.tanggalPemeriksaan));
}
```
For the community feed, the equivalent `findFeed(options?: { kategori?; metodeTerapi? })` is NOT userId-scoped (feed is public across all users) — see RESEARCH.md Code Examples "Feed query" (lines 419-442), which is a ready-to-copy variant of this exact pattern with `eq(communityPosts.diarsipkan, false)` as the base condition instead of a userId filter.

**Single-row IDOR-safe lookup** (lines 96-108, `findById`) — copy directly for post/reply detail lookups.

---

### `backend/src/repositories/communityReply.repository.ts` (repository, toggle)

**Analog:** RESEARCH.md's drafted `toggleHelpful` service-layer logic (lines 444-469) is the closest concrete precedent (no existing repo has toggle-state code, so this is the primary reference):
```typescript
export async function toggleHelpful(userId: string, replyId: string): Promise<{ marked: boolean }> {
  const existing = await db.select().from(communityReplyHelpful)
    .where(and(eq(communityReplyHelpful.userId, userId), eq(communityReplyHelpful.replyId, replyId)))
    .limit(1);
  if (existing.length > 0) {
    await db.delete(communityReplyHelpful)
      .where(and(eq(communityReplyHelpful.userId, userId), eq(communityReplyHelpful.replyId, replyId)));
    return { marked: false };
  }
  await db.insert(communityReplyHelpful).values({ userId, replyId });
  return { marked: true };
}
```
Place this in the repository layer (or service layer per RESEARCH.md's placement — either is consistent with the thin-controller convention as long as Zod validation of `replyId` stays in the service). The `helpfulCount` shown in UI must be a `COUNT(*)` aggregate against this join table, never a denormalized counter column (RESEARCH.md Anti-Patterns).

---

### `backend/src/services/communityPost.service.ts` / `communityReply.service.ts` / `educationContent.service.ts` (service, request-response)

**Analog:** `backend/src/services/labResult.service.ts` (read lines 1-90 of 373)

**Zod schema + doc header pattern** (lines 1-70):
```typescript
import { z } from "zod";
import pino from "pino";
import * as labResultRepository from "../repositories/labResult.repository.js";
import type { NewLabResult } from "../repositories/labResult.repository.js";

const logger = pino({ name: "labResult.service" });

export const createLabSchema = z.object({
  tanggalPemeriksaan: z.string({ required_error: "Tanggal pemeriksaan wajib diisi" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Format tanggal harus YYYY-MM-DD" }),
  namaParameter: z.string({ required_error: "Nama parameter wajib diisi" })
    .min(1, "Nama parameter tidak boleh kosong")
    .max(100, "Nama parameter maksimal 100 karakter"),
  catatan: z.string().max(2000, "Catatan maksimal 2000 karakter").nullable().optional(),
});
export type CreateLabPayload = z.infer<typeof createLabSchema>;
```
Copy this exact shape for `createPostSchema` (judul max ~200, isi max ~5000, kategori enum, metodeTerapi enum) and `createReplySchema` (isi max ~2000) — mirroring the `.max()` + Indonesian-language `required_error`/message strings convention. **Do NOT** import `encrypt`/`decrypt` from `../lib/encryption.js` (labResult.service.ts imports this at line 21) — community/education content is explicitly not sensitive per RESEARCH.md Pitfall 1.

**Injectable-core test seam:** `labResult.service.ts` doc comment (line 13) references an underscore-prefixed `_createLabCore` pattern with injected dependencies — replicate this for `communityPost.service.ts` (e.g. `_createPostCore({ insert, ... })`) so `backend/src/test/communityPost.service.test.ts` can use an in-memory store, matching `labResult.service.test.ts`'s `createInMemoryLabStore()` helper (see that test file for the exact fixture shape).

---

### `backend/src/controllers/community.controller.ts` / `education.controller.ts` (controller, thin)

**Analog:** `backend/src/controllers/labResult.controller.ts` (full file, 325 lines) — use only the simple CRUD handlers (`create`, `list`, `archive`), skip the file-upload/serveFile/trend handlers (not applicable to this phase).

**Archive handler** (lines 74-96):
```typescript
export async function archive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await labResultService.archiveResult(req.user!.id, req.params.id as string);
    if (!result) {
      res.status(404).json({ code: "NOT_FOUND", message: "Lab result tidak ditemukan" });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}
```
Copy structurally for `community.controller.ts::archivePost`, substituting `communityPostService.archivePost` and message `"Postingan tidak ditemukan"` (per RESEARCH.md Pattern 3, lines 309-328).

**Create handler** (lines 19-30) and **list handler with query params** (lines 36-55) are the direct templates for `create`/`list` on both controllers.

---

### `backend/src/routes/community.routes.ts` / `education.routes.ts` (route)

**Analog:** `backend/src/routes/labResult.routes.ts` (full file, 49 lines)
```typescript
import { Router } from "express";
import * as labResultController from "../controllers/labResult.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();
router.post("/", authenticate, labResultController.create);
router.get("/", authenticate, labResultController.list);
router.patch("/:id/archive", authenticate, labResultController.archive);
export default router;
```
Every route in this file (and every other route file in the repo) is behind `authenticate` — apply the same to `/api/community/*` and `/api/education/*` (RESEARCH.md Security Domain recommends keeping education reads authenticated too, for consistency, even though the content itself isn't sensitive).

**Mount in `backend/src/app.ts`** — copy the existing mount-block pattern (lines 51-60):
```typescript
app.use("/api/lab", labResultRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/anomaly", anomalyRoutes);
```
Add `app.use("/api/community", communityRoutes);` and `app.use("/api/education", educationRoutes);` alongside the existing imports at the top of the file (following the same `import xRoutes from "./routes/x.routes.js";` convention seen at lines 6-19).

---

### `backend/src/seed/seed-education.ts` (utility, batch)

**Analog:** `backend/src/seed/seed-demo.ts` (read header, lines 1-40)
```typescript
import "dotenv/config";
import { db, pool } from "../lib/db.js";
import * as schema from "../db/schema/index.js";
import { hashPassword } from "../utils/passwordHash.js";
```
Follow the same doc-header convention (purpose, what's generated, run command `npm run seed:education`, required env vars) and reuse `db`/`schema` import shape. Since `education_content` rows are not user-scoped, this script inserts static rows directly (no `hashPassword`/`encrypt` calls needed) — much simpler than `seed-demo.ts`'s per-user data generation loop.

---

### `backend/src/test/communityPost.service.test.ts` (test)

**Analog:** `backend/src/test/labResult.service.test.ts` (in-memory store pattern, 197 lines) — read this file directly when implementing; it demonstrates the exact `node:test` + in-memory-store fixture shape already used for every service test in this repo. No new test framework/config needed (`node --import tsx --test`).

---

### Frontend: `frontend/app/(app)/edukasi/page.tsx` (modified) + `frontend/app/(app)/edukasi/komunitas/page.tsx` (new)

**Analog 1 — auth-guard shell:** existing `edukasi/page.tsx` itself (full file, 53 lines):
```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

export default function EdukasiPage() {
  const router = useRouter();
  const { accessToken, isLoading, isAuthenticated } = useAuth();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);
  if (isLoading) return (<div className="flex items-center justify-center min-h-[200px]"><p className="text-muted-foreground font-sans text-sm">Memuat...</p></div>);
  if (!isAuthenticated || !accessToken) return null;
  return ( /* content */ );
}
```
Reuse this exact auth-guard boilerplate for the new `komunitas/page.tsx` route (D-03). Replace the "Konten Segera Hadir" placeholder block (lines 35-50) with `<EducationList accessToken={accessToken} />`.

**Analog 2 — pill-row sub-nav (D-02):** `frontend/app/(app)/catatan/page.tsx` lines 20-34 (TABS array) and lines 154-188 (pill rendering):
```tsx
type TabId = "cairan" | "obat" | "cucidarah" | "aktivitas" | "lab";
interface Tab { id: TabId; label: string; enabled: boolean; }
const TABS: Tab[] = [
  { id: "cairan", label: "Cairan", enabled: true },
  // ...
];
// pill row:
<div className="flex gap-2 overflow-x-auto pb-1">
  {TABS.map((tab) => {
    const isActive = activeTab === tab.id;
    return (
      <button key={tab.id} onClick={() => handleTabClick(tab)} aria-current={isActive ? "true" : undefined}
        className="shrink-0 font-sans font-medium transition-colors"
        style={{ fontSize: 12, borderRadius: 20, paddingLeft: 16, paddingRight: 16, height: 36,
          backgroundColor: isActive ? "#2a9d8f" : "#f0faf9", color: isActive ? "#ffffff" : "#1a2e2c" }}>
        {tab.label}
      </button>
    );
  })}
</div>
```
Per D-03, this phase uses **separate routes** (`/edukasi`, `/edukasi/komunitas`) instead of local `useState` — so the two pills should be `<Link href="/edukasi">`/`<Link href="/edukasi/komunitas">` with `usePathname()` driving the `isActive` check, rather than an `activeTab` state variable. Visual styling (colors, sizing) copies directly from this pattern.

---

### Frontend: `EducationList.tsx` / `CommunityFeed.tsx` and list children (component, request-response)

**Analog:** `frontend/components/anomaly/AlertHistoryList.tsx` (full file, 149 lines) — the clearest existing example of fetch/loading/error/empty-state/list-render for a GET-all endpoint.

**Fetch + loading/error/empty state pattern** (lines 23-47, 88-130):
```tsx
const [items, setItems] = useState<T[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [hasError, setHasError] = useState(false);

const fetchItems = useCallback(async () => {
  if (!accessToken) return;
  setIsLoading(true); setHasError(false);
  try {
    const res = await authFetch<{ alerts: T[] }>("/api/anomaly", accessToken);
    setItems(res.alerts ?? []);
  } catch { setHasError(true); } finally { setIsLoading(false); }
}, [accessToken]);

useEffect(() => { fetchItems(); }, [fetchItems]);

if (isLoading) return <p className="font-sans text-center py-8" style={{ fontSize: 14, color: "#3d6b66" }}>Memuat...</p>;
if (hasError) return ( /* error block with "Muat Ulang" retry button */ );
if (items.length === 0) return ( /* empty state with icon + message */ );
return <div className="space-y-2">{items.map((item) => <Card key={item.id} ... />)}</div>;
```
Copy this exact structure for `CommunityFeed.tsx` (fetching `/api/community/posts?kategori=&metodeTerapi=`) and `EducationList.tsx` (fetching `/api/education?metodeTerapi=`).

**Optimistic-update toggle pattern** (lines 51-68, `handleCardClick`) — directly reusable for `ReplyItem.tsx`'s "Tandai Membantu" toggle:
```tsx
const handleToggle = useCallback(async (replyId: string) => {
  setReplies((prev) => prev.map((r) => r.id === replyId ? { ...r, marked: !r.marked } : r));
  try {
    await authFetch(`/api/community/replies/${replyId}/helpful`, accessToken, { method: "POST" });
  } catch {
    setReplies((prev) => prev.map((r) => r.id === replyId ? { ...r, marked: !r.marked } : r)); // revert
  }
}, [accessToken]);
```

**Fetch utility:** `frontend/lib/api.ts` (full file, 99 lines) — `authFetch<T>(path, accessToken, init?)` already handles Bearer header + 401-refresh-retry; use unchanged, no new fetch wrapper needed.

**Safe rendering (XSS):** for `PostDetail.tsx`/`ReplyItem.tsx`/`EducationDetail.tsx` body text, use:
```tsx
<p className="font-sans whitespace-pre-wrap" style={{ fontSize: 13, color: "#1a2e2c" }}>
  {post.isi}
</p>
```
(RESEARCH.md Code Examples, line 477) — plain JSX text child, `whitespace-pre-wrap` for line breaks, never `dangerouslySetInnerHTML`.

---

## Shared Patterns

### IDOR-safe repository signature
**Source:** `backend/src/repositories/labResult.repository.ts` lines 79-108 (`archiveById`, `findById`)
**Apply to:** `communityPost.repository.ts` (archive), any lookup that must scope to the owning user.
```typescript
export async function archiveById(userId: string, id: string): Promise<LabResult | null> {
  const [row] = await db.update(labResults).set({ diarsipkan: true })
    .where(and(eq(labResults.userId, userId as any), eq(labResults.id, id as any)))
    .returning();
  return row ?? null;
}
```
Note: for `communityReply`'s helpful-toggle, ownership is intentionally NOT required (D-08 — any user may mark any reply) — do not apply the userId-ownership guard there, only to post archive.

### Archive-not-delete (soft delete)
**Source:** `backend/src/repositories/labResult.repository.ts` (`diarsipkan` boolean, `archiveById`)
**Apply to:** `communityPost.repository.ts` — never issue a real `DELETE` against `community_posts` (COMMUNITY-03).

### Thin controller → service → repository layering
**Source:** `backend/src/controllers/labResult.controller.ts` (every handler: try/parse/delegate/`next(err)`)
**Apply to:** `community.controller.ts`, `education.controller.ts` — no business logic, no Zod, no DB calls in controllers.

### `authenticate` middleware on every route
**Source:** `backend/src/routes/labResult.routes.ts` (every route has `authenticate` as second arg); `backend/src/middleware/authenticate.ts` (JWT → `req.user.id`)
**Apply to:** All new `/api/community/*` and `/api/education/*` routes — no unauthenticated exceptions, matching every existing route file in the repo.

### `authFetch` + Bearer/refresh pattern
**Source:** `frontend/lib/api.ts` (full file)
**Apply to:** Every new frontend component's data fetching — no new fetch wrapper needed.

### No HTML sanitization library / no `dangerouslySetInnerHTML`
**Source:** RESEARCH.md Pitfall 3, Anti-Patterns — codebase has zero uses of `dangerouslySetInnerHTML` (verified via grep in research).
**Apply to:** `PostDetail.tsx`, `ReplyItem.tsx`, `EducationDetail.tsx`, `PostCard.tsx` — render all text as plain JSX children with `whitespace-pre-wrap` CSS for line breaks.

## No Analog Found

None — every file in this phase's scope has a directly applicable analog already in the codebase (this phase is purely mechanical repetition of Phases 2-5's established layering, per RESEARCH.md's Summary).

## Metadata

**Analog search scope:** `backend/src/db/schema/`, `backend/src/repositories/`, `backend/src/services/`, `backend/src/controllers/`, `backend/src/routes/`, `backend/src/seed/`, `backend/src/test/`, `backend/src/app.ts`, `backend/src/middleware/authenticate.ts`, `frontend/app/(app)/catatan/page.tsx`, `frontend/app/(app)/edukasi/page.tsx`, `frontend/components/anomaly/AlertHistoryList.tsx`, `frontend/lib/api.ts`
**Files scanned:** 15 read directly this session (full or partial) + RESEARCH.md's own direct-inspection list (labResult.*, anomalyAlert.schema.ts, aiDailySummary.schema.ts, users.schema.ts, onboarding.service.ts, errorHandler.ts) reused as secondary evidence
**Pattern extraction date:** 2026-07-04
