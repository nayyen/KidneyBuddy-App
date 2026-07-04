---
phase: 05-ai-insights-anomaly-detection
plan: 06
subsystem: backend
tags: [groq, drizzle, express, ai-cache, backend, ai-disclaimer]

# Dependency graph
requires:
  - phase: 05-ai-insights-anomaly-detection
    plan: "01"
    provides: groqClient.ts singleton, aiDisclaimer.ts, ai_lab_analyses/ai_lifestyle_suggestions schemas
  - phase: 05-ai-insights-anomaly-detection
    plan: "05"
    provides: generate-or-cache + throw-on-Groq-failure (D-18, no cached fallback) pattern established for AI-01/AI-02, reused verbatim here
provides:
  - AI-03 per-lab-result analysis generate-or-cache (aiLabAnalysis.service.ts), non-blocking trigger fired from labResult.service.ts::createEntry (D-14)
  - AI-04 personalized lifestyle suggestion generate-or-cache with a >=3-day tracking gate (aiLifestyle.service.ts)
  - /api/ai endpoints (GET lab-analysis/:labResultId, GET lifestyle)
affects: [05-07-lab-lifestyle-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-and-forget AI trigger from an existing save flow: labResult.service.ts::createEntry awaits the DB insert/save, then calls the AI generate-or-cache function WITHOUT awaiting it, attaching only a .catch() logger — the save response is never delayed or made to depend on Groq availability (D-14)"
    - "IDOR-safe cache lookup via join, not a userId column: ai_lab_analyses has no user_id column (it's keyed purely by lab_result_id per the 05-01 schema) — aiLabAnalysis.repository.ts enforces ownership via an inner join against lab_results.user_id instead of duplicating a user_id column onto the cache table"
    - "Gate-then-generate service shape (new, distinct from 05-05's cache-then-generate shape): getLifestyleSuggestion(userId) checks a >=3-day tracking gate FIRST (no Groq call, no cache lookup) and only delegates to generateAndCacheLifestyle(userId) — which does its own D-16 cache-or-generate — once the gate passes; used because AI-04 has no manual regenerate route (D-13) and the gate itself is the primary UX branch"

key-files:
  created:
    - backend/src/services/aiLabAnalysis.service.ts
    - backend/src/services/aiLifestyle.service.ts
    - backend/src/repositories/aiLabAnalysis.repository.ts
    - backend/src/repositories/aiLifestyleSuggestion.repository.ts
  modified:
    - backend/src/services/labResult.service.ts
    - backend/src/controllers/ai.controller.ts
    - backend/src/routes/ai.routes.ts

key-decisions:
  - "Groq-failure handling mirrors 05-05 exactly (not 05-03): both aiLabAnalysis.service.ts and aiLifestyle.service.ts throw AppError(503, 'AI_UNAVAILABLE') on Groq failure rather than caching a static-template fallback — consistent with these being on-demand narration of already-saved/already-decided facts (the lab result and tracking data are safe regardless of whether the AI narrative generates), unlike 05-03's must-never-drop anomaly safety alerts."
  - "aiLabAnalysis.repository.ts::findByLabResultId enforces IDOR safety via an inner join against lab_results.user_id rather than adding a redundant user_id column to ai_lab_analyses — the 05-01 schema deliberately keys this table by lab_result_id alone (D-16), and the join keeps that single source of truth while still satisfying T-05-14."
  - "GET /api/ai/lab-analysis/:labResultId returns { ready: false } (HTTP 200) for BOTH 'not yet generated' and 'not owned by this user / doesn't exist' — collapsing these into one response avoids a 404-vs-200 status-code oracle that would otherwise leak whether a given labResultId exists for another user."
  - "AI-04's >=3-day tracking gate is computed from distinct fluid_log dates only (not a union across fluid/medication/dialysis/activity tables) — fluid tracking is the universal daily touchpoint across CAPD/HD/transplant patients and mirrors the existing daysWithFluidData concept from 05-05's aiInsight.service.ts. Follows Assumption A3 (05-RESEARCH.md): the simpler UI-SPEC gate ('>=3 days tracking data') rather than PRD FR-SYS-006's stricter '+>=1 hasil lab' wording — flagged here per the plan's action text so a later phase can revisit if the PRD's stricter gate turns out to be the actual intent."
  - "generateAndCacheLifestyle(userId) takes only userId (matching the plan's declared export signature) and re-derives trackingDays internally via a fresh countDistinctTrackingDays call, rather than accepting a caller-supplied trackingDays — keeps the function safe to call standalone even though its only current caller (getLifestyleSuggestion) has already gate-checked."

patterns-established:
  - "Pattern: AI surfaces triggered by an existing non-AI save flow (as opposed to a scheduled batch or a lazy-generate-on-view GET) attach via fire-and-forget from the production wrapper function (not the injectable-core function), so existing unit tests against the injectable core are unaffected and the side effect is isolated to the one code path that actually persists data."

requirements-completed: [AI-03, AI-04, AI-05]

# Metrics
duration: "~40min"
completed: 2026-07-04
---

# Phase 05 Plan 06: AI Lab Analysis & Lifestyle Suggestion Summary

**Per-lab-result AI-03 analysis (fire-and-forget on manual lab save, cached per lab_result_id) and AI-04 lifestyle suggestions (gated on >=3 days of fluid tracking, cached per user+date) now live on /api/ai, both server-side-disclaimer-enforced (AI-05)**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-07-04
- **Tasks:** 3 (all auto)
- **Files modified:** 7 (4 created, 3 modified)

## Accomplishments

- `aiLabAnalysis.service.ts`: `getLabAnalysis` (cache-only read, IDOR-scoped) + `generateAndCacheLabAnalysis` (fetches the lab result's own values, Groq narration against general CKD reference ranges without diagnosing, unconditional `appendDisclaimer`, AES-256-GCM encrypt, upsert keyed on `lab_result_id`)
- `aiLabAnalysis.repository.ts`: `findByLabResultId` (IDOR-safe via inner join against `lab_results.user_id` since `ai_lab_analyses` has no `user_id` column) + `upsertAnalysis`
- `labResult.service.ts::createEntry`: fires `generateAndCacheLabAnalysis` fire-and-forget after the insert succeeds and returns — the manual lab save (AI-03/D-14) never awaits or depends on Groq
- `aiLifestyle.service.ts`: `getLifestyleSuggestion` (gate-checks `>=3` distinct fluid-tracking days before ever touching Groq or the cache) + `generateAndCacheLifestyle` (gathers fluid-tracking count + latest manual lab result + active therapy method, Groq narration of concrete food/lifestyle suggestions, disclaimer, encrypt, upsert keyed on `(userId, tanggal)`)
- `aiLifestyleSuggestion.repository.ts`: `findByUserAndDate`/`upsertSuggestion` (cache CRUD) + `countDistinctTrackingDays` (the AI-04 gate signal)
- `ai.controller.ts` + `ai.routes.ts`: `GET /api/ai/lab-analysis/:labResultId` (returns `{ ready: false }` until the async analysis finishes, or `{ ready: true, ...analysis }`), `GET /api/ai/lifestyle` (returns the gated marker or the suggestion) — both `authenticate`-gated alongside the existing 05-05 routes, no routes/behavior from 05-05 touched

## Task Commits

1. **Task 1: Lab analysis service + repository + non-blocking trigger on lab save (AI-03, D-14)** - `9793ea9` (feat)
2. **Task 2: Lifestyle suggestion service + repository + gate (AI-04)** - `439b316` (feat)
3. **Task 3: ai.controller + ai.routes additions for lab analysis + lifestyle** - `01eaefd` (feat)

## Files Created/Modified

- `backend/src/services/aiLabAnalysis.service.ts` - AI-03 generate-or-cache, throws AppError(503) on Groq failure (D-18), no static fallback cached
- `backend/src/repositories/aiLabAnalysis.repository.ts` - IDOR-safe (join-based) cache CRUD keyed by `lab_result_id`
- `backend/src/services/aiLifestyle.service.ts` - AI-04 gate-then-generate-or-cache, same D-18 throw pattern
- `backend/src/repositories/aiLifestyleSuggestion.repository.ts` - cache CRUD keyed by `(userId, tanggal)` + `countDistinctTrackingDays` gate helper
- `backend/src/services/labResult.service.ts` - `createEntry` now fires the AI-03 analysis trigger fire-and-forget after the save returns
- `backend/src/controllers/ai.controller.ts` - added `getLabAnalysis`, `getLifestyleSuggestion` handlers
- `backend/src/routes/ai.routes.ts` - added `GET /lab-analysis/:labResultId`, `GET /lifestyle` (authenticated)

## Decisions Made

See `key-decisions` in frontmatter — summarized: (1) Groq-failure handling mirrors 05-05's throw pattern, not 05-03's cache-a-fallback pattern; (2) IDOR safety for the lab-analysis cache is enforced via a join rather than a redundant `user_id` column; (3) the lab-analysis GET collapses "not ready" and "not owned" into the same `{ ready: false }` response to avoid a status-code existence oracle; (4) the AI-04 tracking gate uses fluid-log distinct-day count only (Assumption A3, UI-SPEC's simpler gate); (5) `generateAndCacheLifestyle` re-derives `trackingDays` internally to match the plan's single-argument export signature.

## Deviations from Plan

None — plan executed as written. The single-argument vs. two-argument question for `generateAndCacheLifestyle` was resolved in favor of matching the plan's declared export signature exactly (see key-decisions), which is a design clarification during implementation rather than a deviation from any stated behavior.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required (reuses the existing `GROQ_API_KEY` / `ENCRYPTION_KEY` env vars already configured in 05-01).

## Verification

- `npx tsc --noEmit`: zero new errors in any file this plan touched (diffed against the pre-existing baseline of `debug_*.ts` scratch files, `dialysisLog.controller.ts`/`medicationLog.controller.ts` query-param typing, `activities.service.ts`/`activity.service.test.ts` arg-count mismatches, `reminderDispatch.test.ts`, `report.service.test.ts` — all pre-existing, unrelated to this plan, same baseline noted in 05-05's SUMMARY)
- `npm test`: 157/174 passing — identical pass/fail count to the pre-05-06 baseline (17 pre-existing failures, none in files this plan touched)
- `grep -q "generateAndCacheLabAnalysis" src/services/labResult.service.ts` — pass
- `grep -q "appendDisclaimer" src/services/aiLabAnalysis.service.ts` — pass
- `grep -q "appendDisclaimer" src/services/aiLifestyle.service.ts` — pass
- `grep -q "lab-analysis" src/routes/ai.routes.ts` — pass
- `grep -q "lifestyle" src/routes/ai.routes.ts` — pass

## Next Phase Readiness

- AI-03/AI-04/AI-05 backend surfaces are complete and cached; 05-07 can now render the Lab-tab analysis card (polling or refetch after save, since generation is async/D-14) and the Edukasi lifestyle card (including its gated empty state when `{ gated: true }`) against these two new endpoints.
- Residual risk (same category noted in 05-05's SUMMARY): neither Groq-failure path here has been exercised against a live Groq call in this session (consistent with 05-RESEARCH.md's policy of not consuming free-tier quota in automated verification) — the `AppError` throw paths are covered by code reading and the shared pattern's prior verification in 05-05, not a fresh executed test in this plan.

---
*Phase: 05-ai-insights-anomaly-detection*
*Completed: 2026-07-04*

## Self-Check: PASSED

All 8 created/modified files confirmed present on disk; all 3 task commits (`9793ea9`, `439b316`, `01eaefd`) confirmed present in git log.
