---
phase: 05-ai-insights-anomaly-detection
plan: 01
subsystem: infra
tags: [groq-sdk, drizzle, postgres, backend, safety-lib, docker]

# Dependency graph
requires:
  - phase: 04-caregiver-dashboard-doctor-reports
    provides: labResult.schema.ts pgTable convention, encryption.ts hard-fail lib pattern, webPushClient.ts singleton pattern
provides:
  - groq-sdk@1.3.0 installed behind a passed legitimacy checkpoint
  - Singleton Groq client (backend/src/lib/groqClient.ts) with startup guard on GROQ_API_KEY
  - Backend-enforced AI disclaimer (backend/src/lib/aiDisclaimer.ts) satisfying AI-05/D-19
  - Forbidden-phrase detection + static fallback templates (backend/src/lib/forbiddenPhrases.ts) satisfying D-20
  - 5 new Drizzle tables live in Postgres (anomaly_alerts, ai_daily_summaries, ai_weekly_insights, ai_lab_analyses, ai_lifestyle_suggestions)
  - RED test scaffolds for waves 1-3 (anomalyRule.service, anomaly.controller, dailySummary.job)
affects: [05-02-anomaly-rule-engine, 05-03-anomaly-controller-frontend, 05-04-ai-daily-weekly-insights, 05-05-ai-lab-lifestyle-batch-job]

# Tech tracking
tech-stack:
  added: [groq-sdk@1.3.0]
  patterns:
    - "Backend-enforced safety libs (aiDisclaimer.ts, forbiddenPhrases.ts) as dependency-free pure modules with JSDoc headers naming the decision (D-19/D-20) they satisfy"
    - "AI cache tables (ai_daily_summaries, ai_weekly_insights, ai_lab_analyses, ai_lifestyle_suggestions) keyed by unique (userId, date/week/labResultId) constraints for idempotent batch jobs"
    - "anomaly_alerts dual-indexed on (userId, createdAt) and (userId, tipeAnomali, status) to support dedup lookups"
    - "RED test scaffold headers name which future plan (05-02/05-03/05-05) turns them GREEN"

key-files:
  created:
    - backend/src/lib/groqClient.ts
    - backend/src/lib/aiDisclaimer.ts
    - backend/src/lib/forbiddenPhrases.ts
    - backend/src/db/schema/anomalyAlert.schema.ts
    - backend/src/db/schema/aiDailySummary.schema.ts
    - backend/src/db/schema/aiWeeklyInsight.schema.ts
    - backend/src/db/schema/aiLabAnalysis.schema.ts
    - backend/src/db/schema/aiLifestyleSuggestion.schema.ts
    - backend/src/db/migrations/0010_wonderful_piledriver.sql
    - backend/src/test/anomalyRule.service.test.ts (RED)
    - backend/src/test/anomaly.controller.test.ts (RED)
    - backend/src/test/dailySummary.job.test.ts (RED)
    - backend/src/test/forbiddenPhrases.test.ts (GREEN)
    - backend/src/test/aiDisclaimer.test.ts (GREEN)
  modified:
    - backend/package.json
    - backend/src/db/schema/index.ts
    - backend/Dockerfile

key-decisions:
  - "groq-sdk@1.3.0 passed the human legitimacy checkpoint (official github.com/groq/groq-typescript repo, no postinstall script) before install"
  - "groqClient.ts hard-fails at startup if GROQ_API_KEY is missing, mirroring encryption.ts's loadKey() pattern rather than webPushClient.ts's soft-warn pattern, since every AI call site depends on the key"
  - "AI narrative/analysis columns store AES-256-GCM ciphertext as text, encrypted at the service layer using the existing lib/encryption.ts (key never enters Postgres)"
  - "Dockerfile fix: drizzle.config.ts must be copied into both backend build stages, or drizzle-kit cannot find its config inside the container"

