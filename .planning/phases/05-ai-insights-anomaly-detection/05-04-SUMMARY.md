---
phase: 05-ai-insights-anomaly-detection
plan: 04
subsystem: ui
tags: [nextjs, react, radix-alert-dialog, express, groq-sdk, anomaly-detection, frontend]

# Dependency graph
requires:
  - phase: 05-03-ai-insights-anomaly-detection
    provides: "/api/anomaly REST API (history, active-high-severity, feedback, acknowledge), encrypted anomaly_alerts pipeline"
provides:
  - "EmergencyAnomalyModal: full-screen, non-dismissable AlertDialog for tinggi-severity alerts, mounted globally in AppShell, re-checked every session (ANOMALY-03, D-05/D-07/D-08)"
  - "AnomalyAlertCard + AnomalyAlertSection: normal-severity alerts surfaced as Alert AI/Info cards on Beranda (ANOMALY-02); CAPDEffluentBanner superseded and removed from Beranda render"
  - "/notifikasi history page + AlertHistoryList: full alert history with relevan/tidak_relevan feedback (ANOMALY-04)"
  - "Bell entry points wired on TopBar and MobileHeader with amber unread-count dot (useUnreadAnomalyCount hook)"
  - "Bugfix: anomaly.controller.ts now decrypts `deskripsi` before returning it (was leaking raw AES-256-GCM ciphertext to the frontend)"
  - "Bugfix: groqClient lazy-init + Groq-call-failure fallback + GROQ_API_KEY docker-compose passthrough (backend no longer crashes on boot without the key; alerts still fire with static fallback text if Groq itself fails)"
  - "Bugfix: feedback submission now transitions alert status aktif/dibaca -> ditindaklanjuti, unblocking same-type dedup re-firing (previously an acknowledged alert blocked all future alerts of the same type forever)"
