---
phase: quick
plan: 260705-r8b
subsystem: reminders-activity-tracking
tags: [drizzle, node-cron, web-push, react, beranda]

requires:
  - phase: quick-260705-q7w
    provides: therapyReminderScope-scoped findNextUpcoming baseline
  - phase: 03-activity-logging-lab-results
    provides: daily_activities schema, activityEndReminder.job.ts, activity:complete event pattern
provides:
  - "findNextUpcoming fix: a past-due-today reminder can never revert into Pengingat Berikutnya via the tomorrow-fallback branch"
  - "Second, gentler activity follow-up push ~10min after estimasiSelesai (follow_up_sent column + activityFollowUp.job.ts)"
  - "KegiatanModuleInline: banner removed, live elapsed/overdue indicator, Selesai wired to shared activity:complete event, self-start card height"
affects: [beranda, catatan, aktivitas, reminders]

tech-stack:
  added: []
  patterns:
    - "Second-push pattern: gentler follow-up dedup flag (follow_up_sent) mirrors the existing reminderSent flag, queried every minute via node-cron with a 24h catch-up window — same restart-safe shape as activityEndReminder.job.ts"

key-files:
  created:
    - backend/src/jobs/activityFollowUp.job.ts
    - backend/src/db/migrations/0013_oval_photon.sql
  modified:
    - backend/src/repositories/reminderSchedule.repository.ts
    - backend/src/db/schema/dailyActivity.schema.ts
    - backend/src/repositories/dailyActivity.repository.ts
    - backend/src/jobs/activityEndReminder.job.ts
    - backend/src/jobs/scheduler.ts
    - backend/src/test/activityEndReminder.job.test.ts
    - frontend/components/aktivitas/KegiatanModuleInline.tsx
    - "frontend/app/(app)/beranda/page.tsx"

key-decisions:
  - "findNextUpcoming's tomorrow-fallback branch now excludes any reminder that is also active today AND whose jamPengingat < currentTime — such reminders stay owned by today's Obat/Cuci Darah Hari Ini list for the rest of the day, closing the uncheck-then-revert bug"
  - "The FIRST end-time push's copy (activityEndReminder.job.ts) was calmed to explicitly invite completion ('Kegiatan Hampir Selesai' / 'Tandai selesai kalau sudah, ya') rather than only stating elapsed duration, per plan instruction"
  - "KegiatanModuleInline's Selesai button now dispatches the same activity:complete CustomEvent as /catatan's ActivityList instead of calling a dead /finish endpoint + no-op prop callback"

requirements-completed: [REMIND-01, ACTIVITY-02]

duration: ~35min
completed: 2026-07-05
---

# Quick Task 260705-r8b: Fix Beranda Reminder Revert Bug, Activity Follow-up Push, and Activity Card UX Summary

**Fixed a reminder-state bug where unchecking a past-due reminder wrongly re-surfaced it as "next", added a second gentler node-cron push ~10min after an activity's estimated end, and cleaned up the beranda activity card (removed a stray banner, fixed the overdue indicator, rewired Selesai to the shared completion sheet, and stopped the card from stretching to match taller siblings).**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-07-05
- **Tasks:** 3/3 (plus 1 follow-up test-fixture fix)
- **Files modified:** 9 (2 new: `activityFollowUp.job.ts`, migration `0013_oval_photon.sql`)

## Accomplishments

- `findNextUpcoming` no longer lets an unchecked, past-due-today reminder "revert" into Pengingat Berikutnya as tomorrow's occurrence — it now correctly stays in today's Obat/Cuci Darah Hari Ini list until the day rolls over.
- Added a genuine second push: `activityFollowUp.job.ts` fires a calm "Masih Berlangsung?" nudge ~10 minutes after `estimasiSelesai` if the activity is still `berlangsung`, deduped via a new `follow_up_sent` column and wired into the existing node-cron scheduler (boot catch-up + per-minute tick).
- `KegiatanModuleInline.tsx` (beranda activity card): removed the stray white "Kegiatan Aktif — Melebihi Estimasi" banner with its duplicate dead Selesai button; the "· Xm" elapsed indicator now switches live to red "Terlewat X Menit" once past estimate; Selesai now dispatches the same `activity:complete` event `/catatan`'s ActivityList uses, so AppShell opens FeelingsRatingSheet identically in both within-estimate and overdue states; the card now carries `self-start` so it keeps its intrinsic height regardless of ObatCard/CuciDarahCard growing taller in the shared grid row.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Pengingat Berikutnya stale-revert on uncheck (bug 1)** - `c30d5c6` (fix)
2. **Task 2: Add second (10-min) activity follow-up push via node-cron (bug 3 backend)** - `b12d2c7` (feat)
3. **Task 3: Fix activity card indicator, remove banner, wire Selesai, fix card height (bugs 2, 3-frontend, 4, 5)** - `54bf1d4` (fix)
4. **Follow-up: update stale push-title test assertion** - `60dc3b0` (test)

_Note: commit 4 was not in the original plan's task list — it fixes a test fixture that Task 2's intentional copy change broke (see Deviations below)._

## Files Created/Modified

