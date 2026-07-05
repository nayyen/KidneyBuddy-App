---
phase: quick-260705-quo
plan: 01
subsystem: ui
tags: [nextjs, react, react-hook-form, onboarding, express, zod]

requires:
  - phase: 01-foundation-auth-onboarding
    provides: Onboarding wizard (StepProgress, FirstReminderStep, page.tsx), onboarding.service.ts progress tracking
provides:
  - Centered 3-column stepper (circle-over-label) with correct "Selesai" step-3 label
  - Therapy-constrained Jenis selector as the first field in the onboarding reminder step
  - Onboarding reminder step now reuses the canonical /pengingat per-jenis forms (no duplicated field definitions)
  - POST /api/onboarding/complete-reminder — completion-only marker endpoint, no duplicate reminder insert
affects: [onboarding, pengingat]

tech-stack:
  added: []
  patterns:
    - "Onboarding reminder step imports the real /pengingat form components directly instead of maintaining a parallel hand-rolled form, guaranteeing the two can never drift out of sync."
    - "Completion-only backend endpoints (no data insert) used when a form flow's actual data-mutation already happens via a different, already-existing endpoint."

key-files:
  created: []
  modified:
    - frontend/app/(app)/onboarding/_components/StepProgress.tsx
    - frontend/app/(app)/onboarding/_components/FirstReminderStep.tsx
    - frontend/app/(app)/onboarding/page.tsx
    - backend/src/services/onboarding.service.ts
    - backend/src/controllers/onboarding.controller.ts
    - backend/src/routes/onboarding.routes.ts

key-decisions:
  - "StepProgress rebuilt as a single per-step flex column (circle + label together) instead of two separately-aligned rows, which is the structural root cause of the original drift."
  - "FirstReminderStep's onCancel handler for the reused forms resets selectedJenis back to 'obat' (always a valid, always-available option) rather than clearing to a null/no-selection state, since the plan only asked for a 'no-op-safe' return-to-selector behavior."

patterns-established:
  - "Reuse canonical form components across wizards/settings screens instead of reimplementing field-by-field copies."

requirements-completed: [QUICK-260705-quo]

duration: ~15min
completed: 2026-07-05
---

# Quick Task 260705-quo: Onboarding Stepper Alignment + Therapy-Constrained Reminder Form Summary

**Fixed the onboarding stepper's circle/label misalignment and rebuilt the "Atur Pengingat Pertama" step to reuse the real /pengingat per-jenis forms with a therapy-constrained Jenis selector first.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3 completed
- **Files modified:** 6

## Accomplishments

- StepProgress now renders all 3 circles centered exactly above their own labels (previously steps 2/3 drifted left of their labels due to circles-row using `flex-1` left-alignment while the labels-row used `justify-between`); step 3 permanently reads "Selesai" instead of "Langkah 3".
- Added `POST /api/onboarding/complete-reminder`, a completion-only marker endpoint (sets `lastCompletedStep=2`, `reminderConfigured=true`, `completedAt`) that does NOT insert a reminder row — required because the reused /pengingat forms already POST the reminder to `/api/reminders` directly.
- Rewrote `FirstReminderStep` so "Jenis" is the first field, options constrained by the therapy chosen in step 1 (mirrors `AddReminderSheet.tsx`'s exact scoping: CAPD → Obat + Exchange CAPD, HD → Obat + Jadwal HD, Transplantasi → Obat only), and the form below it is the identical `MedicationReminderForm`/`CAPDReminderForm`/`HDReminderForm` component used on `/pengingat` (imported directly, never reimplemented).
- `page.tsx` now tracks the therapy chosen in-session (`selectedTherapy`) with a fallback to the persisted `user.metodeTerapiAktif` from `useAuth` for the re-entry/tutorial path, and calls the new completion endpoint after the reused form's `onSuccess` fires.

## Task Commits

1. **Task 1: Fix stepper circle/label alignment and rename step-3 label to "Selesai"** - `61c0ffb` (fix)
2. **Task 2: Add backend endpoint to mark reminder step complete without inserting a duplicate reminder** - `474c3a6` (feat)
3. **Task 3: Reorganize FirstReminderStep to put Jenis first (therapy-constrained) and reuse the real /pengingat per-jenis forms** - `d324fd8` (feat)

_Note: no docs/plan-metadata commit included here — the orchestrator handles that separately per this task's constraints._

## Files Created/Modified

- `frontend/app/(app)/onboarding/_components/StepProgress.tsx` - Rebuilt as a single per-step column (circle+label+connector) instead of two separately-aligned rows; static labels array replaces per-currentStep ternaries.
- `frontend/app/(app)/onboarding/_components/FirstReminderStep.tsx` - Rewritten to drop the hand-rolled nama/jam/jenis/catatan form; now shows a therapy-constrained Jenis selector first, then renders the reused canonical per-jenis reminder form.
- `frontend/app/(app)/onboarding/page.tsx` - Tracks `selectedTherapy` (falls back to `user.metodeTerapiAktif`); replaced `handleReminderSubmit` (POST /api/onboarding/reminder) with `handleReminderCreated` (POST /api/onboarding/complete-reminder, called after the reused form's own /api/reminders POST succeeds).
- `backend/src/services/onboarding.service.ts` - Added `completeReminderStep(userId)`.
- `backend/src/controllers/onboarding.controller.ts` - Added `completeReminder` handler (mirrors `skipReminder`'s pattern).
- `backend/src/routes/onboarding.routes.ts` - Registered `POST /complete-reminder`.

## Decisions Made

- Kept the existing `POST /api/onboarding/reminder` route and its `saveFirstReminder` service function in place (unused by the new flow) per the plan's explicit instruction to avoid touching other potential callers/tests.
- `firstReminderSchema`/`FirstReminderFormData` in `onboarding.schema.ts` are now unused exports (the reused /pengingat forms own their own zod schemas from `reminder.schema.ts`) — left in place since removing exported symbols wasn't in scope and they cause no type errors.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Onboarding flow is internally consistent with `/pengingat` — any future changes to the per-jenis reminder forms (fields, validation, styling) automatically propagate to onboarding since the same components are imported, not copied.
- Manual/human verification still recommended (per plan's `<human-check>` items): confirm visually in-browser that all 3 stepper circles are centered above labels, and walk through CAPD/HD/Transplantasi onboarding paths to confirm Jenis constraint + no re-entry loop after completion. This was not run as part of this automated execution.

---
*Quick task: 260705-quo-perbaiki-ui-onboarding-garis-progress-da*
*Completed: 2026-07-05*

## Self-Check: PASSED

All 6 modified files verified present on disk; all 3 task commits (61c0ffb, 474c3a6, d324fd8) verified present in git log.
