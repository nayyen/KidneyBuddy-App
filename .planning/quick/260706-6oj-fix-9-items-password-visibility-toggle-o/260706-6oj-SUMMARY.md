---
quick_id: 260706-6oj
subsystem: auth-ui, dashboard, reminders, onboarding, push-notifications, email
tags: [password-toggle, sidebar-nav, activity-overdue, capd-concentration, push-notification, no-reminder-banner, onboarding-tutorial, medication-photo, resend-email]
requirements: [AUTH-06]
dependency_graph:
  requires: []
  provides:
    - "Resend-backed forgot-password email delivery with dev console fallback"
    - "Login password show/hide toggle"
    - "Desktop sidebar /notifikasi entry"
  affects:
    - "frontend auth, beranda, pengingat, catatan, onboarding, push notification surfaces"
    - "backend password-reset email flow"
tech_stack:
  added:
    - "resend@^6.17.1 (official Resend Node SDK, backend)"
  patterns:
    - "Injectable sender parameter for sendPasswordResetEmail (deps-injection pattern, matches 06-01 convention) — enables unit testing without live network calls"
key_files:
  created: []
  modified:
    - "frontend/app/(auth)/login/page.tsx"
    - "frontend/components/shell/Sidebar.tsx"
    - "frontend/components/aktivitas/ActivityList.tsx"
    - "frontend/components/aktivitas/KegiatanModuleInline.tsx"
    - "frontend/components/pengingat/ReminderItem.tsx"
    - "frontend/components/beranda/CuciDarahCard.tsx"
    - "frontend/app/sw.ts"
    - "frontend/app/(app)/beranda/page.tsx"
    - "frontend/app/(app)/onboarding/page.tsx"
    - "frontend/app/(app)/onboarding/_components/TherapySelectStep.tsx"
    - "frontend/components/catatan/MedicationLogItem.tsx"
    - "frontend/components/pengingat/ReminderDetailOverlay.tsx"
    - "frontend/components/pengingat/MedicationReminderForm.tsx"
    - "backend/src/services/email.service.ts"
    - "backend/src/services/auth.service.ts"
    - "backend/src/test/auth.passwordReset.test.ts"
    - ".env.example"
    - "backend/package.json / package-lock.json"
decisions:
  - "Bypassed next/image optimizer (unoptimized prop) for all 3 fotoObat display sites rather than fixing remotePatterns further — the cross-origin, dynamically-uploaded, non-CDN nature of medication photos makes direct browser fetch more robust than optimizer round-trips."
  - "sendPasswordResetEmail takes an injectable ResendSender param (defaults to the real Resend-backed implementation) so unit tests never make live network calls."
  - "auth.service.forgotPassword swallows send failures in a try/catch (generic success message always returned) to avoid user enumeration and to keep the flow resilient to a Resend outage."
metrics:
  duration: "~1h"
  completed: "2026-07-06"
---

# Quick Task 260706-6oj: Fix 9 Reported Bugs/Small Features Summary

Batch of 9 discrete bug fixes/features across auth UI, dashboard, reminders, onboarding, push notifications, and forgot-password email delivery — closes AUTH-06 (password reset via emailed link).

## Per-Item Outcomes

1. **Login password show/hide toggle** — Added `showPassword` state + `Eye`/`EyeOff` icons from `lucide-react` to the login password field. Toggle button is absolutely positioned inside a `relative` wrapper, disabled while locked out, `aria-label` in Bahasa Indonesia ("Tampilkan password" / "Sembunyikan password"). Commit `fbce917`.

2. **Medication photo display fix** — All 3 `next/image` usages for `fotoObat` (obat detail overlay in `MedicationLogItem.tsx`, `ReminderDetailOverlay.tsx`, and the existing-photo preview in `MedicationReminderForm.tsx`) now carry the `unoptimized` prop, bypassing the Next.js image optimizer so the browser fetches the backend `/uploads` URL directly instead of routing through a server-side-reachable optimizer step. Confirmed backend serves `/uploads` statically via `express.static`. Existing broken-image `onError` fallback preserved where it existed. Commit `44d3d0a`.

