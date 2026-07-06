---
phase: quick/260706-epn
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/repositories/reminderSchedule.repository.ts
  - backend/src/test/reminderSchedule.findNextUpcoming.test.ts
autonomous: true
requirements: [QUICK-260706-epn]
must_haves:
  truths:
    - "On a given weekday, the beranda 'Pengingat Berikutnya' card only shows reminders whose hariAktif includes TODAY's day-of-week"
    - "A reminder active only for other days (e.g. Selasa+Sabtu shown on Senin) never surfaces as the next reminder"
    - "This holds uniformly for obat, CAPD, and HD reminder types"
    - "When today has no more upcoming reminders, the card shows the empty state instead of tomorrow's reminder"
  artifacts:
    - path: "backend/src/repositories/reminderSchedule.repository.ts"
      provides: "_computeNextUpcomingCore with today-only findNext (tomorrow-fallback removed)"
      contains: "_computeNextUpcomingCore"
    - path: "backend/src/test/reminderSchedule.findNextUpcoming.test.ts"
      provides: "Regression tests asserting today-only behavior across obat/capd/hd"
  key_links:
    - from: "frontend/components/beranda/PengingatBerikutnyaCard.tsx"
      to: "GET /api/reminders/next"
      via: "authFetch"
      pattern: "reminders/next"
    - from: "backend/src/services/reminders.service.ts#getNextUpcoming"
      to: "reminderScheduleRepository.findNextUpcoming"
      via: "_computeNextUpcomingCore"
      pattern: "_computeNextUpcomingCore"
---

<objective>
Fix the beranda "Pengingat Berikutnya" (Next Reminder) card so it never shows a
reminder that is NOT active for today's day-of-week — uniformly for obat, CAPD,
and HD.

## Confirmed Root Cause (investigation done, not assumed)

The frontend card (`frontend/components/beranda/PengingatBerikutnyaCard.tsx`)
does NO client-side day filtering. It fully trusts the grouped response from
`GET /api/reminders/next`. The wired backend chain is:

  route `/next`
    -> `remindersController.getNextUpcoming`
    -> `remindersService.getNextUpcoming`
    -> `reminderScheduleRepository.findNextUpcoming`
    -> `_computeNextUpcomingCore`  (the pure, tested core)

Inside `_computeNextUpcomingCore`, the inner `findNext()` helper DOES correctly
filter by today's day (`todayReminders = reminders.filter(r => hariAktif.includes(todayDay))`,
repository lines ~144-146). HOWEVER, `findNext()` also has a deliberate
**tomorrow-fallback** branch (repository lines ~157-181): when nothing is
upcoming today, it returns the earliest reminder active TOMORROW
(`hari.includes(tomorrowDay)`).

This tomorrow-fallback is the ONLY code path that surfaces a not-active-today
reminder. It reproduces the reported bug exactly: today = Senin, a reminder set
active for Selasa+Sabtu — tomorrow = Selasa, so the fallback surfaces it as the
"next" reminder on Senin. Because `findNext()` is called identically for both
`obatReminders` and `cuciDarahReminders` (capd + hd), the defect and its fix
apply uniformly across all three therapy types.

Verified: `findNextUpcoming` / `getNextUpcoming` is consumed ONLY by the
`/api/reminders/next` route (the beranda card). No other feature depends on it,
and no existing test asserts the tomorrow-fallback surfacing — so removing that
branch is safe and does not break existing tests. (The reminder DISPATCH job
uses a different function, `findDueReminders`, and is untouched.)

## The Fix

Remove the tomorrow-fallback branch from `findNext()` inside
`_computeNextUpcomingCore` so the card shows ONLY today's earliest upcoming slot,
and shows the empty state ("Tidak ada pengingat berikutnya") when today has no
more upcoming reminders. No frontend change is required — the frontend already
renders whatever the backend returns.

## Product note (behavioral trade-off, honoring the PO's explicit requirement)

The bug report (authored by the PO) explicitly states a not-active-today reminder
"tidak boleh muncul sebagai 'pengingat berikutnya' hari ini". This fix therefore
makes the card strictly today-only, intentionally dropping the prior
tomorrow-fallback behavior. This is deliberate and matches the stated requirement.

