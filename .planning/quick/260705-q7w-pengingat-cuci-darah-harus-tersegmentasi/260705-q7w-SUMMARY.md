---
phase: quick-260705-q7w
plan: 01
subsystem: reminders
tags: [drizzle, postgres, express, nextjs, web-push, therapy-scoping]

requires:
  - phase: 02-fluid-medication-tracking-with-reminders
    provides: reminder_schedule table with jenis ('obat'/'capd'/'hd') column, node-cron push dispatch job
provides:
  - "Pure jenis-vs-metodeTerapiAktif scoping helper (therapyReminderScope.ts) as single source of truth"
  - "Non-destructive, reversible therapy-scoped reminder visibility across list/next-upcoming/beranda/push-dispatch"
  - "Transplantasi-gated /beranda Cuci Darah card"
affects: [reminders, dialysis-log, profile, beranda, push-dispatch]

tech-stack:
  added: []
  patterns:
    - "Query-time visibility filtering via pure jenis-vs-metode helper, instead of mutating a shared aktif column for two different concerns (user toggle vs therapy scoping)"

key-files:
  created:
    - backend/src/lib/therapyReminderScope.ts
    - backend/src/test/therapyReminderScope.test.ts
  modified:
    - backend/src/services/reminders.service.ts
    - backend/src/services/dialysisLog.service.ts
    - backend/src/services/profile.service.ts
    - backend/src/repositories/reminderSchedule.repository.ts
    - backend/src/test/therapyChange.reminders.test.ts
    - frontend/app/(app)/beranda/page.tsx

key-decisions:
  - "Replaced destructive aktif=false therapy-change deactivation with a pure query-time filter (isReminderVisibleForTherapy) — the aktif column is now exclusively the user-facing enable/disable toggle, never touched by therapy scoping."
  - "listReminders keeps aktif=false reminders in the response (only filters by jenis-vs-therapy) so /pengingat can still show and let users re-enable disabled reminders."
  - "Push-dispatch SQL scoping (findDueReminders/findDueRemindersForTimezone) mirrors the same jenis-vs-metode logic at the DB layer via an inner-join + OR condition, since the dispatch job cannot reuse the TS-layer helper directly in a SQL WHERE clause."

patterns-established:
  - "therapyReminderScope.ts is the single source of truth for jenis-vs-therapy visibility; any future surface needing this scoping should import from here rather than re-deriving the CAPD/HD/Transplantasi mapping."

requirements-completed: [REMIND-05, REMIND-06, REMIND-07]

duration: ~25min
completed: 2026-07-05
---

# Quick Task 260705-q7w: Segmented Cuci Darah Reminders Summary

**Replaced destructive `aktif=false` therapy-change deactivation with a pure, reversible jenis-vs-metodeTerapiAktif query-time filter, applied consistently across /pengingat, /beranda, next-upcoming, push dispatch, and the beranda Cuci Darah card (hidden for Transplantasi).**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3 (all `type="auto"`, task 1 was `tdd="true"`)
- **Files modified:** 6 modified, 2 created

## Accomplishments

- Root-caused and fixed the core bug: therapy scoping was conflated with the user's manual reminder enable/disable toggle via a shared `aktif` column, making switch-back-and-forth lossy and never actually filtering the /pengingat list by therapy.
- New `therapyReminderScope.ts` pure-function module (`activeCuciDarahJenis`, `isReminderVisibleForTherapy`) is now the single source of truth, reused across the reminder list, next-upcoming, today's dialysis logs, and the push-dispatch SQL layer.
- `/pengingat`, `/beranda`, next-upcoming, and push notifications are now all correctly scoped: CAPD users see only obat+capd, HD users see only obat+hd, Transplantasi users see only obat and no Cuci Darah card.
- Switching CAPD → HD → CAPD now restores the original CAPD reminders with their `aktif` toggle intact — no data loss.

## Task Commits

1. **Task 1: Add therapy-scope helper + replace destructive deactivation with query-time filtering** - `054f7fd` (feat, tdd)
2. **Task 2: Scope push-notification dispatch by active therapy** - `11eae7c` (fix)
3. **Task 3: Hide the /beranda "Cuci Darah Hari Ini" card for Transplantasi patients** - `81781fe` (fix)

**Plan metadata:** commit pending (orchestrator handles docs commit)

## Files Created/Modified

