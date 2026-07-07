---
phase: quick-260707-flu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/repositories/medicationLog.repository.ts
  - backend/src/repositories/dialysisLog.repository.ts
  - backend/src/services/medicationLog.service.ts
  - backend/src/services/dialysisLog.service.ts
  - backend/src/test/reminders.service.test.ts
  - backend/src/test/medicationLog.service.test.ts
autonomous: true
requirements: [REMIND-03]
must_haves:
  truths:
    - "Confirming today's medication/dialysis reminder touches TODAY's log row (or creates one), never an old row from a previous day/month"
    - "Unconfirming a scheduled item touches TODAY's log row only"
    - "A pre-existing old log row for the same reminder is left untouched by today's confirm/unconfirm"
  artifacts:
    - path: backend/src/repositories/medicationLog.repository.ts
      provides: "findByReminderAndUser scoped to optional day bounds + ORDER BY waktuPengingat DESC"
    - path: backend/src/repositories/dialysisLog.repository.ts
      provides: "findByReminderAndUser scoped to optional day bounds + ORDER BY waktuPengingat DESC"
    - path: backend/src/services/medicationLog.service.ts
      provides: "confirm/unconfirmById pass localDayBounds(timezone) to the existing-log lookup"
    - path: backend/src/services/dialysisLog.service.ts
      provides: "confirm/unconfirmById pass localDayBounds(timezone) to the existing-log lookup"
  key_links:
    - from: backend/src/services/medicationLog.service.ts
      to: backend/src/repositories/medicationLog.repository.ts
      via: "findByReminderAndUser(reminderId, userId, localDayBounds(timezone))"
      pattern: "findByReminderAndUser\\([^)]*localDayBounds"
    - from: backend/src/services/dialysisLog.service.ts
      to: backend/src/repositories/dialysisLog.repository.ts
      via: "findByReminderAndUser(reminderId, userId, localDayBounds(timezone))"
      pattern: "findByReminderAndUser\\([^)]*localDayBounds"
---

<objective>
Fix a live production bug (reproduced on Railway): confirming or unconfirming a medication ("obat") or dialysis ("cuci darah") reminder touches an ARBITRARY OLD log row instead of today's row.

Root cause: `medicationLogRepository.findByReminderAndUser(reminderId, userId)` and its dialysis mirror run `SELECT ... WHERE reminder_id AND user_id LIMIT 1` with NO date filter and NO ordering. With ~6 months of seeded history, they return a random old row (verified: a confirm returned a logId whose waktuPengingat = 2026-01-13). `_confirmCore` then marks THAT old row `dikonfirmasi`, so today's view still shows "tertunda".

Fix: scope the existing-log lookup to the user's CURRENT local day via the existing `localDayBounds(timezone)` helper (same pattern already used by `getTodayLogs`/`findTodayByUser`), and add `ORDER BY waktuPengingat DESC` for determinism.

Purpose: reminder reliability is the product's core value — confirm/unconfirm must operate on today's row.
Output: date-scoped `findByReminderAndUser` in both repositories, all four service call sites passing today's bounds, and regression tests proving old rows are never touched.

Constraint: DO NOT change any API/route shapes — the frontend must keep working unchanged. This is purely a backend query-scoping fix.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@backend/src/repositories/medicationLog.repository.ts
@backend/src/repositories/dialysisLog.repository.ts
@backend/src/services/medicationLog.service.ts
@backend/src/services/dialysisLog.service.ts
@backend/src/services/reminders.service.ts
@backend/src/utils/wib.ts
@backend/src/test/reminders.service.test.ts
@backend/src/test/medicationLog.service.test.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add optional day-bounds scoping to findByReminderAndUser in both repositories</name>
  <files>backend/src/repositories/medicationLog.repository.ts, backend/src/repositories/dialysisLog.repository.ts</files>
  <action>
In BOTH repository files, extend `findByReminderAndUser` to accept an optional third parameter `bounds?: { start: Date; end: Date }`. Keep the parameter OPTIONAL so existing callers and the in-memory test fakes (which call it with 2 args) keep compiling and passing — this preserves the injectable-deps test pattern.

Behavior:
- Build the WHERE condition list starting with the existing `eq(reminderId)` and `eq(userId)` predicates.
- When `bounds` is provided, additionally push `gte(waktuPengingat, bounds.start)` and `lte(waktuPengingat, bounds.end)` — mirroring exactly how `findTodayByUser` in the same file constrains `waktuPengingat`.
- Add `.orderBy(desc(waktuPengingat))` before `.limit(1)` so the result is deterministic (newest matching row first) instead of an arbitrary row.

Import `desc` from `drizzle-orm` in each file (medicationLog.repository currently imports `eq, and, gte, lt, lte`; dialysisLog.repository imports `eq, and, gte, lte, lt` — add `desc` to each import). Use `and(...conditions)` spread form since the condition set is now variable-length.

Update the JSDoc above each function to note the bounds param scopes the lookup to the caller-supplied local day (default unbounded preserves legacy behavior for any caller not yet passing bounds).

Do NOT touch any other function in these files. Do NOT change the return type.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit</automated>
  </verify>
  <done>Both `findByReminderAndUser` functions accept optional `bounds`, apply `gte`/`lte` on `waktuPengingat` when present, order by `desc(waktuPengingat)`, and `tsc --noEmit` passes.</done>
</task>

<task type="auto">
  <name>Task 2: Pass today's local-day bounds at all four service call sites</name>
  <files>backend/src/services/medicationLog.service.ts, backend/src/services/dialysisLog.service.ts</files>
  <action>
