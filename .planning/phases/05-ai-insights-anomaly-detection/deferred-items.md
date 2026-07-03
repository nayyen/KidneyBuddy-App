# Deferred Items — Phase 05

Discovered during 05-03 execution. Out of scope for this plan (pre-existing,
not caused by 05-03's changes) — logged here per the executor's scope
boundary rule rather than fixed inline.

## Pre-existing test/type failures (confirmed unrelated to 05-03)

Full-suite `npm test` run after 05-03 Task 3: 159 pass / 17 fail. All 17
failures are in suites/files 05-03 never touched:

| Suite/File | Failure | Notes |
|---|---|---|
| `activity schema validation`, `activity _createActivityCore` | test-code failures | `src/test/activity.service.test.ts` — pre-existing per `tsc --noEmit` baseline (`Expected 3-4 arguments, but got 5`) |
| `dailySummary.job.test.ts` | module not found | RED scaffold for **05-05** (not this plan) — expected to stay RED until 05-05 |
| `fluidLog _createEntryCore` | zod enum mismatch (`"minuman"` not in `["urine","capd","lainnya"]`) | `src/test/fluid.service.test.ts` — pre-existing, unrelated to `fluid.controller.ts`'s new anomaly trigger (service/schema file untouched by 05-03) |
| `lab trend queries` | test-code failure | unrelated to Phase 5 files |
| `dispatchDueReminders` | test-code failure | `src/test/reminderDispatch.test.ts` — pre-existing per `tsc --noEmit` baseline (`insertLog` vs `insertMedLog` typo in test file) |
| `_generateReportCore aggregation` (5 subtests) | `getCAPDFn is not a function` | `src/test/report.service.test.ts` — pre-existing per `tsc --noEmit` baseline (`Expected 7 arguments, but got 6`) |

Also pre-existing at the `tsc --noEmit` level (not test failures, compile-time only):
- `src/controllers/dialysisLog.controller.ts` / `medicationLog.controller.ts` — `req.params.logId` typed `string | string[]` (Express typing gap, predates 05-03; the two files were edited by 05-03 only to append the anomaly fire-and-forget trigger, not to touch the pre-existing `logId` destructuring)
- `src/test/debug_*.ts`, `src/test/profile.e2e.ts` — scratch/debug scripts with duplicate top-level declarations, unrelated to any phase

**Verification these are pre-existing, not introduced by 05-03:** confirmed via `git status --porcelain` before any 05-03 edits — none of the above files appeared in the working tree diff prior to this plan's commits (05-03 only created/modified files listed in its own `files_modified` frontmatter).

**Action:** None taken — out of 05-03's scope per the executor's scope boundary rule. Recommend a dedicated cleanup task before Milestone sign-off (or whichever plan next touches `activity.service.ts` / `report.service.ts` / `reminderDispatch.job.ts` / `fluid.service.ts`'s `sumber` enum).
