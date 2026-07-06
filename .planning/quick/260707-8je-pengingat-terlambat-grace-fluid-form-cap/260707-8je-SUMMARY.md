---
phase: quick-260707-8je
plan: 01
subsystem: ui
tags: [reminders, fluid-tracking, zod, react-hook-form, clinical-thresholds]

requires:
  - phase: quick-260707-01r
    provides: reminder chip styling, fluid seed data
provides:
  - Shared grace-aware reminder due-state helper (frontend/lib/reminderStatus.ts)
  - Sumber-gated CAPD fluid form fields (create + edit)
  - Evidence-based fluid-balance normal range and retention threshold
affects: [reminders, beranda, catatan, cairan]

tech-stack:
  added: []
  patterns:
    - "getReminderDueState(...) is the single source of truth for reminder
      due/overdue state across ObatCard, CuciDarahCard, MedicationLogItem,
      DialysisLogItem — never re-derive isLate inline again"
    - "CAPD-only form fields gate on the SELECTED sumber (watchedSumber ===
      'capd'), not on the patient's therapy method (isCAPD) — a therapy-method
      gate is only appropriate for which OPTIONS appear in the sumber dropdown"

key-files:
  created:
    - frontend/lib/reminderStatus.ts
  modified:
    - frontend/components/beranda/ObatCard.tsx
    - frontend/components/beranda/CuciDarahCard.tsx
    - frontend/components/catatan/MedicationLogItem.tsx
    - frontend/components/catatan/DialysisLogItem.tsx
    - frontend/components/cairan/CatatCairanForm.tsx
    - frontend/components/cairan/FluidEditSheet.tsx
    - frontend/lib/validators/fluid.schema.ts
    - backend/src/services/fluid.service.ts
    - frontend/components/beranda/HumanFluidChart.tsx

key-decisions:
  - "Backend fluid.service.test.ts uses node:test directly (node --import tsx --test), not vitest — plan's vitest verify command was corrected during execution; ran the actual test runner instead (29/29 pass)"
  - "No backend change needed for item 1 (reminderFollowUp.job.ts already fires at 30min, past the 2-minute grace) or item 3 (no backend fixed-selisih threshold exists) — both confirmed via grep, documented rather than silently changed"

patterns-established:
  - "Reminder due-state derivation centralized in reminderStatus.ts"

requirements-completed: [QUICK-260707-8je]

duration: ~10min
completed: 2026-07-07
---

# Quick Task 260707-8je: Pengingat Grace Period, Fluid Form CAPD Gating, Fluid Balance Threshold Summary

**Added a 2-minute "Segera ..." grace window before any reminder shows "Terlambat", fixed CAPD-only fluid fields leaking into non-CAPD entries by gating on the selected sumber, and corrected the "Cairan tertahan" alert to fire only above +500 ml per clinical insensible-loss research.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-07-07
- **Tasks:** 3 (+ 1 checkpoint deferred to human)
- **Files modified:** 9 (1 new, 8 modified)

## Accomplishments

- New shared `frontend/lib/reminderStatus.ts` (`getReminderDueState`, `OVERDUE_GRACE_MS`) replaces 4 copy-pasted `isLate` expressions across ObatCard, CuciDarahCard, MedicationLogItem, DialysisLogItem — a reminder within 2 minutes of its due time now shows an amber "Segera ..." CTA instead of instantly flashing "Terlambat"
- CAPD-only fluid fields (Konsentrasi CAPD, Kondisi Cairan Keluar) now render and are required only when the user selects sumber = Exchange CAPD for that specific entry, not whenever their therapy method happens to be CAPD — fixes both the create form (`CatatCairanForm`) and edit sheet (`FluidEditSheet`)
- Fluid-balance "Cairan tertahan" alert threshold corrected from `> 0 ml` to `> +500 ml`, matching StatPearls-documented insensible fluid loss (400-800 mL/day) per RESEARCH.md — normal range is now -1000..+500 ml, caption updated, and the "Cairan tertahan" label text darkened to `#7a4c0a` for readability

## Task Commits

1. **Task 1: Grace period before "Terlambat"** — `182d635` (fix)
2. **Task 2: Fluid form — gate CAPD-only fields on selected sumber** — `26033ea` (fix)
3. **Task 3: Evidence-based fluid-balance range + threshold + caption** — `cfe93cb` (fix)

**Plan metadata:** commit pending (orchestrator handles docs commit)

## Files Created/Modified

