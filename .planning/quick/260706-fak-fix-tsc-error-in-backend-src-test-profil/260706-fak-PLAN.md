---
phase: quick/260706-fak
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/test/debug_all.ts
  - backend/src/test/debug_err.ts
  - backend/src/test/debug_hari.ts
  - backend/src/test/debug_obat.ts
  - backend/src/test/debug_obat2.ts
  - backend/src/test/debug_sql.ts
  - backend/src/test/debug_trace.ts
  - backend/src/test/profile.e2e.ts
  - .vscode/tasks.json
  - .planning/phases/05-ai-insights-anomaly-detection/deferred-items.md
  - .planning/quick/260705-9n4-fix-cross-page-bugs-notification-bell-li/deferred-items.md
autonomous: true
requirements: [QUICK-260706-fak]
must_haves:
  truths:
    - "npx tsc --noEmit in backend/ reports zero errors for backend/src/test/profile.e2e.ts"
    - "npx tsc --noEmit in backend/ reports zero errors for any debug_*.ts file (files no longer exist)"
    - "The real automated test suite (node --import tsx --test src/test/*.test.ts) still passes identically to before"
  artifacts:
    - path: "backend/src/test/"
      provides: "No leftover no-import/no-export manual debug scripts causing global-scope collisions"
  key_links:
    - from: ".vscode/tasks.json"
      to: "backend/src/test/debug_obat2.ts, backend/src/test/debug_trace.ts"
      via: "docker exec ... node --import tsx src/test/debug_obat2.ts / debug_trace.ts"
      pattern: "debug_obat2.ts|debug_trace.ts"
---

<objective>
Fix the `npx tsc --noEmit` errors in `backend/src/test/profile.e2e.ts` (and 7 sibling
files) that the user hit directly: `TS2451 Cannot redeclare block-scoped variable
'BASE'/'h'` and `TS2393 Duplicate function implementation` on `main`.

## Confirmed root cause (investigated, not assumed)

`backend/src/test/` contains 8 leftover one-off manual debugging scripts from past
investigation sessions, none of which have any `import`/`export` statement:
`debug_all.ts`, `debug_err.ts`, `debug_hari.ts`, `debug_obat.ts`, `debug_obat2.ts`,
`debug_sql.ts`, `debug_trace.ts`, `profile.e2e.ts`.

A `.ts` file with zero imports/exports is treated by TypeScript as a **global script**,
not a module — its top-level `const`/`function` declarations leak into one shared
global scope across the whole `tsc` program. Since most of these files independently
declare `const BASE = "http://localhost:4000"`, `const h = {...}`, and
`async function main() {...}`, TypeScript sees the SAME identifiers declared multiple
times across different files and reports `TS2451`/`TS2393` on every one of them.

This is NOT new — it has been flagged as a known, deferred issue in at least 5 prior
quick-task SUMMARY.md files and two `deferred-items.md` files (`phases/05-.../
deferred-items.md`, `quick/260705-9n4-.../deferred-items.md`), always noted as
"pre-existing, out of scope, unrelated to this task's changes" and never actually
cleaned up. The user has now hit it directly and asked for an immediate fix.

