---
phase: 02-fluid-medication-tracking-with-reminders
plan: "07"
subsystem: frontend-reminder-ui
tags: [reminders, medication-log, beranda, react-hook-form, zod, multipart-upload, REMIND-01, REMIND-03, REMIND-05, REMIND-06, REMIND-07]

dependency_graph:
  requires:
    - phase: 02-01
      provides: AppShell, responsive layout, shadcn components
    - phase: 02-05
      provides: reminder backend API (CRUD + confirm), medication_log API
  provides:
    - reminder-creation-ui (REMIND-01 MedicationReminderForm + REMIND-05 CAPDReminderForm + REMIND-06 HDReminderForm)
    - type-aware-sheet (AddReminderSheet gates CAPD/HD on metodeTerapiAktif)
    - reminder-list-ui (ReminderList + ReminderItem + DeleteReminderConfirm)
    - medication-log-ui (MedicationLogList + MedicationLogItem with inline confirm)
    - beranda-obat-card (ObatCard with "Sudah diminum" confirm)
    - beranda-pengingat-berikutnya (PengingatBerikutnyaCard next reminder)
    - d04-beranda-complete (full D-04 render order implemented)
  affects:
    - dashboard (D-04 stack complete with ObatCard + PengingatBerikutnyaCard)
    - catatan (Obat tab wired to MedicationLogList)
    - pengingat (full page with AddReminderSheet + list + empty state)

tech-stack:
  added: []
  patterns:
    - Type-aware reminder sheet: AddReminderSheet gates CAPD/HD options on user.metodeTerapiAktif
    - Multipart form data: MedicationReminderForm sends FormData (not JSON) for foto_obat multer field
    - Optimistic UI: ObatCard and MedicationLogList both optimistically update status on confirm
    - Day checkbox as button array: hariAktif managed via setValue (not native checkbox) for custom pill style
    - Parallel fetch pattern: ObatCard + PengingatBerikutnyaCard + DeltaCairanCard all fetch independently

key-files:
  created:
    - frontend/lib/validators/reminder.schema.ts
    - frontend/components/pengingat/MedicationReminderForm.tsx
    - frontend/components/pengingat/CAPDReminderForm.tsx
    - frontend/components/pengingat/HDReminderForm.tsx
    - frontend/components/pengingat/AddReminderSheet.tsx
    - frontend/components/pengingat/ReminderList.tsx
    - frontend/components/pengingat/ReminderItem.tsx
    - frontend/components/pengingat/DeleteReminderConfirm.tsx
    - frontend/components/catatan/MedicationLogList.tsx
    - frontend/components/catatan/MedicationLogItem.tsx
    - frontend/components/beranda/ObatCard.tsx
    - frontend/components/beranda/PengingatBerikutnyaCard.tsx
    - frontend/app/(app)/catatan/obat/page.tsx
  modified:
    - frontend/app/(app)/pengingat/page.tsx
    - frontend/app/(app)/catatan/page.tsx
    - frontend/app/(app)/dashboard/page.tsx

key-decisions:
  - "MedicationReminderForm uses native fetch for multipart (not authFetch which adds Content-Type: application/json — multer requires multipart boundary)"
  - "AddReminderSheet manages type selection state internally; resets to null on close"
  - "ReminderList returns null (not empty state) when reminders.length === 0 — empty state CTA is in the page"
  - "Pengingat page uses separate EmptyState component with its own fetch to track empty/non-empty; avoids prop-drilling ReminderList internals"
  - "Dashboard D-04 desktop layout: DeltaCairan(lg:col-span-2) + PengingatBerikutnya(1 col) as top row; ObatCard(lg:col-span-2) + AiPlaceholder(1 col) as second row"

metrics:
  duration: ~90min
  completed: "2026-06-27"
  tasks_completed: 3
  files_created: 13
  files_modified: 3
---

# Phase 02 Plan 07: Reminder Management UI Summary

**Type-aware reminder creation (Obat/CAPD/HD), reminder list with toggle/delete guard, Beranda ObatCard and PengingatBerikutnyaCard with inline confirmation — D-04 Beranda layout complete.**

## Performance

