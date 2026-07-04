---
phase: 05-ai-insights-anomaly-detection
reviewed: 2026-07-04T00:00:00Z
depth: standard
files_reviewed: 68
files_reviewed_list:
  - backend/package.json
  - backend/src/app.ts
  - backend/src/controllers/ai.controller.ts
  - backend/src/controllers/anomaly.controller.ts
  - backend/src/controllers/dialysisLog.controller.ts
  - backend/src/controllers/fluid.controller.ts
  - backend/src/controllers/medicationLog.controller.ts
  - backend/src/db/migrations/0010_wonderful_piledriver.sql
  - backend/src/db/schema/aiDailySummary.schema.ts
  - backend/src/db/schema/aiLabAnalysis.schema.ts
  - backend/src/db/schema/aiLifestyleSuggestion.schema.ts
  - backend/src/db/schema/aiWeeklyInsight.schema.ts
  - backend/src/db/schema/anomalyAlert.schema.ts
  - backend/src/db/schema/index.ts
  - backend/src/jobs/anomalyDetection.job.ts
  - backend/src/jobs/dailySummary.job.ts
  - backend/src/jobs/scheduler.ts
  - backend/src/jobs/weeklyInsight.job.ts
  - backend/src/lib/aiDisclaimer.ts
  - backend/src/lib/forbiddenPhrases.ts
  - backend/src/lib/groqClient.ts
  - backend/src/repositories/aiDailySummary.repository.ts
  - backend/src/repositories/aiLabAnalysis.repository.ts
  - backend/src/repositories/aiLifestyleSuggestion.repository.ts
  - backend/src/repositories/aiWeeklyInsight.repository.ts
  - backend/src/repositories/anomalyAlert.repository.ts
  - backend/src/repositories/dialysisLog.repository.ts
  - backend/src/repositories/fluidLog.repository.ts
  - backend/src/repositories/medicationLog.repository.ts
  - backend/src/repositories/user.repository.ts
  - backend/src/routes/ai.routes.ts
  - backend/src/routes/anomaly.routes.ts
  - backend/src/services/aiInsight.service.ts
  - backend/src/services/aiLabAnalysis.service.ts
  - backend/src/services/aiLifestyle.service.ts
  - backend/src/services/aiSummary.service.ts
  - backend/src/services/anomalyExplanation.service.ts
  - backend/src/services/anomalyOrchestrator.service.ts
  - backend/src/services/anomalyRule.service.ts
  - backend/src/services/labResult.service.ts
  - backend/src/services/report.service.ts
  - backend/src/test/aiDisclaimer.test.ts
  - backend/src/test/anomaly.controller.test.ts
  - backend/src/test/anomalyRule.service.test.ts
  - backend/src/test/dailySummary.job.test.ts
  - backend/src/test/forbiddenPhrases.test.ts
  - backend/src/test/report.service.test.ts
  - backend/src/utils/wib.ts
  - frontend/app/(app)/beranda/page.tsx
  - frontend/app/(app)/catatan/page.tsx
  - frontend/app/(app)/edukasi/page.tsx
  - frontend/app/(app)/notifikasi/page.tsx
  - frontend/components/anomaly/AlertHistoryList.tsx
  - frontend/components/anomaly/AnomalyAlertCard.tsx
  - frontend/components/anomaly/EmergencyAnomalyModal.tsx
  - frontend/components/beranda/AiDailySummaryCard.tsx
  - frontend/components/beranda/AnomalyAlertSection.tsx
  - frontend/components/edukasi/LifestyleSuggestionCard.tsx
  - frontend/components/lab/CatatLabSheet.tsx
  - frontend/components/lab/InputManualForm.tsx
  - frontend/components/lab/LabAnalysisCard.tsx
  - frontend/components/lab/LabTrendChart.tsx
  - frontend/components/lab/WeeklyInsightCard.tsx
  - frontend/components/laporan/LaporanPreviewContent.tsx
  - frontend/components/laporan/sections/Anomali.tsx
  - frontend/components/shell/AppShell.tsx
  - frontend/components/shell/MobileHeader.tsx
  - frontend/components/shell/TopBar.tsx
  - frontend/components/ui/alert-dialog.tsx
  - frontend/lib/aiDisclaimer.ts
  - frontend/lib/hooks/useUnreadAnomalyCount.ts
findings:
  critical: 4
  warning: 3
  info: 0
  total: 7
