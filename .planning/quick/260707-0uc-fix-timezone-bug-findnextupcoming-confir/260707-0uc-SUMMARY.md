---
phase: 260707-0uc
plan: 01
subsystem: backend-reminders
tags: [timezone, wib, bugfix, reminders]
dependency-graph:
  requires: []
  provides:
    - "findNextUpcoming confirmed-today window anchored to WIB calendar day"
    - "wibDayBounds pure regression test coverage"
  affects:
    - backend/src/repositories/reminderSchedule.repository.ts
tech-stack:
  added: []
  patterns:
    - "wibDayBounds() (existing helper) reused instead of adding a new one"
key-files:
  created:
    - backend/src/test/wibDayBounds.test.ts
  modified:
    - backend/src/repositories/reminderSchedule.repository.ts
decisions:
  - "Used wibDayBounds() (WIB-hardcoded) rather than per-user localDayBounds(timezone), to stay internally consistent with findNextUpcoming's existing WIB-hardcoded currentTime/todayDay (wibHHmm/wibDayNameLower). Migrating the WHOLE function to per-user timezone is a larger, out-of-scope change — noted below as a future improvement."
metrics:
  duration: "~20 min"
  completed: "2026-07-07"
---

# Phase 260707-0uc Plan 01: Fix WIB Timezone Bug in findNextUpcoming Confirmed-Today Window Summary

Repointed `findNextUpcoming`'s "already confirmed today" exclusion window from the container's local/UTC day (`new Date().setHours(...)`) to the patient's actual WIB calendar day via the existing `wibDayBounds()` helper, fixing a bug where doses confirmed yesterday-evening WIB were wrongly hidden from — or early-morning-WIB confirmations wrongly counted against — the Pengingat Berikutnya card between 00:00-07:00 WIB.

## What Was Built

### Task 1: Repoint confirmed-today window to WIB day + pure regression test

**`backend/src/repositories/reminderSchedule.repository.ts`:**
- Added `wibDayBounds` to the existing `../utils/wib.js` import.
- Replaced the two buggy lines:
  ```
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
  ```
  with:
  ```
  const { start: todayStart, end: todayEnd } = wibDayBounds();
  ```
  Variable names `todayStart`/`todayEnd` were kept unchanged, so both exclusion queries (`confirmedMedicationIds` and `confirmedDialysisIds`, using `gte(...waktuKonfirmasi, todayStart)` / `lte(...waktuKonfirmasi, todayEnd)`) required no further edits — only the bounds computation changed.
- Added an inline comment explaining the UTC-vs-WIB bug being fixed.
- `_computeNextUpcomingCore` and every other function in the file were left untouched, per plan constraint.

**`backend/src/test/wibDayBounds.test.ts` (new):** pure, DB-free regression test for `wibDayBounds` (imported from `../utils/wib.js`), using deterministic explicit `dateStr` inputs:
- `wibDayBounds("2026-07-07").start` === `2026-07-06T17:00:00.000Z` (00:00 WIB).
- `.end` === `2026-07-07T16:59:59.999Z` (23:59:59.999 WIB).
- Window span is exactly `86_400_000 - 1` ms.
- Scenario "Tuesday 00:44 WIB": a confirmation at Monday 07:25 WIB (`2026-07-06T00:25:00.000Z`) is BEFORE Tuesday's WIB-day `start` → proves a yesterday-evening confirmation is no longer wrongly hidden.
- Scenario "05:00 WIB same day": a confirmation at `2026-07-05T22:00:00.000Z` (05:00 WIB) IS within `[start, end]` of that day → proves early-morning-WIB confirmations still count as confirmed-today.
- Default-arg smoke check: `wibDayBounds()` returns `end > start` with the same `86_400_000 - 1` span, no fixed clock dependency.

All 5 test cases pass.

## Convention Decision (recorded per plan's output spec)

