---
phase: quick
plan: 260704-uyb
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/test/activity.service.test.ts
  - backend/src/test/fluid.service.test.ts
  - backend/src/test/reminderDispatch.test.ts
  - backend/src/test/labUploadTrend.test.ts
autonomous: true
requirements: [MAINT-TESTS]
must_haves:
  truths:
    - "activity.service.test.ts passes against the current estimasiMenit-based service contract"
    - "fluid.service.test.ts passes with a valid sumber enum value"
    - "reminderDispatch.test.ts makeDeps satisfies the current DispatchDeps type"
    - "labUploadTrend.test.ts documents its Docker-Postgres run requirement"
  artifacts:
    - path: "backend/src/test/activity.service.test.ts"
      provides: "Activity service unit tests aligned with estimasiMenit schema + 4-arg core signature"
    - path: "backend/src/test/fluid.service.test.ts"
      provides: "Fluid service unit tests with valid sumber fixture"
    - path: "backend/src/test/reminderDispatch.test.ts"
      provides: "Dispatch tests with insertMedLog/insertDialysisLog mocks"
    - path: "backend/src/test/labUploadTrend.test.ts"
      provides: "Lab upload/trend tests with Docker run-instructions header"
  key_links:
    - from: "backend/src/test/activity.service.test.ts"
      to: "backend/src/services/activities.service.ts"
      via: "createActivitySchema + _createActivityCore signature"
      pattern: "_createActivityCore\\(USER_ID"
    - from: "backend/src/test/reminderDispatch.test.ts"
      to: "backend/src/jobs/reminderDispatch.job.ts"
      via: "DispatchDeps type"
      pattern: "insertMedLog"
---

<objective>
Fix 4 stale backend test fixtures found during the v1.0 milestone audit. Each test file drifted from its production module after refactors. This plan re-aligns the tests with current production behavior — production is the source of truth; no production code changes.

Purpose: Restore a green backend test suite so future audits surface real regressions, not stale-fixture noise.
Output: 3 test files corrected to match current service/job contracts + 1 test file annotated with its Docker run requirement.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@backend/src/test/activity.service.test.ts
@backend/src/services/activities.service.ts
@backend/src/test/fluid.service.test.ts
@backend/src/services/fluid.service.ts
@backend/src/test/reminderDispatch.test.ts
@backend/src/jobs/reminderDispatch.job.ts
@backend/src/test/labUploadTrend.test.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Align activity.service.test.ts with the estimasiMenit contract</name>
  <files>backend/src/test/activity.service.test.ts</files>
  <action>
The test was written against an OLD activity schema (HH:mm `estimasiSelesai`) and an OLD 5-arg core signature. Current production (`activities.service.ts`) uses `estimasiMenit` (a `z.coerce.number().int().positive()`) and the core signature `_createActivityCore(userId, rawPayload, insertFn, waktuMulai?)` — only 4 params, NO `encrypt`/`decrypt` args, and NO past-time rejection (duration is always future for positive minutes). Update every stale test in the file:

1. Schema `describe("activity schema validation")` block: replace all `estimasiSelesai` fixtures with `estimasiMenit`.
   - "empty namaKegiatan is rejected" → payload `{ namaKegiatan: "", estimasiMenit: 30 }`, still expects `success === false`.
   - Rename/repurpose "invalid estimasiSelesai format is rejected" → "non-positive estimasiMenit is rejected": payload `{ namaKegiatan: "Jalan pagi", estimasiMenit: 0 }`, expects `success === false` (fails the `.positive()` check).
   - Rename "missing estimasiSelesai is rejected" → "missing estimasiMenit is rejected": payload `{ namaKegiatan: "Jalan pagi" }`, expects `success === false`.
   - "valid payload passes schema" → payload `{ namaKegiatan: "Jalan pagi", estimasiMenit: 30 }`, expects `success === true`.

2. `describe("activity _createActivityCore")` block:
   - "valid payload returns berlangsung status and future estimasiSelesai": call `_createActivityCore(USER_ID, { namaKegiatan: "Jalan pagi", estimasiMenit: 60 }, store.insertActivity)`. Remove the `encrypt, decrypt` arguments. Keep assertions: `result.status === "berlangsung"`, `result.estimasiSelesai instanceof Date`, `result.estimasiSelesai > new Date()`, `result.namaKegiatan === "Jalan pagi"`.
   - The current core has NO past-time rejection, so the "past estimasiSelesai is rejected" test is obsolete. Repurpose it to "negative estimasiMenit is rejected before insert": `await assert.rejects(() => _createActivityCore(USER_ID, { namaKegiatan: "Jalan pagi", estimasiMenit: -5 }, store.insertActivity))` (the schema `.parse` throws a ZodError). Drop the old `err.message.includes("Estimasi waktu tidak boleh di masa lalu")` assertion.

3. The `describe("activity _completeActivityCore")` block already matches the current `_completeActivityCore(userId, id, rawPayload, completeFn, encryptFn)` signature — leave it unchanged.

4. Remove the now-unused `encrypt`/`decrypt` from the `_createActivityCore` calls only. Keep the top-of-file `import { encrypt, decrypt }` because `_completeActivityCore` tests still use both.