3. **Desktop sidebar /notifikasi button** — Added a dedicated "Notifikasi" nav entry to `Sidebar.tsx` (desktop-only shell), styled to match other nav items, using `BellRing` (distinct from Pengingat's `Bell`) plus an unread-count badge via the existing `useUnreadAnomalyCount` hook. TopBar's existing bell left unchanged. Commit `b4fe8b8`.

4. **Real forgot-password email via Resend + single-use verification** — Installed `resend` npm package (verified legitimate via `npm view resend version` before install). Rewrote `sendPasswordResetEmail` in `email.service.ts` to be async with an injectable `sender` parameter (defaults to the real Resend-backed implementation); when `RESEND_API_KEY` is set, it calls Resend's send API with an Indonesian subject/body containing the reset link; when unset, it falls back to console-logging the reset URL without throwing. `auth.service.forgotPassword` now awaits the send inside a try/catch (swallows failures, still returns the generic success message — no user enumeration). Single-use enforcement via `passwordResetTokenRepository.consumeIfValid`'s atomic find+markUsed UPDATE was confirmed unchanged (not rebuilt), asserted via a documentation-style test. Added `RESEND_API_KEY` / `RESEND_FROM_EMAIL` placeholders (plus `FRONTEND_URL`, previously read by the code but undocumented in `.env.example`) — placeholders only, no real secrets. TDD gates: RED commit `aa90842` (failing sender-injection test), GREEN commit `dd1b8ea` (implementation, all 10 tests pass). **The integration works the instant the user pastes their own `RESEND_API_KEY` into `.env` — no further code change needed.**

5. **"Terlambat" overdue badge on activities** — `ActivityList.tsx` (/catatan) now renders a distinct red "Terlambat" pill alongside the existing duration text for overdue, non-completed activities. `KegiatanModuleInline.tsx` (/beranda) copy changed from "Terlewat X Menit" to "Terlambat X Menit" for wording consistency; both driven by the existing `now > estimasiSelesai` comparison, no new API calls. Commit `c1bd771`.

6. **CAPD fluid concentration on reminder cards** — `CuciDarahCard.tsx` (/beranda) and `ReminderItem.tsx` (/pengingat) both now render a "Konsentrasi {konsentrasiCapd}" sub-line on the card face for CAPD entries with a non-empty `konsentrasiCapd`, matching the detail overlay's existing display. No schema changes. Commit `de3e6ac`.

7. **Push notification confirm label → "Sudah"** — `app/sw.ts`'s push handler action title changed from the medication-only "Sudah diminum" to the generic "Sudah", correct for obat/CAPD/HD reminders alike. `notificationclick` handler logic unchanged (still opens/focuses the app at the reminder's URL; no direct POST from the SW, per the existing audit comment). **Requires a service-worker rebuild + on-device PWA update to take effect** — the new label won't appear until the SW is redeployed and the installed PWA picks up the update. Commit `57dd626`.

8. **No-reminder banner gated on actual reminder count** — `beranda/page.tsx` now fetches `GET /api/reminders` and gates `NoReminderBanner` on `reminderCount === 0` instead of the `onboardingProgress.reminderConfigured` flag (which only tracked onboarding-step completion, not whether a reminder still exists). Refetches on `SYNC_EVENTS.REMINDER_UPDATED`. Banner does not flash before the count loads (suppressed while `reminderCount` is `null`). Commit `3403b95`.

9. **Tutorial-mode onboarding scopes therapy step** — `onboarding/page.tsx` now filters `therapyOptions` down to just the user's `metodeTerapiAktif` when `isTutorialMode && user?.metodeTerapiAktif` is true, passing the filtered array to `TherapySelectStep`. New users (no therapy set) still see all 3 options regardless of tutorial mode. `TherapySelectStep.tsx` pre-selects the single option via a `useEffect` when only one option is passed in, so "Lanjutkan" is immediately enabled. Commit `7c89dec`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing config] Added `FRONTEND_URL` to `.env.example`**
- **Found during:** Task 9
- **Issue:** `email.service.ts` already read `process.env.FRONTEND_URL` to build the reset-password link, but `.env.example` never documented it — a user setting up the project would have no idea this variable existed or what to set it to for the reset link to point at the right frontend origin.
- **Fix:** Added a `FRONTEND_URL=http://localhost:3000` line under the Runtime section with a comment explaining its purpose.
- **Files modified:** `.env.example`
- **Commit:** `dd1b8ea`