patterns-established:
  - "Pattern: safety-critical backend libs (disclaimer, forbidden-phrase filter) are pure, dependency-free, and unconditionally applied regardless of LLM output — never left to prompt engineering alone"
  - "Pattern: AI-output cache tables use a unique constraint on the natural cache key (user+date, user+week, labResultId) so batch jobs are idempotent on retry"

requirements-completed: [AI-05, ANOMALY-01]

# Metrics
duration: ~35min (across Task 2-4 commits, plus migration/Dockerfile follow-up)
completed: 2026-07-04
---

# Phase 05 Plan 01: AI Insights & Anomaly Detection Foundation Summary

**groq-sdk installed behind a legitimacy checkpoint, backend-enforced AI disclaimer + forbidden-phrase safety libs, and 5 new Drizzle tables (anomaly_alerts + 4 AI cache tables) migrated live to Postgres**

## Performance

- **Duration:** ~35 min of active execution across 4 commits (plus a same-day Dockerfile fix required to unblock the live migration)
- **Started:** 2026-07-04T00:13:17+07:00
- **Completed:** 2026-07-04T04:43:06+07:00
- **Tasks:** 4 (1 human-verify checkpoint + 3 auto tasks)
- **Files modified:** 18 (3 lib files, 5 schema files + index.ts, 1 migration SQL, 5 test files, package.json, Dockerfile)

## Accomplishments
- Human legitimacy checkpoint passed for `groq-sdk@1.3.0` (official Groq org repo, no postinstall script), then installed
- Three dependency-free backend safety libs created: `groqClient.ts` (singleton client, hard-fail startup guard), `aiDisclaimer.ts` (AI-05/D-19 unconditional disclaimer append), `forbiddenPhrases.ts` (D-20 false-reassurance detection + per-type static fallback templates)
- Five new Drizzle schemas (`anomalyAlert`, `aiDailySummary`, `aiWeeklyInsight`, `aiLabAnalysis`, `aiLifestyleSuggestion`) created, exported from `index.ts`, migration generated (`0010_wonderful_piledriver.sql`) and applied to the live database — confirmed via `psql` query returning all 5 table names
- Five test scaffolds created: 2 GREEN (`forbiddenPhrases.test.ts`, `aiDisclaimer.test.ts` — 11/11 assertions passing) and 3 RED (`anomalyRule.service.test.ts`, `anomaly.controller.test.ts`, `dailySummary.job.test.ts`), each headed with the future plan (05-02/05-03/05-05) that turns them GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1: Verify groq-sdk legitimacy** - human-verify checkpoint, approved (no code commit)
2. **Task 2: Install groq-sdk + create groqClient/aiDisclaimer/forbiddenPhrases libs** - `df86e51` (feat)
3. **Task 3: Create 5 Drizzle schemas + index exports, run migration** - `e4a20b5` (feat), migration applied live to Postgres and confirmed by user via `psql`
4. **Task 4: Create RED test scaffolds** - `2f2641e` (test)