Scope every existing-log lookup to the requesting user's current local day using `localDayBounds(timezone)` (already imported in both service files; `getUserTimezone` already exists in both).

medicationLog.service.ts:
1. In `confirm()`: the timezone is already resolved before the `_confirmCore` call. Replace the bare `medicationLogRepository.findByReminderAndUser` argument passed to `_confirmCore` with a closure that binds today's bounds: an arrow fn `(rid, uid) => medicationLogRepository.findByReminderAndUser(rid, uid, localDayBounds(timezone))`. `_confirmCore`'s signature is UNCHANGED — it just receives a date-scoped finder. This makes the "update existing vs. create new" branch operate on today's row: if no today-row exists, `_confirmCore` correctly INSERTs a new confirmed row for today (it already stores `waktuPengingat` from the reminder's jamPengingat via `localDateFromHHmm`).
2. In `unconfirmById()`: resolve the timezone first (`const timezone = await getUserTimezone(userId)`), then in the `UnconfirmByIdDeps` object passed to `_unconfirmByIdCore`, replace `findByReminderAndUser: medicationLogRepository.findByReminderAndUser` with a bounds-bound closure `(rid, uid) => medicationLogRepository.findByReminderAndUser(rid, uid, localDayBounds(timezone))`.

dialysisLog.service.ts:
3. In `confirm()`: `getUserTimezone` is currently called AFTER the existingLog lookup — move `const timezone = await getUserTimezone(userId)` up to BEFORE the `findByReminderAndUser` call, then pass `localDayBounds(timezone)` as its third arg. Reuse the same `timezone` for the existing `localDateFromHHmm(timezone, ...)` in the insert branch (remove the now-duplicate later fetch).
4. In `unconfirmById()`: in the scheduled-prefix branch, resolve `const timezone = await getUserTimezone(userId)` before the `findByReminderAndUser` call and pass `localDayBounds(timezone)` as its third arg.

Do NOT change function signatures of the exported service functions, and do NOT alter any route/controller or response shape.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit && grep -c "localDayBounds(timezone)" src/services/medicationLog.service.ts src/services/dialysisLog.service.ts</automated>
  </verify>
  <done>All four call sites (med confirm, med unconfirmById, dialysis confirm, dialysis unconfirmById) pass `localDayBounds(timezone)` to `findByReminderAndUser`; timezone is resolved before each lookup; `tsc --noEmit` passes; no API shape changed.</done>
</task>

<task type="auto">
  <name>Task 3: Add regression tests proving old rows are never touched</name>
  <files>backend/src/test/reminders.service.test.ts, backend/src/test/medicationLog.service.test.ts</files>
  <action>
Add regression tests that lock in the date-scoping contract using the existing DB-free injectable pattern (no live Postgres).

In reminders.service.test.ts — add a describe block "_confirmCore — date-scoped existing-log lookup":
- Build an in-memory med-log store whose `findByReminderAndUser(reminderId, userId, bounds)` HONORS the optional `bounds` (filter rows where `waktuPengingat >= bounds.start && <= bounds.end`, then pick newest first) — this mirrors the real repository's new behavior.
- Seed an OLD row for the reminder (e.g. `waktuPengingat` = 30 days ago, status "dikonfirmasi" or "tertunda").
- Import `localDayBounds` from `../utils/wib.js`. Call `_confirmCore` passing a finder closure bound to `localDayBounds("Asia/Jakarta")` (exactly as the service does).
- Assert: the OLD row's status/id is UNCHANGED (not the returned logId), AND a NEW row was created (`logs.length` increased) with today's date and status "dikonfirmasi". This is the core regression: today's confirm must NOT touch the January row.
- Add a second case: seed BOTH an old row AND a today "tertunda" row → `_confirmCore` marks the TODAY row dikonfirmasi and leaves the old row untouched (no new row inserted).

In medicationLog.service.test.ts — add to the `_unconfirmByIdCore` describe block a case "unconfirm with a scheduled- id only touches today's row":
- Provide a `findByReminderAndUser` dep whose returned row represents TODAY's row (id "today-log-id"), simulating a bounds-scoped finder that skips the old row.
- Assert `markUnconfirmedById` is called with "today-log-id", never with an old-row id.

Keep every new fake DB-free and follow the file's existing style (node:test `describe`/`it`, `node:assert/strict`). Do not modify existing passing tests.
  </action>
  <verify>
    <automated>cd backend && npm test 2>&1 | tail -30</automated>
  </verify>
  <done>New regression tests pass. Confirm/unconfirm with an old row present provably touch only today's row. The full suite passes except the 3 pre-documented container-only DB test failures (expected, unrelated to this change).</done>
</task>

</tasks>

<verification>
- `cd backend && npx tsc --noEmit` — clean compile.
- `cd backend && npm test` — new date-scoping regression tests pass; only the 3 pre-documented container-only DB test failures remain (expected, unrelated).
- Manual/behavioral (already reproduced by orchestrator on prod): confirming today's reminder now returns a logId whose waktuPengingat is TODAY, and today's dashboard view flips to "dikonfirmasi".
</verification>

<success_criteria>
- `findByReminderAndUser` in both repositories is date-scopable and deterministic (ORDER BY waktuPengingat DESC).
- All four confirm/unconfirm service paths scope the existing-log lookup to the user's current local day via `localDayBounds(timezone)`.
- Regression tests prove an old (previous-day/previous-month) row is never touched by today's confirm/unconfirm.
- No API/route/response shape changed — frontend untouched.
</success_criteria>

<output>
Create `.planning/quick/260707-flu-fix-confirm-unconfirm-pengingat-menyentu/260707-flu-SUMMARY.md` when done.
</output>