**2. [Rule 1 - Test bug] Fixed TypeScript "never" narrowing trap in test capture pattern**
- **Found during:** Task 9 (GREEN phase)
- **Issue:** Initial test used `let captured: X | null = null` reassigned inside a nested closure (the fake sender), then asserted with `assert.ok(captured)` before accessing `captured!.to` — TypeScript's control-flow analysis narrows the variable to `never` in this specific pattern (assignment inside a closure isn't tracked as reachable at the assertion point), causing a compile error unrelated to test logic.
- **Fix:** Switched to an array-based capture pattern (`const calls: Array<...> = []`, `calls.push(params)`) which avoids the narrowing trap entirely. The RED commit (`aa90842`) still carries the original closure-based pattern (it correctly failed for the intended reason — missing sender param — under `tsx`'s non-strict runtime execution); the narrowing fix landed in the GREEN commit once `tsc --noEmit` was run as part of final verification.
- **Files modified:** `backend/src/test/auth.passwordReset.test.ts`
- **Commit:** `dd1b8ea`

## TDD Gate Compliance

Task 9 (`type="auto" tdd="true"`) followed the RED/GREEN cycle:
- RED: commit `aa90842` — added failing test asserting `sendPasswordResetEmail` invokes an injected sender (function didn't yet accept a 3rd param); confirmed failure via `node --test`.
- GREEN: commit `dd1b8ea` — rewrote `email.service.ts` + `auth.service.ts` to make the test pass; confirmed all 10 tests pass.
- No separate REFACTOR commit was needed (implementation was already clean on first GREEN pass).

## Verification Performed

- Frontend typecheck (`cd frontend && npx tsc --noEmit`): clean, no errors in any of the 13 modified frontend files.
- Backend typecheck (`cd backend && npx tsc --noEmit`): clean for all modified files (`email.service.ts`, `auth.service.ts`, `auth.passwordReset.test.ts`). Pre-existing unrelated errors remain in `debug_*.ts` scratch files, `profile.e2e.ts`, and `dialysisLog.controller.ts`/`medicationLog.controller.ts` (string[] query-param typing) — none touched by this task, left untouched per scope boundary.
- Backend tests: `node --import tsx --test src/test/auth.passwordReset.test.ts` → 10/10 pass (8 pre-existing + 2 new unit tests), no live network calls made.
- Each task's individual `<verify>` grep/typecheck command from the plan was run and passed before moving to the next task.

## Pending / Requires Follow-up

- **Item 7 (push label):** requires a service-worker rebuild + redeploy, and the on-device installed PWA needs to pick up the SW update, before end users see "Sudah" instead of "Sudah diminum". No code action remains — this is a deployment/cache-refresh step outside this task's scope.
- **Item 4 (Resend):** works immediately once the user pastes a real `RESEND_API_KEY` into their `.env` — no further code change needed. Until then, forgot-password continues to console-log the reset URL (dev-safe fallback), which is the intended behavior for local dev.
- Human browser verification of all 9 items (visual/UX check) was not performed by this agent — no `checkpoint:human-verify` was reached during execution since all 9 tasks were `type="auto"` per the plan; a manual walkthrough is recommended before considering this batch fully closed.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new-outbound-network-call | `backend/src/services/email.service.ts` | New outbound HTTPS call to Resend's API (`resend.emails.send`) carrying the user's email address and a password-reset link/token, gated behind `RESEND_API_KEY` being set. Not present in the plan's original `<threat_model>` since forgot-password previously only console-logged. Mitigation already in place: token is single-use (`consumeIfValid`), expires in ~1 hour, and the send failure path never leaks success/failure state to the caller (no enumeration). Recommend the user rotate/restrict the `RESEND_API_KEY` to send-only scope in the Resend dashboard. |

## Self-Check: PASSED

- All 17 modified files verified present on disk.
- All 10 commit hashes verified present in `git log --oneline --all`.
