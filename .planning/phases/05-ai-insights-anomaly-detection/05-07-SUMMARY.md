---
phase: 05-ai-insights-anomaly-detection
plan: 07
subsystem: frontend
tags: [nextjs, react, express, groq, ai-cards, report, frontend]

# Dependency graph
requires:
  - phase: 05-ai-insights-anomaly-detection
    plan: "04"
    provides: "AnomalyAlertCard / Alert AI-Info gradient container pattern to mirror"
  - phase: 05-ai-insights-anomaly-detection
    plan: "05"
    provides: "GET /api/ai/daily-summary, POST /api/ai/daily-summary/regenerate, GET /api/ai/weekly-insight"
  - phase: 05-ai-insights-anomaly-detection
    plan: "06"
    provides: "GET /api/ai/lab-analysis/:labResultId ({ready:false} collapse), GET /api/ai/lifestyle (>=3-day gate)"
provides:
  - "AiDailySummaryCard (Beranda) — replaces AiPlaceholderCard, manual regenerate (AI-01, D-10)"
  - "WeeklyInsightCard + LabAnalysisCard (Lab tab) — cache-only read + async polling card (AI-02/AI-03, D-11/D-14)"
  - "LifestyleSuggestionCard (Edukasi) — gated empty state + generated suggestion (AI-04, D-12)"
  - "Report Anomali section wired to real anomaly_alerts data (D-15)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "frontend/lib/aiDisclaimer.ts: splitAiText() locates the backend-appended verbatim disclaimer substring within a combined narrative+disclaimer text field (backend always concatenates via \"\\n\\n\" + AI_DISCLAIMER) so every AI card can style the disclaimer separately (10px italic muted) without ever paraphrasing or shortening it"
    - "LabAnalysisCard polls GET /api/ai/lab-analysis/:labResultId every 3s (~60s cap) rather than using a websocket/push channel, since generation is fire-and-forget server-side (D-14) with no other completion signal"
    - "Newly-created lab result plumbing: InputManualForm's onSuccess now returns the created row (CreatedLabEntry) instead of firing with no args; CatatLabSheet -> AppShell's lab:saved CustomEvent detail -> catatan/page.tsx state, so LabAnalysisCard can mount for exactly the just-saved result without a second round-trip"
    - "Out-of-range highlighting for LabAnalysisCard is computed client-side from the lab result's own nilai/nilaiRujukan (not from the Groq text itself, which has no structured markers) — highlights are only applied if the exact value string appears verbatim in the returned narrative, never fabricated"

key-files:
  created:
    - frontend/lib/aiDisclaimer.ts
    - frontend/components/beranda/AiDailySummaryCard.tsx
    - frontend/components/lab/WeeklyInsightCard.tsx
    - frontend/components/lab/LabAnalysisCard.tsx
    - frontend/components/edukasi/LifestyleSuggestionCard.tsx
  modified:
    - frontend/app/(app)/beranda/page.tsx
    - frontend/app/(app)/catatan/page.tsx
    - frontend/app/(app)/edukasi/page.tsx
    - frontend/components/lab/InputManualForm.tsx
    - frontend/components/lab/CatatLabSheet.tsx
    - frontend/components/shell/AppShell.tsx
    - frontend/components/laporan/sections/Anomali.tsx
    - frontend/components/laporan/LaporanPreviewContent.tsx
    - backend/src/services/aiSummary.service.ts
    - backend/src/repositories/aiDailySummary.repository.ts
    - backend/src/services/report.service.ts
    - backend/src/test/report.service.test.ts

key-decisions:
  - "aiSummary.service.ts's DailySummaryResult gained a createdAt field (Rule 2 auto-add) — the UI-SPEC's 'Dibuat pukul HH:mm' requirement had no backend timestamp to render; aiDailySummary.repository.ts's upsertSummary now also refreshes createdAt on conflict-update so a manual regenerate reflects the new generation time, not the original insert time."
  - "report.service.ts's getAnomaliesByRangeForReport delegates to the already-existing anomalyAlert.repository.findByUserAndRange (from 05-02/05-03) rather than adding a duplicate query in report.repository.ts, per the plan's own stated alternative — kept as a 5th default-valued injected dependency in _generateReportCore so the plan's own DI test-seam convention is preserved without further breaking the pre-existing (already-broken, out-of-scope) report.service.test.ts positional-arg baseline."
  - "report.service.test.ts needed a pre-import ENCRYPTION_KEY env shim (mirrors dailySummary.job.test.ts/labResult.service.test.ts's established pattern) because report.service.ts now transitively imports lib/encryption.ts via anomalyAlertRepo — without it, the whole test file would crash at module load instead of just the pre-existing getCAPDFn-arity failures."

patterns-established:
  - "AI content card shape (4th and final instance in this phase): Alert AI/Info gradient container, 30x30 icon container, AI badge chip top-right, splitAiText()-separated narrative + verbatim disclaimer — now used identically by AiDailySummaryCard, WeeklyInsightCard, LabAnalysisCard, LifestyleSuggestionCard."

requirements-completed: []
# NOTE: AI-01..AI-04 are implemented and committed (Tasks 1-3, all automated
# verification green) but are NOT marked complete in REQUIREMENTS.md yet —
# this plan's own Task 4 (checkpoint:human-verify) has not been approved.
# See "Checkpoint Status" section below. Do not mark AI-01..AI-05 complete
# until a human (with Docker) approves Task 4.

# Metrics
duration: "~1h (Tasks 1-3; Task 4 blocked, not yet run)"
completed: "IN PROGRESS — not yet complete"
---

# Phase 05 Plan 07: AI Frontend Integration & Report Anomali Section (Tasks 1-3 of 4)

**All four AI-content cards (daily summary, weekly insight, lab analysis, lifestyle) are implemented, wired into their locked UI slots, and pass `tsc --noEmit` + the unchanged 157/174 backend test baseline — but this plan's Task 4 (human visual verification via Docker) has NOT run yet, so AI-01..AI-05 remain PENDING in REQUIREMENTS.md pending that approval.**

## Performance

- **Duration so far:** ~1h (Tasks 1-3, automated)
- **Tasks:** 3 of 4 complete (Task 4 is a `checkpoint:human-verify` gate — see below)
- **Files modified:** 16 (5 created, 11 modified)

## Accomplishments

- `AiDailySummaryCard.tsx`: replaces `AiPlaceholderCard` on Beranda in the same `md:col-span-3` slot. Renders all 4 UI-SPEC body states (not-generated / generating / generated / error), manual "Buat Ringkasan"/"Buat Ulang Ringkasan" POSTs `/api/ai/daily-summary/regenerate`, verbatim disclaimer + "Dibuat pukul HH:mm" timestamp.
- `WeeklyInsightCard.tsx`: cache-only read of `/api/ai/weekly-insight`, no manual trigger (D-13), empty/error copy per UI-SPEC.
- `LabAnalysisCard.tsx`: polls `/api/ai/lab-analysis/:labResultId` every 3s (~60s cap) showing "Menganalisis hasil lab..." until ready (D-14 async/non-blocking); highlights the lab result's own out-of-range value inline (red text only, not the whole card) when it appears verbatim in the Groq narrative.
- `LifestyleSuggestionCard.tsx`: single GET `/api/ai/lifestyle`, renders the >=3-day gated empty state or the generated suggestion.
- `catatan/page.tsx`: mounts `WeeklyInsightCard` + `LabAnalysisCard` (for the most recently manually-saved lab result only) above `LabTrendChart`.
- `edukasi/page.tsx`: mounts `LifestyleSuggestionCard` above the existing Phase 6 "Konten Segera Hadir" placeholder.
- Plumbing added so `LabAnalysisCard` knows which `labResultId` to poll: `InputManualForm.onSuccess` now passes the created row through `CatatLabSheet` → `AppShell`'s `lab:saved` CustomEvent detail → `catatan/page.tsx` state.
- Report `Anomali` section (`frontend/components/laporan/sections/Anomali.tsx`) now renders a real 4-column table (Tanggal | Tipe Anomali | Severity | Deskripsi, severity text-colored only, print-compatible) sourced from `report.service.ts`'s new `getAnomaliesByRangeForReport` (delegates to the existing `anomalyAlert.repository.findByUserAndRange`, decrypts `deskripsi`), replacing the Phase 4 static placeholder.

## Task Commits

1. **Task 1: AiDailySummaryCard on Beranda (AI-01/D-10)** - `b96a0db` (feat)
2. **Task 2: WeeklyInsightCard + LabAnalysisCard + LifestyleSuggestionCard (AI-02/03/04)** - `c5f2737` (feat)
3. **Task 3: Report Anomali section wired to real data (D-15)** - `3d35124` (feat)
4. **Task 4: Human verification** - **NOT YET RUN** (see Checkpoint Status)

**Plan metadata commit:** deferred until Task 4 resolves (see below) — this SUMMARY.md is committed now as a docs-only checkpoint so no completed work is lost, but STATE.md/ROADMAP.md/REQUIREMENTS.md are intentionally NOT advanced yet.

## Files Created/Modified

- `frontend/lib/aiDisclaimer.ts` - shared narrative/disclaimer splitter for all 4 AI cards
- `frontend/components/beranda/AiDailySummaryCard.tsx` - AI-01 daily summary card
- `frontend/components/lab/WeeklyInsightCard.tsx` - AI-02 weekly insight card
- `frontend/components/lab/LabAnalysisCard.tsx` - AI-03 async per-result analysis card
- `frontend/components/edukasi/LifestyleSuggestionCard.tsx` - AI-04 lifestyle suggestion card
- `frontend/app/(app)/beranda/page.tsx` - swaps `AiPlaceholderCard` for `AiDailySummaryCard`
- `frontend/app/(app)/catatan/page.tsx` - mounts `WeeklyInsightCard` + `LabAnalysisCard`, listens for `lab:saved` detail
- `frontend/app/(app)/edukasi/page.tsx` - mounts `LifestyleSuggestionCard`
- `frontend/components/lab/InputManualForm.tsx` - `onSuccess` now passes the created row
- `frontend/components/lab/CatatLabSheet.tsx` - forwards the created row through `onSaved`
- `frontend/components/shell/AppShell.tsx` - `lab:saved` CustomEvent now carries `{ created }` detail
- `frontend/components/laporan/sections/Anomali.tsx` - real anomaly table / empty state
- `frontend/components/laporan/LaporanPreviewContent.tsx` - types + passes `report.anomalies` through
- `backend/src/services/aiSummary.service.ts` - `DailySummaryResult.createdAt` added (Rule 2 deviation, see below)
- `backend/src/repositories/aiDailySummary.repository.ts` - `upsertSummary` refreshes `createdAt` on conflict
- `backend/src/services/report.service.ts` - `getAnomaliesByRangeForReport` + wired into `_generateReportCore`/production wrapper
- `backend/src/test/report.service.test.ts` - pre-import `ENCRYPTION_KEY` shim (Rule 1 deviation, see below)

## Decisions Made

See `key-decisions` in frontmatter — summarized: (1) added `createdAt` to the daily-summary response/repo so the UI-SPEC's timestamp requirement is satisfiable; (2) report anomaly query delegates to the existing `anomalyAlert.repository.findByUserAndRange` rather than duplicating it in `report.repository.ts`, kept as a default-valued 5th DI parameter; (3) `report.service.test.ts` needed the same pre-import `ENCRYPTION_KEY` shim already established by other test files in this phase.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Backend never exposed a timestamp for "Dibuat pukul HH:mm"**
- **Found during:** Task 1 implementation
- **Issue:** UI-SPEC Screen Contract 2 requires "Dibuat pukul [HH:mm]" below the generated narrative, but `aiSummary.service.ts`'s `DailySummaryResult` (from 05-05) only returned `{tanggal, ringkasanText, isFallback, fromCache}` — no timestamp field.
- **Fix:** Added `createdAt: string` (ISO) to `DailySummaryResult`, populated from the `ai_daily_summaries` row's existing `createdAt` column (already present in the schema, just not surfaced). Also updated `aiDailySummary.repository.ts`'s `upsertSummary` to refresh `createdAt` on conflict-update (previously only set on first INSERT via `defaultNow()`), so a manual regenerate (D-10) shows the new generation time rather than a stale one.
- **Files modified:** `backend/src/services/aiSummary.service.ts`, `backend/src/repositories/aiDailySummary.repository.ts`
- **Verification:** `cd backend && npx tsc --noEmit` — zero new errors vs. pre-existing baseline.
- **Committed in:** `b96a0db` (bundled with Task 1)

**2. [Rule 1 - Bug] report.service.test.ts would have crashed entirely after Task 3's import change**
- **Found during:** Task 3, verifying `npm test` baseline after adding `getAnomaliesByRangeForReport`
- **Issue:** `report.service.ts` now transitively imports `lib/encryption.ts` (via `anomalyAlertRepo`), which throws at module load if `ENCRYPTION_KEY` is unset. `report.service.test.ts` had no pre-import env shim (unlike `dailySummary.job.test.ts`/`labResult.service.test.ts`, which already established this pattern), so in an environment without `ENCRYPTION_KEY` set, the entire test file would fail to even load — regressing the 4 previously-passing `reportQuerySchema` tests, not just the 5 pre-existing `_generateReportCore` failures.
- **Fix:** Added the same pre-import `process.env.ENCRYPTION_KEY = "..."` shim used elsewhere in the test suite.
- **Files modified:** `backend/src/test/report.service.test.ts`
- **Verification:** `npm test` — 157/174 passing, identical to the pre-existing baseline documented in 05-05/05-06's SUMMARY.md.
- **Committed in:** `3d35124` (bundled with Task 3)

## Issues Encountered

None beyond the two deviations above.

## User Setup Required

None — no new external service configuration required (reuses existing `GROQ_API_KEY`/`ENCRYPTION_KEY` env vars from 05-01).

## Verification

- `cd frontend && npx tsc --noEmit` — clean (0 errors) after Task 1, Task 2, and Task 3.
- `cd backend && npx tsc --noEmit` — zero NEW errors after every task; remaining errors are the same pre-existing baseline noted in 05-05/05-06 SUMMARY.md (`debug_*.ts` scratch files, `dialysisLog.controller.ts`/`medicationLog.controller.ts` query-param typing, `activities.service.ts`/`activity.service.test.ts` arg-count mismatch, `reminderDispatch.test.ts`, `report.service.test.ts`'s arity mismatch — none introduced by this plan).
- `cd backend && npm test` — 157/174 passing, identical count to the pre-existing baseline.
- `grep -q "AiDailySummaryCard" 'app/(app)/beranda/page.tsx' && ! grep -q "AiPlaceholderCard"` — pass.
- `grep -q "WeeklyInsightCard" 'app/(app)/catatan/page.tsx' && grep -q "LabAnalysisCard"` — pass.
- `grep -q "LifestyleSuggestionCard" 'app/(app)/edukasi/page.tsx'` — pass.
- `grep -q "findByUserAndRange" backend/src/services/report.service.ts` — pass.

## Checkpoint Status — Task 4 NOT YET RUN

This plan's frontmatter is `autonomous: false` and Task 4 is `type="checkpoint:human-verify" gate="blocking"`. **This execution session has no browser/Docker access** — Tasks 1-3 (all automated: code + `tsc` + `npm test`) are done and committed, but the actual visual/functional verification (does the disclaimer render verbatim in the browser, does the regenerate button work end-to-end against a live Groq call, does the report print preview render the anomaly table correctly, does the lab-save-then-async-analysis flow actually complete) has **not been performed**.

**Per this plan's explicit instructions, requirements are intentionally NOT marked complete yet:**
- `AI-01` through `AI-05` remain **PENDING** in `REQUIREMENTS.md` (not flipped to complete in this session).
- `STATE.md` / `ROADMAP.md` are **NOT** advanced to "05-07 complete" in this session.
- The plan counter (`state advance-plan`) has **NOT** been run.

A human with Docker must run the verification steps below and approve before a continuation agent (or this same agent, if resumed) marks AI-01..AI-05 complete and finalizes this plan's STATE.md/ROADMAP.md/REQUIREMENTS.md updates.

### How to verify (for the human, via `docker compose up -d --build`)

1. **Beranda AI summary:** Open `/beranda`. Confirm the AI card is NOT the old grey placeholder. Tap "Buat Ringkasan" — confirm a Bahasa Indonesia narrative appears with the disclaimer verbatim ("Ringkasan ini dibuat otomatis oleh AI dan tidak menggantikan saran medis profesional. Selalu konsultasikan kondisi Anda dengan dokter atau tenaga kesehatan.") at the bottom, plus a "Dibuat pukul HH:mm" timestamp. Tap "Buat Ulang Ringkasan" and confirm it regenerates with a new timestamp.
2. **Lab tab:** Open `/catatan` → Lab sub-tab. Confirm "Wawasan Tren Mingguan" and "Analisis Hasil Lab" cards render above the trend chart (weekly insight may show its empty state if no cron cycle has run yet — that's expected). Save a new manual lab result via "+ Catat Hasil Lab" — confirm the save completes immediately (not blocked), then the "Analisis Hasil Lab" card appears showing "Menganalisis hasil lab..." and within ~30-60s transitions to the actual analysis text with disclaimer. If the lab value is out of its reference range, confirm that specific number is highlighted red inline (not the whole card).
3. **Edukasi:** Open `/edukasi`. Confirm "Saran Gaya Hidup untuk Anda" card — gated empty state ("Saran Belum Tersedia") if the patient has <3 days of fluid tracking, otherwise a generated suggestion with disclaimer.
4. **Doctor report:** Generate a report (`/laporan`) over a date range known to include at least one anomaly alert. Confirm the "Anomali Terdeteksi" section lists real rows (Tanggal | Tipe Anomali | Severity | Deskripsi) — "Tinggi" severity in red bold, "Normal" in muted gray, no colored background chips. Open the print preview and confirm it still renders correctly (no layout break).

### Resume signal

Type "approved" (or describe any issues found) back to the orchestrator once the above is verified. A continuation agent will then: mark `AI-01`..`AI-05` complete in `REQUIREMENTS.md`, run `state advance-plan` / `state update-progress` / `roadmap update-plan-progress`, and create the final plan-metadata commit.

---
*Phase: 05-ai-insights-anomaly-detection*
*Status: IN PROGRESS — Tasks 1-3 complete and committed; Task 4 (human-verify checkpoint) pending*

## Self-Check: PASSED

All created/modified files verified present on disk; all 3 task commits (`b96a0db`, `c5f2737`, `3d35124`) confirmed present in git log via `git log --oneline`.
