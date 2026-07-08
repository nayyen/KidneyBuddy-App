---
quick_id: 260708-uqf
description: Fix freeze desktop "Buat (Ulang) Wawasan" — giant DOM di /catatan (default Semua data render semua entri sepanjang masa)
date: 2026-07-08
type: quick
status: planned
---

# Plan: Fix freeze Chrome desktop via pembatasan DOM /catatan

## Root cause (CONFIRMED with production evidence — do not re-diagnose)

Instrumented Playwright run against production (lukman@demo, viewport 1536×695, dsf 1.25):

- Tab Cairan (default): `document.documentElement.scrollHeight = 139,415 px`. Tab Lab: 4,250 px (normal).
- Initial load long tasks on a FAST server CPU: 1,640 ms + 662 ms (rAF gap 2,283 ms). Each regenerate click: 66–108 ms tasks even on fast hardware.
- Cause chain: `FluidLogList.tsx` defaults `range = "Semua data"` → `days=3650` → fetches and renders EVERY fluid entry ever as complex card DOM (demo: months × many entries/day ≈ 1000+ cards). `WeeklyInsightCard` sits ABOVE this list; every state change of the card (klik → "Membuat wawasan..." → hasil, each changes card height) shifts and relayouts/repaints the entire 139k-px document. On a modest Windows laptop (limited RAM/iGPU, classic scrollbars, wide glyph runs) this pegs the renderer for seconds-to-minutes and balloons raster memory → "Chrome not responding", whole laptop slows. Android phone GPUs/viewports tolerate it → "aman di HP".
- `ActivityList.tsx` (tab Aktivitas) has the same unbounded `"Semua data"` default → same giant-DOM risk.
- Two previous fixes (backend query bound + client timeout; `scrollbar-gutter`) were real hardenings but not this mechanism — do NOT revert them.

## Fix strategy: bound the RENDERED DOM, not the feature

Keep the "Semua data" dropdown option and all existing behavior; cap how much is *rendered at once* and let offscreen groups skip layout/paint.

### Task 1 — FluidLogList.tsx progressive disclosure + content-visibility

File: `frontend/components/catatan/FluidLogList.tsx`

1. Add `const INITIAL_DAY_GROUPS = 14;` and `const LOAD_MORE_STEP = 30;`
2. Add state `const [visibleGroups, setVisibleGroups] = useState(INITIAL_DAY_GROUPS);` — reset back to `INITIAL_DAY_GROUPS` whenever `range` changes or a refetch happens (inside fetchEntries success path).
3. Where `sortedDates.map(...)` renders day groups (newest first), render only `sortedDates.slice(0, visibleGroups)`.
4. After the last rendered group, if `sortedDates.length > visibleGroups`, render a full-width secondary button (design system: rounded-full, border teal, bg transparent, text #2a9d8f, font-sans 12–13px — mirror "Buat Ulang Wawasan" button style) labeled `Tampilkan {N} hari sebelumnya` where N = `Math.min(LOAD_MORE_STEP, sortedDates.length - visibleGroups)`; onClick `setVisibleGroups(v => v + LOAD_MORE_STEP)`.
5. On each day-group wrapper div add style `contentVisibility: "auto", containIntrinsicSize: "auto 320px"` so offscreen groups skip layout/paint entirely (Chrome 85+; harmless no-op elsewhere). Keep the daily-selisih header (fix qqd #2) intact — it must still show for every rendered group.

### Task 2 — ActivityList.tsx same treatment

File: `frontend/components/aktivitas/ActivityList.tsx`

Same pattern as Task 1 (INITIAL_DAY_GROUPS/LOAD_MORE_STEP/visibleGroups/slice/load-more button/content-visibility on group wrappers), adapted to however this list groups its items (per-day groups; if it renders a flat list, cap by item count 100 + step 200 instead). Duration display (fix qqd #4) stays intact.

### Task 3 — Verify

1. `cd frontend && npm run build` (timeout 600000 — WSL /mnt/c slow) → must pass.
2. Grep sanity: `content-visibility`/`contentVisibility` present in both lists; "Tampilkan" button logic present.
3. Do NOT touch backend. tsc/test baselines therefore unchanged (backend tsc: 4 pre-existing errors; tests 269/272).
4. State in SUMMARY the expected outcome: docHeight on tab Cairan drops from ~139k px to a bounded height (~a few thousand px for 14 groups); orchestrator will re-run the instrumented prod check after deploy.

## Commits

- Task 1+2 may be one commit or two: `fix(quick-260708-uqf): batasi DOM /catatan (progressive disclosure + content-visibility) — fix freeze Buat Wawasan desktop`
- NO Co-Authored-By. NEVER `git add -A` (unrelated dirty files present) — stage explicit paths only.

## must_haves

- Tab Cairan initially renders at most 14 day-groups regardless of range selection; "Tampilkan N hari sebelumnya" reveals more.
- "Semua data" option still exists and works.
- Daily selisih header + activity duration display (qqd fixes) unchanged.
- Frontend build passes; backend untouched.
