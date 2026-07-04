# Phase 6: Community & Education - Research

**Researched:** 2026-07-04
**Domain:** Quora-style peer community (posts/replies/helpful-marking, archive-not-delete) + therapy-filtered static education content browser, inside an existing Express 5 + Drizzle + Next.js 16 microservices codebase
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Navigation & Page Structure**
- **D-01:** Community and Education are combined into ONE bottom-nav tab, not a
  6th nav item. The nav label/icon stays "Edukasi" (`frontend/lib/nav.ts` is
  unchanged) — Komunitas becomes a sub-section inside it, not a top-level
  destination.
- **D-02:** Sub-navigation is a pill-row (same visual pattern as `/catatan`'s
  Cairan/Obat/Cuci Darah/Aktivitas/Lab tabs) with two pills: "Edukasi" and
  "Komunitas".
- **D-03:** Unlike `/catatan` (single route + local `useState` for the active
  sub-tab), this phase uses SEPARATE ROUTES: `/edukasi` and `/edukasi/komunitas`.
  Reasoning: community content benefits from bookmarkable/shareable URLs (e.g.
  linking directly to the community section) in a way the tracking tabs don't.
- **D-04:** Default sub-tab on first visit to `/edukasi` is "Edukasi" (not
  Komunitas) — matches the tab's nav label and existing user expectation from
  Phase 5 (LifestyleSuggestionCard already lives at `/edukasi`).

**Community Feed**
- **D-05:** Single feed with pill-chip filters (not separate tabs per category).
  Filter chips: category (Semua/Pertanyaan/Berbagi Pengalaman/Informasi) — same
  horizontal-scroll pill pattern as D-02's sub-nav, for visual consistency.
- **D-06:** Therapy-method filter (CAPD/HD/Transplantasi/Umum) shows ALL posts by
  default, regardless of the viewing user's own active therapy method. User can
  narrow manually. Do NOT auto-filter to the user's own method on load.
- **D-07:** Default sort order is newest-first (chronological), not
  most-replied/most-helpful. Matches standard forum/discussion-board convention.

**"Membantu" Marking Mechanics**
- **D-08:** Marking happens at the REPLY level (not the post level), and ANY
  user can mark ANY reply as "membantu" — not restricted to the original
  poster selecting one "best answer". This is a deliberate deviation from PRD
  §8.6's "Jumlah Upvote" wording, which described post-level upvotes; the
  user confirmed reply-level, open-to-everyone marking is what they want.
  This deviation must not be silently "corrected" back toward the PRD's
  literal wording.
- **D-09:** One mark per user per reply, toggleable (click again to unmark).
  Requires a join table (e.g. `community_reply_helpful` with a unique
  `(reply_id, user_id)` constraint) — not a bare integer counter — so dedup is
  enforced at the database level, not just client-side.

**Education Content**
- **D-10:** No draft content exists from the user. Claude must write REAL,
  substantive Bahasa Indonesia seed content (not lorem-ipsum placeholders) —
  articles/guides covering CKD-relevant topics per therapy method (CAPD/HD/
  Transplantasi/Umum), grounded in the same calm, non-diagnostic tone already
  established for AI-generated content in Phase 5 (`lib/aiDisclaimer.ts`
  pattern) since this is medical-adjacent lifestyle content read by a
  non-technical, sometimes 50+ audience.
- **D-11:** Exercise/activity guides (panduan senam) are TEXT + static
  image/illustration format — no video/embedded YouTube. This keeps parity
  with the community's explicit no-video/no-livestreaming restriction (PRD
  out-of-scope list) even though PRD didn't explicitly extend that rule to
  education content — the user chose text+image for consistency and lighter
  PWA/offline footprint.
- **D-12:** Content is seeded via a script (following the existing
  `backend/src/seed/seed-demo.ts` convention already in the codebase), not a
  user-facing authoring UI — consistent with the "no Content Manager role"
  decision already locked in PRD v0.3.

### Claude's Discretion
- Exact wording/copy of the seeded education articles (D-10) — write
  medically-reasonable, calm, non-diagnostic content; specific article count,
  length, and topic breakdown per therapy method is left to the
  researcher/planner to size appropriately for an MVP phase.
- Exact DB schema shape for `community_posts`/`community_replies`/the
  helpful-join-table beyond the constraints in D-08/D-09.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. No admin/Content Manager UI was
requested (PRD already decided against it), no video/livestreaming was
requested, no additional community features (comments-on-comments, private
messaging, etc.) came up.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMMUNITY-01 | User can create a post with title, content, category (pertanyaan/berbagi pengalaman/informasi), and relevant therapy method tag | Architecture Patterns Pattern 3 (thin controller/service/repository), Code Examples `community_posts` schema, Security Domain V5 input validation |
| COMMUNITY-02 | User can reply to a post and mark a reply as "membantu" (helpful) | Architecture Patterns Pattern 2 (composite-unique join table), Code Examples toggle-helpful service logic, Common Pitfalls Pitfall 4 (D-08 deviation from PRD wording) |
| COMMUNITY-03 | User can archive their own post; posts are never hard-deleted | Architecture Patterns Pattern 1 (archive-not-delete, mirrors LAB-04), Common Pitfalls Pitfall 2 (IDOR-safe ownership check) |
| EDU-01 | User can browse and filter education content (articles, exercise guides, food/lifestyle info) by active therapy method | Architectural Responsibility Map (education filtering tier), Don't Hand-Roll (server-side filter query), Open Question 2 (content-type vs therapy-method axis) |
</phase_requirements>

## Summary

This phase adds two greenfield feature areas — community discussion and education content browsing — to a codebase with five already-completed phases whose conventions are extremely consistent and directly reusable. There is no new architectural pattern to invent here: the archive-not-delete flag, the IDOR-safe `userId`-first repository signature, the thin-controller/injectable-core-service/Zod-schema layering, the Node native test-runner TDD pattern, and the pill-row sub-nav UI have all been established in Phases 2-5 and should be mechanically repeated, not redesigned.