- `backend/src/lib/therapyReminderScope.ts` - Pure `activeCuciDarahJenis`/`isReminderVisibleForTherapy` helpers; single source of truth for jenis-vs-therapy scoping
- `backend/src/services/reminders.service.ts` - `listReminders`/`getNextUpcoming` now fetch the user's `metodeTerapiAktif` and filter cuci-darah entries; obat untouched, `aktif=false` reminders still returned
- `backend/src/services/dialysisLog.service.ts` - `getTodayLogs` filters `findActiveCuciDarahByUser` results by therapy before building the scheduled map
- `backend/src/services/profile.service.ts` - `changeTherapyMethod` no longer mutates any reminder row; removed `_changeTherapyWithReminderHookCore` and the `DeactivateFn` type
- `backend/src/repositories/reminderSchedule.repository.ts` - Removed `deactivateTherapySpecific`; `findDueReminders` now inner-joins `users` (previously had no join) and both due-reminder queries add a therapy-scoping OR condition
- `backend/src/test/therapyReminderScope.test.ts` (new) - 14 tests covering every case in the plan's behavior spec
- `backend/src/test/therapyChange.reminders.test.ts` - Rewritten to assert the new non-destructive contract (was asserting the deleted destructive-deactivation hook)
- `frontend/app/(app)/beranda/page.tsx` - `useAuth()` destructure now includes `user`; `isTransplant` gates `CuciDarahCard` render

## Decisions Made

- The `aktif` column's meaning was ambiguous (user toggle vs. therapy-active flag) — resolved by making it exclusively the user-facing toggle. Therapy scoping is now 100% derived, never persisted, so switching therapy is always lossless and reversible.
- `listReminders` deliberately does NOT filter on `aktif` — that filtering already happens client-side/via the toggle UI; this task's filter is strictly about jenis-vs-therapy visibility, per the plan's explicit instruction to keep disabled reminders visible for re-enabling.
- Push-dispatch scoping was implemented at the SQL layer (inner join + OR) rather than fetching-then-filtering in JS, to avoid dispatching (and then discarding) irrelevant rows every minute across all users.

## Deviations from Plan

None - plan executed exactly as written. One minor implementation adjustment: the plan's task 1 "done" criterion literally checks `grep -rn "deactivateTherapySpecific" backend/src` returns nothing — the rewritten `therapyChange.reminders.test.ts` initially referenced the removed function's name only in an explanatory code comment (not a functional reference); reworded the comment to avoid the literal string so the grep-based done-criterion passes cleanly. This is a documentation-only wording change, not a deviation in behavior.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three success criteria from the plan are met: non-destructive/reversible therapy scoping everywhere, obat unaffected, Transplantasi shows no cuci-darah anywhere (including no beranda card), and no schema migration was introduced (existing `jenis` field reused).
- Backend: `cd backend && npx tsc --noEmit` clean for all files touched by this task (pre-existing, unrelated tsc errors remain in untouched debug scripts and two controllers — out of scope, unchanged by this task).
- Backend targeted tests: 25/25 pass (`therapyReminderScope.test.ts`, `therapyChange.reminders.test.ts`, `reminderDispatch.test.ts`). Full backend suite: 244/247 pass; the 3 failures are the pre-existing, documented container-only `labUploadTrend` DB tests (unrelated to this task, not run from host per prior quick-task 260704-uyb).
- Frontend: `cd frontend && npx tsc --noEmit` clean.
- No manual/device verification was performed for this task (backend logic + TDD-covered pure functions + a straightforward conditional render) — the plan's optional manual scenario is available for a follow-up spot-check if desired.

## Self-Check: PASSED

- FOUND: backend/src/lib/therapyReminderScope.ts
- FOUND: backend/src/test/therapyReminderScope.test.ts
- FOUND: backend/src/services/reminders.service.ts (modified)
- FOUND: backend/src/services/dialysisLog.service.ts (modified)
- FOUND: backend/src/services/profile.service.ts (modified)
- FOUND: backend/src/repositories/reminderSchedule.repository.ts (modified)
- FOUND: backend/src/test/therapyChange.reminders.test.ts (modified)
- FOUND: frontend/app/(app)/beranda/page.tsx (modified)
- FOUND commit 054f7fd
- FOUND commit 11eae7c
- FOUND commit 81781fe

---
*Phase: quick-260705-q7w*
*Completed: 2026-07-05*
