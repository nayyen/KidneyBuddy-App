---
phase: 05-ai-insights-anomaly-detection
plan: 03
subsystem: api
tags: [groq-sdk, node-cron, express, drizzle, anomaly-detection, backend]

# Dependency graph
requires:
  - phase: 05-01-ai-insights-anomaly-detection
    provides: groqClient.ts, aiDisclaimer.ts, forbiddenPhrases.ts, anomaly_alerts schema, RED anomaly.controller.test.ts scaffold
  - phase: 05-02-ai-insights-anomaly-detection
    provides: anomalyRule.service.ts (4 pure rule functions), anomalyAlert.repository.ts, findMissedToday helpers, fluidLog rule-input helpers
provides:
  - "Complete backend anomaly pipeline: fired rule -> Groq explanation (D-20 validated) -> encrypted insert -> emergency push for tinggi severity"
  - "Fire-and-forget per-entry anomaly trigger wired into fluid/medicationLog/dialysisLog controllers (ANOMALY-01)"
  - "21:00 WIB cron batch (anomalyDetection.job.ts) iterating all active users sequentially with D-17/D-18 fault isolation"
  - "/api/anomaly REST API: GET history, GET active-high-severity, PATCH feedback, POST acknowledge (ANOMALY-04)"
affects: [05-04-anomaly-frontend, 05-05-ai-daily-weekly-insight, 05-06-ai-lab-lifestyle]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single shared orchestrator pipeline (anomalyOrchestrator.service.ts) called from both the per-entry fire-and-forget trigger AND the daily batch job — no duplicated rule-firing logic between call sites"
    - "Generic AnomalyRepoDeps<T> injectable-core pattern in anomaly.controller.ts so a RED test scaffold's simplified in-memory fake and the production Drizzle row type satisfy the same interface without casts"
    - "AnomalyAlertNotFoundError thrown by injectable core functions (not returned as undefined) so happy-path test assertions never need a null-check, while controllers catch-and-404"

key-files:
  created:
    - backend/src/services/anomalyExplanation.service.ts
    - backend/src/services/anomalyOrchestrator.service.ts
    - backend/src/jobs/anomalyDetection.job.ts
    - backend/src/controllers/anomaly.controller.ts
    - backend/src/routes/anomaly.routes.ts
  modified:
    - backend/src/repositories/anomalyAlert.repository.ts (added getAlertById, findAllByUser)
    - backend/src/repositories/fluidLog.repository.ts (added getTodayAbnormalKondisiKeluar)
    - backend/src/repositories/user.repository.ts (added findAllActive)
    - backend/src/jobs/scheduler.ts (registered 21:00 WIB batch + boot catch-up)
    - backend/src/controllers/fluid.controller.ts (fire-and-forget trigger on create)
    - backend/src/controllers/medicationLog.controller.ts (fire-and-forget trigger on confirm/confirmById)
    - backend/src/controllers/dialysisLog.controller.ts (fire-and-forget trigger on confirm/confirmById)
    - backend/src/app.ts (mounted /api/anomaly)

key-decisions:
  - "medicationLog.controller.ts/dialysisLog.controller.ts have no res.status(201).json(...) create handler (unlike fluid.controller.ts) — their meaningful 'new tracking entry' events are confirm/confirmById (status transition tertunda -> dikonfirmasi), so the fire-and-forget trigger was added there instead of a literal create endpoint that doesn't exist in these two controllers"
  - "anomaly.controller.ts's injectable core functions (_submitFeedbackCore/_acknowledgeAlertCore) are generic over the repo row type T and throw AnomalyAlertNotFoundError instead of returning T | undefined, so the already-committed 05-01 RED scaffold's non-null-checked assertions (result.feedbackPengguna) type-check without modifying the test file"
  - "Added getAlertById + findAllByUser to anomalyAlert.repository.ts (not explicitly named in the plan's action text) because the RED test scaffold's injected fake repo shape requires a getAlertById existence/IDOR check before every mutation, and the history GET endpoint needs an unfiltered-by-date list function"
  - "getTodayAbnormalKondisiKeluar returns the worst-priority (berdarah > keruh_gumpalan > keruh) CAPD effluent condition logged today, or null — feeds checkCapdEffluentAnomaly without the rule engine ever touching Postgres directly (D-03 boundary preserved)"

patterns-established:
  - "Pattern: repository helpers that feed the anomaly rule engine live in the entity's own repository file (fluidLog/medicationLog/dialysisLog), never in a shared anomaly-specific data-access module — keeps D-03's boundary (rule engine has zero db imports) intact while repositories stay entity-scoped"

requirements-completed: [ANOMALY-01]

# Metrics
duration: ~50min
completed: 2026-07-04
---

# Phase 05 Plan 03: Anomaly Backend Pipeline (Explanation, Orchestrator, Batch, API) Summary