**Deviation fix (not part of original task list):** `773776d` (fix) - Dockerfile fix required to unblock Task 3's live migration

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified
- `backend/src/lib/groqClient.ts` - Singleton Groq client (`groq`, `GROQ_MODEL = "llama-3.3-70b-versatile"`), throws at startup if `GROQ_API_KEY` unset
- `backend/src/lib/aiDisclaimer.ts` - `AI_DISCLAIMER` verbatim Indonesian string + `appendDisclaimer()`, unconditionally applied (AI-05/D-19)
- `backend/src/lib/forbiddenPhrases.ts` - `FORBIDDEN_PHRASES`, `containsForbiddenPhrase()`, `STATIC_FALLBACK_TEMPLATES` keyed by all 4 `tipeAnomali` values (D-20)
- `backend/src/db/schema/anomalyAlert.schema.ts` - `anomaly_alerts` table, indexed on `(userId, createdAt)` and `(userId, tipeAnomali, status)`
- `backend/src/db/schema/aiDailySummary.schema.ts` - `ai_daily_summaries`, unique `(userId, tanggal)`
- `backend/src/db/schema/aiWeeklyInsight.schema.ts` - `ai_weekly_insights`, unique `(userId, pekan)`
- `backend/src/db/schema/aiLabAnalysis.schema.ts` - `ai_lab_analyses`, unique `labResultId`
- `backend/src/db/schema/aiLifestyleSuggestion.schema.ts` - `ai_lifestyle_suggestions`, unique `(userId, tanggal)`
- `backend/src/db/schema/index.ts` - exports all 5 new table symbols
- `backend/src/db/migrations/0010_wonderful_piledriver.sql` - generated migration, applied to live DB
- `backend/src/test/forbiddenPhrases.test.ts`, `backend/src/test/aiDisclaimer.test.ts` - GREEN safety-lib tests
- `backend/src/test/anomalyRule.service.test.ts`, `backend/src/test/anomaly.controller.test.ts`, `backend/src/test/dailySummary.job.test.ts` - RED scaffolds for 05-02/05-03/05-05
- `backend/Dockerfile` - copies `drizzle.config.ts` into both build stages (deviation fix, see below)
- `backend/package.json` - adds `groq-sdk@^1.3.0`

## Decisions Made
- Hard-fail (not soft-warn) startup guard for `GROQ_API_KEY` in `groqClient.ts`, since every AI call site in later waves depends on this key existing — mirrors `encryption.ts`'s `loadKey()` pattern rather than `webPushClient.ts`'s.
- AES-256-GCM encryption of AI narrative/analysis text columns deferred to the service layer (Assumption A4) — schema stores plain `text()` columns, ciphertext handled by existing `lib/encryption.ts` before INSERT, consistent with prior phases.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Dockerfile did not copy `drizzle.config.ts` into either build stage**
- **Found during:** Task 3 (running `npm run db:migrate` against the live database)
- **Issue:** `drizzle-kit` could not locate its config file inside the backend container, blocking the mandatory live-migration step. The plan's acceptance criteria required the migration to actually be applied (build/type checks alone would be a false positive), so this was a hard blocker to completing Task 3.
- **Fix:** `backend/Dockerfile` updated to copy `drizzle.config.ts` into both the build and runtime stages.
- **Files modified:** `backend/Dockerfile`
- **Verification:** `docker compose exec db psql -U kidneybuddy -d kidneybuddy -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('anomaly_alerts','ai_daily_summaries','ai_weekly_insights','ai_lab_analyses','ai_lifestyle_suggestions');"` returned all 5 table names, confirming the migration was applied inside the container.
- **Committed in:** `773776d` (separate one-line commit, applied after Task 3's schema commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for correctness — without it the live migration (an explicit `[BLOCKING]` sub-step of Task 3) could not run inside Docker at all. No scope creep; single-line, single-file fix.

## Issues Encountered
- Live migration initially failed inside the Docker container because `drizzle-kit` couldn't find `drizzle.config.ts` (see deviation above). Resolved by updating the Dockerfile; user re-ran the migration and confirmed via direct `psql` query that all 5 tables exist.

## User Setup Required

None - no external service configuration required beyond the `GROQ_API_KEY` environment variable already scoped in this plan's frontmatter `user_setup` (Groq Console API key), which the human legitimacy checkpoint (Task 1) gated before install.

## Next Phase Readiness
- Groq client, disclaimer enforcement, and forbidden-phrase safety libs are stable contracts for 05-04 (AI daily/weekly insights) and 05-05 (lab analysis + lifestyle suggestions batch job).
- All 5 tables exist live in Postgres — anomaly-engine (05-02) and AI-content plans (05-04, 05-05) can write against them immediately.
- RED scaffolds (`anomalyRule.service.test.ts`, `anomaly.controller.test.ts`, `dailySummary.job.test.ts`) define the exact contracts 05-02, 05-03, and 05-05 must satisfy to go GREEN.
- No blockers carried forward.

---
*Phase: 05-ai-insights-anomaly-detection*
*Completed: 2026-07-04*
