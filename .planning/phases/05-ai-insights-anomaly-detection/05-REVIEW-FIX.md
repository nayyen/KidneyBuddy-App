---
phase: 05-ai-insights-anomaly-detection
fixed: 2026-07-04T00:00:00Z
review_source: 05-REVIEW.md
iterations: 1
findings_fixed: 7
findings_skipped: 0
status: fixed
---

# Phase 05: Code Review Fix Report

All 7 findings from `05-REVIEW.md` (4 critical, 3 warnings) were addressed directly
(not via the automated gsd-code-fixer agent — applied manually with full session
context of the codebase).

## Critical

### CR-01: Anomaly dedup could permanently suppress future alerts — FIXED

`findActiveByType` (`anomalyAlert.repository.ts`) now bounds the dedup query to the
same WIB calendar day (`gte`/`lte` against `wibDayBounds()`), matching its own
docstring's original intent. A recurrence on any later day is now always eligible
to fire again, regardless of whether a prior day's alert was ever read or given
feedback. Commit: `78818e2`.

### CR-02: `report.service.test.ts` arity bug (5/9 tests failing) — FIXED

Added `getDialysisAdherenceByRange`/`getAnomaliesByRangeForReport` fakes to the
test's repo factory and corrected every `_generateReportCore(...)` call site to
the current 8-arg signature. Added 2 new tests (dialysis-adherence pct, D-15
anomaly passthrough) previously missing entirely. All 11 tests in the file now
pass. Commit: `7ae3c00`.

### CR-03: `anomaly.controller.test.ts` failing at import time (0/4 tests ran) — FIXED

Added the missing `process.env.ENCRYPTION_KEY` setup before the dynamic import
(same pattern already used by `dailySummary.job.test.ts`/`report.service.test.ts`).
Added a new test explicitly asserting the `ditindaklanjuti` status transition on
feedback submission — the exact behavior CR-01's fix depends on. All 5 tests now
pass. Commit: `5cb043e`.

### CR-04: Boot catch-up could permanently cache an incomplete day/week — FIXED

`scheduler.ts`'s boot catch-up for `runDailySummaryBatch`/`runWeeklyInsightBatch`
now only fires if the scheduled time has already passed today (daily: WIB
`>= 20:00`; weekly: Sunday WIB `>= 19:00`), using the existing `wibHHmm()`/
`wibDayNameLower()` helpers. Commit: `81121cd`.

## Warnings

### WR-01: No recovery path for a missed weekly-insight batch — FIXED

Added `POST /api/ai/weekly-insight/regenerate` (controller + route), mirroring
`regenerateDailySummary` — the service layer (`generateAndCacheWeeklyInsight`)
already supported `{force: true}`, only the HTTP surface was missing. Wired a
"Buat Wawasan"/"Buat Ulang Wawasan" button into `WeeklyInsightCard.tsx` across
its empty/error/generated states. Commit: `59c415d`.

### WR-02: Misleading empty-state copy — FIXED

Corrected `WeeklyInsightCard.tsx`'s empty-state text, which claimed a
"significant new lab data" auto-trigger that `aiInsight.service.ts`'s own header
comment says was never implemented. Now describes only the real Sunday 19:00 WIB
cron behavior plus the new manual-generate option. Commit: `59c415d` (same as
WR-01, addressed together since both touch the same component).

### WR-03: TOCTOU race could duplicate alerts/emergency pushes — FIXED

Considered the reviewer's suggested fix (a partial unique index on
`(user_id, tipe_anomali) WHERE status IN ('aktif','dibaca')`) but rejected it —
it would conflict with CR-01's day-bounded dedup, which deliberately allows two
unresolved rows of the same type across different days. Instead wrapped the
check+explain+insert sequence in a DB transaction guarded by
`pg_advisory_xact_lock` keyed to `(userId, tipeAnomali)`, serializing concurrent
calls for the exact same user+type without a schema change. The emergency push
stays outside the transaction so a push failure can't roll back a committed
alert. `findActiveByType`/`insertAlert` now accept an optional transaction-scoped
client. Commit: `aececa6`.

## Verification

- `npx tsc --noEmit` (backend): zero new errors across all 6 commits above.
- All Phase 5 test files (`anomalyRule.service.test.ts`, `anomaly.controller.test.ts`,
  `dailySummary.job.test.ts`, `report.service.test.ts`, `forbiddenPhrases.test.ts`,
  `aiDisclaimer.test.ts`): 41/41 passing (13 suites).
- Full `npm test`: 169/180 passing — the 11 remaining failures are the same
  pre-existing categories (activity schema validation, fluid trend queries,
  reminder dispatch) unrelated to Phase 5 AI/anomaly code, present before this
  review and out of this phase's scope.

---

_Fixed: 2026-07-04_
_Fixer: Claude (manual, in-session)_