Do not touch `activities.service.ts` — production is correct; the test is stale.
  </action>
  <verify>
    <automated>docker exec kidneybuddy-backend node --import tsx --test src/test/activity.service.test.ts</automated>
  </verify>
  <done>All tests in activity.service.test.ts pass; no references to `estimasiSelesai` as an input payload field remain; `_createActivityCore` is called with 3 args.</done>
</task>

<task type="auto">
  <name>Task 2: Fix invalid sumber enum fixture in fluid.service.test.ts + missing DispatchDeps mocks in reminderDispatch.test.ts</name>
  <files>backend/src/test/fluid.service.test.ts, backend/src/test/reminderDispatch.test.ts</files>
  <action>
Two independent, small fixture fixes:

A. fluid.service.test.ts — In the `_createEntryCore` test "returns entry with correct tipe, volume, tanggal, satuan" (around line 175), the payload uses `sumber: "minuman"`, but production `createFluidSchema` (`fluid.service.ts`) only allows the enum `["urine", "capd", "lainnya"]`, so `createFluidSchema.parse` throws before insert. Change `sumber: "minuman"` to `sumber: "lainnya"` (a generic drink entry for a `tipe: "masuk"` row). This is the only invalid `sumber` fixture in the file (all other rows use `sumber: null`). Do not change `fluid.service.ts`.

B. reminderDispatch.test.ts — The `makeDeps()` helper returns a mock with an `insertLog` field, but the current `DispatchDeps` type (`reminderDispatch.job.ts`) requires `insertMedLog` AND `insertDialysisLog` (the `insertLog` name no longer exists — this causes `deps.insertMedLog is not a function`). In `makeDeps()`, replace the single `insertLog` mock with two mocks, both pushing to the shared `insertedLogs` array so existing assertions on `deps.insertedLogs` keep working:
  - `insertMedLog: async (data) => { insertedLogs.push(data); return data; }`
  - `insertDialysisLog: async (data) => { insertedLogs.push(data); return data; }`
BASE_REMINDER has `jenis: "obat"`, so the med-log path runs and `log.namaObat === "Amlodipine"` assertions stay valid. Do not change `reminderDispatch.job.ts`.
  </action>
  <verify>
    <automated>docker exec kidneybuddy-backend sh -c "node --import tsx --test src/test/fluid.service.test.ts && node --import tsx --test src/test/reminderDispatch.test.ts"</automated>
  </verify>
  <done>fluid.service.test.ts and reminderDispatch.test.ts both pass; `makeDeps()` exposes `insertMedLog` and `insertDialysisLog`; no `sumber: "minuman"` remains.</done>
</task>

<task type="auto">
  <name>Task 3: Document Docker-Postgres run requirement in labUploadTrend.test.ts</name>
  <files>backend/src/test/labUploadTrend.test.ts</files>
  <action>
This test exercises `getTrendData`/`createUploadEntry`, which hit the real Postgres. It passes 4/4 inside the backend container but fails from the host (no network route to the Dockerized DB) — this is an environment issue, NOT a code defect. No code fix. Update the top-of-file docblock so future contributors do not mistake host failures for real regressions:
  - Add a line under the existing "Run:" comment stating this test REQUIRES a live Postgres connection (the Dockerized DB), so it must be run inside the backend container, not from the host.
  - Replace/augment the `Run:` command with the correct invocation: `docker exec kidneybuddy-backend node --import tsx --test src/test/labUploadTrend.test.ts`.
  - Add a short note: "Running from the host will fail with a DB connection error even though the code is correct."
Change only the header comment block — do not modify any test logic.
  </action>
  <verify>
    <automated>docker exec kidneybuddy-backend node --import tsx --test src/test/labUploadTrend.test.ts</automated>
  </verify>
  <done>labUploadTrend.test.ts header documents the Docker-Postgres requirement and correct `docker exec` run command; test passes 4/4 inside the container; no test logic changed.</done>
</task>

</tasks>

<threat_model>
No new trust boundaries. All changes are test-only fixture corrections and documentation; no production code, auth, encryption, or input-validation paths are modified. No STRIDE-relevant surface introduced. No package installs.
</threat_model>

<verification>
Run the full backend suite inside the container and confirm all four previously-stale files pass:
`docker exec kidneybuddy-backend node --import tsx --test src/test/activity.service.test.ts src/test/fluid.service.test.ts src/test/reminderDispatch.test.ts src/test/labUploadTrend.test.ts`
</verification>

<success_criteria>
- activity.service.test.ts, fluid.service.test.ts, reminderDispatch.test.ts, labUploadTrend.test.ts all pass when run inside the backend container.
- No production source files (`activities.service.ts`, `fluid.service.ts`, `reminderDispatch.job.ts`, `labResult.service.ts`) were modified.
- labUploadTrend.test.ts documents its Docker-Postgres run requirement.
</success_criteria>

<output>
Create `.planning/quick/260704-uyb-fix-4-stale-backend-test-fixtures-found-/260704-uyb-SUMMARY.md` when done.
</output>
