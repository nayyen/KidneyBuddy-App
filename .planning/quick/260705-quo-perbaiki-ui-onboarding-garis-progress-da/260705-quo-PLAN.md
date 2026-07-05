---
phase: quick-260705-quo
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/app/(app)/onboarding/_components/StepProgress.tsx
  - backend/src/services/onboarding.service.ts
  - backend/src/controllers/onboarding.controller.ts
  - backend/src/routes/onboarding.routes.ts
  - frontend/app/(app)/onboarding/_components/FirstReminderStep.tsx
  - frontend/app/(app)/onboarding/page.tsx
autonomous: true
requirements: [QUICK-260705-quo]
must_haves:
  truths:
    - "Each step circle sits exactly centered above its own label for all 3 steps"
    - "Step 3 label reads 'Selesai' (not 'Langkah 3')"
    - "The 'Jenis' field is the first field in the Atur Pengingat Pertama form"
    - "Jenis options are constrained by the therapy chosen in step 1 (CAPD → Obat+Exchange CAPD; HD → Obat+Jadwal HD; Transplantasi → Obat only)"
    - "After choosing a jenis, the fields shown are the identical per-jenis reminder form used on /pengingat"
    - "Completing the reuse form marks onboarding complete with reminderConfigured true (no re-entry loop on next visit)"
  artifacts:
    - path: "frontend/app/(app)/onboarding/_components/StepProgress.tsx"
      provides: "Aligned stepper with per-column circle+label and 'Selesai' label"
    - path: "frontend/app/(app)/onboarding/_components/FirstReminderStep.tsx"
      provides: "Therapy-constrained Jenis selector at top + reuse of /pengingat per-jenis forms"
    - path: "backend/src/services/onboarding.service.ts"
      provides: "completeReminderStep — marks onboarding complete without inserting a duplicate reminder"
  key_links:
    - from: "frontend/app/(app)/onboarding/_components/FirstReminderStep.tsx"
      to: "frontend/components/pengingat/MedicationReminderForm.tsx"
      via: "direct import + render per selected jenis"
      pattern: "MedicationReminderForm|CAPDReminderForm|HDReminderForm"
    - from: "frontend/app/(app)/onboarding/page.tsx"
      to: "/api/onboarding/complete-reminder"
      via: "authFetch POST after per-jenis form onSuccess"
      pattern: "complete-reminder"
---

<objective>
Two onboarding UI fixes for KidneyBuddy:

1. Fix the step-progress indicator so every numbered circle is centered exactly above its own text label (currently steps 2 and 3 circles drift left of their labels), and rename the step-3 label from "Langkah 3" to "Selesai".

2. Reorganize the "Atur Pengingat Pertama" onboarding form so the "Jenis" field is first, its options are constrained by the therapy method chosen in step 1, and — once a jenis is chosen — the form below renders the IDENTICAL per-jenis reminder form already used on /pengingat (by importing the real components, never reimplementing them), so the two can never drift out of sync.

Purpose: Correct a visible alignment bug and eliminate a nonsensical therapy/jenis mismatch (e.g. a CAPD patient picking "Jadwal HD"), while guaranteeing the onboarding reminder form always matches the canonical /pengingat form.
Output: Updated StepProgress, FirstReminderStep, onboarding page, plus a lightweight backend endpoint that marks the reminder step complete without inserting a duplicate reminder.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md

# Onboarding (target of the fix)
@frontend/app/(app)/onboarding/page.tsx
@frontend/app/(app)/onboarding/_components/StepProgress.tsx
@frontend/app/(app)/onboarding/_components/FirstReminderStep.tsx
@frontend/lib/validators/onboarding.schema.ts

# Canonical per-jenis reminder forms to REUSE (do not reimplement)
@frontend/components/pengingat/AddReminderSheet.tsx
@frontend/components/pengingat/MedicationReminderForm.tsx
@frontend/components/pengingat/CAPDReminderForm.tsx
@frontend/components/pengingat/HDReminderForm.tsx

# Backend onboarding progress/completion
@backend/src/services/onboarding.service.ts
@backend/src/controllers/onboarding.controller.ts
@backend/src/routes/onboarding.routes.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix stepper circle/label alignment and rename step-3 label to "Selesai"</name>
  <files>frontend/app/(app)/onboarding/_components/StepProgress.tsx</files>
  <action>
Restructure StepProgress so circles and labels share one per-step column, guaranteeing each circle is centered above its own label. Root cause of the current bug: the circles row uses three equal `flex-1` children each left-aligning its circle (circles land at x=0, 1/3, 2/3), while the labels row uses `justify-between` (labels land at x=0, 1/2, 1), so only step 1 lines up.

