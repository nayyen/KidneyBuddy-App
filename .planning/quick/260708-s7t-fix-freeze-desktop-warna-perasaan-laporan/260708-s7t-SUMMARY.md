---
slug: 260708-s7t-fix-freeze-desktop-warna-perasaan-laporan
type: quick
completed: 2026-07-08
commits:
  - 12598de
  - 3190999
---

# Quick Task 260708-s7t: Fix Freeze Desktop "Buat Ulang Wawasan" + Warna Perasaan Laporan — Summary

**One-liner:** `scrollbar-gutter: stable` reserves permanent gutter space so LabTrendChart's recharts ResizeObserver no longer reacts to scrollbar-toggle-driven width changes (empirically confirmed to eliminate the one real reflow mechanism found, though a catastrophic freeze itself could not be reproduced under automation); `/laporan` Aktivitas table's Perasaan column now renders colored pills via a new shared `frontend/lib/perasaan.ts` helper also consumed by `/catatan`'s ActivityList.

## IMPORTANT: Execution note on the checkpoint override

This plan's Task 3 was `type="checkpoint:human-verify"`. Per explicit orchestrator instruction, that checkpoint was replaced with the strongest automated verification achievable, and the executor did **not** push to `main` (per the override's instruction — that remains the orchestrator's job) and did **not** commit `.planning/` docs artifacts. **Final on-laptop confirmation by the user (real Windows Chrome, real desktop scrollbars, the exact freeze repro) remains the one outstanding manual step** — see "What remains unverified" below.

## Task 1 — Diagnose (evidence-first) then fix the desktop-only freeze

### Diagnostic method

