---
phase: quick-260708-fr2
plan: 01
subsystem: auth
tags: [mobile, cookies, cors, pwa, auth]
dependency-graph:
  requires: []
  provides: [same-origin-api-proxy, case-insensitive-login]
  affects: [frontend/next.config.ts, frontend/lib/api.ts, backend/src/repositories/user.repository.ts]
tech-stack:
  added: []
  patterns: [Next.js rewrites() proxy, first-party cookie via same-origin]
key-files:
  created: []
  modified:
    - frontend/next.config.ts
    - frontend/lib/api.ts
    - frontend/app/sw.ts
    - frontend/Dockerfile
    - docker-compose.yml
    - frontend/lib/validators/auth.schema.ts
    - backend/src/services/auth.service.ts
    - backend/src/repositories/user.repository.ts
    - frontend/app/(auth)/login/page.tsx
decisions:
  - "All JSON API calls now go through Next.js rewrites (/api/* same-origin) instead of directly to the Railway backend origin, making the refreshToken cookie first-party for iOS Safari/Android."
  - "Multipart uploads, /uploads image GETs, and offlineQueue deliberately keep the direct backend origin (untouched) — they use Bearer/token-query-param auth, not cookies."
  - "findByEmail is now case-insensitive via SQL lower() comparison instead of requiring a data migration, since all 7 existing prod emails are already lowercase."
metrics:
  duration: "~20 min"
  completed: "2026-07-08"
---

# Phase quick-260708-fr2 Plan 01: Fix login/register gagal di HP (cookie relay) Summary

Fixed login/register session persistence failing on mobile phones by making the httpOnly `refreshToken` cookie first-party via a Next.js same-origin API proxy, plus hardened email normalization and a visible login network-error message.

## What Was Built

**Root cause (confirmed via prod DB evidence):** the frontend (vercel.app) and backend (railway.app) are cross-site. The httpOnly `refreshToken` cookie was therefore a THIRD-PARTY cookie, which iOS Safari (ITP) and several Android browsers silently block. Server-side login succeeded (200 response), but the cookie was never stored by the mobile browser, so the very next page's `/api/auth/refresh` call returned 401 and bounced the user back to `/login`. Desktop Chrome (which currently still allows third-party cookies) worked fine, exactly matching the bug report pattern.

**Task 1 — Same-origin API proxy (the actual fix):**
- `frontend/next.config.ts` — added an async `rewrites()` inside `nextConfig` (kept `withSerwist(nextConfig)` wrapper intact) that proxies `/api/:path*` to a computed target: `API_PROXY_TARGET ?? NEXT_PUBLIC_API_URL ?? "http://localhost:4000"`.
- `frontend/lib/api.ts` — `API_BASE` changed from `NEXT_PUBLIC_API_URL` to `""` (empty string), so `apiFetch`/`tryRefreshToken` now issue relative `/api/*` requests, same-origin, proxied to the backend by the rewrite. Only this file's API_BASE changed.
- `frontend/app/sw.ts` — the fetch-passthrough guard now also matches by `pathname.startsWith("/api/")`, keeping the old `API_BASE` origin-prefix check as a fallback so the invariant ("API responses never cached/intercepted") still holds for both same-origin and any remaining direct calls.
- `frontend/Dockerfile` — added `ARG API_PROXY_TARGET` / `ENV API_PROXY_TARGET=${API_PROXY_TARGET}` next to the existing `NEXT_PUBLIC_API_URL` build args, since rewrites are baked into the routes-manifest at `next build` time.
- `docker-compose.yml` — added `API_PROXY_TARGET: http://backend:4000` to both the frontend service's `build.args` and `environment` (the Next *server* must reach the backend via the compose service name, while the browser-facing `NEXT_PUBLIC_API_URL` stays `localhost:4000`).

Upload/image components (`UploadFileForm.tsx`, `LabUploadEditSheet.tsx`, `LabResultList.tsx`, `MedicationReminderForm.tsx`, `ReminderDetailOverlay.tsx`, `MedicationLogItem.tsx`, `app/(app)/pengingat/page.tsx`, `lib/offlineQueue.ts`) were NOT touched — they keep their own direct-backend-origin `API_BASE`, per the plan's critical invariant (Bearer tokens / token query params / multipart bodies / `<Image>` srcs must not go through the proxy).

**Task 2 — Email normalization + visible login network error:**
- `frontend/lib/validators/auth.schema.ts` — `registerSchema`, `loginSchema`, `forgotPasswordSchema` email fields now `z.string().trim().toLowerCase().email(...)`.
- `backend/src/services/auth.service.ts` — same `trim().toLowerCase()` transform applied to `registerSchema`, `loginSchema`, `forgotPasswordSchema`.
- `backend/src/repositories/user.repository.ts` — `findByEmail` now compares via `eq(sql\`lower(${users.email})\`, email.trim().toLowerCase())` instead of a case-sensitive `eq(users.email, email)`. Added `sql` to the existing drizzle-orm import.
- `frontend/app/(auth)/login/page.tsx` — `onSubmit`'s catch block gained an `else` branch (for errors that are not `instanceof ApiError`, i.e. network failures before a response arrives) that calls `setError("root", { message: "Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi." })`. Previously a network failure left the submit button appearing to do nothing.

## Deviations from Plan

None — plan executed exactly as written across both tasks (9 files, 2 commits).

## Verification

- `cd frontend && npm run build` — succeeded (Next.js 16.2.9, Turbopack, 22 routes compiled, `NEXT_PUBLIC_API_URL` unset locally so the rewrite target fell back to `http://localhost:4000` with no build error, as expected).
- `cd backend && npx tsc --noEmit` — 4 pre-existing errors remain (`dialysisLog.controller.ts` lines 46/68, `medicationLog.controller.ts` lines 47/69, all `TS2345: string | string[] not assignable to string`). Confirmed via a temporary `git stash`/`tsc`/`git stash pop` cycle (safe — this is the main checkout, not a linked worktree) that these 4 errors are identical before and after this plan's changes; they are the same errors documented across many prior SUMMARY.md entries in STATE.md ("4 pre-existing unrelated controller errors") and are out of scope for this task.
- No new tsc errors introduced by any of the 4 backend/frontend files this plan touched.

## Commits

- `bbcf71e` — fix(quick-260708-fr2): route JSON API calls same-origin via Next.js rewrites
- `defb264` — fix(quick-260708-fr2): normalize email casing/whitespace + visible login network error

## Known Side Effect (documented, not a bug)

Existing sessions had their `refreshToken` cookie set on the `railway.app` domain. After this fix deploys, every user's next `/api/auth/refresh` call will 401 once (cookie domain mismatch) and they will need to log in one more time — after that, the cookie is re-set on the `vercel.app` origin and subsequent sessions persist correctly on mobile.

## Pending (not blocking, manual verification only)

Post-deploy: open the live site on an actual iPhone (Safari) and an Android phone, log in, navigate to `/beranda`, and confirm the session persists (no bounce back to `/login`). This cannot be verified from this environment and was explicitly marked non-blocking in the plan's verification section.

## Self-Check: PASSED

All 9 modified files confirmed present on disk; both commits (`bbcf71e`, `defb264`) confirmed present in `git log --oneline --all`.
