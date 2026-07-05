---
phase: quick-260705-p9y
plan: 01
subsystem: notifications-ai-safety
tags: [web-push, groq, llama-3.3-70b, node-test, pino, forbiddenPhrases]

# Dependency graph
requires:
  - phase: quick-260705-9n4
    provides: jenis-aware emoji/label pattern originally inlined in reminderDispatch.job.ts
  - phase: 05-ai-insights-anomaly-detection
    provides: anomalyExplanation.service.ts D-20 forbidden-phrase safety gate + forbiddenPhrases.ts
provides:
  - Shared reminderNotificationCopy.ts module (jenisEmoji/jenisLabel/jenisFollowUpNoun) used by both reminderDispatch.job.ts and reminderFollowUp.job.ts
  - Corrected missed-reminder follow-up push copy (jenis emoji + label + accurate "minum obat ini" wording)
  - FALSE_CONTACT_PHRASES + containsFalseContactClaim() guard in forbiddenPhrases.ts
  - anomalyExplanation.service.ts system-prompt constraint + all-severity false-contact-claim safety gate
affects: [reminders, ai-anomaly-detection]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared jenis-aware copy helpers live in backend/src/lib/reminderNotificationCopy.ts — any future reminder-related push copy should import from here rather than re-inlining JENIS_EMOJI/JENIS_LABEL"
    - "Safety-critical LLM guards live in backend/src/lib/forbiddenPhrases.ts as dependency-free pure string-matching functions, applied post-generation in anomalyExplanation.service.ts's getValidatedExplanation()"

key-files:
  created:
    - backend/src/lib/reminderNotificationCopy.ts
    - backend/src/test/reminderNotificationCopy.test.ts
  modified:
    - backend/src/jobs/reminderDispatch.job.ts
    - backend/src/jobs/reminderFollowUp.job.ts
    - backend/src/lib/forbiddenPhrases.ts
    - backend/src/services/anomalyExplanation.service.ts
    - backend/src/test/forbiddenPhrases.test.ts

key-decisions:
  - "containsFalseContactClaim is enforced across ALL anomaly severities (not gated to severity 'tinggi' like the existing D-20 false-reassurance check), since a false claim that the app contacts a doctor is unsafe regardless of severity."
  - "jenisFollowUpNoun() collapses capd/hd into one 'sesi cuci darah ini' noun phrase (mirrors JENIS_LABEL's existing capd/hd -> 'Cuci Darah' merge) since both are dialysis-therapy sessions from the patient's perspective."

patterns-established:
  - "Pattern: reminder push copy (emoji/label/noun-phrase) is centralized in reminderNotificationCopy.ts, not duplicated per job file."
  - "Pattern: LLM safety gates are pure functions in forbiddenPhrases.ts, applied defensively after every Groq call in getValidatedExplanation(), with a static per-tipeAnomali fallback template and a server-side-only pino warn log (never surfaced to the UI)."

requirements-completed: []

# Metrics
duration: ~20min
completed: 2026-07-05
---

# Quick Task 260705-p9y Summary

**Jenis-aware missed-reminder push copy (fixing "dosis ini" -> "minum obat ini") + an all-severity defensive filter blocking AI anomaly alerts from ever claiming the app contacts a doctor/nurse on the patient's behalf**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2 completed
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- Missed-reminder ("Pengingat Terlewat") push now shows a jenis-specific emoji (💊 obat / 🩸 hd / 💧 capd) and label in the title, and the body text no longer says the medically-inaccurate "dosis ini" — it now correctly says "minum obat ini" for medication reminders (or "sesi cuci darah ini" for dialysis reminders).
- Extracted the jenis-aware copy logic (previously inlined only in reminderDispatch.job.ts) into a shared, tested module so both reminder jobs stay in sync going forward.
- AI anomaly explanations can no longer surface a false claim that the app/system will contact, notify, or coordinate with a doctor/nurse/hospital on the patient's behalf — enforced via both a system-prompt instruction and a defensive post-generation keyword filter with a safe static-template fallback, active across all severities (not just "tinggi").

## Task Commits

Each task was committed atomically:

1. **Task 1: Jenis-aware missed-reminder follow-up notification + correct body text** - `4a63453` (fix)
2. **Task 2: Block AI anomaly alerts from claiming the app contacts a doctor/nurse** - `dd2144d` (fix)

_No plan-metadata commit yet — orchestrator handles the docs commit separately._

## Files Created/Modified
- `backend/src/lib/reminderNotificationCopy.ts` - New shared module: JENIS_EMOJI/JENIS_LABEL constants + jenisEmoji()/jenisLabel()/jenisFollowUpNoun() helpers
- `backend/src/test/reminderNotificationCopy.test.ts` - New unit tests for all three helper functions (12 cases)
- `backend/src/jobs/reminderDispatch.job.ts` - Removed duplicated local JENIS_EMOJI/JENIS_LABEL/jenisEmoji/jenisLabel definitions, now imports from the shared module (behavior byte-for-byte identical)
- `backend/src/jobs/reminderFollowUp.job.ts` - Follow-up push title/body now use jenisEmoji/jenisLabel/jenisFollowUpNoun; fixes wrong "dosis ini" text
- `backend/src/lib/forbiddenPhrases.ts` - Added FALSE_CONTACT_PHRASES (15 phrases) + containsFalseContactClaim()
- `backend/src/services/anomalyExplanation.service.ts` - SYSTEM_PROMPT extended with an explicit no-false-contact-claim constraint; getValidatedExplanation now runs containsFalseContactClaim on every Groq response across all severities, falling back to STATIC_FALLBACK_TEMPLATES (or GENERIC_FALLBACK_TEXT) + a server-side pino warn log on a match
- `backend/src/test/forbiddenPhrases.test.ts` - Added 4 new test cases for containsFalseContactClaim (3 true-positive, 1 true-negative)

## Decisions Made
- False-contact-claim gate applies to all severities, unlike the existing D-20 false-reassurance gate which is scoped to "tinggi" only — a factually false claim about system capability is unsafe at any severity level.
- Both HD and CAPD collapse to "sesi cuci darah ini" in jenisFollowUpNoun(), consistent with the existing JENIS_LABEL precedent that already merges hd/capd into one "Cuci Darah" label.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Full backend test suite run (`node --import tsx --test src/test/*.test.ts`) shows 233/236 passing; the 3 failures are the pre-existing, previously-documented `labUploadTrend` container-only DB tests (require Docker Postgres, not runnable from host — see STATE.md quick-task 260704-uyb entry) and are unrelated to this task's changes. `tsc --noEmit` shows zero errors in any file touched by this task (pre-existing unrelated errors exist in `src/test/debug_*.ts` scratch scripts and `profile.e2e.ts`, out of scope per the scope-boundary rule).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both fixes are self-contained and require no follow-up work.
- Future reminder-copy work should extend `reminderNotificationCopy.ts` rather than re-inlining jenis logic in a job file.
- Future anomaly-explanation safety work should extend `forbiddenPhrases.ts` with the same pure-function pattern.

---
*Phase: quick-260705-p9y*
*Completed: 2026-07-05*

## Self-Check: PASSED

All 7 created/modified files confirmed present on disk; both task commit hashes (4a63453, dd2144d) confirmed in git log.
