---
phase: 06-community-education
fixed_at: 2026-07-04T14:14:13Z
review_path: .planning/phases/06-community-education/06-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 2
skipped: 1
status: partial
---

# Phase 06: Code Review Fix Report (Info-severity findings)

**Fixed at:** 2026-07-04T14:14:13Z
**Source review:** .planning/phases/06-community-education/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (IN-01, IN-02, IN-03 — the 6 Critical/Warning findings WR-01..WR-06 were already fixed and committed in a prior pass, see `06-REVIEW-FIX.md`)
- Fixed: 2
- Skipped: 1 (already resolved as a side effect of the prior WR-01 fix — no code change needed)

## Fixed Issues

### IN-01: Zod enum validation falls back to English default message for actual invalid-enum values

**Files modified:** `backend/src/services/communityPost.service.ts`, `backend/src/services/educationContent.service.ts`
**Commit:** e834e6b
**Applied fix:** Read both files' current enum schemas (`createPostSchema`'s `kategori`/`metodeTerapi`, and `listQuerySchema`'s `metodeTerapi`/`tipeKonten`). Zod v3.25.76 (the installed version) disallows combining `errorMap` with `required_error`/`invalid_type_error` on the same schema, so the existing shorthand had to be fully replaced rather than supplemented. Added a small local `enumErrorMap`/`invalidEnumErrorMap` helper in each file that handles all three Zod issue codes (`invalid_enum_value`, missing/`undefined` data, `invalid_type`) and returns a Bahasa Indonesia message for each, preserving the original "wajib diisi" / "tidak valid" wording for the cases that were already localized. Verified via a manual `safeParse` probe that:
  - missing `kategori` → "Kategori wajib diisi" (unchanged)
  - wrong-type `kategori` (e.g. a number) → "Kategori tidak valid" (unchanged)
  - correct-type but invalid value `kategori: "spam"` → "Kategori tidak valid" (previously the untranslated Zod default — this is the fix)
  - same pattern verified for `educationContent.service.ts`'s `metodeTerapi` filter enum
  All 8 existing tests in `communityPost.service.test.ts` and `educationContent.service.test.ts` still pass (no test asserted the old English default message). `listFeedQuerySchema`'s enums in `communityPost.service.ts` were intentionally left untouched — the finding's File: line only cited the `createPostSchema` enums, and scoping the fix to exactly what was flagged avoids touching unrelated validation paths.

### IN-03: Frontend `authFetch` failures collapse distinct error causes (network vs 401 vs validation) into one generic toast/error state

**Files modified:** `frontend/components/komunitas/CreatePostSheet.tsx`, `frontend/components/komunitas/CommunityFeed.tsx`, `frontend/components/edukasi/EducationList.tsx`, `frontend/components/komunitas/PostDetail.tsx`
**Commit:** 52468f6
**Applied fix:** Read `frontend/lib/api.ts` first to confirm `authFetch` already retries once internally on a 401 via `tryRefreshToken()` before rethrowing — meaning a 401 `ApiError` reaching a caller's `catch` block always means the session is genuinely expired, not a transient blip. Searched the existing codebase for a precedent (per the task's instruction to follow existing patterns rather than invent a new one) and found `frontend/app/(app)/profil/page.tsx`'s `fetchProfile` already special-cases `err?.status === 401` to redirect via `router.replace("/login")`. Applied the same `err instanceof ApiError && err.status === 401` check to all four catch blocks named in the finding:
  - `CreatePostSheet.tsx`'s `onSubmit` catch — added `useRouter` + `ApiError` import, toast "Sesi Anda telah berakhir. Silakan masuk kembali." then `router.replace("/login")`.
  - `CommunityFeed.tsx`'s `fetchPosts` catch — added `useRouter` + `ApiError` import, redirect via `router.replace("/login")` instead of setting the generic `hasError` state.
  - `EducationList.tsx`'s `fetchItems` catch — same pattern as `CommunityFeed.tsx`.
  - `PostDetail.tsx`'s `handleSubmitReply` and `handleArchive` catches — this file already imported `useRouter`/`ApiError` (used elsewhere for 404 handling on `fetchPost`), so only the two catch blocks were extended with the 401 branch.
  All other (network/validation) failures still fall through to the pre-existing generic toast/inline message — only the 401/session-expiry case was carved out, per the finding's explicit "Distinguish at least the 401/session-expiry case" scope.

## Skipped Issues

### IN-02: `toggleHelpful` service's `replyId` type guard is unreachable dead code

**File:** `backend/src/services/communityReply.service.ts:108-110` (per original REVIEW.md line numbers — since shifted)
**Reason:** Already resolved as a side effect of the prior WR-01 fix pass (commit `442eba4`, "fix(06): WR-01 validate route-param ids as UUIDs before hitting the DB"). Reading the current file confirms the old `if (typeof replyId !== "string" || replyId.length === 0) throw new Error(...)` dead-code guard no longer exists — it was replaced by the `isValidUuid(replyId)` check added for WR-01, and the code even carries an explicit comment noting this: "this also replaces the old dead-code typeof/length guard". Confirmed via `grep` that no `typeof replyId`/`replyId.length` pattern remains anywhere in the file, and the existing `communityReply.service.test.ts` suite still passes unchanged. No commit was made for this finding since there was no remaining code to fix.
**Original issue:** `if (typeof replyId !== "string" || replyId.length === 0) throw new Error(...)` could never trigger through the real Express request path (route params are always non-empty strings by construction) — a compile-time-only guard providing no runtime value in production.

## Verification

- `cd backend && npm test`: 194 tests, 183 pass, 11 fail — identical baseline to the one documented in `06-REVIEW-FIX.md` after the WR-01..06 pass (the same 5 pre-existing failing suites: `activity schema validation`, `activity _createActivityCore`, `fluidLog _createEntryCore`, `lab trend queries`, `dispatchDueReminders` — all unrelated to phase 06). No new failures introduced by IN-01's changes.
- `cd backend && npx tsc --noEmit`: no errors in either file touched by IN-01 (`communityPost.service.ts`, `educationContent.service.ts`). Remaining errors are the same pre-existing ones confined to unrelated controllers/services and `src/test/debug_*.ts` scratch files, none touched by this pass.
- `cd frontend && npx tsc --noEmit`: clean, zero errors, across the whole project (including the 4 files touched by IN-03).
- `cd frontend && npm run build`: Turbopack (the default bundler) failed with an unrelated environment error (`Symlink [project]/frontend/node_modules is invalid, it points out of the filesystem root`) — caused by this agent's isolated git worktree living under `/tmp` while `node_modules` is symlinked back to the main repo under `/mnt/c/...` (a different filesystem root from Turbopack's perspective), not by any code change. Per CLAUDE.md's documented fallback ("if it does, fall back to `next build --no-turbo` for the production build step only"), re-ran with `next build --webpack`, which **succeeded** (exit code 0), producing all 19 routes including `/edukasi`, `/edukasi/komunitas`, and `/edukasi/komunitas/[id]` — the routes that render the components touched by IN-03.

---

_Fixed: 2026-07-04T14:14:13Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
