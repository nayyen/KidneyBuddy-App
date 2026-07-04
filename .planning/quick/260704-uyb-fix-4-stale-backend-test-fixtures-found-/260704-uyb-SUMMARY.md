---
phase: quick
plan: 260704-uyb
subsystem: testing
tags: [node-test-runner, zod, tdd-fixtures, backend]

# Dependency graph
requires:
  - phase: 06 (community-education)
    provides: milestone-audit context that surfaced these 4 stale test files
provides:
  - Green backend test suite for activity.service.test.ts, fluid.service.test.ts, reminderDispatch.test.ts
  - Documented Docker-Postgres run requirement for labUploadTrend.test.ts
affects: [future audits of backend test suite health]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Injectable-deps test seam contract (_createActivityCore, DispatchDeps) is the binding source of truth for test fixtures — when production evolves the contract, update the test, never revert production"

key-files:
  created: []
  modified:
    - backend/src/test/activity.service.test.ts
    - backend/src/test/fluid.service.test.ts
    - backend/src/test/reminderDispatch.test.ts
    - backend/src/test/labUploadTrend.test.ts

key-decisions:
  - "Also fixed a second stale assertion in reminderDispatch.test.ts (p.reminderId no longer exists on the grouped-batch notification payload) discovered while fixing the makeDeps() mock in the same task/file — Rule 1 auto-fix, not called out explicitly in the plan text but directly blocking the task's own verification step."

patterns-established: []

requirements-completed: [MAINT-TESTS]

# Metrics
duration: ~20min
completed: 2026-07-04
---

# Quick Task 260704-uyb: Fix 4 Stale Backend Test Fixtures Summary

**Re-aligned 4 drifted backend test files (activity, fluid, reminderDispatch, labUploadTrend) with their current production contracts — zero production code changes, full green suite restored.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-04
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- `activity.service.test.ts` now matches the `estimasiMenit` schema and 3-arg `_createActivityCore(userId, rawPayload, insertFn)` signature (no more stale `estimasiSelesai` HH:mm fixtures or extra encrypt/decrypt args).
- `fluid.service.test.ts` fixture uses a valid `sumber` enum value (`lainnya`) instead of the non-existent `minuman`.
- `reminderDispatch.test.ts`'s `makeDeps()` now provides `insertMedLog`/`insertDialysisLog` matching the current `DispatchDeps` type, and a second stale assertion (`reminderId` on the notification payload, which no longer exists after the grouped-batch notification refactor) was also fixed.
- `labUploadTrend.test.ts` header now documents that it requires a live Postgres connection and must be run via `docker exec` inside the backend container.

## Task Commits

Each task was committed atomically:

1. **Task 1: Align activity.service.test.ts with the estimasiMenit contract** - `6ae73af` (test)
2. **Task 2: Fix invalid sumber enum fixture + missing DispatchDeps mocks** - `c33c00d` (test)
3. **Task 3: Document Docker-Postgres run requirement in labUploadTrend.test.ts** - `2c35ce5` (docs)

**Plan metadata:** commit pending (docs, handled by orchestrator)

## Files Created/Modified
- `backend/src/test/activity.service.test.ts` - Schema fixtures use `estimasiMenit`; `_createActivityCore` calls use current 3-arg signature; obsolete past-time-rejection test repurposed into negative-`estimasiMenit`-rejection test
- `backend/src/test/fluid.service.test.ts` - `sumber: "minuman"` fixture changed to valid `sumber: "lainnya"`
- `backend/src/test/reminderDispatch.test.ts` - `makeDeps()` exposes `insertMedLog`/`insertDialysisLog`; `sendToAll` assertion checks `url` instead of the no-longer-existent `reminderId`
- `backend/src/test/labUploadTrend.test.ts` - Header docblock documents Docker-Postgres requirement and correct `docker exec` invocation; no test logic changed

## Decisions Made
- Production code is the source of truth throughout; every fix was applied to the test file, never to `activities.service.ts`, `fluid.service.ts`, or `reminderDispatch.job.ts`.
- Fixed a second, previously-undocumented stale assertion in `reminderDispatch.test.ts` (the `sendToAll` payload no longer carries `reminderId` — the job now sends one grouped-batch notification per user via `title`/`body`/`url` only) because it directly blocked Task 2's own verification command in the same file/task scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stale `reminderId` assertion in reminderDispatch.test.ts**
- **Found during:** Task 2 (fixing `makeDeps()` DispatchDeps mocks)
- **Issue:** The "calls sendToAll with correct title and reminderId" test asserted `p.reminderId === "rem-1"`, but current production (`reminderDispatch.job.ts`) sends a grouped-batch notification payload of `{ title, body, url }` only — `reminderId` was removed when the job switched to per-user batched notifications. This test was not called out in the plan's task text but is in the same file/task and blocked the task's verification command from passing.
- **Fix:** Renamed the test to "calls sendToAll with correct title and url" and replaced the `reminderId` assertion with `assert.strictEqual(p.url, "/catatan")`.
- **Files modified:** `backend/src/test/reminderDispatch.test.ts`
- **Verification:** `docker exec kidneybuddy-backend node --import tsx --test src/test/reminderDispatch.test.ts` → 6/6 pass
- **Committed in:** `c33c00d` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary to satisfy the plan's own verification command for reminderDispatch.test.ts; no production code touched; no scope creep beyond the file already in scope for Task 2.

## Issues Encountered
None beyond the deviation documented above.

## Final Verification

**Inside the backend container** (all 4 target files together, per plan's `<verification>` block):
```
docker exec kidneybuddy-backend node --import tsx --test src/test/activity.service.test.ts src/test/fluid.service.test.ts src/test/reminderDispatch.test.ts src/test/labUploadTrend.test.ts
```
Result: **42/42 tests pass, 0 fail** (10 suites: activity 8 tests, fluid 24 tests, reminderDispatch 6 tests, labUploadTrend 4 tests).

**From the host** (`cd backend && npm test`, full suite):
Result: **191/194 tests pass, 3 fail**. All 3 failures are in `labUploadTrend.test.ts`'s "lab trend queries" describe block (`getTrendData returns an array`, `getTrendData with unknown parameter returns empty array`, `getTrendData result items have TrendPoint shape`) — these hit the real Dockerized Postgres and have no network route from the host by design. This is the exact, pre-existing environment limitation Task 3 was scoped to document (not fix): the plan explicitly states "It passes 4/4 inside the backend container but fails from the host... this is an environment issue, NOT a code defect. No code fix." No other test file in the full 194-test suite regressed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Backend test suite is green for all 4 previously-stale files when run inside the backend container (the project's canonical test environment, since it has a live Postgres connection).
- Future audits will surface real regressions in these files rather than stale-fixture noise.
- No blockers. `labUploadTrend.test.ts`'s host-vs-container distinction is now self-documented in the file header for future contributors.

---
*Plan: 260704-uyb*
*Completed: 2026-07-04*

## Self-Check: PASSED

All 4 modified test files and the SUMMARY.md exist on disk; all 3 task commits (`6ae73af`, `c33c00d`, `2c35ce5`) verified present in git log.
