---
phase: 02-fluid-medication-tracking-with-reminders
plan: "03"
subsystem: frontend-pwa
tags: [pwa, push-notifications, serwist, turbopack, ios-gate, service-worker]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [pwa-installability, push-subscription-client, ios-install-gate, sw-push-handler]
  affects: [frontend-layout, profil-page, push-subscriptions-backend]
tech_stack:
  added:
    - "@serwist/turbopack@9.5.11 (withSerwist, createSerwistRoute, SerwistProvider)"
    - "serwist@9.5.11 (Serwist class, PrecacheEntry)"
    - "esbuild@0.28.1 (SW bundler, useNativeEsbuild: true)"
  patterns:
    - "Serwist Route Handler pattern (app/serwist/[path]/route.ts) — not @serwist/next"
    - "Notification.requestPermission() as first click-handler expression (iOS rule)"
    - "Per-device push subscription re-registration on visibilitychange (iOS expiry mitigation)"
    - "urlBase64ToArrayBuffer returns ArrayBuffer (not Uint8Array) to satisfy TypeScript strict PushSubscriptionOptionsInit.applicationServerKey"
key_files:
  created:
    - frontend/next.config.ts (withSerwist wrapper)
    - frontend/app/serwist/[path]/route.ts (Route Handler serving compiled SW)
    - frontend/app/manifest.ts (MetadataRoute.Manifest, served at /manifest.webmanifest)
    - frontend/app/sw.ts (push + notificationclick handlers, Serwist precache)
    - frontend/lib/pwaDetection.ts (isIos, isInStandaloneMode)
    - frontend/lib/pushClient.ts (subscribeAndRegister, ensureFreshSubscription)
    - frontend/components/push/InstallPrompt.tsx (iOS Add-to-Home-Screen interstitial)
    - frontend/components/push/NotificationPermissionBanner.tsx (permission UI + iOS gate)
    - frontend/public/icons/.gitkeep (placeholder for required icon assets)
  modified:
    - frontend/app/layout.tsx (SerwistProvider wrapping children at /serwist/sw.js)
    - frontend/app/(app)/profil/page.tsx (Aktifkan Notifikasi section + visibilitychange)
decisions:
  - "Used createSerwistRoute (Route Handler) not @serwist/next — @serwist/turbopack uses the Turbopack-native Route Handler approach instead of webpack plugins"
  - "useNativeEsbuild: true in createSerwistRoute — esbuild-wasm is not installed; native esbuild is the peer dep we installed"
  - "Declared local SW event interfaces (SwPushEvent, SwNotificationEvent) in sw.ts — PushEvent/NotificationEvent and ServiceWorkerGlobalScope are not directly accessible in lib.dom with the project's tsconfig"
  - "urlBase64ToArrayBuffer returns ArrayBuffer.slice(0) not Uint8Array — TypeScript strict mode requires ArrayBuffer not Uint8Array<ArrayBufferLike> for PushSubscriptionOptionsInit.applicationServerKey"
  - "Task 4 (real device PWA verification) deferred to manual QA per pre-authorization — requires physical iOS + Android devices, cannot be automated"
metrics:
  duration: "38 minutes"
  completed_date: "2026-06-26"
  tasks_completed: 3
  tasks_deferred: 1
  files_created: 9
  files_modified: 2
---

# Phase 02 Plan 03: PWA Installability + Push Subscription Client Summary

KidneyBuddy is now a real installable PWA with a working Serwist service worker, native manifest, and the complete frontend device subscription flow — including the iOS Add-to-Home-Screen gate that must precede any permission request on iPhone.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Package legitimacy gate (pre-approved) | — | Skipped (pre-authorized) |
| 2 | Serwist + Turbopack setup: next.config, sw.ts, manifest.ts, SerwistProvider | 8068587 | Done |
| 3 | pushClient + pwaDetection + InstallPrompt + NotificationPermissionBanner + profil entry | 0c4f5a0 | Done |
| 4 | Real device verification (NOTIF-01, NOTIF-03) | — | Deferred to manual QA |

## Build Verification

`npm run build` output (Task 2 verification):
```
✓ Compiled successfully in 18.4s
✓ TypeScript passed (34.7s)
○ /manifest.webmanifest  — served at expected URL
● /serwist/[path]        — SSG via generateStaticParams
  ├ /serwist/sw.js.map
  └ /serwist/sw.js       ← service worker served here
✓ (serwist) 28 precache entries (920.87 KiB)
```

`npx tsc --noEmit` (Task 3 verification): 0 errors.

## Key Implementation Details

### Serwist + Turbopack Architecture

`@serwist/turbopack` uses a different integration model from `@serwist/next`:
- `withSerwist(nextConfig)` — adds esbuild/esbuild-wasm to `serverExternalPackages` only
- `createSerwistRoute({ swSrc, useNativeEsbuild: true })` — Route Handler at `app/serwist/[path]/route.ts` that compiles `app/sw.ts` via native esbuild on-demand and serves it at `/serwist/sw.js`
- `SerwistProvider swUrl="/serwist/sw.js"` — Client Component in root layout that registers the SW

The Route Handler approach is the correct Turbopack-native integration; webpack-based `@serwist/next` would require `next build --no-turbo`.

