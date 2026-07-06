---
quick_id: 260706-8zc
mode: quick
subsystem: reminders, dashboard, catatan-logs
tags: [pengingat-berikutnya-cuci-darah, medication-photo-catatan, reminder-photo-edit-bug, dosis-konsentrasi-catatan-display]
one_liner: Root-caused a real earliest-slot therapy-scoping bug in "Pengingat Berikutnya" and a stale-object refetch bug in the reminder edit form; verified (not re-implemented) the CAPD/HD grouping and medication-photo display already worked; surfaced dosis/konsentrasi/catatan on every reminder & log card face.
dependency_graph:
  requires: [quick-260705-q7w (therapyReminderScope.ts), quick-260705-r8b (findNextUpcoming past-due-today exclusion), quick-260706-573 (fotoObat attach pattern + UPLOAD_DIR fix)]
  provides: [_computeNextUpcomingCore (testable pure core for findNextUpcoming), ReminderItem onEdited prop]
  affects: [/beranda ObatCard/CuciDarahCard/PengingatBerikutnyaCard, /pengingat ReminderItem/ReminderList, /catatan MedicationLogItem/DialysisLogItem]
tech_stack:
  added: []
  patterns: ["injectable pure-core extraction for DB-backed repository functions (mirrors reminders.service.ts's _confirmCore pattern)", "force-refetch-after-mutation instead of stale-object-merge for list state"]
key_files:
  created:
    - backend/src/test/reminderSchedule.findNextUpcoming.test.ts
  modified:
    - backend/src/services/medicationLog.service.ts
    - backend/src/services/dialysisLog.service.ts
    - backend/src/repositories/reminderSchedule.repository.ts
    - frontend/components/pengingat/ReminderItem.tsx
    - frontend/components/pengingat/ReminderList.tsx
    - frontend/components/beranda/PengingatBerikutnyaCard.tsx
    - frontend/components/beranda/ObatCard.tsx
    - frontend/components/beranda/CuciDarahCard.tsx
    - frontend/components/catatan/MedicationLogItem.tsx
    - frontend/components/catatan/DialysisLogItem.tsx
metrics:
  duration: ~1h 45min
  completed: 2026-07-06
---

# Quick Task 260706-8zc: Fix 5 items (CAPD/HD reminder grouping, medication photo, reminder photo edit bug, dosis/konsentrasi/catatan display) Summary

Batch of 5 user-reported items. Two were genuinely already fixed (verification-only), one required a real backend fix, one required a real frontend fix, and one (item 3b) was investigated exhaustively but no reproducible defect was found — it collapses into the item-3a fix per the plan's own contingency.

## Task 1 — Backend: attach catatanWaktu to today-log responses

`medicationLog.service.ts`'s `getTodayLogs` (type `MedicationLogWithFoto`) and `dialysisLog.service.ts`'s `getTodayLogs` (new type `DialysisLogWithCatatan`) now attach `catatanWaktu` from the owning `reminder_schedule` row, mirroring the existing `fotoObat` attach pattern (sourced from `listByUser`/all-reminders regardless of `aktif`, per the quick-260706-573 precedent).

**Verified live** against the running Docker dev stack (backend restarted to pick up the change — no file-watcher/nodemon in this container, `node --import tsx src/server.ts` runs once): created a real obat reminder with `catatanWaktu` and confirmed `GET /api/medication-log/today` returned it alongside `fotoObat`/`dosis`; same for a CAPD reminder against `GET /api/dialysis-log/today`. All test data cleaned up afterward.

## Task 2 — Frontend: surface dosis / konsentrasi / catatan on all card faces (+ item 2 verification)

Added muted sub-text lines (`#7a8c8a`, existing style) to 6 components, rendering only when non-empty:
- **ReminderItem.tsx** (/pengingat): added `Dosis {dosis}` for obat (capd konsentrasi + catatanWaktu already existed).
- **PengingatBerikutnyaCard.tsx** (/beranda): added `dosis`/`konsentrasiCapd` to `NextReminder`, rendered in the obat and cuci-darah sections respectively (backend `/api/reminders/next` already returned full rows — no backend change needed).
- **ObatCard.tsx**: added `dosis` + `catatanWaktu` to the card face (previously showed only name + time).
- **CuciDarahCard.tsx**: `konsentrasiCapd` was already shown; added `catatanWaktu`.
- **MedicationLogItem.tsx** (/catatan): added `Dosis` + `Catatan` lines to the card FACE (previously only visible in the detail overlay).
- **DialysisLogItem.tsx** (/catatan): added `Konsentrasi` (capd-only) + `Catatan` lines to the card face.