Rebuild as a single `map` over the steps rendering, per step, one column that is `flex flex-col items-center` and `flex-1`. Inside each column: (a) the numbered circle (keep the existing circle sizing w-8 h-8, rounded-full, and the existing three-state styling — completed = bg-primary with the check svg, current = bg-primary + ring-4 ring-primary/20, upcoming = bg-muted), rendered with `relative z-10`; (b) the label span below it (`mt-2 text-center text-xs font-sans text-muted-foreground`). Draw the connector line as an absolutely-positioned element inside each non-last column: position it at the circle's vertical center (`absolute top-4`) spanning from this circle's center to the next circle's center (`left-1/2 w-full h-0.5 -z-0`, rounded-full), colored bg-primary when `step < currentStep` else bg-muted. Because circle and label live in the same centered column, the circle is always exactly above its label for all 3 steps.

Replace the current per-currentStep label ternaries with a single static labels array so the text is stable regardless of currentStep: step 1 = "Pilih Terapi", step 2 = "Pengingat Pertama", step 3 = "Selesai". This removes the "Langkah 2"/"Langkah 3" placeholder strings entirely and satisfies the rename of step 3 to "Selesai".

Keep the component's props (`currentStep`, `totalSteps = 3`) and "use client" directive unchanged. Preserve the outer wrapper spacing so the header layout in page.tsx is unaffected.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v '^#' | grep -c "StepProgress" | grep -qx 0 && echo TS_OK</automated>
    <human-check>Load /onboarding, confirm all 3 circles are centered above their labels and step 3 reads "Selesai".</human-check>
  </verify>
  <done>StepProgress renders 3 centered circle-over-label columns with connector lines between them; step 3 label is "Selesai"; no "Langkah 3" text remains; tsc clean.</done>
</task>

<task type="auto">
  <name>Task 2: Add backend endpoint to mark reminder step complete without inserting a duplicate reminder</name>
  <files>backend/src/services/onboarding.service.ts, backend/src/controllers/onboarding.controller.ts, backend/src/routes/onboarding.routes.ts</files>
  <action>
The onboarding reuse of the /pengingat forms (Task 3) creates the reminder by POSTing to /api/reminders directly, so the existing POST /api/onboarding/reminder (which itself inserts a reminder) must NOT be called for reused forms — doing so would create a second, duplicate reminder. Instead add a completion-only marker endpoint.

In onboarding.service.ts add `completeReminderStep(userId: string)` that calls `onboardingProgressRepository.upsertProgress({ userId, lastCompletedStep: 2, reminderConfigured: true, completedAt: new Date() })` and returns `{ message: "Onboarding selesai" }`. Do NOT insert into reminderScheduleRepository here — the reminder already exists via /api/reminders. Setting `reminderConfigured: true` is essential: getProgress uses it, and the page redirects a completed user with reminderConfigured=false back into step 2 (the re-entry loop we must avoid).

In onboarding.controller.ts add `completeReminder(req, res, next)` following the exact pattern of the existing `skipReminder` handler (try/catch, `req.user!.id`, `res.json(result)`, `next(err)`).

In onboarding.routes.ts register `router.post("/complete-reminder", onboardingController.completeReminder);` alongside the existing reminder routes (after "/skip-reminder"). Keep the existing "/reminder" route in place (unused by the new flow but harmless; do not remove it to avoid touching other callers/tests).
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v '^#' | grep -c "onboarding" | grep -qx 0 && echo TS_OK</automated>
  </verify>
  <done>POST /api/onboarding/complete-reminder marks onboarding complete (lastCompletedStep 2, reminderConfigured true, completedAt set) without inserting a reminder; backend tsc clean.</done>
</task>

<task type="auto">
  <name>Task 3: Reorganize FirstReminderStep to put Jenis first (therapy-constrained) and reuse the real /pengingat per-jenis forms</name>
  <files>frontend/app/(app)/onboarding/_components/FirstReminderStep.tsx, frontend/app/(app)/onboarding/page.tsx</files>
  <action>
Rewrite FirstReminderStep to stop using its own hand-rolled fields (nama/jam/jenis/catatan posting to /api/onboarding/reminder) and instead present a therapy-constrained Jenis selector FIRST, then render the identical per-jenis reminder form used on /pengingat.

Props: change FirstReminderStep to accept `metodeTerapiAktif: string | null`, `accessToken: string`, `onReminderCreated: () => void | Promise<void>`, `onSkip`, `isSkipping`, `onBack`. Remove the old `onSubmit`/`isSaving`/react-hook-form usage and the `firstReminderSchema` import — the reused forms own their own validation and submission.

