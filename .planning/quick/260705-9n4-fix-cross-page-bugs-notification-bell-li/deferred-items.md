# Deferred Items — quick-260705-9n4

Pre-existing issues discovered during execution that are OUT OF SCOPE for this
quick task (not caused by any of its 11 tasks) per the executor's scope
boundary rule. Logged here rather than fixed.

## 1. `npm run build` (tsc) fails on pre-existing debug/one-off scripts

Files: `src/test/debug_obat.ts`, `src/test/debug_obat2.ts`, `src/test/debug_sql.ts`,
`src/test/debug_trace.ts`, `src/test/debug_hari.ts`, `src/test/profile.e2e.ts`

These are ad-hoc debug scripts (not `*.test.ts`, not run by `npm test`) that
redeclare block-scoped variables across files (tsc treats all files under
`src/` as part of one compilation unit) and have implicit-`any` errors.
Confirmed present before this quick task's first commit (verified via
`git stash` + `npm run build` against the pre-task HEAD). Not part of any of
the 11 planned tasks' file lists.

## 2. `req.params` type error in medicationLog.controller.ts / dialysisLog.controller.ts

```
src/controllers/dialysisLog.controller.ts(46,71): error TS2345: Argument of type
'string | string[]' is not assignable to parameter of type 'string'.
src/controllers/medicationLog.controller.ts(47,73): error TS2345: ...
```

`confirmById`/`unconfirmById` pass `req.params.logId` (typed `string | string[]`
under the current Express types config) directly into the service functions
which expect `string`. Confirmed present before this quick task's first commit.
Not in Task 1's assigned file list (only the two `*Log.service.ts` files were
assigned). A real fix belongs in a follow-up task/PR that also addresses item 3.

## 3. ~~`activities.service.ts` call-site argument-count mismatch~~ — RESOLVED in Task 8

```
src/services/activities.service.ts(240,5): error TS2554: Expected 3-4 arguments, but got 5.
```

Confirmed present before this quick task's first commit. Task 8 (Mulai
Kegiatan estimasiSelesai rework) rewrote `_createActivityCore`'s signature
to accept a `deps` object (`{ waktuMulai?, timezone? }`) instead of
positional args, and fixed `createEntry`'s call site to match — the extra
`realEncrypt, realDecrypt` arguments it was incorrectly passing (which
`_createActivityCore` never accepted; encryption only applies to
`completeActivity`) are gone. No longer present as of Task 8's commit.

All three items were re-verified as pre-existing via:
```bash
git stash && npm run build 2>&1 | tail -40 && git stash pop
```
run at the start of Task 2, before Task 2's own edits were applied.