- **Duration:** ~90 minutes
- **Completed:** 2026-06-27
- **Tasks:** 3/4 auto (Task 4 is checkpoint:human-verify)
- **Files created:** 13
- **Files modified:** 3

## Accomplishments

### Task 1 — Reminder forms + AddReminderSheet + validators (commit `f054b31`)

**reminder.schema.ts** — Three zod schemas mirroring backend (02-05):
- `createObatFormSchema`: nama (max 100), dosis, jenisObat (minum|suntik), catatanWaktu, hariAktif (min 1), jamPengingat (HH:mm), fotoObat (optional File, image/jpeg|png, max 10MB)
- `createCapdFormSchema`: nama, konsentrasiCapd (select), jamPengingat, hariAktif, catatanWaktu
- `createHdFormSchema`: nama, jamPengingat, hariAktif, catatanWaktu
- Shared `HARI_OPTIONS` (7 Indonesian days) and `CAPD_KONSENTRASI_OPTIONS`

**MedicationReminderForm.tsx** — REMIND-01 form:
- Pill toggle for jenisObat (Minum/Suntik)
- 7-day checkbox row via button array + setValue
- File input for foto_obat with client-side MIME+size validation
- Submits via native `fetch` FormData (bypasses authFetch JSON Content-Type)
- Sends `hariAktif[]` array items as separate FormData entries

**CAPDReminderForm.tsx** — REMIND-05 form with konsentrasi_capd select and teal identity colors

