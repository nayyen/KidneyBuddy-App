---
phase: 01-foundation-auth-onboarding
plan: 05
subsystem: profile
tags: [therapy-history, profile]

requires:
  - phase: 01-04
    provides: onboarding therapy-method selection
provides:
  - Confirmation-gated therapy-method change with history, replay onboarding tutorial from Settings
affects: [02, 06]

tech-stack:
  added: []
  patterns:
    - "therapyHistory table records every method change as an append-only log, never mutated in place"

key-files:
  created:
    - backend/src/db/schema/therapyHistory.schema.ts
    - backend/src/repositories/therapyHistory.repository.ts
    - backend/src/services/profile.service.ts
    - backend/src/controllers/profile.controller.ts
    - frontend/components/profil/ChangeTherapyDialog.tsx
    - frontend/components/profil/ReplayTutorialButton.tsx
  modified: []

key-decisions: []

patterns-established:
  - "profile.service.ts's deactivateTherapySpecific (therapy-change hook) is reused by Phase 2's REMIND-07 — confirmed in the v1.0 milestone audit as the same function, not a duplicate."

requirements-completed: [ONBOARD-05, ONBOARD-06]

duration: unknown (written retroactively)
completed: 2026-06-26
---

# Phase 01: Foundation, Auth & Onboarding — Plan 05 Summary

**Confirmation-gated therapy-method change with an append-only history log, plus a Settings button to replay the onboarding tutorial — shipped together with 01-02/03/04 in one combined commit.**

## Retroactive Note

Written 2026-07-04 during the v1.0 milestone audit — no SUMMARY.md existed for this plan at execution time. Reconstructed from commit `f7f6ca5`'s diff and current code, not session memory.

## Accomplishments (per commit f7f6ca5 and current code)
- `ChangeTherapyDialog.tsx` requires explicit confirmation before switching active therapy method (ONBOARD-05)
- Every change is recorded in `therapyHistory` (append-only, never mutated)
- `profile.service.ts`'s therapy-change hook (`deactivateTherapySpecific`) auto-adjusts therapy-specific reminders — this same function is reused by Phase 2's REMIND-07 requirement, confirmed as shared (not duplicated) code by the 02-VERIFICATION.md test suite (4/4 passing) and the v1.0 milestone audit
- `ReplayTutorialButton.tsx` on the profile page lets a user replay the onboarding tutorial after initial completion (ONBOARD-06)

## Verification (2026-07-04, during milestone audit)
- Confirmed present and wired via integration-checker spot-check; REMIND-07's 4/4 passing tests in 02-VERIFICATION.md independently exercise this same `deactivateTherapySpecific` function

---
*Phase: 01-foundation-auth-onboarding*
*Completed: 2026-06-26 (documented retroactively 2026-07-04)*
