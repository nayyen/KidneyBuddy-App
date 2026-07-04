---
phase: 05-ai-insights-anomaly-detection
plan: 05
subsystem: backend
tags: [groq, drizzle, express, node-cron, ai-cache, backend]

# Dependency graph
requires:
  - phase: 05-ai-insights-anomaly-detection
    plan: "01"
    provides: groqClient.ts singleton, aiDisclaimer.ts, ai_daily_summaries/ai_weekly_insights schemas, dailySummary.job.test.ts RED scaffold
  - phase: 05-ai-insights-anomaly-detection
    plan: "03"
    provides: anomaly.controller.ts thin-controller + injectable-core pattern, anomalyDetection.job.ts batch shape, scheduler.ts 21:00 job registration
provides:
  - AI-01 daily summary generate-or-cache (aiSummary.service.ts) + 20:00 WIB batch (dailySummary.job.ts)
  - AI-02 weekly trend insight generate-or-cache (aiInsight.service.ts) + Sunday 19:00 WIB batch (weeklyInsight.job.ts)
  - findAllActiveUsers() on user.repository.ts
  - /api/ai endpoints (GET daily-summary, POST daily-summary/regenerate, GET weekly-insight)
  - Established generate-or-cache + not-cached-on-Groq-failure pattern for 05-06 to extend
affects: [05-06-ai-lab-lifestyle-batch-job]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Generate-or-cache service shape: getX(userId) cache-only read (never calls Groq) + generateAndCacheX(userId, {force?}) that checks cache unless forced, gathers data, calls Groq, appends disclaimer unconditionally, encrypts, upserts"
    - "On a Groq call failure, the service does NOT cache a fallback row — it throws AppError(503, 'AI_UNAVAILABLE', <D-18 message>) so the batch job's per-user try/catch skips that user for the cycle (D-18) and an interactive caller sees the friendly message via the existing errorHandler"
    - "Injectable batch core (_runDailySummaryBatchCore<T>(userIds, {generateSummary, saveSummary, logError})) generic over payload type T, mirrors anomalyDetection.job.ts's AnomalyRepoDeps<T> shape from 05-03"

key-files:
  created:
    - backend/src/services/aiSummary.service.ts
    - backend/src/services/aiInsight.service.ts
    - backend/src/repositories/aiDailySummary.repository.ts
    - backend/src/repositories/aiWeeklyInsight.repository.ts
    - backend/src/jobs/dailySummary.job.ts
    - backend/src/jobs/weeklyInsight.job.ts
    - backend/src/controllers/ai.controller.ts
    - backend/src/routes/ai.routes.ts
  modified:
    - backend/src/repositories/user.repository.ts
    - backend/src/utils/wib.ts
    - backend/src/jobs/scheduler.ts
    - backend/src/app.ts
    - backend/src/test/dailySummary.job.test.ts

key-decisions:
  - "Groq-failure handling deliberately diverges from 05-03's anomalyExplanation.service.ts: 05-03 always caches a static-template fallback (isFallback=true); 05-05's plan text and RESEARCH.md Pattern 3 specify NOT caching on failure and surfacing a D-18 error instead. The interrupted session's original implementation had copied 05-03's cache-a-fallback pattern; this was corrected during resumed verification to match the plan text (see Deviation below)."
  - "findAllActiveUsers() added as a thin wrapper over 05-03's existing findAllActive() (returns userId[] instead of User[]) rather than duplicating the WHERE deletedAt IS NULL query — satisfies the plan's literal acceptance criterion while keeping one source of truth for the active-user predicate."
  - "isFallback column (migrated in 05-01) is now always written as false for both cache tables, since the only path that upserts is the Groq-success path — kept for schema/type compatibility with the 05-01 migration rather than altering the schema in this plan."

patterns-established:
  - "Pattern: AI batch jobs use an injectable core generic over a payload type, wired to production deps (real generate-or-cache service + no-op saveSummary, since persistence is already a side effect of generation) in a thin `run*Batch()` wrapper — reused for the next AI surface (05-06 lab analysis / lifestyle suggestion)."

requirements-completed: [AI-01, AI-02]

# Metrics
duration: "~25min resumed session (Task 1+2 verification/fix + Task 3 execution)"
completed: 2026-07-04
---

# Phase 05 Plan 05: AI Daily Summary & Weekly Insight Summary

**AI-01 daily summary and AI-02 weekly insight now generate, cache, and disclaim server-side on fixed WIB schedules, with manual regenerate exposed via `/api/ai`**

## Performance

- **Duration:** ~25 min (resumed after an interrupted session; Task 1 and 2 were already implemented but needed a Groq-failure-handling fix before commit; Task 3 executed fresh)
- **Completed:** 2026-07-04
- **Tasks:** 3 (all auto)
- **Files modified:** 13 (8 created, 5 modified)

## Accomplishments