**Wired the 05-02 rule engine into a complete backend pipeline — fired rules get a D-20-validated Groq explanation, deduped and encrypted into `anomaly_alerts`, with `tinggi`-severity alerts fanning out an emergency push; every fluid/medication/dialysis entry triggers a fire-and-forget check, a 21:00 WIB cron batch sweeps all users, and `/api/anomaly` exposes history/feedback/acknowledge**

## Performance

- **Duration:** ~50 min across 3 task commits
- **Tasks:** 3 (1 TDD-flavored explanation+orchestrator task, 1 batch-job task, 1 controller/routes/wiring task)
- **Files modified:** 13 (5 created, 8 modified)

## Accomplishments

- `anomalyExplanation.service.ts`: `generateAnomalyExplanation` calls Groq with a calm, non-diagnostic, prompt-injection-resistant system prompt; `getValidatedExplanation` applies the D-20 forbidden-phrase gate, swapping in the static fallback template (invisible to UI, logged server-side) for `tinggi`-severity output that fails the check
- `anomalyOrchestrator.service.ts::runAnomalyChecksForUser`: single shared pipeline (rules → dedup via `findActiveByType` → explain → `encrypt()` → `insertAlert` → conditional `sendToAllDevices`) called from both the per-entry trigger and the batch job; never throws to its caller
- `anomalyDetection.job.ts`: `_anomalyBatchCore` (injectable) + `runAnomalyDetectionBatch`, sequential per-user loop with a 2.5s delay (D-17, ~24 calls/min, safely under the ~30 RPM free-tier ceiling) and per-user try/catch-continue (D-18); registered in `scheduler.ts` at `"0 21 * * *"` with `{ timezone: "Asia/Jakarta" }` plus an idempotent boot catch-up
- Fire-and-forget `runAnomalyChecksForUser` wired into `fluid.controller.ts::create`, `medicationLog.controller.ts::confirm`/`confirmById`, `dialysisLog.controller.ts::confirm`/`confirmById` — all placed strictly after the response is sent
- `anomaly.controller.ts` + `anomaly.routes.ts` + `app.ts` mount: `GET /api/anomaly` (history), `GET /api/anomaly/active-high-severity` (D-07 emergency-modal re-check), `PATCH /api/anomaly/:id/feedback`, `POST /api/anomaly/:id/acknowledge` (status `aktif` -> `dibaca`, persisted) — every route `authenticate`-gated
- `src/test/anomaly.controller.test.ts` (05-01 RED scaffold): now GREEN, 4/4 assertions passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Explanation service (D-20) + anomaly orchestrator** - `26dd0b2` (feat)
2. **Task 2: 21:00 batch job + scheduler registration** - `f8f75df` (feat)
3. **Task 3: Per-entry triggers + anomaly controller/routes + app.ts mount** - `333441c` (feat)

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified

- `backend/src/services/anomalyExplanation.service.ts` - Groq narration + D-20 validate/fallback
- `backend/src/services/anomalyOrchestrator.service.ts` - `runAnomalyChecksForUser`, the single shared pipeline
- `backend/src/jobs/anomalyDetection.job.ts` - `_anomalyBatchCore`/`runAnomalyDetectionBatch`
- `backend/src/jobs/scheduler.ts` - registers 21:00 WIB job + boot catch-up
- `backend/src/controllers/anomaly.controller.ts` - list/activeHighSeverity/feedback/acknowledge + injectable cores
- `backend/src/routes/anomaly.routes.ts` - authenticate on every route
- `backend/src/app.ts` - mounts `/api/anomaly`
- `backend/src/controllers/fluid.controller.ts` - fire-and-forget trigger on `create`
- `backend/src/controllers/medicationLog.controller.ts` - fire-and-forget trigger on `confirm`/`confirmById`
- `backend/src/controllers/dialysisLog.controller.ts` - fire-and-forget trigger on `confirm`/`confirmById`
- `backend/src/repositories/anomalyAlert.repository.ts` - added `getAlertById`, `findAllByUser`
- `backend/src/repositories/fluidLog.repository.ts` - added `getTodayAbnormalKondisiKeluar`
- `backend/src/repositories/user.repository.ts` - added `findAllActive`

## Decisions Made