Jenis constraint (mirror AddReminderSheet exactly): build `availableTypes: ("obat"|"capd"|"hd")[] = ["obat"]`; push "capd" only when `metodeTerapiAktif === "CAPD"`; push "hd" only when `metodeTerapiAktif === "HD"`. Transplantasi (and any other/null value) therefore yields Obat only. This matches the therapy-scoping already applied on /pengingat.

Layout: keep the header ("Atur Pengingat Pertama" + subtitle). Directly below the header render the Jenis field as the FIRST field — a labeled selector (dropdown or segmented buttons) listing only `availableTypes`, using labels Obat / Exchange CAPD / Jadwal HD (reuse `reminderJenisLabels` from onboarding.schema for the text). Manage the chosen jenis in local `selectedJenis` state, defaulting to "obat" (always valid). When only one option is available (Transplantasi), still show the field but it will only contain Obat.

Below the Jenis selector, render the matching real component by importing them directly from @/components/pengingat: `MedicationReminderForm` for "obat", `CAPDReminderForm` for "capd", `HDReminderForm` for "hd". Pass each `accessToken`, `onSuccess={onReminderCreated}`, and `onCancel` set to clear back to the selector (or reuse for Back — since the forms render their own Simpan/Batal buttons, wire onCancel to a no-op-safe handler that returns focus to the selector). Do NOT reimplement any fields — the forms provide nama/dosis/hari/jam/foto (obat), konsentrasi (capd), etc., identical to /pengingat.

Keep the "Lewati untuk sekarang" skip button (calls onSkip) and the "← Kembali" back button (calls onBack) below the reused form. Because the reused forms show their own submit button, the onboarding step no longer needs its own submit button.

In page.tsx:
- Track the therapy chosen in step 1: add `selectedTherapy` state; in `handleTherapySubmit`, after a successful save set `setSelectedTherapy(data.metodeTerapi)`. Compute `const activeTherapy = selectedTherapy ?? user?.metodeTerapiAktif ?? null` so the re-entry/tutorial path (which skips step 1 in-session) falls back to the persisted therapy from useAuth (same source /pengingat uses). Pull `user` from useAuth alongside the existing auth values.
- Replace `handleReminderSubmit` (which POSTed to /api/onboarding/reminder) with `handleReminderCreated` that POSTs to `/api/onboarding/complete-reminder` (the Task 2 endpoint) via authFetch, then `setCurrentStep(3)`. The reminder itself is already created by the reused form's own POST to /api/reminders; this call only records onboarding completion.
- Update the `<FirstReminderStep ... />` render for `currentStep === 2` to pass `metodeTerapiAktif={activeTherapy}`, `accessToken={accessToken}`, `onReminderCreated={handleReminderCreated}`, and keep `onSkip`, `isSkipping`, `onBack`.
- Remove the now-unused `FirstReminderFormData` import/usage if it is no longer referenced.

Do not change the skip flow (still POST /api/onboarding/skip-reminder) or step 1/success rendering.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v '^#' | grep -cE "FirstReminderStep|onboarding/page" | grep -qx 0 && echo TS_OK</automated>
    <human-check>In /onboarding: pick CAPD in step 1 → step 2 Jenis shows only Obat + Exchange CAPD (no Jadwal HD); pick Exchange CAPD → the CAPD reminder fields match /pengingat's CAPD form; submit → lands on Selesai; reload /onboarding does not loop back to step 2. Repeat for HD (Obat + Jadwal HD only) and Transplantasi (Obat only).</human-check>
  </verify>
  <done>Jenis is the first field, constrained to the step-1 therapy; selecting a jenis renders the identical /pengingat per-jenis form (imported, not reimplemented); submitting creates the reminder and marks onboarding complete with reminderConfigured=true; frontend tsc clean.</done>
</task>

</tasks>

<verification>
- `cd frontend && npx tsc --noEmit` is clean.
- `cd backend && npx tsc --noEmit` is clean.
- Manual: onboarding stepper circles centered over labels, step 3 = "Selesai".
- Manual: Jenis field is first and therapy-constrained; per-jenis fields match /pengingat; completion does not loop back to step 2.
</verification>

<success_criteria>
- All 3 stepper circles centered above their labels; step-3 label reads "Selesai".
- "Jenis" is the first field in Atur Pengingat Pertama, options constrained by therapy (CAPD → Obat+Exchange CAPD; HD → Obat+Jadwal HD; Transplantasi → Obat only).
- Selecting a jenis renders the identical per-jenis form imported from components/pengingat (no reimplementation).
- Reminder is created once (via /api/reminders) and onboarding is marked complete via /api/onboarding/complete-reminder with reminderConfigured=true.
- Both frontend and backend typecheck clean.
</success_criteria>

<output>
Create `.planning/quick/260705-quo-perbaiki-ui-onboarding-garis-progress-da/260705-quo-SUMMARY.md` when done.
</output>