status: fixed
fix_report: 05-REVIEW-FIX.md
---

# Phase 05: Code Review Report

**Reviewed:** 2026-07-04
**Depth:** standard
**Files Reviewed:** 68
**Status:** issues_found

## Summary

Reviewed the deterministic anomaly rule engine, the anomaly notification/explanation
pipeline, the 4 AI content features (daily summary, weekly insight, per-lab-result
analysis, lifestyle suggestion), their batch jobs, and the corresponding frontend
surfaces. The three specific fixes called out in the review brief were checked and
confirmed present in the code as described:

1. `groqClient.ts` lazily constructs the Groq client via a `Proxy` — importing it
   never throws (confirmed correct).
2. `anomalyExplanation.service.ts`'s `getValidatedExplanation` now has a `catch`
   around the Groq call itself (not just the forbidden-phrase check), falling back
   to `STATIC_FALLBACK_TEMPLATES`/`GENERIC_FALLBACK_TEXT` for any severity on Groq
   failure (confirmed correct).
3. `anomaly.controller.ts`'s `_submitFeedbackCore` now transitions status to
   `"ditindaklanjuti"` after feedback submission (confirmed present) — **but this
   fix is incomplete**: see CR-01 below, which is the most severe finding in this
   review. The underlying "an anomaly alert can permanently block all future
   detection of the same anomaly type" bug is only fixed for the minority of users
   who proactively visit `/notifikasi` and tap a feedback button; the primary
   interaction path (acknowledging the `EmergencyAnomalyModal`) still leaves the
   alert dedup-blocking forever.
4. `GET /api/ai/lab-analysis/:labResultId` correctly triggers on-demand
   fire-and-forget generation on a cache miss (confirmed correct) — but the
   equivalent `GET /api/ai/weekly-insight` endpoint has **no** such fallback and
   **no** manual regenerate route either (CR-05/WR-01 below), unlike daily-summary
   (which has a regenerate route) and lab-analysis (which has on-demand
   generation).
5. Frontend `authFetch` call sites were cross-checked against `app.ts`'s mount
   table — all AI/anomaly-related paths (`/api/ai/*`, `/api/anomaly/*`, `/api/lab/*`)
   match correctly; no repeat of the wrong-base-path bug was found in the files
   reviewed.

Beyond the specific items above, two of this phase's own backend test files are
provably broken (confirmed by actually running them, not just reading them) —
`report.service.test.ts` (5/9 tests throw `TypeError`) and
`anomaly.controller.test.ts` (fails at import time, 0/4 tests ever execute). The
latter means the exact ANOMALY-04 status-lifecycle behavior this review was asked
to verify has **zero** passing automated test coverage today.

## Critical Issues

### CR-01: Anomaly dedup can permanently suppress all future alerts of a type after the very first acknowledgment (incomplete fix of the "aktif→dibaca→ditindaklanjuti" gap)

**File:** `backend/src/repositories/anomalyAlert.repository.ts:29,51-65`, `backend/src/controllers/anomaly.controller.ts:91-101`, `backend/src/services/anomalyOrchestrator.service.ts:93-97`

**Issue:** `findActiveByType` treats both `"aktif"` and `"dibaca"` as unresolved
(`UNRESOLVED_STATUSES = ["aktif", "dibaca"]`), and `processFiredRule` skips
inserting (and therefore skips emergency-pushing) a new alert whenever any
existing alert of that `tipeAnomali` is still in one of those two states —
**with no date/time bound whatsoever** (the query has no `createdAt` filter,
despite the code comment above it claiming "same-day/same-episode dedup"). The
*only* code path that transitions a row out of `"dibaca"` into `"ditindaklanjuti"`
(which is required to unblock the dedup) is `_submitFeedbackCore`, invoked when a
user explicitly taps "Relevan"/"Tidak Relevan" on `/notifikasi`
(`AlertHistoryList.tsx`'s `handleFeedback`).

However, the *primary* interaction path for a `severity: "tinggi"` alert is the
global `EmergencyAnomalyModal`, whose only action
(`POST /api/anomaly/:id/acknowledge`) transitions the alert to `"dibaca"` and then
**closes the modal** (`onAcknowledged` just clears local state — it does not
navigate to `/notifikasi` or otherwise prompt the user for feedback). A realistic
patient will tap "Saya Mengerti, Hubungi Dokter Segera" and continue using the
app without ever visiting the alert-history feedback UI.

Concrete failure scenario:
1. Day 1: patient logs an abnormal ("keruh") CAPD effluent entry.
   `checkCapdEffluentAnomaly` fires, an alert is inserted (`status: "aktif"`,
   `tipeAnomali: "kondisi_cairan_abnormal"`, `severity: "tinggi"`), emergency push
   sent, `EmergencyAnomalyModal` shown. Patient acknowledges → status becomes
   `"dibaca"`.
2. Day 5 (or any day after): the patient's CAPD effluent is abnormal again (a
   genuinely new, clinically significant recurrence — e.g. suspected peritonitis
   recurring). A new fluid entry is logged, `runAnomalyChecksForUser` runs,
   `checkCapdEffluentAnomaly` fires again, but `processFiredRule`'s
   `findActiveByType(userId, "kondisi_cairan_abnormal")` still returns the Day-1
   row (status `"dibaca"` counts as unresolved) → `active.length > 0` → the
   function returns early. **No new alert row, no emergency push, no modal.**
   This repeats indefinitely until the patient happens to open `/notifikasi` and
   taps a feedback button on the year-old alert.