### iOS Permission Rule (Pitfall 2 Compliance)

In `NotificationPermissionBanner.tsx`, the click handler structure is:
```typescript
const handleEnableClick = async () => {
  // ▼ MUST be the first expression — iOS user-gesture requirement
  const permission = await Notification.requestPermission();
  // ... only after permission is resolved, call subscribeAndRegister
};
```
No await, if-block, or fetch precedes the `requestPermission()` call.

### iOS Subscription Expiry Mitigation (Pitfall 5)

The profil page registers a `visibilitychange` listener calling `ensureFreshSubscription(accessToken)`. This re-POSTs the subscription to `/api/push/subscribe` on each app foreground, refreshing `last_confirmed_at` in the backend table and creating a new subscription if the iOS one has silently expired.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript: `ServiceWorkerGlobalScope` not directly accessible in lib.dom**
- **Found during:** Task 2 — first `npm run build` attempt
- **Issue:** TypeScript's `lib.dom` does not expose `ServiceWorkerGlobalScope` as a named type in module context; `PushEvent`/`NotificationEvent` also not accessible via the module-scoped type system
- **Fix:** Defined local SW-context interfaces (`SwPushEvent`, `SwNotificationEvent`, `SwExtendableEvent`, `SwNotificationOptions`) in `app/sw.ts`; used `as unknown as` double-cast for `self` to access SW-specific properties
- **Files modified:** `frontend/app/sw.ts`
- **Commit:** 8068587

**2. [Rule 1 - Bug] TypeScript: `Uint8Array<ArrayBufferLike>` not assignable to `PushSubscriptionOptionsInit.applicationServerKey`**
- **Found during:** Task 3 — `npx tsc --noEmit` first run
- **Issue:** TypeScript 5.x strict mode requires `ArrayBuffer` (not `Uint8Array`) for the `applicationServerKey` parameter — the stricter `ArrayBufferView<ArrayBuffer>` constraint means `Uint8Array` with its `ArrayBufferLike` buffer type doesn't satisfy it
- **Fix:** Renamed `urlBase64ToUint8Array` to `urlBase64ToArrayBuffer`; returns `outputArray.buffer.slice(0)` (plain `ArrayBuffer`) instead of the `Uint8Array` itself
- **Files modified:** `frontend/lib/pushClient.ts`
- **Commit:** 0c4f5a0

**3. [Rule 3 - Blocking] `esbuild-wasm` missing: createSerwistRoute fails at page data collection**
- **Found during:** Task 2 — build succeeds TypeScript check but fails at "Collecting page data"
- **Issue:** `createSerwistRoute` tries `esbuild-wasm` as its default. Only native `esbuild` is installed as a project dependency
- **Fix:** Added `useNativeEsbuild: true` to `createSerwistRoute` options in `app/serwist/[path]/route.ts`
- **Files modified:** `frontend/app/serwist/[path]/route.ts`
- **Commit:** 8068587

## Task 4 Deferred — Manual QA Checklist

Task 4 requires real device testing (iOS Safari + Android Chrome). This is deferred per pre-authorization. The QA checklist when devices are available:

1. **Desktop Chrome:** DevTools → Application → Manifest shows name "KidneyBuddy", display "standalone"; SW registered and activated; install icon in address bar
2. **Android Chrome:** "Add to Home Screen" offered; tap "Aktifkan Notifikasi" → permission dialog appears; row appears in `push_subscriptions` table
3. **Real iPhone (Safari):** Without adding to Home Screen → `InstallPrompt` interstitial visible (not a permission button); after Add to Home Screen + open from icon → iOS permission dialog appears on "Aktifkan Notifikasi" tap
4. **Multi-device:** Second device grant → second distinct row in `push_subscriptions` (per-device model verified)

## Known Stubs

None — this plan does not contain stub data or placeholder wiring. The push subscription flow has a real backend endpoint (`/api/push/subscribe` from plan 02-02). The medication-log confirm endpoint (`/api/medication-log/confirm`) referenced in the SW's `notificationclick` handler is implemented in plan 02-05.

## Threat Flags

No new threat surfaces beyond those in the plan's threat model:
- T-02-03-01 (VAPID public key in client): accepted — public keys are by design public
- T-02-03-02 (iOS expiry): mitigated by `visibilitychange` re-subscribe
- T-02-03-03 (SW confirm POST): credentials: "include" present; backend validates ownership in 02-05

## Self-Check: PASSED

All created files verified on disk. Both task commits verified in git log.

| Check | Result |
|-------|--------|
| frontend/app/manifest.ts | FOUND |
| frontend/app/sw.ts | FOUND |
| frontend/app/serwist/[path]/route.ts | FOUND |
| frontend/lib/pwaDetection.ts | FOUND |
| frontend/lib/pushClient.ts | FOUND |
| frontend/components/push/InstallPrompt.tsx | FOUND |
| frontend/components/push/NotificationPermissionBanner.tsx | FOUND |
| frontend/public/icons/.gitkeep | FOUND |
| Commit 8068587 (Task 2) | FOUND |
| Commit 0c4f5a0 (Task 3) | FOUND |