- `medicationLog.controller.ts`/`dialysisLog.controller.ts` have no literal `res.status(201).json(...)` create handler (unlike `fluid.controller.ts`) — their `confirm`/`confirmById` actions are the meaningful "new tracking entry" events, so the fire-and-forget trigger was placed there instead of a nonexistent create endpoint.
- `anomaly.controller.ts`'s injectable cores (`_submitFeedbackCore`/`_acknowledgeAlertCore`) are generic over the repo row type and throw `AnomalyAlertNotFoundError` rather than returning `T | undefined`, so the already-committed RED scaffold's non-null-checked assertions type-check without any test-file modification.
- Added `getAlertById` + `findAllByUser` to `anomalyAlert.repository.ts` — not explicitly named in the plan's action text, but required by the RED scaffold's fake-repo contract (existence/IDOR check before every mutation) and by the history GET endpoint (unfiltered-by-date list).
- `getTodayAbnormalKondisiKeluar` returns the worst-priority (berdarah > keruh_gumpalan > keruh) CAPD effluent condition logged today, keeping the D-03 boundary intact (rule engine never touches Postgres — only receives already-fetched data).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `getAlertById`/`findAllByUser` to `anomalyAlert.repository.ts`**
- **Found during:** Task 3 (turning `anomaly.controller.test.ts` GREEN)
- **Issue:** The already-committed 05-01 RED scaffold's injected fake repo requires `getAlertById(userId, alertId)` as part of the injectable-core contract, and the plan's `list` handler needs a full-history query with no repository function existing for it (`findByUserAndRange` requires a date range).
- **Fix:** Added both functions to `anomalyAlert.repository.ts`, both IDOR-scoped by `userId`.
- **Files modified:** `backend/src/repositories/anomalyAlert.repository.ts`
- **Verification:** `anomaly.controller.test.ts` 4/4 GREEN; `npx tsc --noEmit` clean for this file.
- **Committed in:** `26dd0b2` (repo additions bundled with Task 1, since the orchestrator also needed repository groundwork) and used in `333441c` (Task 3)

**2. [Rule 1 - Bug] Generic `AnomalyRepoDeps<T>` + throw-based core functions instead of `T | undefined` returns**
- **Found during:** Task 3, `npx tsc --noEmit` after wiring the controller against the RED scaffold
- **Issue:** An initial implementation typed the injectable core functions as returning `AnomalyAlert | undefined` (the concrete production row type). The RED scaffold's fake repo returns a structurally different (simplified) object and the test accesses `result.feedbackPengguna` without a null check — this produced two classes of compile error: the fake repo not assignable to the concrete `AnomalyAlert`-typed interface, and `result` "possibly undefined".
- **Fix:** Made `AnomalyRepoDeps<T>` and the core functions generic over `T`, and changed not-found handling from `return undefined` to `throw new AnomalyAlertNotFoundError()` — the test's happy-path calls never hit the throw branch, so `result` is typed as non-optional `T`, satisfying the test's direct property access; controllers catch `AnomalyAlertNotFoundError` and respond 404.
- **Files modified:** `backend/src/controllers/anomaly.controller.ts`
- **Verification:** `npx tsc --noEmit` clean; `node --import tsx --test src/test/anomaly.controller.test.ts` 4/4 GREEN.
- **Committed in:** `333441c` (Task 3 commit — fixed before commit, not a separate commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug) — both required to satisfy the already-committed RED test scaffold's exact contract; no scope creep beyond what Task 3's acceptance criteria demanded.

## Issues Encountered

Full-suite `npm test` after Task 3: 159 pass / 17 fail. All 17 failures confirmed pre-existing and unrelated to any file this plan touched (activity service tests, `dailySummary.job.test.ts` — the 05-05 RED scaffold, `fluid.service.test.ts`'s unrelated zod-enum mismatch, `report.service.test.ts` argument-count mismatch, `reminderDispatch.test.ts` typo) — verified via `tsc --noEmit` baseline and `git status --porcelain` showing none of those files were touched by 05-03. Logged to `.planning/phases/05-ai-insights-anomaly-detection/deferred-items.md` per the scope-boundary rule; not fixed here.

## User Setup Required

None - no new external service configuration required (Groq/GROQ_API_KEY already configured in 05-01).

## Next Phase Readiness

- Backend anomaly pipeline is complete and live: `/api/anomaly` (history/active-high-severity/feedback/acknowledge), fire-and-forget per-entry checks, and the 21:00 WIB batch job are all wired and type-checked.
- 05-04 (anomaly frontend) can build the emergency modal, alert card, and `/notifikasi` history page directly against this API — `GET /api/anomaly/active-high-severity` is the exact server-fetched source of truth D-07 requires (never derive modal visibility from client state).
- `anomalyOrchestrator.service.ts::runAnomalyChecksForUser` is a stable, reusable entry point — no further backend anomaly-detection work is needed before 05-04's frontend wiring.
- Pre-existing test failures (see Issues Encountered / `deferred-items.md`) remain unresolved — recommend a dedicated cleanup pass before Milestone sign-off, not blocking for 05-04.

---
*Phase: 05-ai-insights-anomaly-detection*
*Completed: 2026-07-04*

## Self-Check: PASSED

All created/modified files verified present on disk; all three task commits (`26dd0b2`, `f8f75df`, `333441c`) verified present in git log.