- `backend/src/repositories/reminderSchedule.repository.ts` - `findNextUpcoming`'s tomorrow-fallback branch now excludes reminders whose today slot already passed
- `backend/src/db/schema/dailyActivity.schema.ts` - added `followUpSent` boolean column
- `backend/src/db/migrations/0013_oval_photon.sql` - drizzle-generated migration adding `follow_up_sent`
- `backend/src/repositories/dailyActivity.repository.ts` - added `findDueForFollowUp` / `markFollowUpSent`
- `backend/src/jobs/activityFollowUp.job.ts` (new) - second, gentler follow-up push job
- `backend/src/jobs/activityEndReminder.job.ts` - calmed the first push's copy to invite completion
- `backend/src/jobs/scheduler.ts` - registered the new job (boot catch-up + per-minute tick)
- `backend/src/test/activityEndReminder.job.test.ts` - updated title assertion to match new copy
- `frontend/components/aktivitas/KegiatanModuleInline.tsx` - banner removed, live overdue indicator, Selesai → `activity:complete`, `self-start` on all three render states, dropped dead `onCompleteActivity` prop
- `frontend/app/(app)/beranda/page.tsx` - dropped the now-removed `onCompleteActivity` prop pass-through

## Decisions Made

- The tomorrow-fallback exclusion in `findNextUpcoming` checks `hariAktif.includes(todayDay) && jamPengingat < currentTime` — this correctly scopes to "today's slot already passed," not just "recurs on both days," so a genuine tomorrow-only reminder (not active today) is unaffected.
- Kept the "Estimasi selesai: HH:mm" subtitle but dropped the redundant "(Lebih Dari Waktu Estimasi)" suffix now that the indicator itself says "Terlewat X Menit" (plan explicitly allowed dropping it).
- Removed the `onCompleteActivity` prop entirely (interface + page.tsx call site) rather than leaving it as unused dead code, since the plan explicitly permitted dropping its usage and the prop had no other caller.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/stale test fixture] `activityEndReminder.job.test.ts` asserted the old push title**
- **Found during:** Task 2 (after changing the first push's title from "Masih Aktif" to "Kegiatan Hampir Selesai" per the plan's explicit copy instruction)
- **Issue:** The existing test `activityEndReminder.job.test.ts` asserted `title === "Masih Aktif"`, which the plan's own instructed copy change made stale.
- **Fix:** Updated the assertion to `"Kegiatan Hampir Selesai"`. No other test needed changes (body still contains the activity name and "lebih").
- **Files modified:** `backend/src/test/activityEndReminder.job.test.ts`
- **Verification:** `node --import tsx --test src/test/activityEndReminder.job.test.ts` — 4/4 pass.
- **Committed in:** `60dc3b0`

---

**Total deviations:** 1 auto-fixed (Rule 1, stale test fixture caused directly by an in-scope copy change).
**Impact on plan:** No scope creep — the fix was a direct, necessary consequence of following the plan's own instruction.

## Issues Encountered

None beyond the stale test fixture above.

## Verification Performed

- `cd backend && npx tsc --noEmit` — clean (remaining errors are pre-existing, unrelated `src/test/debug_*.ts` scratch files and `dialysisLog.controller.ts`/`medicationLog.controller.ts`, confirmed out of scope via `git log` — untouched by this task).
- `cd frontend && npx tsc --noEmit` — clean, zero errors.
- `npm run db:generate` produced exactly one new migration (`0013_oval_photon.sql`) for `follow_up_sent`.
- Backend tests run: `activityEndReminder.job.test.ts` (4/4), `reminderDispatch.test.ts` (11/11), `reminders.service.test.ts` (15/15), `therapyChange.reminders.test.ts` (5/5), `therapyReminderScope.test.ts` (9/9), `activity.service.test.ts` (9/9) — all green, no regressions from either backend change.
- **Manual verification still required (human, next browser session)** per the plan's own verification section:
  1. Let a reminder pass its time, check it in Obat Hari Ini, uncheck it → confirm it stays in Hari Ini and does NOT reappear under Pengingat Berikutnya.
  2. Start an activity → confirm header shows "· Xm" elapsed while active, then red "Terlewat X Menit" after `estimasiSelesai` passes.
  3. Confirm the white "Kegiatan Aktif — Melebihi Estimasi" banner is gone.
  4. Click Selesai (both before and after the estimate) → confirm FeelingsRatingSheet opens both times.
  5. Confirm the Mulai Kegiatan card stays the same height as sibling reminder lists (ObatCard/CuciDarahCard) grow with more items.
  6. (New, not in original plan verification list but relevant to Task 2) Confirm the second "Masih Berlangsung?" push actually arrives ~10 minutes after the first "Kegiatan Hampir Selesai" push on a real device, since automated tests only cover the injectable core logic, not live push delivery.

## User Setup Required

None - no external service configuration required. The new `follow_up_sent` column will be applied automatically the next time `npm run db:migrate` (or `drizzle-kit migrate`) runs against the target database — no manual DB action needed beyond the project's normal migration deployment step.

## Next Phase Readiness

All three in-scope tasks are code-complete and committed with clean `tsc` on both containers and passing backend unit tests. The five manual/live-device verification items above remain open (standard for UI/push-timing behavior that cannot be asserted by an automated test) and should be confirmed in the next human browser/device session before considering this quick task fully closed.

---
*Phase: quick*
*Plan: 260705-r8b*
*Completed: 2026-07-05*

## Self-Check: PASSED

All 10 claimed files verified present on disk; all 4 claimed commit hashes (`c30d5c6`, `b12d2c7`, `54bf1d4`, `60dc3b0`) verified present in `git log --oneline --all`.