This directly contradicts CLAUDE.md's stated Core Value ("pasien tidak pernah
melewatkan... tanpa sadar" / reminder & detection reliability must work
perfectly) — a recurring high-severity condition silently stops being detected
after the very first occurrence in the app's lifetime for that user.

**Fix:** Either (a) scope `findActiveByType` to a real time window (e.g. only
dedup within the same WIB calendar day, matching its own docstring), so a
recurrence on a later day is always eligible to fire again regardless of
feedback status, or (b) have `EmergencyAnomalyModal`'s acknowledge action also
transition the alert straight to `"ditindaklanjuti"` (skipping the
"dibaca-but-never-actioned" purgatory state) since acknowledging IS the concrete
follow-up action for an emergency alert, or (c) add a scheduled job that
auto-expires `"dibaca"` alerts to `"ditindaklanjuti"` after a bounded time (e.g.
24h) so dedup self-heals even if the user never visits `/notifikasi`. Option (a)
is the most robust and matches the existing docstring's stated intent.

### CR-02: `report.service.test.ts` is broken — 5 of 9 tests throw `TypeError`, confirmed by running the suite

**File:** `backend/src/test/report.service.test.ts:130-221` (calls), `backend/src/services/report.service.ts:148-157` (current signature)

**Issue:** This phase (05-07) added a `getDialysisFn` param (from an earlier
phase) and a new `getAnomaliesFn` param to `_generateReportCore`, changing its
signature to:
`(userId, dari, sampai, getFluidFn, getMedFn, getDialysisFn, getCAPDFn, getAnomaliesFn?)`.
The test file's calls were never updated and still pass only 6 positional
arguments:
`_generateReportCore(USER_ID, dari, sampai, repo.getFluidSummaryByRange, repo.getMedicationAdherenceByRange, repo.getCAPDConditionsByRange)`.
This means `repo.getCAPDConditionsByRange` (the test's 6th arg) is bound to the
`getDialysisFn` parameter slot, and `getCAPDFn` is `undefined`. Running the suite
confirms the failure:

```
$ node --import tsx --test src/test/report.service.test.ts
not ok 1 - returns correct fluid summary (totalIn, totalOut, balance)
  error: 'getCAPDFn is not a function'
...
# tests 9
# pass 4
# fail 5
```

Notably, the 05-07 diff to this file *acknowledges* the problem in its own
comment without fixing it: `"the import chain still requires a syntactically
valid key to avoid a load-time throw that would fail every test in this file,
not just the pre-existing getCAPDFn-arity ones"` — i.e. the arity bug was known
and shipped anyway. This means D-15 (real anomaly data in the doctor report) has
no passing regression coverage, and `npm test` fails for this file today.

**Fix:** Update every `_generateReportCore(...)` call in the test file to pass
a fake `getDialysisFn` in the correct 6th position and either a fake
`getAnomaliesFn` (7th position) or omit it to exercise the default (in which case
`ENCRYPTION_KEY` must be a real-format key and a DB connection must be
mockable/avoided — prefer passing an explicit fake).

### CR-03: `anomaly.controller.test.ts` fails at import time — 0 of 4 tests ever run

**File:** `backend/src/test/anomaly.controller.test.ts:24-26`, `backend/src/controllers/anomaly.controller.ts:21` (`import { decrypt } from "../lib/encryption.js"`), `backend/src/lib/encryption.ts:23-39` (`const KEY = loadKey();` — eager, throws if `ENCRYPTION_KEY` unset)

**Issue:** This test file was originally written in 05-01 as a RED scaffold
("expected to FAIL/error at import time until 05-03 implements the module").
05-03 (`333441c`) did implement `anomaly.controller.ts`, including a direct
top-level import of `lib/encryption.js` (which eagerly validates `ENCRYPTION_KEY`
at module load — the same "throw at import time" anti-pattern this review was
asked to check for, previously fixed only in `groqClient.ts`). Unlike its sibling
files touched in this phase (`dailySummary.job.test.ts`, `report.service.test.ts`),
`anomaly.controller.test.ts` was never updated to set
`process.env.ENCRYPTION_KEY` before the dynamic import, so it still fails —
confirmed by running it directly:

```
$ node --import tsx --test src/test/anomaly.controller.test.ts
# Error: [encryption] ENCRYPTION_KEY env var is missing.
#     at async <anonymous> (.../src/test/anomaly.controller.test.ts:24:56)
not ok 1 - .../anomaly.controller.test.ts
# tests 1
# pass 0
# fail 1
```

This means every assertion this file was meant to cover — ANOMALY-04 feedback
persistence, the "aktif → dibaca" acknowledge transition, and ANOMALY-02 field
pass-through — has never actually executed since the controller was implemented.
The RED scaffold silently never turned GREEN, and the "fix" described in the
review brief (feedback submission transitioning to `"ditindaklanjuti"`) has no
regression test protecting it going forward.

**Fix:** Add the same `process.env.ENCRYPTION_KEY = "<64 hex chars>"` line (before
the dynamic import) that `dailySummary.job.test.ts` and `report.service.test.ts`
already use, then re-run to confirm the assertions actually pass against the real
implementation (not just against the RED-scaffold expectation).

### CR-04: Daily-summary and weekly-insight boot catch-up runs unconditionally regardless of time-of-day/day-of-week, permanently caching an incomplete day/week

**File:** `backend/src/jobs/scheduler.ts:36-45`, `backend/src/jobs/dailySummary.job.ts:62-71`, `backend/src/jobs/weeklyInsight.job.ts:53-60`

**Issue:** `startScheduler()` calls `runDailySummaryBatch()` and
`runWeeklyInsightBatch()` unconditionally on every process boot (in addition to
their normal 20:00 WIB / Sunday-19:00-WIB cron schedules), justified by the
comment "safe to re-run unconditionally because generate-or-cache functions
no-op on a cache hit." That reasoning only establishes *idempotency*
(no duplicate Groq calls / no duplicate rows) — it says nothing about whether the
*data being cached* is correct for that call time.

Railway/Render containers restart routinely (deploys, health-check restarts,
crash recovery, hobby-tier idle/wake cycles). If a restart happens at, say, 09:00
WIB, `generateAndCacheDailySummary(userId)` runs immediately with **only that
day's data logged so far** (a few hours of fluid/medication/dialysis entries),
generates a narrative describing an incomplete day, and `upsertSummary` caches
it under the unique `(userId, tanggal)` key. When the *real* 20:00 WIB cron job
runs later that same day, `generateAndCacheDailySummary` (called without
`force: true`) sees the existing cache row and returns it unchanged — the
premature, incomplete-day summary becomes the permanent record for that day
unless the patient manually taps "Buat Ulang Ringkasan".

The weekly-insight case is strictly worse: a restart on any day other than
Sunday evening caches an incomplete-week insight under that week's ISO key, and
**there is no manual regenerate endpoint for weekly insight at all** (see
CR-05) — so an incomplete weekly insight, once cached by an untimely restart,
can only be corrected by the next Sunday's cron overwriting the *following*
week's row; that week's insight stays wrong for its entire remaining lifetime.

**Fix:** Guard the boot catch-up calls with a time check — only run
`runDailySummaryBatch()` at boot if the current WIB time is at/after 20:00 (i.e.
"catch up because we missed today's run"), and only run
`runWeeklyInsightBatch()` at boot if it's Sunday at/after 19:00 WIB (or, more
robustly, track a `lastRunDate`/`lastRunWeek` marker so the catch-up only fires
when a scheduled run was actually missed, not on every restart).