- `aiSummary.service.ts`: `getDailySummary` (cache-only read) + `generateAndCacheDailySummary` (gather day's fluid/CAPD/medication/dialysis/activity data via `report.repository.ts` + `dailyActivity.repository.ts`, Groq narration, unconditional `appendDisclaimer`, AES-256-GCM encrypt, upsert keyed on `(userId, tanggal)`)
- `aiInsight.service.ts`: mirrors the same shape over a 7-30 day lookback (fluid/CAPD/medication/dialysis/lab), keyed on `(userId, pekan)` (WIB ISO-week)
- `dailySummary.job.ts` / `weeklyInsight.job.ts`: injectable sequential batch cores (D-17 no concurrency, D-18 per-user fault isolation), wired to real deps with a `GROQ_CALL_DELAY_MS` (2500ms) delay only after an actual Groq call
- `user.repository.ts`: added `findAllActiveUsers()` (userId-only wrapper over 05-03's `findAllActive()`)
- `ai.controller.ts` + `ai.routes.ts`: `GET /api/ai/daily-summary`, `POST /api/ai/daily-summary/regenerate` (forces regeneration, D-10), `GET /api/ai/weekly-insight` — all `authenticate`-gated
- `scheduler.ts`: registered 20:00 WIB and Sunday 19:00 WIB cron jobs (`Asia/Jakarta` timezone) plus idempotent boot catch-up calls, alongside the existing 21:00 anomaly job (untouched)
- `app.ts`: mounted `/api/ai` after `/api/anomaly`
- `dailySummary.job.test.ts` (05-01 RED scaffold) now GREEN: both the fault-isolation case and the all-succeed case pass

## Deviation from interrupted session's original implementation

The session that started this plan was interrupted mid-execution. Its Task 1/2 code was verified from scratch rather than trusted, which surfaced a real design bug: `aiSummary.service.ts`/`aiInsight.service.ts` caught Groq call failures internally and cached a static-template fallback (`isFallback=true`), copying 05-03's `anomalyExplanation.service.ts` pattern. But this plan's Task 1 action text ("On Groq failure, do not cache; surface the D-18 error text... to the caller") and `05-RESEARCH.md` Pattern 3's code example (`generateAndCacheDailySummary` is expected to throw, caught by the batch loop's per-user try/catch) both specify the opposite design. Under the original implementation, a Groq failure would never actually trigger D-18 fault isolation — the service would swallow the error and return a normal-looking cached result.

Fixed before committing: both services now throw `AppError(503, "AI_UNAVAILABLE", <D-18 message>)` on Groq failure instead of catching-and-caching a fallback. Static-fallback-template functions and the associated `isFallback` branching were removed; `isFallback` is now always written `false` (the column stays for 05-01 schema/type compatibility, but this plan's design never exercises the `true` branch). Confirmed via `npx tsc --noEmit` (no new errors vs. pre-fix baseline) and re-running `dailySummary.job.test.ts` (still green — the test only exercises the batch core's injected-dependency contract, not the service internals).

## Task Commits

1. **Task 1: Daily summary service + repository + findAllActiveUsers + 20:00 job** - `3208a4b` (feat) — includes the Groq-failure-handling fix and the new `findAllActiveUsers()` export
2. **Task 2: Weekly insight service + repository + Sunday 19:00 job** - `0a56e57` (feat) — same fix applied, plus `wib.ts`'s `wibDaysAgoStr`/`wibIsoWeekKey` additions
3. **Task 3: ai.controller + ai.routes + scheduler registration + app.ts mount** - `2b81477` (feat)

## Verification

- `npx tsc --noEmit`: zero new errors (diffed against pre-change baseline — all remaining errors are pre-existing, in files outside this plan's scope: `debug_*.ts` scratch files, `reminderDispatch.test.ts`, `report.service.test.ts`)
- `node --import tsx --test src/test/dailySummary.job.test.ts`: 2/2 passing (D-17 sequential + D-18 fault isolation)
- `npm test`: 157/174 passing, identical pass/fail count to the pre-existing baseline (the 17 failures are unrelated pre-existing failures, confirmed via grep that none of the failing test files reference any file this plan touched)
- `grep -q "appendDisclaimer"` passes for both `aiSummary.service.ts` and `aiInsight.service.ts`
- `grep -q "app.use(\"/api/ai\""` passes; `grep -c "Asia/Jakarta" scheduler.ts` = 3 (was 1, +2 new jobs)

## Requirements Completed

- **AI-01**: Daily summary generated at 20:00 WIB or manual trigger, cached per user+date, disclaimer-enforced
- **AI-02**: Weekly insight generated Sunday 19:00 WIB from 7-30 days of data, cached per user+week, disclaimer-enforced

## Self-Assessment

**Confidence: High** — both AI surfaces follow the same verified generate-or-cache pattern, the RED scaffold from 05-01 is now GREEN, tsc/test-suite baselines are unchanged outside this plan's files, and the Groq-failure design now matches the plan text exactly rather than the interrupted session's uncommitted (and incorrect) copy of 05-03's pattern.

**Residual risk:** the Groq-failure fix was never exercised against a live Groq call (no live API call made in this session, consistent with 05-RESEARCH.md's stated policy of not consuming free-tier quota in tests) — the `AppError` throw path is covered by code reading, not an executed test. If 05-06 or a later phase adds a dedicated Groq-failure unit test for these two services, it would close this gap.