- `frontend/lib/reminderStatus.ts` — new shared helper: `getReminderDueState({isConfirmed, status, waktuPengingat, now})` returns `"confirmed" | "menunggu" | "segera" | "terlambat"`; exports `OVERDUE_GRACE_MS = 2*60*1000`
- `frontend/components/beranda/ObatCard.tsx` — uses `getReminderDueState`; adds amber "Segera minum obat" CTA during grace window
- `frontend/components/beranda/CuciDarahCard.tsx` — uses `getReminderDueState`; jenis-aware "Segera lakukan exchange CAPD" / "Segera lakukan cuci darah" CTA
- `frontend/components/catatan/MedicationLogItem.tsx` — uses `getReminderDueState`; status badge gains a "Segera" state (bg `#fdf3e3` / text `#7a4c0a`) between Tertunda and Terlambat
- `frontend/components/catatan/DialysisLogItem.tsx` — uses `getReminderDueState`; same badge treatment; removed the duplicate trailing "Segera lakukan cuci darah" block that double-rendered overdue text
- `frontend/components/cairan/CatatCairanForm.tsx` — CAPD field wrapper gated on `isSumberCapd` instead of `isCAPD`; removed misleading "(opsional)" label suffix; `onSubmit` nulls out `konsentrasiCapd`/`kondisiKeluar` when `sumber !== "capd"`
- `frontend/components/cairan/FluidEditSheet.tsx` — added `watchedSumber`/`isSumberCapd`; Konsentrasi field gated on `isSumberCapd`, Kondisi field gated on `isSumberCapd && isKeluar`; submit handler nulls out both fields when sumber isn't CAPD
- `frontend/lib/validators/fluid.schema.ts` — added superRefine rule: `kondisiKeluar` required when `sumber === "capd" && tipe === "keluar"`
- `backend/src/services/fluid.service.ts` — mirrored the same superRefine rule server-side (source of truth); no other change
- `frontend/components/beranda/HumanFluidChart.tsx` — retained-fluid branch condition `delta > 0` → `delta > 500`; status label color `#ef9f27` → `#7a4c0a` (silhouette fill unchanged); caption "-1000 ml sampai 0 ml" → "-1000 ml sampai +500 ml"; header doc-comment legend updated to match

## Decisions Made

- Ran backend fluid tests via `node --import tsx --test src/test/fluid.service.test.ts` (the project's actual test runner for this file) instead of the plan's `npx vitest run` command, which reported "No test suite found" because the file uses `node:test`, not vitest — 29/29 tests pass with the correct runner.
- Item 1 backend follow-up job (`reminderFollowUp.job.ts`) fires at 30 minutes past due, well outside the 2-minute grace window — confirmed via reading the plan's own note, no backend change made or needed.
- Item 3: grepped `backend/src/services/anomalyRule.service.ts` and all of `backend/src/` for "tertahan" / `delta > 0` / `delta>0` patterns — zero matches. The backend's anomaly rules use intake-deviation-% and output-decline logic, and `getDailyBalance`/`hasAbnormalCondition` refer to CAPD effluent condition, not fluid retention. No backend equivalent threshold exists; no change made.

## Deviations from Plan

None — plan executed exactly as written. The only adjustment was substituting the correct test-runner invocation (`node --test` instead of `vitest`) for Task 2's verification, since the target test file is written against `node:test`, not vitest; this is a verification-command correction, not a code deviation.

## Issues Encountered

None.

## Deployment

- `docker restart kidneybuddy-backend` — done (backend has no nodemon; fluid.service.ts change requires container restart).
- `docker compose build frontend && docker compose up -d frontend` — done (frontend is a baked production build); rebuild succeeded, container recreated and started.
- Post-deploy smoke check: `GET http://localhost:3000/login` → 200, `POST http://localhost:4000/api/auth/refresh` → 401 (expected, no token) — both containers responding.

## Needs Human Verification

The plan's final task is a blocking `checkpoint:human-verify` that was intentionally NOT auto-approved (per executor instructions, this checkpoint is listed here rather than blocked on). Please verify:

1. **Reminder grace (item 1):** With a reminder whose time is within the last 2 minutes (or temporarily set one), open `/beranda`, `/pengingat`, and `/catatan` — it must show "Segera ..." (amber), NOT "Terlambat". After 2+ minutes past the time, it must switch to "Terlambat". Check both obat and cuci-darah (CAPD should show "exchange CAPD" wording, HD should show "cuci darah" wording).
2. **Fluid form CAPD gating (item 2):** Open Catat Cairan. For Cairan Keluar, pick sumber = Urine → Konsentrasi CAPD and Kondisi Cairan Keluar must NOT appear, and the form must save without them. Pick sumber = Exchange CAPD → both appear, are required, and labels have no "(opsional)" suffix. For Cairan Masuk, pick a non-CAPD sumber → Konsentrasi CAPD must not appear. Repeat both checks on the edit sheet.
3. **Fluid balance threshold (item 3):** On `/beranda` "Keseimbangan Cairan Hari Ini", a small positive selisih (e.g. +200..+500 ml) must render as normal (teal, no "Cairan tertahan"); a selisih > +500 ml shows amber "Cairan tertahan" in a dark, readable color (`#7a4c0a`); caption reads "Rentang normal selisih harian: -1000 ml sampai +500 ml".

## Next Phase Readiness

All three PO-reported issues are implemented, verified via tsc + grep gates + backend unit tests, and deployed live (backend restarted, frontend image rebuilt). No blockers for future work. Human browser verification of the 3 items above is the only remaining step.

---
*Phase: quick-260707-8je*
*Completed: 2026-07-07*

## Self-Check: PASSED

All 10 created/modified files confirmed present on disk; all 3 task commit hashes (182d635, 26033ea, cfe93cb) confirmed present in git log.