**HDReminderForm.tsx** — REMIND-06 form with HD amber identity (#ef9f27 day buttons, amber submit)

**AddReminderSheet.tsx** — shadcn Sheet with therapy-aware type selection:
- Obat always visible
- CAPD only when `user.metodeTerapiAktif === "CAPD"`
- HD only when `user.metodeTerapiAktif === "HD"`
- Type selector resets to null on close; calls `onSuccess()` on successful submission

### Task 2 — Pengingat page + list + delete + medication log (commit `d1b135f`)

**ReminderList.tsx** — Fetches GET /api/reminders sorted by jamPengingat; skeleton loader, error+retry, returns null when empty

**ReminderItem.tsx** — Per UI-SPEC:
- Time badge (PJS 700 14px teal, #f0faf9 bg, radius 8px)
- Active day chips (7 days, active=teal, inactive=grey)
- Type badge (obat/capd=teal, hd=amber identity colors)
- shadcn Switch for aktif toggle → PATCH /api/reminders/:id (optimistic)
- Trash2 icon → opens DeleteReminderConfirm AlertDialog

**DeleteReminderConfirm.tsx** — shadcn AlertDialog:
- Title: "Hapus Pengingat?"
- Body: "Pengingat '{nama}' akan dihapus dan tidak akan dikirimkan lagi. Tindakan ini tidak dapat dibatalkan."
- Cancel: "Batal" | Confirm: "Hapus Pengingat" (#d4183d destructive)

**MedicationLogList.tsx + MedicationLogItem.tsx** — Today's medication log:
- Status colors: dikonfirmasi=teal check circle, tertunda=amber, terlewat=red
- POST /api/medication-log/confirm on circle tap; optimistic status update
- Empty: Pill icon + "Belum ada log obat hari ini"

**pengingat/page.tsx** — Full page: header "Pengingat" with AddReminderSheet trigger, ReminderList, EmptyState CTA when empty

**catatan/page.tsx** — Obat tab now renders `<MedicationLogList accessToken={accessToken} />`

**catatan/obat/page.tsx** — Standalone sub-route at /catatan/obat for direct URL access

### Task 3 — Beranda D-04 cards complete (commit `5353b7c`)

**ObatCard.tsx** — GET /api/medication-log/today:
- Each entry: confirm circle button + medication name + scheduled time
- POST /api/medication-log/confirm on circle or "Sudah diminum" button tap
- Optimistic update: immediately shows teal check + strikethrough + "Sudah diminum" badge
- Reverts to tertunda on API error
- Empty: "Tidak ada obat hari ini"

**PengingatBerikutnyaCard.tsx** — GET /api/reminders/next:
- Time (PJS 700 20px teal) + type badge + reminder name + catatanWaktu note
- Empty: "Tidak ada pengingat berikutnya"
- Error: "Gagal memuat data" + Coba Lagi

**dashboard/page.tsx** — D-04 complete:
- Top row: `lg:grid-cols-3` with DeltaCairanCard (`lg:col-span-2`) + PengingatBerikutnyaCard (1 col)
- Below (NoReminderBanner conditional, full width if onboarding.reminderConfigured is false)
- Second row: ObatCard (`md:col-span-2`) + AiPlaceholderCard (1 col on lg)

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 (validators + forms + sheet) | `f054b31` | feat(02-07): reminder validators + type-aware forms + AddReminderSheet |
| Task 2 (list + delete + log) | `d1b135f` | feat(02-07): Pengingat page + ReminderList/Item + DeleteReminderConfirm + medication log |
| Task 3 (Beranda cards + dashboard) | `5353b7c` | feat(02-07): Beranda ObatCard + PengingatBerikutnyaCard + D-04 complete |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree branch at wrong base commit**
- **Found during:** Startup
- **Issue:** Worktree HEAD was `8cb5ee8` (early main commit, no project files) instead of `06cf3fef` (phase/1 HEAD). `8cb5ee8` is a linear ancestor of `06cf3fef` with no unique worktree commits — safe fast-forward.
- **Fix:** `git reset --hard 06cf3fef`
- **Commits affected:** None (no worktree commits existed at that point)

**2. [Rule 3 - Blocking] Turbopack crashed on node_modules symlink**
- **Found during:** Task 3 build verification
- **Issue:** Symlink from worktree frontend/node_modules → main project node_modules caused Turbopack error: "Symlink [project]/node_modules is invalid, it points out of the filesystem root" (WSL2 cross-directory symlink limitation)
- **Fix:** Removed symlink, ran `npm install --prefer-offline` in worktree frontend directory
- **Result:** `npm run build` succeeded — 14 routes prerendered

**3. [Rule 2 - Missing Critical Functionality] Client-side file validation for foto_obat**
- **Found during:** Task 1 implementation
- **Issue:** `z.instanceof(File)` is SSR-unsafe in Next.js App Router
- **Fix:** Used `z.custom<File | null | undefined>()` with `.refine()` checks for MIME type (image/jpeg|png) and file size (max 10MB), matching backend multer limits

## Known Stubs

None. All components fetch from real API endpoints. Empty states render when API returns no data.

## Threat Flags

None — plan threat model fully mitigated:
- T-02-07-01: Backend (02-05) enforces per-user ownership; UI only sends IDs
- T-02-07-02: Client validates image/jpeg|png + 10MB before upload; backend multer re-validates independently
- T-02-07-03: AddReminderSheet gates CAPD/HD options on `metodeTerapiAktif` from /api/auth/me (via useAuth)

## Self-Check

- [x] `frontend/lib/validators/reminder.schema.ts` — EXISTS
- [x] `frontend/components/pengingat/MedicationReminderForm.tsx` — EXISTS
- [x] `frontend/components/pengingat/CAPDReminderForm.tsx` — EXISTS
- [x] `frontend/components/pengingat/HDReminderForm.tsx` — EXISTS
- [x] `frontend/components/pengingat/AddReminderSheet.tsx` — EXISTS
- [x] `frontend/components/pengingat/ReminderList.tsx` — EXISTS
- [x] `frontend/components/pengingat/ReminderItem.tsx` — EXISTS
- [x] `frontend/components/pengingat/DeleteReminderConfirm.tsx` — EXISTS
- [x] `frontend/components/catatan/MedicationLogList.tsx` — EXISTS
- [x] `frontend/components/catatan/MedicationLogItem.tsx` — EXISTS
- [x] `frontend/components/beranda/ObatCard.tsx` — EXISTS
- [x] `frontend/components/beranda/PengingatBerikutnyaCard.tsx` — EXISTS
- [x] `frontend/app/(app)/catatan/obat/page.tsx` — EXISTS
- [x] Commit f054b31 — EXISTS
- [x] Commit d1b135f — EXISTS
- [x] Commit 5353b7c — EXISTS
- [x] `npm run build` — PASSED (14 routes prerendered)

## Self-Check: PASSED