Since this sandbox has no GUI/real browser and no root access to install system browser dependencies (`chrome-headless-shell`/`chrome` both failed with `libnspr4.so`/`libnss3.so`/etc. "not found", and `sudo apt-get install` requires an interactive password unavailable here), live interactive verification was done via **headless Chromium running inside the official `mcr.microsoft.com/playwright` Docker image** (already present in this environment's Docker/npm cache from a prior session), attached to the same Docker network as the real `kidneybuddy-backend`/`kidneybuddy-db` containers, running the actual `next build && next start` **production build** (not dev mode — dev-mode Turbopack/HMR overhead skews main-thread timing and is not representative of what ships) against the real Groq-backed backend, logged in as the real demo user (`lukman@demo.kidneybuddy.id`).

Instrumentation (`window.ResizeObserver` wrapped to count invocations, `PerformanceObserver('longtask')` to sum blocked-main-thread time, a `requestAnimationFrame` heartbeat counter to detect main-thread unresponsiveness via slow `page.evaluate()` round-trips, and a listener for the native "ResizeObserver loop completed with undelivered notifications" warning) was injected before any app code ran.

### What was tested against the plan's 3 ranked candidates

1. **Real click-driven repro** (production build, desktop 1440×900, Lab tab open with LabTrendChart + LabAnalysisCard + WeeklyInsightCard all co-rendered as the plan specifies): clicked "Buat Ulang Wawasan" up to 4 times in a row, sampled the instrumentation every ~300ms for ~12s after each run.
   - Result: **no freeze reproduced** — heartbeat kept advancing at ~59fps throughout, zero new `longtask` entries attributable to the click, zero ResizeObserver-loop warnings, `ResizeObserver` fire count stayed flat (2, the two normal mount-time measurements).
2. **CPU throttling** (6× slower via CDP `Emulation.setCPUThrottlingRate`, simulating a weaker/busier real laptop): same real-click repro re-run under throttle — still no freeze, no runaway `ResizeObserver` count, only ~65ms of new long-task time attributable to the whole click+re-render.
3. **Zoom/DPI simulation** (`document.documentElement.style.zoom = "1.25"`, a proxy for the very common Windows-laptop 125% display scaling, which forces the non-integer CSS-px↔device-px layout rounding that is the classic trigger for Chromium `ResizeObserver` subpixel-oscillation bugs): still no freeze, `ResizeObserver` count unchanged after the click.
4. **Isolated mechanism test** (candidate #1, decoupled from the AI call entirely): forced the vertical scrollbar to toggle on/off 6-8 times by sweeping `page.setViewportSize` height across the exact content-height boundary (headless Chromium's default `--hide-scrollbars` flag was explicitly removed via `ignoreDefaultArgs` so real space-reserving scrollbar behavior was present, matching desktop Chrome — this flag would otherwise have silently masked the entire mechanism). **Result: this DID produce a measurable, repeatable effect** — `ResizeObserver` fired exactly once per forced toggle (delta `ro+=8` across 8 toggles, confirmed both at normal speed and under 6× CPU throttle), but never escalated into a runaway loop (`roLoopErr` stayed 0 throughout every test).

### Code-level evidence

- `frontend/node_modules/recharts/es6/component/ResponsiveContainer.js`'s `SizeDetectorContainer` attaches a real `ResizeObserver` to its own wrapper `<div>` (confirms LabTrendChart's chart genuinely re-measures on width change — the mechanism the plan's candidate #1 names is real). Critically, its `setContainerSize` callback **rounds the new width/height with `Math.round()` and bails out via a state-equality check** (`if (prevState.containerWidth === roundedWidth && ...) return prevState`) before ever calling `setSizes`. This is exactly the standard defensive pattern that prevents a literal infinite ResizeObserver loop from subpixel jitter — meaning recharts 3.9.9 (the version pinned in this project) already guards against the "catastrophic runaway" framing of candidate #1, which is consistent with never observing `roLoopErr > 0` in any test above.
- `frontend/app/globals.css` had no `scrollbar-gutter` declaration anywhere (grep-confirmed) and no `overflow-y: scroll` forcing a permanently-reserved gutter — so the classic desktop scrollbar's visibility genuinely toggles based on whether page content exceeds the viewport height, exactly as the plan's mechanism describes.
- `frontend/app/(app)/catatan/page.tsx`: confirmed (again, matching the plan's own pre-gathered evidence and quick-260708-qqd's prior investigation) that `WeeklyInsightCard` renders once, outside the tab-conditional blocks, with no callback prop or window event tying its local state to any parent/sibling state — ruling out candidate #3 (parent re-render cascade) as a mechanism for this specific click, by direct code inspection.
- `LabAnalysisCard`'s poll `useEffect` depends on `[accessToken, labResultId, days]`; none of these change when `WeeklyInsightCard`'s local state transitions — ruling out candidate #2 (poll-effect churn) as directly triggered by this click, by direct code inspection.
- `frontend/app/sw.ts` (service worker): confirmed its `fetch` listener explicitly passes through all `/api/*` requests uncached/unintercepted — ruled out as a contributor.
- `frontend/lib/api.ts`'s `apiFetch`/`authFetch` (already hardened by quick-260708-qqd with a 45s `AbortController` timeout) were re-read and confirmed to have no leaked timers/listeners across repeated calls (`clearTimeout` in a `finally` block on every path).

### Root cause conclusion and what was fixed

**The literal "infinite freeze" was not reproduced under automation**, including with CPU throttling and DPI/zoom simulation meant to approximate a real, busier Windows laptop. However, direct testing **did confirm a real, always-present (if bounded) causal chain**: `WeeklyInsightCard`'s height change (short "Membuat wawasan..." ↔ full narrative) can push `/catatan`'s total document height across the "does content overflow the viewport" boundary, which toggles Chrome's classic scrollbar, which changes the content column's available width, which `LabTrendChart`'s recharts `ResponsiveContainer` reacts to via `ResizeObserver` — a real reflow/re-render cost tied to a UI event (an AI text swap) that has nothing to do with chart sizing. This exactly explains the reported desktop-vs-mobile asymmetry: desktop Chrome's classic scrollbar reserves layout space and toggles; mobile browsers (and the user's Android phone) use overlay scrollbars that never do, so this reflow path structurally cannot exist there.

**Fix applied** (`frontend/app/globals.css`): added `scrollbar-gutter: stable` to `html`. This permanently reserves the scrollbar's gutter space regardless of whether content actually needs to scroll at any given moment, so the vertical scrollbar's presence/absence can never again change the content column's width — severing the toggle→reflow chain at its root, for this interaction and for the whole app.

**Before/after verification (headless Chromium, production build, isolated mechanism test):**
- **Before the fix:** forcing 8 scrollbar-toggle-crossing viewport-height changes → `ResizeObserver` fired 8 times (`delta ro+=8`), ~127-525ms of attributable long-task time depending on CPU throttle.
- **After the fix (rebuilt with the change):** the identical 8-toggle sweep → `ResizeObserver` fired **0** additional times (`delta ro+=0`), confirming the mechanism is severed.
- Real click-based repro re-run post-fix (4 consecutive "Buat Ulang Wawasan" clicks, desktop 1440×900): still no freeze, `ResizeObserver` count flat at 2, insight regenerates correctly each time, no regression.
- Mobile-viewport repro (390×844) re-run post-fix: unaffected, as expected (`scrollbar-gutter` only has visible effect where classic scrollbars exist).
- D-18 error contract untouched: `WeeklyInsightCard`'s `catch { setState("error") }` path was not modified; `apiFetch`'s 45s timeout (quick-260708-qqd) was not modified.
- "Berdasarkan data 7-30 hari terakhir" caption and the AI disclaimer text render unchanged (not touched).

### What remains unverified

A genuine catastrophic freeze exactly as the user describes it (Chrome "not responding," whole laptop slowing down) could **not** be reproduced in this sandboxed environment despite the battery of tests above (production build, real Groq backend, repeated clicks, CPU throttling, DPI/zoom simulation). The fix targets the one concrete, reproducible causal mechanism found in the codebase and directly matches the reported desktop-only/never-on-Android pattern, but **final confirmation on the user's actual Windows laptop with real Chrome** is the outstanding manual step (per the checkpoint override, this executor did not push to `main` — the orchestrator/user should verify live after deploy, watching specifically for whether the freeze recurs after this fix ships).

## Task 2 — Shared perasaan helper + colored `/laporan` Aktivitas badges

- **New file `frontend/lib/perasaan.ts`**: exports `PERASAAN_COLOR`/`PERASAAN_LABEL` (byte-identical hex values/labels extracted verbatim from `ActivityList.tsx`: nyaman `#2a9d8f`, biasa `#7a8c8a`, lelah `#ef9f27`, berat `#d4183d`) plus a small `perasaanBadgeStyle()` convenience helper.
- **`ActivityList.tsx`**: local `PERASAAN_COLOR`/`PERASAAN_LABEL` const declarations removed, now imports from `@/lib/perasaan`. Pure de-duplication — no rendering/behavior change (verified: the edit-chip tints, the completed-activity perasaan text, all still reference the same map objects, just imported instead of locally declared).
- **`AktivitasReport.tsx`**: local `PERASAAN_LABEL` removed, now imports both `PERASAAN_COLOR` and `PERASAAN_LABEL` from `@/lib/perasaan`. The "Perasaan" table cell (previously plain `#1a2e2c` text) now renders a colored pill badge (`color` = the perasaan's brand color, `backgroundColor` = that color at 12.5% alpha via the `${color}20` hex-alpha suffix pattern already used elsewhere in this codebase) matching `/catatan`'s Aktivitas tab visual treatment. Falls back to a plain "-" for `null`/missing perasaan and to the raw key for any unrecognized value (never crashes on unexpected data). Colors are inline `style` (not CSS classes), so they survive `window.print()`/PDF export unchanged — no new print CSS needed, consistent with how `LaporanPreviewContent.tsx` already shares the same DOM between screen and print.
- Grep-confirmed: no remaining local `PERASAAN_COLOR`/`PERASAAN_LABEL` `const` declarations in either component — both import exclusively from the shared helper.
- No backend change — the report endpoint already returns `perasaan` per activity row (added in quick-260708-qqd). No seed change.

## Verifikasi Keseluruhan

1. **Frontend build:** `cd frontend && npm run build` → **exit 0**, all 22 routes compiled including `/catatan`, `/laporan`, `/laporan/preview` (run twice: once after Task 1's CSS-only change, once after Task 2's changes on top — both green).
2. **Frontend tsc (touched files):** `npx tsc --noEmit` output grepped for `perasaan|ActivityList|AktivitasReport|globals.css` → **zero matches** (no errors introduced).
3. **Backend tsc baseline (regression guard only, no backend files touched):** `cd backend && npx tsc --noEmit 2>&1 | grep -c "error TS"` → **4** (unchanged baseline: `dialysisLog.controller.ts` / `medicationLog.controller.ts`, pre-existing `string | string[]` errors).
4. **Backend test suite (regression guard only):** `npx tsx --test src/test/*.test.ts` → **269/272** (unchanged baseline: 3 pre-documented container-only `labUploadTrend.test.ts` failures, no regression).
5. **Live headless-Chromium verification** (documented in full above): before/after `ResizeObserver`-fire delta measurement across a forced scrollbar-toggle sweep (`ro+=8` before → `ro+=0` after), plus repeated real-click regeneration (4×, desktop) and mobile-viewport sanity re-runs, all clean post-fix.

## Deviations from Plan

### Auto-fixed / adjusted per checkpoint override

**1. Task 3 checkpoint replaced with automated verification**
- **Reason:** Explicit orchestrator instruction — the user cannot interact mid-run.
- **What was done:** Headless-Chromium-based automated verification (see Task 1 above) substituted for human-in-the-browser verification. Did NOT push to `main`; did NOT commit `.planning/` docs artifacts (PLAN.md/SUMMARY.md/STATE.md) — those remain for the orchestrator.

**2. Root cause could not be conclusively confirmed as "the" freeze mechanism, only as "a real, present" mechanism**
- **Found during:** Task 1, after exhausting the plan's 3 ranked candidates via direct empirical testing (production build, real backend, CPU throttling, zoom simulation) with no freeze reproduced.
- **Action taken:** Applied the plan's own explicitly-recommended "smallest change that breaks the feedback loop" (`scrollbar-gutter: stable`) since it (a) is zero-risk/zero-behavior-change to anything else, (b) directly explains the desktop-vs-mobile asymmetry the user reported, and (c) was empirically proven (before/after `ResizeObserver`-fire-count measurement) to eliminate the one concrete causal chain found in the codebase. Did not invent an unverified fix for a mechanism that couldn't be demonstrated.
- **Files modified:** `frontend/app/globals.css`
- **Commit:** 12598de

No other deviations — Task 2 executed exactly as planned.

## Known Stubs

None — both fixes are fully wired; no placeholders introduced.

## Threat Flags

None — CSS-only change (Task 1) and a pure display/labeling change reading already-authorized report data (Task 2); no new endpoints, auth paths, or trust boundaries touched.

## Self-Check: PASSED

Files verified to exist:
- FOUND: frontend/app/globals.css (scrollbar-gutter: stable added)
- FOUND: frontend/lib/perasaan.ts (new)
- FOUND: frontend/components/aktivitas/ActivityList.tsx (imports shared helper)
- FOUND: frontend/components/laporan/sections/AktivitasReport.tsx (imports shared helper, colored badge)

Commits verified in git log:
- FOUND: 12598de
- FOUND: 3190999
