---
phase: quick-260708-ayj
plan: 01
subsystem: frontend
tags: [pwa, icons, lab, bugfix]
requirements: [QUICK-260708-AYJ]
dependency-graph:
  requires: []
  provides: ["fixed lab file open URL", "branded PWA/push icons"]
  affects: ["frontend/components/lab/LabResultList.tsx", "PWA install/push notification icon rendering"]
tech-stack:
  added: []
  patterns: ["sharp-based SVG-to-PNG icon generation (one-off script, not committed)"]
key-files:
  created:
    - frontend/app/apple-icon.png
    - frontend/app/icon.png
  modified:
    - frontend/components/lab/LabResultList.tsx
    - frontend/public/icons/icon-192.png
    - frontend/public/icons/icon-512.png
    - frontend/public/icons/icon-512-maskable.png
    - frontend/public/icons/badge-72.png
  deleted:
    - frontend/public/manifest.json
decisions:
  - "Rendered droplets glyph as SVG at target size per icon (not upscaled from a small raster) so stroke width stays crisp even at 72px badge size."
  - "Badge icon rendered with transparent background (no bg rect) per Android's monochrome notification-badge alpha-mask convention; icon/apple-icon variants keep the solid teal #2a9d8f background per PWA install icon convention."
metrics:
  duration: ~20min
  completed: 2026-07-08
---

# Phase quick-260708-ayj Plan 01: Fix lab file link + branded PWA/push icons Summary

Fixed the hardcoded `localhost:4000` lab-file-open URL (broken in production for every user) and replaced the placeholder solid-teal PWA/push icons with the droplets brand mark, generated programmatically via sharp from the lucide "droplets" SVG paths.

## What Was Done

**Task 1 — Fix hardcoded lab-file URL:** `LabResultList.tsx`'s `openFile` callback built the file-open URL from a literal `http://localhost:4000/api/lab/file/...` instead of the existing `API_BASE` constant (`process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"`, already used everywhere else in the file). Changed the one line to use `${API_BASE}` — production users clicking a lab file now hit the real deployed API origin instead of an unreachable localhost address.

**Task 2 — Regenerate branded icons:** Wrote a temporary Node/sharp script (run with cwd=`frontend`, `.cjs` extension since the frontend package is ESM) that composes an SVG per output size using the lucide "droplets" icon's two paths on its native 24×24 viewBox, then rasterizes each via `sharp(...).png().toFile(...)`:
- `public/icons/icon-192.png` / `icon-512.png` — teal `#2a9d8f` background, white strokes, droplet ~58% of canvas.
- `public/icons/icon-512-maskable.png` — same colors, droplet ~45% of canvas (respecting the maskable safe zone).
- `public/icons/badge-72.png` — white strokes on a **transparent** background (Android renders push-notification badges as a monochrome alpha mask, so background color doesn't matter here — only the alpha shape does; visually confirmed by compositing over black).
- `frontend/app/apple-icon.png` (180×180) and `frontend/app/icon.png` (192×192) — new files using Next.js's file-convention icons (auto-emits `apple-touch-icon` link + favicon), same teal/white design as `icon-192`.

Each SVG was rendered directly at its target canvas size (not upscaled from a small raster), so stroke width stays sharp even on the 72px badge. The generator script was written to the scratchpad, copied into `frontend/` only for the run (Node's CJS `require` resolves relative to the script's own location, not `cwd`), then deleted immediately after — it is not part of the repo.

`app/manifest.ts` and `app/sw.ts` already referenced these exact file paths (verified by reading both before Task 2), so no code changes were needed there.

**Task 3 — Remove stale manifest.json + verify:** Deleted `frontend/public/manifest.json` (a stale duplicate manifest — old `start_url: "/"`, only 2 icons listed — grep-confirmed zero code references to the string `"manifest.json"` anywhere in frontend source). The live PWA manifest is served via `app/manifest.ts` at `/manifest.webmanifest`. Ran `npx tsc --noEmit`, which passed with no errors.

## Verification

- `grep` confirms no `localhost:4000/api/lab/file` literal remains in `LabResultList.tsx`; the line now reads `` `${API_BASE}/api/lab/file/${fileId}?token=...` ``.
- All six icon PNGs verified via `sharp(...).metadata()`: icon-192 (192×192), icon-512 (512×512), icon-512-maskable (512×512), badge-72 (72×72, `hasAlpha=true`), apple-icon (180×180), icon.png (192×192) — all correct dimensions.
- Visually inspected `icon-192.png`, `icon-512-maskable.png`, and `apple-icon.png` (droplets glyph on teal background) and `badge-72.png` composited over black (confirms the alpha-masked droplet shape renders correctly, not a blank/solid square).
- `public/manifest.json` confirmed deleted (`test ! -f` passes).
- `npx tsc --noEmit` passes cleanly (no errors) after all three tasks.
- Only the task-related files were staged per commit (never `git add -A`); unrelated pre-existing dirty files (`.claude/settings.local.json`, `260706-arp-*` files, `frontend/next-env.d.ts`, `frontend/tsconfig.tsbuildinfo`) were left untouched throughout.

## Deviations from Plan

None — plan executed exactly as written. The verify command in the plan for Task 1 (`grep -q '\${API_BASE}/api/lab/file/'`, using BRE) reported a false negative locally because `$` inside a basic-regex grep pattern combined with the shell's handling of the literal `${...}` substring didn't match as expected; `grep -F` (fixed string) on the same pattern confirmed the line is present and correct. This is a verify-command syntax quirk, not a code issue — no fix needed to the actual source file.

## Known Stubs

None. All icon files are final, non-placeholder assets.

## Self-Check: PASSED

- FOUND: frontend/app/apple-icon.png
- FOUND: frontend/app/icon.png
- FOUND: frontend/public/icons/badge-72.png
- CONFIRMED DELETED: frontend/public/manifest.json
- FOUND commit: 5955cd2 (Task 1)
- FOUND commit: 10f8742 (Task 2)
- FOUND commit: 8b39c66 (Task 3)