`findNextUpcoming` already derives `currentTime` and `todayDay` from the WIB-hardcoded helpers `wibHHmm()`/`wibDayNameLower()` (not per-user timezone). The internally-consistent fix therefore uses `wibDayBounds()` (also WIB-hardcoded), NOT the per-user `localDayBounds(timezone)` helper that `medicationLog.service.ts` uses elsewhere in the codebase. Mixing a per-user exclusion window with WIB-hardcoded `currentTime`/`todayDay` in the same function would have been internally inconsistent (e.g. a non-Jakarta user's "today" slot selection and "confirmed today" exclusion could disagree on which calendar day is "today").

**Future improvement (out of scope here):** migrate the WHOLE of `findNextUpcoming` (currentTime, todayDay, AND the confirmed-today bounds) to the user's stored `timezone` column, matching the per-user pattern already used by `medicationLog.service.ts`. The demo user Lukman is on `Asia/Jakarta`, so both the WIB-hardcoded and per-user approaches currently yield identical results — this migration is a larger, separate change.

## Scope-Boundary Finding: `grep -rn "setHours" backend/src`

```
backend/src/repositories/reminderSchedule.repository.ts:209:  // BUG FIX (quick-260707-0uc): `new Date().setHours(0,0,0,0)` uses the
```

The only remaining occurrence of the string `setHours` in `backend/src` is inside the explanatory code comment I added (documenting the bug that was fixed), not an actual call. No other file carries the same buggy `new Date().setHours(...)`-based day-bounds pattern — confirmed via re-run of the grep before finishing, matching the plan's investigation notes.

## Verification

- `npx tsc --noEmit` in `backend/`: clean except 4 pre-existing, unrelated `string | string[]` errors in `dialysisLog.controller.ts` / `medicationLog.controller.ts` (documented in multiple prior SUMMARY.md entries, e.g. 260706-fak, 260706-q0g — out of scope for this task, no new errors introduced).
- `node --import tsx --test src/test/wibDayBounds.test.ts`: 5/5 pass.
- `npm test` (full suite): 260/263 pass — the same 3 pre-documented container-only DB test failures remain (`lab trend queries` and related), no new failures.

### Live verification (Task 2 checkpoint — performed directly, not deferred to a human checkpoint)

Per the orchestrator's runtime facts, the live curl assertion was run directly rather than blocking on a human-verify checkpoint:

1. Confirmed the code change was present inside the running container (`docker exec kidneybuddy-backend cat /app/src/repositories/reminderSchedule.repository.ts`).
2. **Deviation found and fixed:** the backend container's Dockerfile `CMD` is `node --import tsx src/server.ts` (no `nodemon`/`--watch`), so the volume-mounted `src` edit did NOT hot-reload as the runtime facts assumed — the container needed an explicit restart (`docker restart kidneybuddy-backend`) to pick up the change. Confirmed via startup log lines ("KidneyBuddy backend listening on port 4000", scheduler-started message) after restart. This is a scope-appropriate Rule 3 auto-fix (blocking issue preventing verification), not a code change to the plan's deliverable.
3. Logged in as `lukman@demo.kidneybuddy.id` at `2026-07-06T17:45:33Z` UTC (≈ 2026-07-07 00:45 WIB, Tuesday — still before 07:00 WIB).
4. `GET /api/reminders/next` returned, in the `obat` group: **both** Amlodipine (07:00) and Bisoprolol (07:00). Pre-fix (verified moments earlier against the pre-restart, stale-code container) only Bisoprolol appeared — Amlodipine's Monday 07:25 WIB confirmation was wrongly falling inside the buggy UTC-today exclusion window.
5. Full JSON evidence:
   ```json
   {
     "obat": [
       { "nama": "Amlodipine", "jamPengingat": "07:00", ... },
       { "nama": "Bisoprolol", "jamPengingat": "07:00", ... }
     ],
     "cuciDarah": [
       { "nama": "Exchange CAPD", "jamPengingat": "06:00", ... }
     ]
   }
   ```
6. Full backend suite re-verified not regressed (see above, 260/263, same 3 documented container-only failures).

**Final visual confirmation on the beranda Pengingat Berikutnya card itself** is left to the user, per the runtime facts — the API-level evidence above is the authoritative proof the fix works; the frontend card is a thin renderer of this same endpoint's response and was not modified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Backend container required a manual restart to pick up the code change**
- **Found during:** Task 2 live verification
- **Issue:** The runtime facts stated the backend hot-reloads via nodemon on the volume-mounted `src`, but the Dockerfile's `CMD` runs `node --import tsx src/server.ts` directly with no watch/reload mechanism. The first live curl (run immediately after the Task 1 commit) still returned the pre-fix behavior (only Bisoprolol) even though `docker exec ... cat` confirmed the mounted file already had the fix.
- **Fix:** `docker restart kidneybuddy-backend`; confirmed fresh startup log lines before re-testing.
- **Files modified:** none (infrastructure-only, no code change).
- **Commit:** n/a (no file change).

No other deviations. Plan executed exactly as written otherwise.

## Threat Flags

None — this change only adjusts date-range bounds on an already user-scoped query (per the plan's threat model, disposition: accept). No new packages, no new attack surface.

## Self-Check: PASSED

- `backend/src/repositories/reminderSchedule.repository.ts` — FOUND, contains `wibDayBounds`.
- `backend/src/test/wibDayBounds.test.ts` — FOUND, 5/5 tests passing.
- Commit `7216163` — FOUND in `git log --oneline`.
- Live `GET /api/reminders/next` evidence captured above — both 07:00 obat reminders present.