**Item 2 verification (medication photo in /catatan detail) — VERIFICATION ONLY, no code change.** Traced the chain end-to-end and confirmed live: created a test obat reminder with a photo via multipart `POST /api/reminders`, confirmed `GET /api/medication-log/today` returns `fotoObat` pointing at the saved path, and confirmed the static file resolves with `curl -I` → `200 image/png`. `MedicationLogItem.tsx`'s existing photo block (`unoptimized` next/image + `onError` fallback) was already correct — the full chain (getTodayLogs attach → static serve → unoptimized bypass) works with no defect found.

## Task 3 — Item 1 verification + real fix: CAPD/HD reminders in "Pengingat Berikutnya"

The high-level architecture (grouped `{obat, cuciDarah}` shape, therapy-scoped filter, `PengingatBerikutnyaCard`'s "Pengingat Cuci Darah" section) was indeed already correct, wired in quick-260705-q7w — **but investigation found one genuine filtering defect**, not just a verification pass:

`reminderSchedule.repository.ts#findNextUpcoming` combined ALL capd+hd reminders and picked the single globally-earliest `jam_pengingat` slot *before* `reminders.service.ts#getNextUpcoming` ever applied the therapy filter. If an off-therapy reminder (e.g. a leftover HD reminder while the user's current `metodeTerapiAktif` is CAPD) happened to have an earlier time slot than the user's real CAPD reminder, that off-therapy slot would "win" the earliest-slot computation — and since `findNext()` only returns items sharing the winning time, the user's legitimately-next CAPD reminder was silently discarded entirely, not merely filtered out afterward.

**Reproduced live**: created an HD reminder at an earlier time (10:00) and a CAPD reminder at a later time (23:59) for a CAPD-therapy test user. Before the fix, `GET /api/reminders/next` returned `cuciDarah: []` (both candidates silently dropped). 

**Fix**: extracted the pure grouping/selection logic into a new exported `_computeNextUpcomingCore(active, metode, ctx)` and now apply `isReminderVisibleForTherapy()` to the cuci-darah candidate pool *before* computing the earliest slot, not after (the service-level filter in `getNextUpcoming` remains as a harmless defensive backstop). After the fix, the same live scenario correctly surfaces the CAPD reminder as next.

Added `backend/src/test/reminderSchedule.findNextUpcoming.test.ts` (4 tests: CAPD-wins-over-earlier-HD, HD-wins-over-earlier-CAPD, Transplantasi-yields-empty, obat-never-filtered) — all pass. Existing 29 therapy-scoping/reminders tests still pass (no regressions).

## Task 4 — Item 3: photo delete persistence + re-upload-during-edit bugs

**3(a) — deleted photo reappearing after save (ROOT CAUSE FIXED).** `ReminderItem.handleEditSuccess` was calling `onUpdated?.(reminder)`, passing the *stale* pre-edit `reminder` prop (still holding the old `fotoObat`) back into `ReminderList`'s list-state merge, instead of refetching. Fixed by adding an `onEdited` prop to `ReminderItem`, wired to a new `ReminderList.handleEdited` (calls `fetchReminders()` then dispatches `SYNC_EVENTS.REMINDER_UPDATED`); `handleEditSuccess` now calls `onEdited?.()` instead. The aktif-toggle path is untouched — it already passes the real PATCH response via `onUpdated`.

Verified the backend delete path first, per the plan's instruction: `PATCH /api/reminders/:id` with `hapusFoto=true` correctly nulls `fotoObat` and persists (confirmed via a follow-up `GET /api/reminders` showing `fotoObat: null`) — proving the fix target was purely the frontend stale-merge, not the backend.

**3(b) — page reload / upload never completes when adding a new photo during edit (NO DEFECT FOUND — collapses into 3(a)).** Per the plan's explicit instruction, this needed browser-style reproduction; since no live browser tool was available, reproduced as closely as possible via:
- Direct multipart `PATCH` curl requests against the running backend replicating the exact field set `MedicationReminderForm.tsx`'s `onSubmit` builds: (1) a valid photo replacement → `200`, `fotoObat` updated to the new path; (2) an invalid file type (`.txt`) → clean `400 {"code":"INVALID_FILE_TYPE",...}` via multer's `fileFilter` + `app.ts`'s `MulterError` handler — no crash, no hang.
- Full code trace of `onSubmit`: no thrown exception before `fetch`, `FormData` construction is straightforward, `react-hook-form`'s `handleSubmit` always calls `preventDefault()` regardless of validation outcome (ruling out a native-submit navigation even if `onSubmit` threw). No nested `<form>` on the `/pengingat` page (`EditReminderSheet` is not rendered inside another form). No `required` HTML attributes that could trigger native browser validation conflicts.

No reproducible defect was found in either the backend or the traced frontend code path. Per the plan's own contingency ("If reproduction shows the PATCH already fires and succeeds and the only visible symptom is the stale UI, then 3(b) collapses into 3(a)"), this is the concluded outcome: the perceived "reload / never completes" symptom was very likely the exact same stale-merge bug from 3(a) — a successful new-photo upload would appear to silently fail once the sheet closed and the OLD (photo-less or old-photo) object was re-merged into list state, making it look like nothing happened. The 3(a) refetch fix resolves this for the new-photo-during-edit case as well. **No code change was made to `MedicationReminderForm.tsx`** since no defect was found there — this deviates from the plan's file list expectation but is the correct outcome per the plan's own escape hatch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Item 1: cuci-darah reminders' earliest-slot selection ran before therapy scoping**
- **Found during:** Task 3 (item 1 verification)
- **Issue:** `findNextUpcoming` picked the globally-earliest jam_pengingat slot across combined capd+hd reminders before the caller's therapy filter ran, silently discarding a legitimate next reminder when an off-therapy reminder had an earlier slot.
- **Fix:** Extracted `_computeNextUpcomingCore` and moved `isReminderVisibleForTherapy` filtering before the earliest-slot computation.
- **Files modified:** `backend/src/repositories/reminderSchedule.repository.ts`
- **Commit:** `868385d`

**2. [Rule 1 - Bug] Item 3(a): stale object re-merged into reminder list after edit**
- **Found during:** Task 4
- **Issue:** `ReminderItem.handleEditSuccess` passed the pre-edit `reminder` prop (stale `fotoObat`) to `ReminderList`'s merge-based `handleUpdated`, so a deleted photo (or a newly added one) never reflected in list state until an unrelated refetch happened to occur.
- **Fix:** Added `onEdited` prop forcing a genuine `fetchReminders()` server refetch on edit success, distinct from the aktif-toggle's `onUpdated` merge path (which is legitimately safe since it carries the real PATCH response).
- **Files modified:** `frontend/components/pengingat/ReminderItem.tsx`, `frontend/components/pengingat/ReminderList.tsx`
- **Commit:** `3a7ca2d`

### Deferred / No Change Needed

- Item 3(b) required no code change — investigated exhaustively (backend multipart curl reproduction + full frontend code trace) with no reproducible defect found; concluded per the plan's contingency that it collapses into 3(a)'s fix. `frontend/components/pengingat/MedicationReminderForm.tsx` was read and traced but not modified.
- Items 1 (high-level grouping architecture) and 2 (medication photo chain) were confirmed already correctly implemented by prior quick tasks (260705-q7w, 260706-573) — no rebuild was done, consistent with the plan's verification-first instruction.

## Known Stubs

None.

## Threat Flags

None — all changes are read-time joins of already-existing columns (`catatanWaktu`) or client-side refetch/display logic. No new endpoints, auth paths, or schema changes.

## Self-Check: PASSED

Verified all claimed files exist and all claimed commits exist in git log (see below).