The two features differ in one important way: community posts/replies are live, user-generated, mutable-adjacent (helpful-toggle) data requiring a new many-to-many join table (first of its kind in this schema — `unique()` composite-constraint syntax already exists as precedent in `aiDailySummary.schema.ts`), while education content is pre-seeded, read-only, admin-free static content (per PRD v0.3's explicit "no Content Manager role" decision) that only needs a seed script following `seed-demo.ts` conventions. Neither community post/reply content nor education article content is a PRD-listed "sensitive health data" field (unlike `fluid_log`/`medication_log`/`lab_result`), so the AES-256-GCM application-layer encryption pattern used elsewhere does **not** apply here — this is a deliberate, evidence-based scope narrowing, not an oversight (see Architecture Patterns).

The most safety-relevant finding: the codebase currently has zero HTML-sanitization dependencies and zero `dangerouslySetInnerHTML` usages anywhere in `frontend/`. Given the UI-SPEC confirms plain `<Textarea>` input (no rich-text/markdown editor) for post/reply composition, the correct MVP-appropriate mitigation for the XSS risk CLAUDE.md flags is to *rely on React's default text-node escaping* (never introduce `dangerouslySetInnerHTML` for this feature) plus Zod length/type validation server-side — not to add a new sanitization library for content that will never be interpreted as HTML. This avoids introducing an unverified new dependency for a problem the existing stack already solves by default, and is flagged explicitly in Don't Hand-Roll / Common Pitfalls below.

**Primary recommendation:** Build Phase 6 as four vertical slices — (1) education content backend+seed+browse UI, (2) community post create+feed+detail, (3) reply+"membantu" toggle, (4) archive-own-post — each following the exact repository/controller/service/schema/route layering already used in `labResult.*` and `anomalyAlert.*`, reusing `authenticate` middleware, `errorHandler`/`AppError`, and the `node --import tsx --test` TDD harness. No new npm packages are required for the community/education backend or frontend surfaces.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Community post/reply CRUD, archive | API / Backend | Database / Storage | Business rules (own-post-only archive, IDOR checks) belong in Express controllers/services; Postgres just persists rows — frontend never touches DB directly (CLAUDE.md constraint) |
| "Membantu" toggle dedup enforcement | Database / Storage | API / Backend | Unique `(reply_id, user_id)` constraint is the authoritative dedup guarantee (D-09) — application code only needs to catch the constraint violation / do an upsert-toggle, not reimplement dedup logic itself |
| Community feed filtering/sorting (category, therapy tag, newest-first) | API / Backend | — | Filtering must happen in the SQL query (`WHERE`/`ORDER BY`), not client-side, so the feed scales past what fits in one response and stays consistent with future pagination |
| Education content filtering by therapy method | API / Backend | Browser / Client | Same reasoning as feed filtering — API does `WHERE metode_terapi IN (...)`; client only manages which filter chip is active (D-06-equivalent behavior for education) |
| Education content authoring | Database / Storage (seed script) | — | No admin UI exists or is planned (PRD v0.3) — content is written once as seed data, not a live-editable resource; this is a build-time/deploy-time concern, not a runtime tier |
| XSS-safe rendering of post/reply/article text | Browser / Client (React) | — | React's default JSX text-node escaping is the enforcement point — must NOT be bypassed with `dangerouslySetInnerHTML` anywhere in this feature's components |
| Sub-nav pill routing (`/edukasi` vs `/edukasi/komunitas`) | Frontend Server (SSR) / Browser | — | Next.js App Router file-based routing; no backend involvement |
| Auth / own-post ownership check | API / Backend | — | `req.user.id` from JWT (already-established `authenticate` middleware) is the sole source of truth for "own post" — never trust a client-supplied userId |

## Standard Stack

### Core
No new core libraries are required. This phase is built entirely on the stack already installed and pinned in the repo:

| Library | Version (installed) | Purpose | Why Standard (for this phase) |
|---------|---------|---------|--------------|
| `drizzle-orm` / `drizzle-kit` | 0.45.x / 0.31.x [VERIFIED: package.json in repo] | Schema + migrations for `community_posts`, `community_replies`, `community_reply_helpful`, `education_content` | Already the project's sole data layer — new tables follow existing `pgTable(...)` conventions verbatim |
| `zod` (backend) | ^3.24.0 [VERIFIED: backend/package.json in repo] | Request validation for post/reply create payloads | Matches every existing service (`labResult.service.ts`, `anomaly*.service.ts`) |
| `express` | ^5.2.0 [VERIFIED: backend/package.json in repo] | New `/api/community/*`, `/api/education/*` routers | Existing router/controller/middleware chain reused unchanged |
| `next` (App Router) | ^16.2.0 [VERIFIED: frontend/package.json in repo] | New `/edukasi/komunitas` route + updated `/edukasi` page | Existing `(app)` route group layout/shell reused |
| `react-hook-form` + `@hookform/resolvers` | ^7.54.0 / ^5.0.0 [VERIFIED: frontend/package.json in repo] | Post composer form (title/content/category/therapy-tag) | Same pairing used for every other data-entry form in the app |

### Supporting
No new supporting libraries recommended. Everything needed (Sheet/Dialog/Textarea/Select/Badge/Avatar/AlertDialog/ScrollArea) is already installed in `frontend/components/ui/` per 06-UI-SPEC.md's Registry Safety table — zero new shadcn component installs.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Rely on React's default JSX escaping for post/reply/article body text | `sanitize-html` (npm, [ASSUMED — see Package Legitimacy Audit]) or `isomorphic-dompurify` (npm, [ASSUMED]) applied server-side before INSERT | Only worth adding if a future phase introduces markdown/rich-text authoring for posts or articles. For MVP plain-`<textarea>` input rendered as plain text (never via `dangerouslySetInnerHTML`), an HTML sanitizer library solves a problem that doesn't exist yet and adds an unverified dependency for no functional gain — see Don't Hand-Roll and Common Pitfalls. |
| Composite `unique()` join table for "membantu" dedup (D-09) | A plain integer `helpfulCount` column on `community_replies`, incremented/decremented client-side | Explicitly rejected by D-09 itself — a bare counter cannot enforce one-mark-per-user server-side and is trivially exploitable (repeated clicks/API calls inflate counts). The join-table approach is the only one that satisfies "One mark per user per reply, toggleable" at the DB level. |
| Fetch full community feed / reply list unpaginated (matches existing `AlertHistoryList`/`LabResultList`/`ActivityList` pattern — no pagination anywhere in the codebase yet) | Cursor or offset pagination (`?limit=&offset=` or keyset) | Every existing list-fetching component in this codebase (`AlertHistoryList.tsx`, `LabArchivedList.tsx`, `ReminderList.tsx`) fetches the full result set in one call with no pagination. For an academic MVP with a small community userbase, matching this precedent is the consistent choice; add a defensive `LIMIT` (e.g. 100) server-side as pagination is not the focus of MVP scope, and CONTEXT.md/UI-SPEC do not request infinite-scroll or "load more" UI. |

**Installation:** No `npm install` commands needed — no new packages.

## Package Legitimacy Audit

This phase's core scope requires **no new npm packages** — see Alternatives Considered above for why an HTML-sanitization library is deliberately *not* recommended for MVP. Because slopcheck could not be installed in this research environment (`pip`/`pip3` unavailable), the one package mentioned as a discretionary future option is tagged `[ASSUMED]` and must NOT be installed without a `checkpoint:human-verify` if a future phase revisits rich-text support.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `sanitize-html` | npm | long-established (v2.17.5 confirmed via `npm view`, last publish 2026-06-10) [ASSUMED — package name from training knowledge, not from official docs/Context7; npm existence alone does not confer VERIFIED status per provenance rule] | not measured this session | apostrophecms/sanitize-html (well-known) | not run (slopcheck unavailable — pip/pip3 not installed in this environment) | NOT RECOMMENDED for this phase's MVP scope (see Alternatives Considered) — do not install |
| `isomorphic-dompurify` | npm | v3.18.0 confirmed via `npm view` [ASSUMED — same reasoning] | not measured | cure53/DOMPurify (well-known upstream) | not run | NOT RECOMMENDED for this phase's MVP scope — do not install |

**Packages removed due to slopcheck [SLOP] verdict:** none (slopcheck did not run)
**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable at research time (no `pip`/`pip3` binary in this environment). Both packages listed above are discretionary/future-only and are NOT part of this phase's recommended implementation — if a future phase needs them, gate installation behind `checkpoint:human-verify`.*

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (Next.js App Router — "use client" pages/components)       │
│                                                                       │
│  /edukasi (default)         /edukasi/komunitas                      │
│  ┌──────────────────┐       ┌──────────────────────────────────┐    │
│  │ LifestyleSuggest- │       │ Sub-nav pill row (Edukasi|Komunitas)│  │
│  │ ionCard (kept)    │◄──────┤ CommunityFeed                      │  │
│  │ EducationList     │       │  ├─ category + therapy filter chips│  │
│  │  └─ EducationCard │       │  ├─ PostCard[] (newest-first)      │  │
│  │ EducationDetail   │       │  └─ CreatePostSheet (Buat Postingan)│ │
│  └──────────────────┘       │ PostDetail                          │  │
│         │                    │  ├─ ReplyList → ReplyItem (Tandai   │  │
│         │                    │  │   Membantu toggle, optimistic)  │  │
│         │                    │  └─ Archive AlertDialog (own post)  │  │
│         │                    └──────────────────────────────────┘   │
│         └──────────────┬─────────────────┘                          │
│                         │ fetch (authFetch, Bearer JWT, credentials) │
└─────────────────────────┼────────────────────────────────────────────┘
                          ▼  REST (JSON, never direct DB access)
┌─────────────────────────────────────────────────────────────────────┐
│  Express 5 Backend                                                    │
│                                                                       │
│  authenticate middleware (JWT → req.user.id)                        │
│      │                                                               │
│      ▼                                                               │
│  routes: /api/education/*        routes: /api/community/*            │
│      │                                │                              │
│      ▼                                ▼                              │
│  education.controller.ts        community.controller.ts              │
│  (thin — parse req, delegate)   (thin — parse req, delegate)         │
│      │                                │                              │
│      ▼                                ▼                              │
│  education.service.ts           community.service.ts                 │
│  (Zod validation, no encrypt —  (Zod validation; own-post check       │
│   content is not sensitive)      for archive; helpful-toggle logic)  │
│      │                                │                              │
│      ▼                                ▼                              │
│  education.repository.ts        community*.repository.ts             │
│  (userId-scoped WHERE for       (userId-first param, IDOR-safe,       │
│   filter query, no user-scope   archive via diarsipkan boolean,       │
│   needed — content is shared)   helpful-toggle via unique constraint) │
│      │                                │                              │
│      ▼                                ▼                              │
│              PostgreSQL 16 (Drizzle-managed)                          │
│  education_content   community_posts   community_replies              │
│                       community_reply_helpful (join, unique(reply,user))│
└───────────────────────────────────────────────────────────────────────┘
        ▲
        │ (build-time / deploy-time only, no runtime UI)
   backend/src/seed/seed-education.ts  (new — follows seed-demo.ts convention)
```

A reader can trace the primary use case (create post → view in feed → reply → mark helpful → archive) fully left-to-right/top-to-bottom through this diagram: composer → POST /api/community/posts → service validates+inserts → feed re-fetches → GET /api/community/posts (filtered/sorted) → detail page → POST reply → toggle helpful (upsert-or-delete against the unique join row) → archive PATCH (own-post check, diarsipkan=true, never DELETE).

### Recommended Project Structure
```
backend/src/
├── db/schema/
│   ├── communityPost.schema.ts          # community_posts
│   ├── communityReply.schema.ts         # community_replies
│   ├── communityReplyHelpful.schema.ts  # join table, unique(reply_id, user_id)
│   └── educationContent.schema.ts       # education_content (read-only, seeded)
├── repositories/
│   ├── communityPost.repository.ts
│   ├── communityReply.repository.ts
│   └── educationContent.repository.ts
├── services/
│   ├── communityPost.service.ts
│   ├── communityReply.service.ts
│   └── educationContent.service.ts
├── controllers/
│   ├── community.controller.ts          # posts + replies + helpful-toggle + archive
│   └── education.controller.ts          # list + filter + detail
├── routes/
│   ├── community.routes.ts              # mounted at /api/community
│   └── education.routes.ts              # mounted at /api/education
├── seed/
│   └── seed-education.ts                # follows seed-demo.ts convention (D-12)
└── test/
    ├── communityPost.service.test.ts
    ├── communityReply.service.test.ts
    └── educationContent.service.test.ts

frontend/
├── app/(app)/edukasi/
│   ├── page.tsx                         # updated: replace "Konten Segera Hadir" with EducationList
│   └── komunitas/page.tsx               # new route (D-03)
├── components/edukasi/
│   ├── EducationList.tsx
│   ├── EducationCard.tsx
│   └── EducationDetail.tsx
└── components/komunitas/
    ├── CommunityFeed.tsx
    ├── PostCard.tsx
    ├── CreatePostSheet.tsx
    ├── PostDetail.tsx
    ├── ReplyList.tsx
    └── ReplyItem.tsx
```

### Pattern 1: Archive-not-delete (diarsipkan boolean flag)
**What:** Soft-delete via a `boolean("diarsipkan")` column defaulting to `false`; "delete" operations become `UPDATE ... SET diarsipkan = true WHERE user_id = $1 AND id = $2`, never a real `DELETE`.
**When to use:** COMMUNITY-03 ("archive own post; posts are never hard-deleted") — mirrors `LAB-04`'s already-shipped implementation exactly.
**Example:**
```typescript
// Source: backend/src/repositories/labResult.repository.ts (existing, in repo)
export async function archiveById(
  userId: string,
  id: string,
): Promise<LabResult | null> {
  const [row] = await db
    .update(labResults)
    .set({ diarsipkan: true })
    .where(and(eq(labResults.userId, userId as any), eq(labResults.id, id as any)))
    .returning();
  return row ?? null;
}
```
Apply the identical shape to `communityPost.repository.ts::archiveById` — the `and(eq(userId...), eq(id...))` guard is what makes this IDOR-safe (a user can only archive their own post — the WHERE clause fails silently, returning `null`, for anyone else's post ID).

### Pattern 2: Composite-unique join table for one-per-user toggle state
**What:** A dedicated join table with a `unique(colA, colB)` composite constraint enforces "at most one row per (reply, user)" at the database level — not a counter, not a client-side check.
**When to use:** D-08/D-09's "membantu" marking — reply-level, any user, one mark per user per reply, toggleable.
**Example:**
```typescript
// Source: backend/src/db/schema/aiDailySummary.schema.ts (existing, in repo)
// — same `unique()` composite-constraint syntax, different two columns
import { pgTable, uuid, timestamp, unique } from "drizzle-orm/pg-core";
import { communityReplies } from "./communityReply.schema.js";
import { users } from "./users.schema.js";

export const communityReplyHelpful = pgTable(
  "community_reply_helpful",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    replyId: uuid("reply_id").notNull().references(() => communityReplies.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("uq_community_reply_helpful_reply_user").on(table.replyId, table.userId),
  ],
);
```
Toggle logic in the service layer: attempt to find the existing row (`userId`, `replyId`); if found, `DELETE` it (unmark) and return `marked: false`; if not found, `INSERT` it (mark) and return `marked: true`. The `helpfulCount` shown on `PostCard`/`ReplyItem` is computed via `COUNT(*)` from this join table (or a Drizzle `count()` aggregate query), never a denormalized counter column that could drift.

### Pattern 3: Thin controller → Zod-validated service → IDOR-safe repository
**What:** Controllers only parse `req`/call service/`res.json()`/`next(err)`. All Zod schemas and business rules live in the service. All repository functions take `userId` as the first parameter and always include it in the `WHERE` clause.
**When to use:** Every new endpoint in this phase.
**Example:**
```typescript
// Source: backend/src/controllers/labResult.controller.ts (existing, in repo)
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
`community.controller.ts::archivePost` should be structurally identical, substituting `communityPostService.archivePost` and the message `"Postingan tidak ditemukan"`.

### Pattern 4: Node native test runner with injectable-core services
**What:** Services export a Zod schema plus an underscore-prefixed `_xxxCore` function that accepts injected dependencies (insert fn, encrypt fn, etc.) so tests run without a real DB connection.
**When to use:** All new `*.service.test.ts` files this phase — matches `labResult.service.test.ts`'s `createInMemoryLabStore()` pattern exactly.
**Example:** See `backend/src/test/labResult.service.test.ts` (in repo) — build `communityPost.service.test.ts` with an in-memory store the same way, no real Postgres needed for unit tests.

### Anti-Patterns to Avoid
- **Denormalized `helpfulCount` integer column, incremented client-side or via a non-transactional `UPDATE ... SET count = count + 1`:** Loses the one-mark-per-user guarantee and can drift/race under concurrent requests. Use the join table + `COUNT(*)` (Pattern 2).
- **`dangerouslySetInnerHTML` anywhere in `components/komunitas/` or `components/edukasi/`:** The entire codebase currently has zero uses of this API (verified via grep) — introducing it for this feature alone would be the single biggest regression against the project's existing (accidental-by-omission but real) XSS posture. Render all user/seeded text as plain JSX text children.
- **Hard `DELETE FROM community_posts`:** Violates COMMUNITY-03 explicitly. Even an admin/cleanup script must never issue a real DELETE against this table in application code.
- **Auto-filtering the community feed to the viewer's own therapy method on load:** Explicitly rejected by D-06 — default view is unfiltered/all, user manually narrows.
- **Restricting "membantu" marking to the original poster selecting a single "best answer":** Explicitly rejected by D-08 — this is a PRD-wording deviation the user confirmed; do not "correct" it back toward PRD §8.6's literal "Jumlah Upvote" (post-level) language.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Preventing double "membantu" marks per user | A client-side disabled-button flag or a `Set` checked only in React state | DB-level `unique(reply_id, user_id)` composite constraint (Pattern 2) | Client-only dedup is trivially bypassed by a second browser tab, a replayed request, or a race between two rapid clicks before state updates — D-09 explicitly requires DB-level enforcement |
| XSS protection for post/reply/article text | A custom regex-based HTML stripper (`.replace(/<[^>]*>/g, '')`) | React's default JSX text-node escaping — i.e., simply never route this content through `dangerouslySetInnerHTML`, `innerHTML`, or a templating engine that doesn't auto-escape | Regex-based tag-stripping is a well-known-broken approach (fails on malformed/obfuscated tags, event handler attributes, encoded entities) — the correct "don't hand-roll" answer here is "let the framework's default behavior do it," not "write a sanitizer," since a real sanitizer library is unnecessary for plain-text-only input in this phase's scope |
| Filtering education content by multiple therapy tags | Client-side `.filter()` over an unbounded fetched-all dataset that will grow with every future content addition | Server-side `WHERE metode_terapi = ANY($1)` (or `IN`) in `educationContent.repository.ts`, mirroring `labResult.repository.ts::findByUser`'s `options` pattern | Keeps the filtering logic in one place, consistent with every other filterable list in this codebase, and doesn't force the client to download content that will never render |
| Sort-order / newest-first ordering | Client-side `.sort()` after fetch | `ORDER BY created_at DESC` in the repository query (Drizzle `desc()`) | Matches `labResult.repository.ts::findByUser`'s `.orderBy(desc(...))` convention; also required if pagination is ever added later — client-side sort silently breaks once pagination is introduced |

**Key insight:** Nearly every "hand-roll risk" in this phase is really a "don't deviate from the pattern already proven correct in Phases 2-5" risk. The one place a genuinely new mechanism is needed (the helpful-toggle join table) still has a directly copy-pasteable syntax precedent already living in this repo (`aiDailySummary.schema.ts`).

## Common Pitfalls

### Pitfall 1: Treating community/education content as "sensitive health data" and over-encrypting it
**What goes wrong:** A well-intentioned implementer, having seen `fluid_log`/`medication_log`/`lab_result` all use `encrypt()`/`decrypt()` from `backend/src/lib/encryption.ts`, applies the same pattern to `community_posts.isi` or `education_content.body`.
**Why it happens:** Pattern-matching on "every text column in this app gets encrypted" without checking which fields the PRD/CLAUDE.md actually classify as sensitive health data (fluid, medication, lab — explicitly named) versus public-by-design social/reference content.
**How to avoid:** Community posts are inherently public-to-other-users content (the whole point is peer visibility) — encrypting them application-side would require decrypting for every other viewer anyway, providing zero confidentiality benefit while adding real complexity (every list/feed query would need N decrypt calls). Education content is static seeded reference material, not user data at all. Do not import `encrypt`/`decrypt` into any Phase 6 service.
**Warning signs:** A migration adding `encrypt()` calls to `communityPost.service.ts`; a `catatan`-style ciphertext comment appearing in `communityPost.schema.ts`.

### Pitfall 2: Skipping the own-post ownership check on archive, trusting a client-supplied flag
**What goes wrong:** `archivePost(postId)` doesn't verify `req.user.id` matches the post's `user_id` before setting `diarsipkan = true`, allowing any authenticated user to archive anyone else's post (IDOR).
**Why it happens:** Easy to forget when the happy-path UI only ever shows the archive button on the viewer's own posts — the backend must independently enforce this, since the "archive own post" phrase is a security requirement, not just a UI affordance.
**How to avoid:** Follow `labResult.repository.ts::archiveById`'s exact WHERE-clause pattern: `and(eq(userId, req.user.id), eq(id, postId))` — if the row doesn't match both conditions, the query returns 0 rows and the service should treat it as 404, not silently succeed on someone else's row.
**Warning signs:** A repository function signature for archive that only takes `postId`, no `userId` parameter.

### Pitfall 3: Rendering community/education content with `dangerouslySetInnerHTML` "just to support line breaks" or future markdown
**What goes wrong:** A developer wants multi-paragraph post bodies to render with proper `<br>`/`<p>` breaks and reaches for `dangerouslySetInnerHTML` on user-supplied text, reopening a stored-XSS hole CLAUDE.md explicitly calls out as a real risk in this exact feature area.
**Why it happens:** `<Textarea>` input naturally contains `\n` characters, and CSS `white-space: pre-wrap` (not `dangerouslySetInnerHTML`) is the correct, safe way to preserve line breaks in plain text — but this isn't always obvious to someone reaching for a "quick fix."
**How to avoid:** Use `className="whitespace-pre-wrap"` (Tailwind) on the text-rendering element for post/reply/article body content — this preserves user-typed line breaks while keeping the content as an auto-escaped React text node. Never introduce a markdown parser or `dangerouslySetInnerHTML` in this phase.
**Warning signs:** Any `import ... from "dompurify"` or `dangerouslySetInnerHTML=` appearing in a diff touching `components/komunitas/` or `components/edukasi/`.

### Pitfall 4: Silently "correcting" D-08's reply-level, open-to-everyone "membantu" model back toward PRD §8.6's post-level "Jumlah Upvote" wording
**What goes wrong:** A planner or implementer, reading PRD.md §8.6 literally, builds post-level upvoting (or "OP selects one best answer") instead of what the user explicitly confirmed during `/gsd-discuss-phase` (D-08/D-09: reply-level, any user, toggleable, one-per-user).
**Why it happens:** PRD.md is generally treated as ground truth, and this is one of the rare cases where a locked CONTEXT.md decision deliberately deviates from it — that deviation is easy to miss without re-reading D-08's explicit callout.
**How to avoid:** Treat CONTEXT.md's D-08/D-09 as the authoritative spec for this specific mechanic — the "membantu" toggle lives on `community_replies`, not `community_posts`, and any authenticated user (not just the post's author) can toggle it on any reply.
**Warning signs:** A schema/migration adding a `jumlah_upvote` or `helpful_count` column directly to `community_posts` instead of `community_replies` + a join table.

### Pitfall 5: Introducing a 4th persistent service/container for community/education (e.g., a search index like Elasticsearch, or Redis-backed caching)
**What goes wrong:** MVP feed/filter/sort performance concerns lead someone to reach for a caching layer or dedicated search service.
**Why it happens:** Standard "Quora-style forum at scale" advice often assumes search/caching infrastructure, but this is explicitly out of scope per CLAUDE.md's hard 3-container constraint (Frontend/Backend/Postgres only).
**How to avoid:** For MVP scope (small seeded content set, small user-generated community), plain Postgres `WHERE`/`ORDER BY` queries with appropriate indexes (see Code Examples) are more than sufficient — no search/cache infrastructure is warranted or permitted.
**Warning signs:** Any `docker-compose.yml` diff adding a new `services:` entry, or a new npm dependency for `elasticsearch`, `algolia`, `redis`, etc.

## Code Examples

### community_posts schema (new)
```typescript
// New file: backend/src/db/schema/communityPost.schema.ts
// Follows labResult.schema.ts conventions (diarsipkan boolean, indexes on
// (userId, ...) and (filterable columns), no encryption — public social content).
import { pgTable, uuid, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const communityPosts = pgTable(
  "community_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
    judul: text("judul").notNull(),
    isi: text("isi").notNull(),
    // 'pertanyaan' | 'berbagi_pengalaman' | 'informasi' (D-05 filter chips)
    kategori: text("kategori").notNull(),
    // 'CAPD' | 'HD' | 'Transplantasi' | 'Umum' (D-06 filter — matches
    // onboarding.service.ts's therapyEnum values, plus 'Umum' per D-06)
    metodeTerapi: text("metode_terapi").notNull(),
    diarsipkan: boolean("diarsipkan").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_community_posts_created").on(table.createdAt), // D-07 newest-first feed
    index("idx_community_posts_kategori").on(table.kategori, table.diarsipkan),
    index("idx_community_posts_metode").on(table.metodeTerapi, table.diarsipkan),
    index("idx_community_posts_user").on(table.userId), // own-post lookups for archive
  ],
);
```

### Feed query with category + therapy filters, newest-first (D-05/D-06/D-07)
```typescript
// New file: backend/src/repositories/communityPost.repository.ts
// Pattern: follows labResult.repository.ts::findByUser's `options` shape,
// but NOT scoped to a single userId (feed shows all users' non-archived posts).
import { and, eq, desc } from "drizzle-orm";
import { db } from "../lib/db.js";
import { communityPosts } from "../db/schema/communityPost.schema.js";

export async function findFeed(options?: {
  kategori?: string;
  metodeTerapi?: string;
}) {
  const conditions = [eq(communityPosts.diarsipkan, false)];
  if (options?.kategori) conditions.push(eq(communityPosts.kategori, options.kategori));
  if (options?.metodeTerapi) conditions.push(eq(communityPosts.metodeTerapi, options.metodeTerapi));

  return db
    .select()
    .from(communityPosts)
    .where(and(...conditions))
    .orderBy(desc(communityPosts.createdAt)); // D-07: newest-first
}
```

### Toggle "membantu" (mark/unmark) — service-layer logic
```typescript
// New file: backend/src/services/communityReply.service.ts (excerpt)
// Pattern: check-then-act against the unique join table; DB constraint is the
// real guarantee, this is just the toggle UX logic.
import { and, eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { communityReplyHelpful } from "../db/schema/communityReplyHelpful.schema.js";

export async function toggleHelpful(userId: string, replyId: string): Promise<{ marked: boolean }> {
  const existing = await db
    .select()
    .from(communityReplyHelpful)
    .where(and(eq(communityReplyHelpful.userId, userId), eq(communityReplyHelpful.replyId, replyId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(communityReplyHelpful)
      .where(and(eq(communityReplyHelpful.userId, userId), eq(communityReplyHelpful.replyId, replyId)));
    return { marked: false };
  }

  await db.insert(communityReplyHelpful).values({ userId, replyId });
  return { marked: true };
}
```

### Safe plain-text rendering with preserved line breaks (frontend)
```tsx
// components/komunitas/PostDetail.tsx (excerpt) — no dangerouslySetInnerHTML.
// React auto-escapes {post.isi} as a text node; whitespace-pre-wrap preserves
// user-typed newlines visually without needing HTML <br> tags.
<p className="font-sans whitespace-pre-wrap" style={{ fontSize: 13, color: "#1a2e2c" }}>
  {post.isi}
</p>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| N/A — this is a greenfield feature area within an already-current stack | Reuse Phases 2-5's established layering (repository/service/controller/route, archive-not-delete, Node native test runner) | N/A | No stack drift risk — every dependency involved (Drizzle 0.45.x, Express 5.2.x, Next.js 16.2.x, Zod 3.24.x) is the same version already pinned and verified in this repo's `package.json` files |

**Deprecated/outdated:** None applicable — no external library upgrade decisions are in scope for this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `sanitize-html` (npm) is a legitimate, actively maintained package — package name recalled from training knowledge, cross-checked via `npm view` (v2.17.5, published 2026-06-10) but not verified via official docs/Context7, and NOT recommended for installation this phase | Package Legitimacy Audit, Alternatives Considered | Low — this package is explicitly NOT part of the recommended implementation; risk only materializes if a future phase installs it without re-verifying |
| A2 | `isomorphic-dompurify` (npm) is a legitimate package — same provenance caveat as A1 | Package Legitimacy Audit, Alternatives Considered | Low — same reasoning as A1, not recommended for this phase |
| A3 | Therapy-method enum values for `community_posts.metodeTerapi` / `education_content.metodeTerapi` should be `'CAPD' | 'HD' | 'Transplantasi' | 'Umum'`, matching `backend/src/services/onboarding.service.ts`'s existing `therapyEnum` plus a new `'Umum'` value introduced by D-06/UI-SPEC | Code Examples, Architectural Responsibility Map | Medium — if the planner instead invents a different casing/spelling (e.g. `'Hemodialisis'` matching `seed-demo.ts`'s display-string usage in `riwayatTerapi`, rather than `'HD'` matching the enum), filter queries between community/education and the user's `users.metodeTerapiAktif` field would silently fail to match. Confirmed via direct grep of `onboarding.service.ts` in this session — HIGH confidence, not purely assumed, but flagged here because it affects a brand-new enum surface (`'Umum'`) that has no prior precedent in the codebase. |
| A4 | No pagination is needed for the community feed or reply list at MVP scale — a defensive `LIMIT` (not full cursor pagination) is sufficient, matching every existing list-fetching component in this codebase (none of which paginate) | Alternatives Considered, Don't Hand-Roll | Low-Medium — if the seeded/real community data volume grows faster than expected during grading/demo, an unpaginated feed could become slow; mitigated by the defensive `LIMIT` and the fact this is an academic MVP with a small expected userbase |
| A5 | Community post/reply content and education content should NOT be application-layer encrypted (unlike fluid/medication/lab data) | Common Pitfalls (Pitfall 1) | Medium — if a stricter reading of NFR-02 ("data kesehatan sensitif... wajib dienkripsi") is later applied to community posts (which may incidentally contain health details shared by patients), this could require retrofitting encryption. Current reasoning: PRD.md explicitly names `fluid_log`/`medication_log`/`lab_result` as the sensitive entities requiring encryption, and community content is inherently peer-visible (encrypting-then-decrypting-for-every-viewer provides no confidentiality benefit) — this should be confirmed with the user/PO if genuinely ambiguous, but is not re-litigated here since it wasn't raised as a concern in CONTEXT.md's discussion. |

## Open Questions (RESOLVED)

1. **Exact set/count of seeded education articles (D-10's "Claude's Discretion" scope)** — RESOLVED
   - What we know: Content must be real, substantive Bahasa Indonesia, non-diagnostic, calm tone (matching `aiDisclaimer.ts` tone), covering CAPD/HD/Transplantasi/Umum, in text+static-image format (no video, D-11), authored via seed script (D-12).
   - What's unclear: Exact article count and length per therapy method — CONTEXT.md explicitly defers this sizing decision to "researcher/planner."
   - Recommendation: Size to roughly 2-3 articles per therapy method category (CAPD/HD/Transplantasi) covering at minimum: (a) diet/fluid lifestyle guidance, (b) an exercise/activity guide (panduan senam, per D-11's text+image format), (c) a general therapy-adherence/education piece — plus 1-2 "Umum" articles applicable to all patients. This gives the planner a concrete Wave/task-sizing target (~8-10 articles total) without overcommitting content-writing effort in an MVP phase. Final count is the planner's call, informed by wave/task budget.
   - Resolution: Adopted by plan 06-02 Task 3 (seeds ~8-10 articles across CAPD/HD/Transplantasi/Umum per the recommendation above).

2. **Whether `education_content` needs a `kategori` field distinct from `metodeTerapi` (e.g., "Artikel" vs "Panduan Senam" vs "Informasi Gaya Hidup" as a content-type axis, separate from the CAPD/HD/Transplantasi/Umum therapy-method axis)** — RESOLVED
   - What we know: EDU-01 requires filtering "by active therapy method" specifically; UI-SPEC's `EducationCard.tsx` inventory mentions "flat SVG/illustration per category," implying a category concept exists visually.
   - What's unclear: CONTEXT.md and UI-SPEC don't explicitly confirm a second filterable axis (content-type) beyond therapy method — EDU-01's requirement text only names therapy-method filtering as a hard requirement.
   - Recommendation: Model `education_content` with both `metodeTerapi` (required filter, EDU-01) and a `tipeKonten` field ('artikel' | 'panduan_senam' | 'gaya_hidup') for card iconography/grouping (per D-11's format distinction and the UI-SPEC's "buku/artikel per kategori" illustration note), but treat `tipeKonten` as a display/grouping concern only — not a second mandatory filter chip row, since only therapy-method filtering is a locked requirement.
   - Resolution: Adopted by plan 06-01 (schema) and 06-02 (service) — `tipeKonten` added as a display-only field, not a mandatory filter chip row, exactly as recommended.

## Environment Availability

No external service/tool dependencies beyond what's already running in this repo's 3-container setup (Node 20, Postgres 16, npm). No new environment variables, no new Docker services, no new CLI tools required for this phase.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend + seed script execution | Yes (confirmed via `node -e process.version` in this session) | v20.20.2 | — |
| PostgreSQL (via existing `DATABASE_URL`) | New tables/migrations | Assumed available (existing Docker Compose service, unchanged) | 16 (pinned per CLAUDE.md) | — |
| `pip`/`pip3` | slopcheck installation (research-time tooling only, not a runtime dependency of the app) | No (neither binary found in this research environment) | — | Package Legitimacy Audit marked all considered packages `[ASSUMED]`; no runtime impact since no new packages are actually recommended for installation |

**Missing dependencies with no fallback:** none blocking implementation.
**Missing dependencies with fallback:** `pip`/`pip3` (research-tooling only) — handled via the graceful-degradation ASSUMED-tagging protocol, no impact on phase execution.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js native test runner (`node:test` + `node:assert`) — no Jest/Vitest/Mocha installed |
| Config file | none — invoked directly via `npm test` script: `node --import tsx --test src/test/*.test.ts` |
| Quick run command | `cd backend && node --import tsx --test src/test/communityPost.service.test.ts` |
| Full suite command | `cd backend && npm test` (runs all `src/test/*.test.ts`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMMUNITY-01 | Create post with title/content/category/therapy-tag, Zod validation rejects missing fields | unit | `node --import tsx --test src/test/communityPost.service.test.ts` | ❌ Wave 0 |
| COMMUNITY-02 | Reply to post; mark reply as "membantu" (toggle, one-per-user via unique constraint) | unit | `node --import tsx --test src/test/communityReply.service.test.ts` | ❌ Wave 0 |
| COMMUNITY-03 | Archive own post (diarsipkan=true, IDOR-safe — other users' archive attempts return null/404); never hard-deleted (no DELETE statement exists in repository) | unit | `node --import tsx --test src/test/communityPost.service.test.ts` | ❌ Wave 0 (same file as COMMUNITY-01, additional test cases) |
| EDU-01 | Browse/filter education content by therapy method; filter query returns only matching rows | unit | `node --import tsx --test src/test/educationContent.service.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --import tsx --test src/test/<touched-file>.test.ts`
- **Per wave merge:** `cd backend && npm test` (full suite — verifies no regression in Phases 1-5's existing tests)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `backend/src/test/communityPost.service.test.ts` — covers COMMUNITY-01, COMMUNITY-03 (in-memory store pattern per `labResult.service.test.ts`)
- [ ] `backend/src/test/communityReply.service.test.ts` — covers COMMUNITY-02 (including toggle-twice-returns-to-unmarked test case)
- [ ] `backend/src/test/educationContent.service.test.ts` — covers EDU-01 filter behavior
- [ ] No new shared fixtures/conftest-equivalent needed — this test runner has no fixture-sharing convention beyond each file's own in-memory store helper function, matching existing test files
- [ ] No framework install needed — `node:test` is built into Node.js 20, already in use

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Reuse existing `authenticate` middleware (JWT Bearer token, `req.user.id`) — no new auth mechanism introduced |
| V3 Session Management | No (unchanged) | No new session logic in this phase |
| V4 Access Control | Yes | Own-post-only archive enforced server-side via `and(eq(userId), eq(id))` WHERE clause (IDOR prevention, Pattern 1/3); any-user reply/helpful-toggle is an intentional open-access model (D-08), not a broken access control gap — document this distinction clearly so a security reviewer doesn't flag it as IDOR |
| V5 Input Validation | Yes | Zod schemas for post/reply create payloads (title/content length limits, category/therapy-tag enum validation) — mirrors `createLabSchema` conventions |
| V6 Cryptography | No | Community/education content is not sensitive health data per PRD's explicit entity list (`fluid_log`/`medication_log`/`lab_result`) — no encryption applies here (see Common Pitfalls Pitfall 1); do not hand-roll or reuse `encrypt()`/`decrypt()` for this feature |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS via community post/reply/education content rendered unsafely | Tampering / Elevation of Privilege (session hijack via script injection) | Never use `dangerouslySetInnerHTML`; render all user/seeded text as plain React JSX text children (auto-escaped); use `whitespace-pre-wrap` CSS for line-break preservation instead of HTML `<br>` injection (Pitfall 3, Code Examples) |
| IDOR on archive-own-post endpoint (archiving another user's post by guessing/enumerating post IDs) | Tampering / Elevation of Privilege | Server-side `userId` + `id` compound WHERE clause on every mutating query (Pattern 1/3, Pitfall 2) — never trust a client-supplied ownership flag |
| Double/repeated "membantu" mark inflation (spamming the mark endpoint to fake a higher helpful count) | Tampering (data integrity) | DB-level `unique(reply_id, user_id)` constraint (Pattern 2) — the toggle service logic checks-then-acts, but the constraint is the actual enforcement backstop even under race conditions |
| Unbounded post/content length causing storage/rendering DoS or UI breakage | Denial of Service | Zod `.max()` length constraints on `judul`/`isi` fields (mirror `createLabSchema`'s `.max(2000, ...)` pattern for `catatan`) |
| Enumeration of `education_content` or `community_posts` via unauthenticated endpoints (education content is arguably public info, but community posts should still require auth per app-wide convention) | Information Disclosure | All community routes stay behind `authenticate` middleware (matches every other route file in this repo — no exceptions currently exist for any authenticated-app feature); confirm with planner whether education content read-endpoints should also require auth (recommended: yes, for consistency with the rest of the app, even though the content itself isn't sensitive — CAREGIVER-01's shared-account model means an unauthenticated read path isn't needed) |

## Sources

### Primary (HIGH confidence)
- Direct repository inspection (Read/Bash/grep tool calls in this session) of: `backend/src/db/schema/labResult.schema.ts`, `anomalyAlert.schema.ts`, `aiDailySummary.schema.ts`, `users.schema.ts`, `therapyHistory.schema.ts`, `loginAttempts.schema.ts`, `pushSubscriptions.schema.ts`, `schema/index.ts`; `backend/src/repositories/labResult.repository.ts`; `backend/src/controllers/labResult.controller.ts`; `backend/src/routes/labResult.routes.ts`; `backend/src/services/labResult.service.ts`; `backend/src/services/onboarding.service.ts` (therapy enum); `backend/src/middleware/authenticate.ts`, `errorHandler.ts`; `backend/src/app.ts`; `backend/src/lib/encryption.ts`; `backend/src/lib/aiDisclaimer.ts` + frontend counterpart; `backend/src/seed/seed-demo.ts`; `backend/src/test/labResult.service.test.ts`; `backend/package.json`, `frontend/package.json`; `backend/drizzle.config.ts`; `frontend/app/(app)/edukasi/page.tsx`, `frontend/app/(app)/catatan/page.tsx`; `frontend/lib/nav.ts`, `frontend/lib/api.ts`; `frontend/components/anomaly/AlertHistoryList.tsx`; `.planning/config.json`
- `npm view sanitize-html version` / `npm view isomorphic-dompurify version` — executed this session, ground-truth registry versions (though package legitimacy audit still tags provenance as ASSUMED per protocol, since these were not recommended and not discovered via Context7/official docs)

### Secondary (MEDIUM confidence)
- None — all findings in this research were either directly verified against the repo (HIGH) or explicitly flagged as ASSUMED with reasoning (see Assumptions Log)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new packages needed; every library referenced is already installed and version-pinned in this repo's own `package.json` files, directly read this session
- Architecture: HIGH - every pattern recommended (archive-not-delete, IDOR-safe repository signature, thin-controller/service/repository layering, composite-unique join table) has a directly-cited, currently-shipping precedent in this exact codebase
- Pitfalls: HIGH - grounded in direct codebase inspection (e.g., confirmed zero `dangerouslySetInnerHTML` usages via grep) plus explicit CONTEXT.md decisions (D-06, D-08, D-09) that name the exact deviation risks to avoid

**Research date:** 2026-07-04
**Valid until:** 30 days (stable internal codebase conventions; no fast-moving external dependency in scope)