Confirmed NOT part of the automated suite: `backend/package.json`'s `"test"` script is
`node --import tsx --test src/test/*.test.ts` — it globs only `*.test.ts` files. None
of these 8 files match that glob (they're `.ts`, not `.test.ts`), so deleting them
changes ZERO test coverage.

Two of the 8 files are referenced as convenience one-off run shortcuts in
`.vscode/tasks.json` (`debug_obat2.ts` line ~392, `debug_trace.ts` line ~442) — these
task entries must be removed too, or they'd point at deleted files.

`verify_single_use.ts` and `debug_direct.ts` (also in `src/test/`) are NOT affected —
both already have proper `import` statements, making them real ES modules with no
scope collision. Leave them untouched.

## The fix

Delete all 8 colliding scratch files outright (they were one-off manual debug scripts
from resolved past investigations — not documentation, not reusable tooling, not
referenced by any real workflow other than the two ad-hoc VSCode tasks). Remove the
now-dangling `.vscode/tasks.json` entries for `debug_obat2.ts`/`debug_trace.ts`. Update
the two `deferred-items.md` files that explicitly listed this as a deferred item, so
the deferred list doesn't keep referencing now-resolved/deleted files.

Do NOT touch the two unrelated pre-existing tsc errors in
`dialysisLog.controller.ts`/`medicationLog.controller.ts` (`string | string[]` query
param typing) — different root cause, out of scope for this task, not what the user
reported.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@backend/src/test/profile.e2e.ts
@.vscode/tasks.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Delete the 8 no-import scratch debug scripts + clean up dangling references</name>
  <files>backend/src/test/debug_all.ts, backend/src/test/debug_err.ts, backend/src/test/debug_hari.ts, backend/src/test/debug_obat.ts, backend/src/test/debug_obat2.ts, backend/src/test/debug_sql.ts, backend/src/test/debug_trace.ts, backend/src/test/profile.e2e.ts, .vscode/tasks.json, .planning/phases/05-ai-insights-anomaly-detection/deferred-items.md, .planning/quick/260705-9n4-fix-cross-page-bugs-notification-bell-li/deferred-items.md</files>
  <action>
    1. Delete these 8 files entirely (git rm):
       - backend/src/test/debug_all.ts
       - backend/src/test/debug_err.ts
       - backend/src/test/debug_hari.ts
       - backend/src/test/debug_obat.ts
       - backend/src/test/debug_obat2.ts
       - backend/src/test/debug_sql.ts
       - backend/src/test/debug_trace.ts
       - backend/src/test/profile.e2e.ts

       Do NOT delete backend/src/test/verify_single_use.ts or
       backend/src/test/debug_direct.ts — both are real ES modules (they have
       import statements) and are not part of this collision.

    2. In .vscode/tasks.json, remove the two task entries whose "command" invokes
       `debug_obat2.ts` (around line 392) and `debug_trace.ts` (around line 442) —
       read the file first to find their exact task object boundaries (each is a
       JSON object inside the "tasks" array; remove the whole object plus its
       trailing comma correctly so the JSON stays valid). Do not touch any other
       task entries in this file.

    3. In .planning/phases/05-ai-insights-anomaly-detection/deferred-items.md,
       remove (or mark resolved) the line referencing
       "src/test/debug_*.ts, src/test/profile.e2e.ts — scratch/debug scripts with
       duplicate top-level declarations, unrelated to any phase" — these files no
       longer exist, so the deferred item is resolved. Use whatever removal style
       matches the rest of that file (if other resolved items are struck through
       or removed entirely, follow that convention; if unsure, just delete the
       line).

    4. In .planning/quick/260705-9n4-fix-cross-page-bugs-notification-bell-li/
       deferred-items.md, remove or mark resolved the entry listing
       "src/test/debug_obat.ts, src/test/debug_obat2.ts, src/test/debug_sql.ts,
       src/test/debug_trace.ts, src/test/debug_hari.ts, src/test/profile.e2e.ts"
       for the same reason (files deleted, deferred item resolved).
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit 2>&1 | grep -c "debug_\|profile.e2e" ; echo "---full tsc---" ; npx tsc --noEmit ; echo "---jsonvalid---" ; node -e "JSON.parse(require('fs').readFileSync('../.vscode/tasks.json','utf8'))" && echo "tasks.json valid JSON" ; echo "---test suite---" ; node --import tsx --test src/test/*.test.ts 2>&1 | tail -15</automated>
  </verify>
  <done>The 8 colliding scratch files are deleted. `npx tsc --noEmit` reports zero errors mentioning `debug_` or `profile.e2e` (the only remaining errors, if any, are the pre-existing unrelated `dialysisLog.controller.ts`/`medicationLog.controller.ts` string[] typing issues — do not fix those, out of scope). `.vscode/tasks.json` is still valid JSON with the two dangling task entries removed. The real automated suite (`node --import tsx --test src/test/*.test.ts`) passes with the same pass/fail counts as before (no regression — these files were never part of it). Both `deferred-items.md` files no longer list the now-deleted debug scripts as outstanding.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` in `backend/` shows zero errors for any deleted file.
- `.vscode/tasks.json` remains valid JSON, with the 2 dangling debug-script task entries removed.
- `node --import tsx --test src/test/*.test.ts` passes identically to the pre-change baseline.
- Both `deferred-items.md` files updated to reflect the resolved item.
</verification>

<success_criteria>
- The exact error the user hit (`profile.e2e.ts` BASE/h/main redeclaration) is gone.
- No new tsc errors introduced; the two unrelated pre-existing controller errors remain untouched (explicitly out of scope).
- No loss of real test coverage (`*.test.ts` files untouched).
</success_criteria>

<output>
Create `.planning/quick/260706-fak-fix-tsc-error-in-backend-src-test-profil/260706-fak-SUMMARY.md` when done.
</output>