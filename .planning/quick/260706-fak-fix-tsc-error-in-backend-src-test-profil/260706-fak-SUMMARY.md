---
phase: quick/260706-fak
plan: 01
subsystem: backend/test-infra
tags: [tsc, cleanup, tech-debt]
dependency-graph:
  requires: []
  provides: ["backend/src/test/ free of no-import global-scope collisions"]
  affects: ["backend tsc --noEmit output", ".vscode/tasks.json"]
tech-stack:
  added: []
  patterns: ["one-off debug scripts must have at least one import/export to avoid becoming global-scope scripts under tsc"]
key-files:
  created: []
  modified:
    - .vscode/tasks.json
    - .planning/phases/05-ai-insights-anomaly-detection/deferred-items.md
    - .planning/quick/260705-9n4-fix-cross-page-bugs-notification-bell-li/deferred-items.md
  deleted:
    - backend/src/test/debug_all.ts
    - backend/src/test/debug_err.ts
    - backend/src/test/debug_hari.ts
    - backend/src/test/debug_obat.ts
    - backend/src/test/debug_obat2.ts
    - backend/src/test/debug_sql.ts
    - backend/src/test/debug_trace.ts
    - backend/src/test/profile.e2e.ts
decisions:
  - "Deleted all 8 colliding scratch files outright rather than adding import/export statements to neutralize the collision — they were resolved one-off debugging sessions with no ongoing value, not reusable tooling."
metrics:
  duration: "~15min"
  completed: "2026-07-06"
---

# Quick Task 260706-fak: Delete colliding no-import scratch debug scripts Summary

Deleted 8 leftover one-off manual debug scripts in `backend/src/test/` that had zero `import`/`export` statements, causing TypeScript to treat them as one shared global scope and report `TS2451`/`TS2393` redeclaration errors on `BASE`/`h`/`main` across files — the exact error the user hit directly in `profile.e2e.ts`.

## What Was Done

**Task 1: Delete the 8 no-import scratch debug scripts + clean up dangling references**

- Deleted via `git rm`: `debug_all.ts`, `debug_err.ts`, `debug_hari.ts`, `debug_obat.ts`, `debug_obat2.ts`, `debug_sql.ts`, `debug_trace.ts`, `profile.e2e.ts` (all in `backend/src/test/`)
- Left untouched: `verify_single_use.ts`, `debug_direct.ts` — both are real ES modules (have `import` statements), not part of the collision
- Cleaned up `.vscode/tasks.json` to remove now-dangling task entries pointing at the deleted files (see Deviations — scope was larger than planned)
- Updated `.planning/phases/05-ai-insights-anomaly-detection/deferred-items.md` and `.planning/quick/260705-9n4-fix-cross-page-bugs-notification-bell-li/deferred-items.md` to mark this long-standing deferred item as resolved

**Confirmed root cause:** these files had no imports/exports, so TypeScript's compiler treated each as a global script rather than a module — their top-level `const`/`function` declarations (mostly `const BASE = "http://localhost:4000"`, `const h = {...}`, `async function main()`) leaked into one shared scope across the whole `tsc` program, since multiple files declared the same identifiers. This had been flagged as a known, deferred issue in at least 5 prior quick-task SUMMARY.md files and two `deferred-items.md` files, and was never actually cleaned up until now.

**Confirmed zero test coverage impact:** `backend/package.json`'s `"test"` script is `node --import tsx --test src/test/*.test.ts` — it globs only `*.test.ts` files. None of the 8 deleted files matched that glob.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `.vscode/tasks.json` had 13 dangling entries, not 2**

- **Found during:** Task 1, step 2 (editing `.vscode/tasks.json`)
- **Issue:** The plan's action instructions said to remove "the two task entries" referencing `debug_obat2.ts` (around line 392) and `debug_trace.ts` (around line 442). A full `grep` across the file for all 8 deleted filenames found **13 task entries** referencing them: `e2e-test` (profile.e2e.ts), `run-debug-obat` (debug_obat.ts), `run-debug-obat2`/`verify-obat-fix`/`verify-obat-v3`/`final-test-obat`/`test-obat-after-wait` (all debug_obat2.ts, 5 entries), `run-debug-sql` (debug_sql.ts), `debug-hari-aktif` (debug_hari.ts), `debug-all` (debug_all.ts), `debug-trace`/`final-verify-obat`/`verify-after-wait` (all debug_trace.ts, 3 entries). The plan's own objective text explicitly states the intent — "these task entries must be removed too, or they'd point at deleted files" — so leaving 11 of the 13 dangling entries in place would have directly contradicted the plan's own stated goal, even though its literal instruction undercounted the entries.
- **Fix:** Removed all 13 task entries whose `command` referenced any of the 8 deleted filenames, using a Python `json.load`/filter/`json.dump` round-trip (the `Edit` tool's multi-line string matching was unexpectedly failing to match these blocks despite byte-identical content — single-line edits worked fine, so the script approach was used for the multi-line object removals instead). Entries referencing `verify_single_use.ts` and `debug_direct.ts` (not deleted files) were explicitly preserved.
- **Files modified:** `.vscode/tasks.json`
- **Commit:** `1a32437`

### No other deviations

Everything else executed exactly as planned.

## Verification

Ran the plan's exact verify command from `backend/`:

```
npx tsc --noEmit 2>&1 | grep -c "debug_\|profile.e2e"   -> 0
npx tsc --noEmit                                         -> only the 2 pre-existing, explicitly out-of-scope
                                                             dialysisLog.controller.ts / medicationLog.controller.ts
                                                             `string | string[]` errors (4 error lines, 2 files) remain
node -e "JSON.parse(...tasks.json...)"                   -> "tasks.json valid JSON"
node --import tsx --test src/test/*.test.ts              -> 255 pass / 3 fail (255/258)
```

The 3 remaining test failures are all in `lab trend queries` (`getTrendData`), the same pre-documented container-only DB test failures noted in prior SUMMARY.md entries (e.g. 260704-uyb, 260706-8zc, 260706-epn: "3 remaining failures are the documented container-only DB tests, not run from host") — no regression introduced by this task.

## Self-Check: PASSED

- FOUND: backend/src/test/debug_all.ts — deleted (confirmed absent)
- FOUND: backend/src/test/debug_err.ts — deleted (confirmed absent)
- FOUND: backend/src/test/debug_hari.ts — deleted (confirmed absent)
- FOUND: backend/src/test/debug_obat.ts — deleted (confirmed absent)
- FOUND: backend/src/test/debug_obat2.ts — deleted (confirmed absent)
- FOUND: backend/src/test/debug_sql.ts — deleted (confirmed absent)
- FOUND: backend/src/test/debug_trace.ts — deleted (confirmed absent)
- FOUND: backend/src/test/profile.e2e.ts — deleted (confirmed absent)
- FOUND: backend/src/test/verify_single_use.ts — still present (correct, untouched)
- FOUND: backend/src/test/debug_direct.ts — still present (correct, untouched)
- FOUND: commit 1a32437 in git log
