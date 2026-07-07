---
phase: quick-260707-aas
plan: 01
subsystem: auth
tags: [express, cors, cookies, deployment, cross-domain]

requires: []
provides:
  - "Shared refresh-token cookie options (backend/src/utils/cookies.ts) used by register/login/logout"
  - "Production CORS origin reads FRONTEND_URL env var with hardcoded fallback"
affects: [deployment, auth]

tech-stack:
  added: []
  patterns:
    - "Single source-of-truth cookie-options helper (refreshCookieOptions/clearRefreshCookieOptions) instead of inline literals at each call site"

key-files:
  created:
    - backend/src/utils/cookies.ts
  modified:
    - backend/src/controllers/auth.controller.ts
    - backend/src/app.ts

key-decisions:
  - "sameSite: none only in production (paired with secure: true), sameSite: strict unchanged in dev — cross-site vercel.app -> railway.app cookie delivery requires SameSite=None; Secure"
  - "clearRefreshCookieOptions is derived from refreshCookieOptions by omitting maxAge (not independently redefined) so set/clear shapes can never drift apart"
  - "CORS origin reuses the existing FRONTEND_URL env var (already used by email.service.ts) rather than introducing a new env var name; || (not ??) so an empty string also falls back"

requirements-completed: [DEPLOY-PROD-CROSS-DOMAIN]

duration: ~10min
completed: 2026-07-07
---

# Quick Task 260707-aas Summary

**Backend now supports cross-domain production auth: refresh cookie uses SameSite=None+Secure in prod (via a new shared cookie-options helper), and CORS origin reads FRONTEND_URL with a vercel.app fallback**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2/2 completed
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Created `backend/src/utils/cookies.ts` as the single source of truth for refresh-token cookie options — `sameSite: "none"` + `secure: true` in production (required for the cross-site vercel.app → railway.app cookie to actually be sent by the browser), `sameSite: "strict"` unchanged in dev.
- Refactored `register`, `login`, and `logout` in `auth.controller.ts` to use the shared `refreshCookieOptions`/`clearRefreshCookieOptions` instead of three separate inline option literals — guarantees the clear-cookie call matches the set-cookie shape so the browser actually removes it on logout.
- Updated CORS `origin` in `app.ts` to read `process.env.FRONTEND_URL` in production, falling back to the existing hardcoded `https://kidneybuddy.vercel.app` when unset/empty — makes the deployment portable across environments without a code edit, while dev origin (`http://localhost:3000`) and `credentials: true` are unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared refresh-cookie options helper and apply to all three call sites** - `1adc072` (feat)
2. **Task 2: Read CORS origin from FRONTEND_URL in production with hardcoded fallback** - `ca2fd83` (feat)

## Files Created/Modified
- `backend/src/utils/cookies.ts` - New helper exporting `refreshCookieOptions` and `clearRefreshCookieOptions` (typed `CookieOptions`), env-driven `isProduction` switch
- `backend/src/controllers/auth.controller.ts` - `register`/`login` set cookie via `refreshCookieOptions`; `logout` clears via `clearRefreshCookieOptions`; no inline `sameSite` literals remain
- `backend/src/app.ts` - CORS `origin` in production now `[process.env.FRONTEND_URL || "https://kidneybuddy.vercel.app"]`

## Decisions Made
- `clearRefreshCookieOptions` is derived from `refreshCookieOptions` via object destructuring (omitting `maxAge`) rather than written as a second independent literal, so the two option sets are provably identical in every field that `res.clearCookie` matches on (name/path/sameSite/secure/httpOnly).
- Used `||` rather than `??` for the `FRONTEND_URL` fallback per the plan's explicit instruction, so an empty-string env var also triggers the hardcoded fallback (not just `undefined`).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Ran `cd backend && npm run build` per the plan's overall verification step. Output showed 4 pre-existing TypeScript errors in `dialysisLog.controller.ts` and `medicationLog.controller.ts` (`string | string[]` not assignable to `string`) — these are documented in `.planning/STATE.md` as pre-existing, unrelated errors carried across multiple prior quick tasks (e.g. "255/258 backend tests... tsc clean (only the 2 pre-existing, explicitly out-of-scope controller `string\|string[]` errors remain)"). Confirmed via `grep` that none of these errors reference `cookies.ts`, `auth.controller.ts`, or `app.ts` — the two files this plan touched compile with zero errors. Out of scope per the plan's file list; left untouched and not counted as a deviation.

## User Setup Required

None for local dev — behavior is unchanged (`sameSite: "strict"`, `secure: false`). For production deployment, set the `FRONTEND_URL` environment variable on the Railway backend service to the actual deployed Vercel URL (e.g. `https://kidneybuddy.vercel.app` or a custom domain) so CORS/cookies target the correct origin; if left unset, the hardcoded fallback `https://kidneybuddy.vercel.app` is used automatically.

## Next Phase Readiness

Backend is ready for cross-domain production deployment (Vercel frontend + Railway backend): the refresh-token cookie will be delivered cross-site in production, and CORS will accept the configured frontend origin. No blockers.

---
*Phase: quick-260707-aas*
*Completed: 2026-07-07*

## Self-Check: PASSED

- FOUND: backend/src/utils/cookies.ts
- FOUND: commit 1adc072
- FOUND: commit ca2fd83