## Warnings

### WR-01: `GET /api/ai/weekly-insight` has no way to recover from a missed/failed batch — no regenerate endpoint, no on-demand trigger

**File:** `backend/src/routes/ai.routes.ts:20-21`, `backend/src/services/aiInsight.service.ts` (no `force`-capable route wired), `frontend/components/lab/WeeklyInsightCard.tsx`

**Issue:** Unlike daily-summary (`POST /api/ai/daily-summary/regenerate`) and
lab-analysis (`getOrTriggerLabAnalysis`'s on-demand fire-and-forget generation
on cache miss), weekly-insight is purely cache-only: if the Sunday 19:00 WIB
batch fails for a user (Groq timeout/rate-limit — which per D-18 is deliberately
*not* cached as a fallback, so a failure leaves no row at all), that user has no
insight for the entire week and no way to trigger generation until the following
Sunday.

**Fix:** Add either a `POST /api/ai/weekly-insight/regenerate` route (mirroring
daily-summary) or an on-demand fire-and-forget trigger on the GET path (mirroring
lab-analysis's `getOrTriggerLabAnalysis`), so a missed batch run is recoverable
within the same week.

### WR-02: `WeeklyInsightCard.tsx` empty-state copy describes a trigger mechanism that was explicitly not implemented

**File:** `frontend/components/lab/WeeklyInsightCard.tsx:130-132`, `backend/src/services/aiInsight.service.ts:11-15`

**Issue:** The empty-state text reads: *"Wawasan baru dibuat otomatis setiap
Minggu pukul 19:00, atau saat ada data lab baru yang signifikan."* ("...or when
there's significant new lab data.") But `aiInsight.service.ts`'s own file header
states explicitly: *"Per 05-RESEARCH.md Open Question 4: only the Sunday-cron
path is implemented here — 'significant new lab data' triggers are AI-03's
per-save lab analysis trigger (05-06), not a second weekly-insight
significance-detection mechanism."* There is no code path anywhere in
`aiInsight.service.ts`/`aiLabAnalysis.service.ts` that regenerates the weekly
insight in response to a new lab result. This is user-facing copy claiming a
feature that does not exist, which will confuse patients into believing a
new lab result should have updated their weekly insight when it never will.

**Fix:** Either implement the lab-triggered regeneration this copy promises, or
correct the copy to only reference the Sunday 19:00 WIB cron (matching the
actual, documented, implemented behavior).

### WR-03: Fire-and-forget anomaly checks have a TOCTOU race that can produce duplicate alerts/duplicate emergency pushes for the same event

**File:** `backend/src/services/anomalyOrchestrator.service.ts:88-130` (`processFiredRule`), `backend/src/controllers/fluid.controller.ts:31-33`, `backend/src/controllers/medicationLog.controller.ts:28-30,50-52`, `backend/src/controllers/dialysisLog.controller.ts:27-29,48-50`

**Issue:** Every tracking-entry endpoint (`fluid.create`, `medicationLog.confirm`/
`confirmById`, `dialysisLog.confirm`/`confirmById`) fires
`runAnomalyChecksForUser(userId)` without any debounce/lock. `processFiredRule`'s
dedup is a plain read-then-write (`findActiveByType` SELECT, then later
`insertAlert` INSERT) with no transaction or unique constraint enforcing
atomicity — `anomaly_alerts` has only non-unique indexes
(`idx_anomaly_user_type_status`), not a unique constraint on
`(userId, tipeAnomali)` for unresolved rows. If a user's client fires two
requests close together (e.g. two rapid fluid entries, or a request retried by
the client), two concurrent `runAnomalyChecksForUser` calls can both pass the
`active.length === 0` dedup check before either has inserted its row, resulting
in two alert rows and — for `severity: "tinggi"` — two emergency push
notifications and two `EmergencyAnomalyModal` appearances for what the patient
experiences as a single event.

**Fix:** Either wrap the dedup-check + insert in a single DB transaction with
`SELECT ... FOR UPDATE`, or add a partial unique index on
`(user_id, tipe_anomali) WHERE status IN ('aktif','dibaca')` so the database
itself rejects the second concurrent insert, with the orchestrator treating a
unique-violation as a normal dedup skip.

---

_Reviewed: 2026-07-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
