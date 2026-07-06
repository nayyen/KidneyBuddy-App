---
phase: quick/260706-epn
plan: 01
subsystem: api
tags: [reminders, beranda, express, node-test]

requires: []
provides:
  - "_computeNextUpcomingCore#findNext returns strictly today-only reminders (no tomorrow-fallback)"
  - "Regression tests locking today-only behavior across obat/capd/hd"
affects: [beranda-pengingat-berikutnya, reminders-service]

tech-stack:
  added: []
  patterns:
    - "node:test unit tests calling _computeNextUpcomingCore directly (no DB) for pure repository-core logic"

key-files:
  created: []
  modified:
    - backend/src/repositories/reminderSchedule.repository.ts
    - backend/src/test/reminderSchedule.findNextUpcoming.test.ts

key-decisions:
  - "Removed the tomorrow-fallback branch entirely rather than gating it further — the PO's bug report explicitly requires the card to be strictly today-only, so no reminder inactive for today's day-of-week should ever surface, matching the reported behavioral requirement exactly."

patterns-established: []

requirements-completed: [QUICK-260706-epn]

duration: 7min
completed: 2026-07-06
---

# Quick Task 260706-epn: Beranda Pengingat Berikutnya Today-Only Fix Summary

**Removed the tomorrow-fallback branch in `_computeNextUpcomingCore#findNext` so the beranda "Pengingat Berikutnya" card never surfaces a reminder that isn't active for today's day-of-week, for obat/CAPD/HD uniformly.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-07-06T10:42:24+07:00
- **Completed:** 2026-07-06T10:48:40+07:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added 4 new regression tests (Tests A/B/C/D) proving the bug and locking the fix, confirmed RED (3 failing) before the fix and GREEN (all passing) after.
- Removed the tomorrow-fallback branch inside `_computeNextUpcomingCore`'s `findNext()` helper: when today has no more upcoming reminders, the function now simply returns `[]`, driving the card's empty state instead of surfacing a not-active-today reminder.
- Confirmed the fix applies uniformly to obat, CAPD, and HD (all three flow through the same `findNext()` helper).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing regression tests for today-only behavior (all 3 types)** - `d9780e1` (test)
2. **Task 2: Remove tomorrow-fallback in findNext; make it strictly today-only; verify green** - `a7c3ec4` (fix)

**Plan metadata:** committed separately by the orchestrator (docs commit, not included in this executor run per constraints).

_Note: Task 1 is TDD (RED), Task 2 is the GREEN fix — no separate refactor commit was needed._

## Files Created/Modified
- `backend/src/repositories/reminderSchedule.repository.ts` - Removed the `tomorrowReminders`/`earliestTomorrow` fallback block inside `_computeNextUpcomingCore`'s `findNext()`; updated the inline comment to document the today-only behavior and note it subsumes the prior quick-260705-r8b past-due-today revert fix (no fallback path remains for that bug to occur through).
- `backend/src/test/reminderSchedule.findNextUpcoming.test.ts` - Added a new `describe("_computeNextUpcomingCore — today-only filtering (quick-260706-epn)")` block with Tests A (obat), B (capd), C (hd), and D (positive control), calling `_computeNextUpcomingCore` directly with the existing `makeReminder` helper — no DB access, no changes to the pre-existing describe block.

## Decisions Made
- Kept `tomorrowDay` in the `ctx` type/signature unchanged even though `findNext()` no longer uses it — avoids widening scope into `findNextUpcoming`'s call site and the `ctx` shape used elsewhere; the unused field is harmless (project's `tsconfig.json` has no `noUnusedLocals`/`noUnusedParameters`, so this causes no tsc error).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None specific to this task. `npx tsc --noEmit` surfaces pre-existing, unrelated errors in `debug_*.ts` scratch scripts and 2 controller files (confirmed via `git stash` on just the repository file — the same 63 lines of errors exist with or without this task's change), out of scope per the deviation rules' scope boundary; no errors were reported for `reminderSchedule.repository.ts` itself. The full backend suite (`node --import tsx --test src/test/*.test.ts`) passes 255/258, with the same 3 pre-documented container-only DB test failures (`labUploadTrend`/"lab trend queries", requires the Docker Postgres container) noted in prior SUMMARY.md entries (e.g. 260705-9n4, 260706-8zc) — unrelated to this change.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
No frontend changes were required — `PengingatBerikutnyaCard.tsx` already renders exactly what `/api/reminders/next` returns, so the fix is fully contained to the backend repository core. Pending: human browser verification that the beranda card now shows the empty state on a day with no more today-upcoming reminders, instead of a tomorrow reminder (deferred to the orchestrator/user, no checkpoint was defined in this plan since both tasks are `type="auto"`).

## Self-Check: PASSED

- FOUND: `backend/src/repositories/reminderSchedule.repository.ts`
- FOUND: `backend/src/test/reminderSchedule.findNextUpcoming.test.ts`
- FOUND commit: `d9780e1`
- FOUND commit: `a7c3ec4`

---
*Phase: quick/260706-epn*
*Completed: 2026-07-06*