Purpose: Restore trust in the beranda card so patients only see reminders they
can actually act on today.
Output: One-branch removal in the repository core + a regression test locking the
today-only behavior for obat, CAPD, and HD.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@backend/src/repositories/reminderSchedule.repository.ts
@backend/src/test/reminderSchedule.findNextUpcoming.test.ts
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add failing regression tests for today-only behavior (all 3 types)</name>
  <files>backend/src/test/reminderSchedule.findNextUpcoming.test.ts</files>
  <behavior>
    Add a new describe block "today-only filtering (quick-260706-epn)" to the
    existing test file, calling the already-exported `_computeNextUpcomingCore`
    directly (no DB). Use the existing `makeReminder` helper and the existing
    ctx shape `{ currentTime, todayDay, tomorrowDay }`.

    - Test A (obat): active=[ makeReminder({ id: "obat-tue", jenis: "obat",
      jamPengingat: "09:00", hariAktif: ["selasa","sabtu"] }) ], metode=null,
      ctx { currentTime: "08:00", todayDay: "senin", tomorrowDay: "selasa" }.
      Expect result.obat has length 0 (must NOT surface a Selasa reminder on Senin,
      even though tomorrow=Selasa).
    - Test B (capd): active=[ makeReminder({ id: "capd-tue", jenis: "capd",
      jamPengingat: "10:00", hariAktif: ["selasa","sabtu"] }) ],
      metode="capd" (so therapy-scoping keeps it), same ctx.
      Expect result.cuciDarah has length 0.
    - Test C (hd): active=[ makeReminder({ id: "hd-tue", jenis: "hd",
      jamPengingat: "10:00", hariAktif: ["selasa","sabtu"] }) ],
      metode="hd", same ctx. Expect result.cuciDarah has length 0.
    - Test D (positive control): a reminder active TODAY still surfaces —
      makeReminder({ id: "obat-mon", jenis: "obat", jamPengingat: "09:00",
      hariAktif: ["senin"] }), metode=null, same ctx. Expect result.obat length 1
      and result.obat[0].id === "obat-mon". This guards against over-correction
      (do not accidentally drop today's reminders).
  </behavior>
  <action>
    Append a new describe block to
    backend/src/test/reminderSchedule.findNextUpcoming.test.ts using the file's
    existing imports (`describe`, `it` from "node:test"; `assert` from
    "node:assert/strict"; `_computeNextUpcomingCore` and `makeReminder` already
    present). Do NOT modify the existing describe block. Follow the four cases in
    <behavior> exactly. Use `assert.equal(result.obat.length, 0)` /
    `assert.equal(result.cuciDarah.length, 0)` and for the positive control
    `assert.equal(result.obat.length, 1)` plus `assert.equal(result.obat[0].id,
    "obat-mon")`. Reference the reason inline in a comment: tomorrow-fallback must
    not surface not-active-today reminders (quick-260706-epn). Tests A/B/C are
    expected to FAIL against current code (RED) because the tomorrow-fallback
    currently surfaces the Selasa reminders; Test D should already pass.
  </action>
  <verify>
    <automated>cd backend && node --import tsx --test src/test/reminderSchedule.findNextUpcoming.test.ts 2>&1 | grep -E "not ok|# fail" | head</automated>
  </verify>
  <done>New describe block added; running the test file shows Tests A/B/C failing (RED) and Test D passing, confirming the tests correctly capture the bug before the fix.</done>
</task>

<task type="auto">
  <name>Task 2: Remove tomorrow-fallback in findNext; make it strictly today-only; verify green</name>
  <files>backend/src/repositories/reminderSchedule.repository.ts</files>
  <action>
    In `_computeNextUpcomingCore`, edit the inner `findNext()` helper. Keep the
    `todayReminders` filter and the `upcomingToday` today-slot selection (the
    first `if (upcomingToday.length > 0) { ... return ... }` block) exactly as-is.
    DELETE the tomorrow-fallback section entirely: remove the `tomorrowReminders`
    filter, the `earliestTomorrow` sort, and the
    `if (earliestTomorrow.length > 0) { ... }` block, so that when there is no
    upcoming reminder today `findNext()` simply `return []`.

    Do NOT touch the therapy-scoping logic (`obatReminders`,
    `cuciDarahReminders`, `isReminderVisibleForTherapy`) — that stays. Do NOT
    change any other function (`findNextUpcoming` DB wrapper, `findDueReminders`,
    mutations). Update the leading block comment above `findNext`/the fallback to
    note the tomorrow-fallback was removed per quick-260706-epn (card is now
    strictly today-only). Leave `tomorrowDay` in the ctx type/signature untouched
    even though it becomes unused by findNext — do not widen scope by editing the
    ctx shape or `findNextUpcoming`'s call site (removing the arg risks TS errors
    and churn; an unused ctx field is harmless). If `npx tsc --noEmit` complains
    about an unused local, address only that specific complaint minimally.
  </action>
  <verify>
    <automated>cd backend && node --import tsx --test src/test/reminderSchedule.findNextUpcoming.test.ts 2>&1 | tail -20 && npx tsc --noEmit && node --import tsx --test src/test/*.test.ts 2>&1 | tail -15</automated>
  </verify>
  <done>All four new tests pass (GREEN); `npx tsc --noEmit` reports no errors; the full backend test suite passes with no regressions (existing findNextUpcoming, reminders.service, therapy-scope, and dispatch tests still green).</done>
</task>

</tasks>

<verification>
- Confirmed root cause is the tomorrow-fallback branch in `_computeNextUpcomingCore#findNext`, the sole path that surfaces not-active-today reminders, applied uniformly to obat and cuciDarah.
- After the fix, `findNext` returns only today's earliest upcoming slot (or empty), so the beranda card can never show a reminder inactive for the current day-of-week.
- Frontend requires no change: `PengingatBerikutnyaCard.tsx` renders exactly what `/api/reminders/next` returns.
- Day-string matching stays on the existing lowercase Indonesian convention (`hariAktif` values like "senin"), unchanged from the current codebase.
</verification>

<success_criteria>
- On Senin, a reminder active only for Selasa+Sabtu does NOT appear in the card (verified for obat, capd, hd via unit tests).
- A reminder active for today still appears (positive-control test passes).
- `npx tsc --noEmit` passes; full backend test suite passes.
- No frontend edits required; no changes to reminder dispatch or other endpoints.
</success_criteria>

<output>
Create `.planning/quick/260706-epn-pada-halaman-beranda-kartu-pengingat-ber/260706-epn-SUMMARY.md` when done.
</output>
