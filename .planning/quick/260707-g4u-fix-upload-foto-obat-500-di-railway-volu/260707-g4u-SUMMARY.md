---
phase: quick-260707-g4u
plan: 01
subsystem: backend-infra, frontend-beranda
tags: [docker, entrypoint, uploads, railway, beranda, pengingat]
dependency-graph:
  requires: []
  provides: [entrypoint-privilege-drop, pengingat-berikutnya-display-only]
  affects: [backend/Dockerfile, frontend/beranda]
tech-stack:
  added: [su-exec]
  patterns: [root-entrypoint-chown-then-drop-privileges]
key-files:
  created:
    - backend/docker-entrypoint.sh
  modified:
    - backend/Dockerfile
    - frontend/components/beranda/PengingatBerikutnyaCard.tsx
decisions:
  - "Root-privileged entrypoint chowns the mounted /app/uploads volume at container start, then drops to express via su-exec — image no longer sets USER express directly."
metrics:
  duration: ~15min
  completed: 2026-07-07
---

# Quick Task 260707-g4u: Fix upload foto obat 500 di Railway (volume permission) + Pengingat Berikutnya display-only Summary

Root-privileged Docker entrypoint chowns the Railway-mounted uploads volume before dropping to the `express` user via `su-exec`, fixing multipart upload EACCES 500s; the "Pengingat Berikutnya" beranda card had its inline confirm checkbox removed to become display-only.

## What Was Built

**1. Backend upload-permission fix (Railway production bug):**
Railway mounts the persistent `/app/uploads` volume owned by `root`, shadowing the image's build-time `chown express:nodejs`. Since the container ran as non-root `express` (uid 1001), multer could not write into the mounted directory, causing multipart `POST /api/reminders` (and other file-upload endpoints) to 500 with EACCES.

- New `backend/docker-entrypoint.sh` (POSIX `sh`, LF line endings verified): runs as root at container start, ensures `/app/uploads/lab-files` exists, `chown -R express:nodejs /app/uploads` (a no-op when already owned — e.g. the local docker-compose named volume — so this is safe everywhere), then `exec su-exec express:nodejs "$@"` to drop privileges and hand off to the original CMD.
- `backend/Dockerfile` runner stage: added `su-exec` to the `apk add` line, `COPY`+`chmod +x` the entrypoint script, removed `USER express` (container must start as root so the entrypoint can chown the root-owned mounted volume), added `ENTRYPOINT ["/app/docker-entrypoint.sh"]` above the unchanged `CMD ["node", "--import", "tsx", "src/server.ts"]`.

**2. Pengingat Berikutnya card made display-only (PO request):**
`frontend/components/beranda/PengingatBerikutnyaCard.tsx` had an inline confirm-checkbox affordance letting users confirm medication/dialysis directly from this widget. Per PO intent, confirmation should only happen from the "Obat Hari Ini" / "Cuci Darah Hari Ini" cards. Removed:
- `confirmingIds` state
- `handleConfirm` function (and its POST to `/api/medication-log/confirm` / `/api/dialysis-log/confirm`)
- Both circular confirm `<button>` elements (obat section + cuci darah section)
- Unused imports: `Check` (lucide-react), `dispatchSyncEvent` (kept `SYNC_EVENTS`, still used by the listener effect)

All fetch/refetch logic (fetchNext, sync-event listeners, focus/visibility refetch), the "Coba Lagi" retry button, and therapy filtering/rendering were left untouched.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `sh -n backend/docker-entrypoint.sh` — passes
- `file backend/docker-entrypoint.sh` — confirms LF line endings (no CRLF)
- `grep -c $'\r' backend/docker-entrypoint.sh` — 0
- `grep -q 'su-exec' backend/docker-entrypoint.sh` — present
- `grep -q 'ENTRYPOINT' backend/Dockerfile` — present
- `! grep -q '^USER express' backend/Dockerfile` — confirmed absent
- `docker compose config -q` — validates cleanly
- `grep -q 'confirmingIds\|handleConfirm\|dispatchSyncEvent' components/beranda/PengingatBerikutnyaCard.tsx` — none found
- `grep -q 'Check' components/beranda/PengingatBerikutnyaCard.tsx` — none found
- `cd frontend && npx tsc --noEmit` — clean, no errors

## Post-Deploy Manual Sanity (pending, orchestrator-owned push)

Once pushed to `main` and Railway/Vercel auto-redeploy:
- A multipart `POST /api/reminders` with `foto_obat` should return 2xx (not 500 EACCES).
- `/beranda`'s "Pengingat Berikutnya" card should render with no confirm checkbox.

## Known Stubs

None.

## Threat Flags

None — this change reduces attack surface (removes a write-capable inline action from a display widget) and fixes a container privilege-drop misconfiguration; no new endpoints, auth paths, or schema changes were introduced.

## Self-Check: PASSED

- FOUND: backend/docker-entrypoint.sh
- FOUND: backend/Dockerfile (modified)
- FOUND: frontend/components/beranda/PengingatBerikutnyaCard.tsx (modified)
- FOUND commit f564d59: fix(quick-260707-g4u): chown mounted uploads volume via root entrypoint before privilege drop
- FOUND commit 78ad21d: fix(quick-260707-g4u): make Pengingat Berikutnya card display-only
