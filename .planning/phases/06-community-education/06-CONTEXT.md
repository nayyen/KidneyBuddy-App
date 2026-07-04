# Phase 6: Community & Education - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers two features under one combined nav tab: a Quora-style peer
community (create post, reply, mark a reply "membantu", archive own post) and a
therapy-filtered education content browser (articles, exercise guides,
lifestyle/food info). Per PRD v0.3, there is NO in-app Content Manager/admin role
— education content is pre-curated and seeded, not authored via UI.

</domain>

<decisions>
## Implementation Decisions

### Navigation & Page Structure
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

### Community Feed
- **D-05:** Single feed with pill-chip filters (not separate tabs per category).
  Filter chips: category (Semua/Pertanyaan/Berbagi Pengalaman/Informasi) — same
  horizontal-scroll pill pattern as D-02's sub-nav, for visual consistency.
- **D-06:** Therapy-method filter (CAPD/HD/Transplantasi/Umum) shows ALL posts by
  default, regardless of the viewing user's own active therapy method. User can
  narrow manually. Do NOT auto-filter to the user's own method on load.
- **D-07:** Default sort order is newest-first (chronological), not
  most-replied/most-helpful. Matches standard forum/discussion-board convention.

### "Membantu" Marking Mechanics
- **D-08:** Marking happens at the REPLY level (not the post level), and ANY
  user can mark ANY reply as "membantu" — not restricted to the original
  poster selecting one "best answer". This is a deliberate deviation from PRD
  §8.6's "Jumlah Upvote" wording, which described post-level upvotes; the
  user confirmed reply-level, open-to-everyone marking is what they want.
  Flag this deviation for the planner/researcher so it's not silently
  "corrected" back toward the PRD's literal wording.
- **D-09:** One mark per user per reply, toggleable (click again to unmark).
  Requires a join table (e.g. `community_reply_helpful` with a unique
  `(reply_id, user_id)` constraint) — not a bare integer counter — so dedup is
  enforced at the database level, not just client-side.

### Education Content
- **D-10:** No draft content exists from the user. Claude must write REAL,
  substantive Bahasa Indonesia seed content (not lorem-ipsum placeholders) —
  articles/guides covering CKD-relevant topics per therapy method (CAPD/HD/
  Transplantasi/Umum), grounded in the same calm, non-diagnostic tone already
  established for AI-generated content in Phase 5 (see `lib/aiDisclaimer.ts`
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
- Exact wording/copy of the seeded education articles (D-10) — Claude should
  write medically-reasonable, calm, non-diagnostic content but the specific
  article count, length, and topic breakdown per therapy method is left to
  the researcher/planner to size appropriately for an MVP phase.
- Exact DB schema shape for `community_posts`/`community_replies`/the
  helpful-join-table beyond the constraints in D-08/D-09.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Data Model
- `PRD.md` §8.6 (Data Entity 6: Postingan Komunitas) — CommunityPost attributes
  (judul, isi, kategori, metode terapi relevan, timestamp, jumlah upvote,
  status aktif/diarsipkan). Note: this phase's D-08 deviates from the
  "Jumlah Upvote"-on-post wording — reply-level "membantu" marking is what's
  actually being built; do not silently follow the PRD's literal schema here.
- `PRD.md` line 108 — explicit assumption removing the Content Manager role;
  education content is pre-curated/seeded by the team, not admin-authored.
- `PRD.md` FR-PS-013 — community post/reply/"membantu" interaction model
  (Quora-style).
- `.planning/REQUIREMENTS.md` §Community (COMMUNITY-01..03) and §Education
  (EDU-01) — the exact requirement IDs this phase must satisfy.
- `.planning/ROADMAP.md` §Phase 6 — goal, success criteria, mode (mvp).

### Design System
- `DESIGN_SYSTEM_KidneyBuddy_v3.md` — visual tokens (teal/amber/cream palette,
  Plus Jakarta Sans + DM Sans) for all new UI in this phase; no new tokens
  should be introduced without checking here first.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/app/(app)/edukasi/page.tsx` — already exists from Phase 5. Contains
  `LifestyleSuggestionCard` (keep as-is, do not remove) and a "Konten Segera
  Hadir" placeholder empty state explicitly marked as Phase 6 scope — this
  placeholder is what gets replaced by the real education content browser.
- `frontend/app/(app)/catatan/page.tsx` — the sub-tab pill-row pattern to mirror
  for D-02 (TABS array + pill styling), though this phase uses separate routes
  (D-03) rather than that file's local-state approach.
- `backend/src/seed/seed-demo.ts` — existing seed-script convention to follow
  for D-12's education content seeding.
- `frontend/lib/aiDisclaimer.ts` / `backend/src/lib/aiDisclaimer.ts` — tone/
  disclaimer patterns from Phase 5's AI content that should inform D-10's
  content-writing style (calm, non-diagnostic, plain Bahasa Indonesia).

### Established Patterns
- IDOR-safe repository pattern (userId always first param, always in WHERE
  clause) used throughout `backend/src/repositories/*.ts` — apply to new
  `communityPost`/`communityReply` repositories.
- Archive-not-delete pattern already exists for lab results (`LAB-04`,
  `labResult.repository.ts`'s `archiveById`) — COMMUNITY-03 ("archive own
  post, never hard-delete") should follow the same `diarsipkan`-boolean-flag
  shape, not a real DELETE.
- `frontend/lib/nav.ts` → `NAV_ITEMS` feeds both `BottomNav.tsx` (mobile) and
  `Sidebar.tsx`/`TopBar.tsx` (desktop) — no changes needed here since D-01
  keeps the nav item unchanged.

### Integration Points
- New backend: `backend/src/db/schema/communityPost.schema.ts`,
  `communityReply.schema.ts`, `communityReplyHelpful.schema.ts` (join table
  per D-09), `educationContent.schema.ts` — all greenfield, no existing tables
  to extend (unlike Phase 5 which built on Phase 1-4's schemas).
- New routes: `/api/community/*`, `/api/education/*` — no existing route
  files to extend.
- Frontend: new `/edukasi/komunitas` route (D-03) alongside the existing
  `/edukasi` route.

</code_context>

<specifics>
## Specific Ideas

- The user has no existing draft education content — Claude/researcher/planner
  must originate real, medically-reasonable Bahasa Indonesia content from
  scratch (D-10), not stub it out for later. This is a heavier content-writing
  lift than a typical phase and should be planned for explicitly (e.g. as its
  own task/wave), not treated as an afterthought inside a UI task.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. No admin/Content Manager UI was
requested (PRD already decided against it), no video/livestreaming was
requested, no additional community features (comments-on-comments, private
messaging, etc.) came up.

</deferred>

---

*Phase: 6-community-education*
*Context gathered: 2026-07-04*