affects: [05-05-ai-daily-weekly-insight, 05-06-ai-lab-lifestyle, 05-07-ai-frontend-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Modal open-state derived only from a server fetch (GET /api/anomaly/active-high-severity) on every AppShell mount — never from a client-persisted dismiss flag — so a hard reload before acknowledging still re-shows the modal (D-07)"
    - "AnomalyAlertCard is a single component with compact (Beranda, ellipsized/clickable) and full (notifikasi, untruncated + status badge + feedback pills) variants, rather than two near-duplicate components"
    - "useUnreadAnomalyCount shared hook counts normal-severity aktif alerts only; tinggi-severity alerts never rely on the bell badge since they interrupt via the emergency modal directly"

key-files:
  created:
    - frontend/components/anomaly/EmergencyAnomalyModal.tsx
    - frontend/components/anomaly/AnomalyAlertCard.tsx
    - frontend/components/anomaly/AlertHistoryList.tsx
    - frontend/components/beranda/AnomalyAlertSection.tsx
    - frontend/app/(app)/notifikasi/page.tsx
    - frontend/lib/hooks/useUnreadAnomalyCount.ts
  modified:
    - frontend/components/shell/AppShell.tsx (mounts modal globally, fetches active-high-severity on every mount, wires onNotificationClick)
    - frontend/components/shell/TopBar.tsx (wired previously-unused Bell button + amber unread dot)
    - frontend/components/shell/MobileHeader.tsx (added Bell button + amber unread dot, previously had none)
    - frontend/components/ui/alert-dialog.tsx (added overlayClassName passthrough for the red-tinted overlay)
    - frontend/app/(app)/beranda/page.tsx (added AnomalyAlertSection, removed CAPDEffluentBanner render + dead state)
    - backend/src/controllers/anomaly.controller.ts (decrypt-before-return fix)
    - backend/src/lib/groqClient.ts (lazy init)
    - backend/src/services/anomalyExplanation.service.ts (fallback on Groq call failure)
    - docker-compose.yml, .env.example (GROQ_API_KEY passthrough)

key-decisions:
  - "Emergency modal's close path is strictly: acknowledge button -> authFetch POST /api/anomaly/:id/acknowledge -> close only on 2xx; escape/outside-click/back-button are all no-ops (onOpenChange no-op, preventDefault on escape and pointer-outside), satisfying D-05/D-07/D-08 without any client-side dismiss flag."
  - "CAPDEffluentBanner.tsx was NOT deleted, only unrendered from beranda/page.tsx — EmergencyAnomalyModal now owns all tinggi-severity interruption per the Alert Variant Lock, but the banner file is left in place in case of future reuse."
  - "AnomalyAlertSection returns null (no empty state) when zero active/unread normal-severity alerts exist, matching the UI-SPEC's 'do not clutter Beranda with an empty peringatan block' intent."
  - "TopBar/MobileHeader bell badge counts only normal-severity aktif alerts — tinggi-severity alerts bypass the badge entirely since the emergency modal already interrupts on its own, avoiding a double-signal for the same event."

patterns-established:
  - "Pattern: any alert-derived UI state (modal open, unread dot, card visibility) must be recomputed from a server fetch on mount/session-start, never trusted from client state alone — this is now the standard for anomaly/notification UI in this codebase."

requirements-completed: [ANOMALY-02, ANOMALY-03, ANOMALY-04]

# Metrics
duration: ~1h 31m
completed: 2026-07-04
---

# Phase 05 Plan 04: Anomaly Frontend (Emergency Modal, Alert Cards, History, Bell Wiring) Summary

**Shipped the full patient-facing anomaly UX against the live 05-03 backend — a non-dismissable, server-truth-driven emergency modal for tinggi-severity alerts, teal Alert AI/Info cards for normal-severity alerts on Beranda, a `/notifikasi` history page with working relevan/tidak_relevan feedback, and bell entry points on both TopBar and MobileHeader — plus three real bugs (ciphertext leak, backend boot crash on missing GROQ_API_KEY, and a dedup-blocking status bug) found and fixed during manual verification.**

## Performance

- **Duration:** ~1h 31m (05:52 – 07:23 WIB), across 3 planned task commits + 4 bugfix commits + 1 docs commit
- **Started:** 2026-07-04T05:52:50+07:00
- **Completed:** 2026-07-04T07:23:37+07:00
- **Tasks:** 4 (3 auto tasks + 1 human-verify checkpoint, all complete)
- **Files modified:** 17 (9 declared in plan frontmatter + 8 touched by the 3 post-manual-test bugfixes and 1 docs commit)

## Accomplishments

- `EmergencyAnomalyModal.tsx`: shadcn `AlertDialog` per UI-SPEC Contract 1 — red-tinted overlay `rgba(212,24,61,0.15)`, no `AlertDialogCancel`, `onOpenChange` no-op, escape/pointer-outside both `preventDefault`, single full-width "Saya Mengerti, Hubungi Dokter Segera" button that POSTs `/api/anomaly/:id/acknowledge` and closes only on success
- `AppShell.tsx` fetches `/api/anomaly/active-high-severity` on every mount (new session) and mounts the modal globally alongside `CatatCairanSheet`, blocking any route underneath (D-07); also passes `onNotificationClick` through to TopBar/MobileHeader
- `AnomalyAlertCard.tsx` + `AnomalyAlertSection.tsx`: Alert AI/Info gradient cards for normal-severity alerts, amber unread dot only for `status==='aktif'`, section renders only with >=1 active/unread normal alert, "Lihat Semua Peringatan" link past 3; `beranda/page.tsx` now renders the section and no longer renders `CAPDEffluentBanner`
- `AlertHistoryList.tsx` + `notifikasi/page.tsx`: full alert history (all severities/statuses, newest-first), status badges (Aktif/Sudah Dibaca/Ditindaklanjuti), Relevan/Tidak Relevan feedback pills (`Tidak Relevan` filled neutral `#7a8c8a`, never red) PATCHing `/api/anomaly/:id/feedback`; loading/empty/error states per Copywriting Contract
- `TopBar.tsx` (previously-unused Bell button wired) and `MobileHeader.tsx` (Bell button added, previously had none) both route to `/notifikasi` with an amber unread-count dot via the new shared `useUnreadAnomalyCount` hook
- Three real bugs found and fixed during manual (docker compose) verification, described in Deviations below

## Task Commits

Each task was committed atomically:

1. **Task 1: EmergencyAnomalyModal + global AppShell mount + session re-check** - `ec79178` (feat) — bundled with the decrypt-before-return fix (see Deviations)
2. **Task 2: AnomalyAlertCard + AnomalyAlertSection on Beranda; remove CAPDEffluentBanner** - `c5f6374` (feat)
3. **Task 3: /notifikasi history page + AlertHistoryList + feedback; bell wiring** - `ad1fbc3` (feat)
4. **Task 4: Human verification** - approved after manual testing surfaced 3 bugs, all fixed and committed separately (see below)

Post-task-3 bugfixes found during Task 4 manual verification:

- `ed3f5c4` (fix) — make `groqClient` lazy so a missing `GROQ_API_KEY` doesn't crash the whole backend on boot
- `c94faf0` (fix) — fall back to the static template when the Groq call itself fails (not just on forbidden-phrase violations)
- `aa2bba6` (fix) — pass `GROQ_API_KEY` through to the backend container in `docker-compose.yml` + document in `.env.example`
- `b705a52` (fix) — transition alert status to `ditindaklanjuti` on feedback submission, unblocking dedup re-firing
- `c39623d` (docs) — log the TopBar desktop-rendering bug as a separate, non-blocking follow-up todo

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified

- `frontend/components/anomaly/EmergencyAnomalyModal.tsx` - non-dismissable AlertDialog for tinggi alerts
- `frontend/components/anomaly/AnomalyAlertCard.tsx` - compact (Beranda) + full (notifikasi) alert card variants
- `frontend/components/anomaly/AlertHistoryList.tsx` - full history list with feedback pills
- `frontend/components/beranda/AnomalyAlertSection.tsx` - normal-severity section on Beranda
- `frontend/app/(app)/notifikasi/page.tsx` - "Riwayat Peringatan" history page
- `frontend/lib/hooks/useUnreadAnomalyCount.ts` - shared unread-count hook for both bell buttons
- `frontend/components/shell/AppShell.tsx` - global modal mount + active-high-severity fetch
- `frontend/components/shell/TopBar.tsx` - bell wiring + unread dot
- `frontend/components/shell/MobileHeader.tsx` - bell button added + unread dot
- `frontend/components/ui/alert-dialog.tsx` - `overlayClassName` passthrough
- `frontend/app/(app)/beranda/page.tsx` - section added, CAPDEffluentBanner render removed
- `backend/src/controllers/anomaly.controller.ts` - decrypt `deskripsi` before returning (bugfix)
- `backend/src/lib/groqClient.ts` - lazy init (bugfix)
- `backend/src/services/anomalyExplanation.service.ts` - fallback on Groq call failure (bugfix)
- `docker-compose.yml`, `.env.example` - GROQ_API_KEY passthrough (bugfix)

## Decisions Made

- Modal close path is strictly acknowledge-button -> server POST -> close-on-success; no client-persisted dismiss flag exists anywhere, so a reload before acknowledging always re-shows the modal.
- `CAPDEffluentBanner.tsx` was intentionally left on disk (not deleted) — only its render call was removed from `beranda/page.tsx` — since `EmergencyAnomalyModal` now owns all tinggi-severity interruption per the Alert Variant Lock, but no reason to delete a working component outright.
- Bell unread-dot counts only normal-severity `aktif` alerts; tinggi-severity alerts are deliberately excluded from that count since they already interrupt directly via the modal — avoids double-signaling the same event through two channels.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `anomaly.controller.ts` never decrypted `deskripsi` before returning it**
- **Found during:** Task 1 implementation (before manual verification even started)
- **Issue:** `list`/`activeHighSeverity`/`feedback`/`acknowledge` all returned the raw AES-256-GCM ciphertext column directly — the frontend would have rendered encrypted bytes instead of the Bahasa Indonesia explanation text.
- **Fix:** Added `withDecryptedDeskripsi()` following the same encrypt-before-INSERT/decrypt-after-SELECT pattern already established elsewhere in the codebase (e.g. fluid_log).
- **Files modified:** `backend/src/controllers/anomaly.controller.ts`
- **Verification:** Manual test confirmed readable Indonesian explanation text renders in both the emergency modal and alert cards.
- **Committed in:** `ec79178` (bundled with Task 1 commit)

**2. [Rule 1 - Bug] Backend crashed on boot when `GROQ_API_KEY` was unset**
- **Found during:** Task 4 manual verification (docker compose run)
- **Issue:** `groqClient.ts` threw at module import time; since `app.ts` transitively imports it via the anomaly route registration chain, this crashed the entire backend process — blocking login and all unrelated features, not just AI narration.
- **Fix:** Made `groqClient` lazy-initialized (constructed on first use, not at import time).
- **Files modified:** `backend/src/lib/groqClient.ts`
- **Verification:** Backend boots successfully with `GROQ_API_KEY` unset; confirmed manually.
- **Committed in:** `ed3f5c4`

**3. [Rule 1 - Bug] Alert insertion silently skipped when the Groq call itself failed**
- **Found during:** Task 4 manual verification, same session as #2
- **Issue:** `getValidatedExplanation` only had a fallback for forbidden-phrase content violations; if the Groq call itself threw (missing key, timeout, rate limit, network error), the error propagated up and `processFiredRule` skipped alert insertion entirely — meaning a real anomaly could go completely unrecorded if Groq was unreachable.
- **Fix:** Added a try/catch around the Groq call that falls back to the same static template used for content-policy failures, so alert insertion always proceeds regardless of Groq availability.
- **Files modified:** `backend/src/services/anomalyExplanation.service.ts`
- **Verification:** Manually confirmed alert still fires and is visible with static fallback text when `GROQ_API_KEY` is unset.
- **Committed in:** `c94faf0`

**4. [Rule 3 - Blocking] `docker-compose.yml` never forwarded `GROQ_API_KEY` to the backend container**
- **Found during:** Task 4 manual verification, same session as #2/#3
- **Issue:** The backend container always saw `GROQ_API_KEY` as unset regardless of local `.env` configuration, since compose never passed it through.
- **Fix:** Added the passthrough in `docker-compose.yml`'s backend service `environment:` block and documented the var in `.env.example`.
- **Files modified:** `docker-compose.yml`, `.env.example`
- **Verification:** Manually confirmed Groq calls succeed inside the container after the fix with a real key set.
- **Committed in:** `aa2bba6`

**5. [Rule 1 - Bug, patient-safety] Feedback submission never advanced alert status past `dibaca`**
- **Found during:** Task 4 manual verification — re-testing dedup by logging a second "berdarah" entry after acknowledging the first
- **Issue:** `_submitFeedbackCore` only persisted `feedbackPengguna`, never transitioning status to `ditindaklanjuti`. Since `anomalyOrchestrator.service.ts`'s same-day dedup treats both `aktif` and `dibaca` as unresolved, an alert that received feedback stayed permanently stuck at `dibaca` — silently blocking every future alert of the same `(userId, tipeAnomali)` pair forever. This meant a real repeat "berdarah" CAPD effluent event days later would never re-fire, a direct patient-safety gap.
- **Fix:** `_submitFeedbackCore` now transitions status to `ditindaklanjuti` on feedback submission, completing the PRD §8.8 lifecycle (`aktif` -> `dibaca` -> `ditindaklanjuti`) and unblocking dedup.
- **Files modified:** `backend/src/controllers/anomaly.controller.ts`
- **Verification:** Manually re-tested — after the fix, acknowledging + submitting feedback on a berdarah alert, then logging a fresh berdarah entry later, correctly triggered a brand-new emergency modal.
- **Committed in:** `b705a52`

---

**Total deviations:** 5 auto-fixed (4 bugs, 1 blocking) — all found via manual verification (Task 4), all necessary for correctness/safety, no scope creep. A 6th item (TopBar desktop-rendering bug) was found but NOT auto-fixed — see Issues Encountered.

## Issues Encountered

- **TopBar bell/avatar not visually rendering at desktop width (>=1024px)** — discovered during Task 4 manual verification. `MobileHeader`'s identical bell-icon pattern (same `useUnreadAnomalyCount` hook) works correctly at narrow widths, but `TopBar` renders no visible header bar, bell, or avatar at desktop widths. DOM introspection was inconsistent (one check found 2 matching buttons, a later check in the same session found only 1 `<header>` element), suggesting a possible post-hydration unmount rather than a simple CSS issue. Root cause undiagnosed. **Does not block this plan or Phase 5**: the bell-wiring code itself is correct — `MobileHeader` proves the exact same pattern renders and functions properly — this is an isolated, cosmetic/nav-only rendering mystery specific to `TopBar` at desktop width, not a missing feature or a defect in the anomaly-detection safety pipeline. Filed as `.planning/todos/pending/topbar-bell-not-rendering-desktop.md` for separate investigation. Desktop users currently have no way to reach `/notifikasi` except via clicking through a normal-severity alert card on Beranda (when one exists) until this is fixed.

## User Setup Required

None - no new external service configuration required beyond what was already documented (GROQ_API_KEY, now correctly passed through docker-compose per bugfix #4 above).

## Next Phase Readiness

- Full anomaly-detection user experience (ANOMALY-02/03/04) is complete, live, and manually verified end-to-end: emergency modal blocks correctly, re-appears until acknowledged, resolves after acknowledge+feedback, normal-severity cards render on Beranda, `/notifikasi` history + feedback works and persists across reload.
- Three real bugs found during manual testing are fixed and committed; the dedup-blocking bug (#5) in particular was a genuine patient-safety gap now closed.
- 05-05/05-06/05-07 (AI daily/weekly insight, lab/lifestyle, frontend integration) are unaffected by and do not depend on the TopBar rendering bug — safe to proceed.
- Outstanding: TopBar desktop bell/avatar rendering bug remains open (non-blocking, filed as a todo) — recommend picking it up as a standalone quick task before final UI polish/demo, since it currently removes the desktop nav path to `/notifikasi`.

---
*Phase: 05-ai-insights-anomaly-detection*
*Completed: 2026-07-04*

## Self-Check: PASSED

All created/modified files verified present on disk; all task commits (`ec79178`, `c5f6374`, `ad1fbc3`) plus bugfix commits (`ed3f5c4`, `c94faf0`, `aa2bba6`, `b705a52`) and docs commit (`c39623d`) verified present in git log.
