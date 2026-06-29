---
phase: 02-fluid-medication-tracking-with-reminders
verified: 2026-06-27T10:00:00Z
status: gaps_found
score: 13/20 must-haves verified
overrides_applied: 0
re_verification: null
gaps:
  - truth: "User can create a medication reminder via a form (name, dose, type, active days, time, optional photo) and receive a push notification at the scheduled time"
    status: failed
    reason: "CR-03: MedicationReminderForm.tsx line 80 appends hariAktif[] (with brackets) to FormData. Express/multer preserves bracket verbatim — req.body.hariAktif is always undefined, so createObatSchema.parse() throws 'Pilih minimal satu hari aktif' and every medication reminder POST returns HTTP 400. No medication reminder can be created via the form."
    artifacts:
      - path: "frontend/components/pengingat/MedicationReminderForm.tsx"
        issue: "Line 80: data.hariAktif.forEach((day) => fd.append('hariAktif[]', day)) — bracket notation not stripped by multer/busboy; must be fd.append('hariAktif', day)"
    missing:
      - "Remove brackets from FormData field name: fd.append('hariAktif', day) not fd.append('hariAktif[]', day)"

  - truth: "User receives a push notification at the scheduled reminder time (REMIND-02) — reminders dispatch at the patient's local clock time in Jakarta (WIB UTC+7)"
    status: failed
    reason: "CR-02: reminderDispatch.job.ts currentHHmm() and currentDayName() use new Date().getHours() / new Date().getDay() which return UTC values. On Railway/Render where TZ=UTC, a reminder set for 08:00 WIB fires at 15:00 WIB (7 hours late). findNextUpcoming in reminderSchedule.repository.ts has the same UTC-comparison bug (WR-07). Also findTodayByUser in medicationLog.repository.ts computes midnight boundary in UTC, causing log mismatches across the Jakarta day boundary."
    artifacts:
      - path: "backend/src/jobs/reminderDispatch.job.ts"
        issue: "Lines 26-31: currentHHmm() and currentDayName() use new Date() without UTC+7 offset — fires 7h wrong for all Jakarta patients"
      - path: "backend/src/repositories/reminderSchedule.repository.ts"
        issue: "findNextUpcoming uses local time for HH:mm comparison — UTC comparison against WIB-stored times"
      - path: "backend/src/repositories/medicationLog.repository.ts"
        issue: "findTodayByUser computes midnight boundary from UTC, not WIB"
    missing:
      - "Apply WIB offset: const jakartaMs = Date.now() + 7*3600*1000; use new Date(jakartaMs).getUTCHours() in currentHHmm()"
      - "Or set TZ=Asia/Jakarta in Railway/Render environment and docker-compose"
      - "Apply same fix to findNextUpcoming and findTodayByUser"

  - truth: "User can confirm a medication dose from the push notification action (REMIND-03) — the SW 'Sudah diminum' action is logged in the backend"
    status: failed
    reason: "CR-01: sw.ts line 108 uses a relative URL fetch('/api/medication-log/confirm'...). In the service worker, relative URLs resolve against the SW origin — the Vercel frontend domain (https://kidneybuddy.vercel.app). Next.js has no /api/medication-log/confirm route, so this returns 404. Even if the URL were correct, credentials:'include' sends the httpOnly refresh cookie but the authenticate middleware checks for a Bearer token — the in-memory access token is unreachable from the SW context. All push-triggered dose confirmations silently fail."
    artifacts:
      - path: "frontend/app/sw.ts"
        issue: "Line 108: fetch('/api/medication-log/confirm'...) — relative URL resolves to Vercel not Railway backend. Also credentials:'include' sends cookie but backend requires Bearer token."
    missing:
      - "Inject NEXT_PUBLIC_API_URL via esbuild define in createSerwistRoute and use absolute URL: fetch(`${API_BASE}/api/medication-log/confirm`...)"
      - "Include a confirmToken in the push payload (short-lived JWT scoped to reminderId) to authenticate from the SW context without needing an in-memory access token"

  - truth: "Beranda Obat card and Catatan/Obat log show medication names correctly"
    status: failed
    reason: "CR-04: medication_log schema column is nama_obat (Drizzle maps to namaObat). The API returns namaObat but ObatCard.tsx interface declares reminderNama (line 24) and renders {entry.reminderNama} (line 184). MedicationLogItem.tsx interface also declares reminderNama (line 18) and renders {log.reminderNama} (line 99). Both render as undefined — all medication names in the Obat card and Catatan/Obat log are blank."
    artifacts:
      - path: "frontend/components/beranda/ObatCard.tsx"
        issue: "Line 24: interface declares reminderNama; line 184: renders {entry.reminderNama} — API returns namaObat"
      - path: "frontend/components/catatan/MedicationLogItem.tsx"
        issue: "Line 18: interface declares reminderNama; line 99: renders {log.reminderNama} — API returns namaObat"
    missing:
      - "Rename reminderNama to namaObat in MedicationEntry interface (ObatCard.tsx) and MedicationLog interface (MedicationLogItem.tsx)"
      - "Update all .reminderNama references to .namaObat in both files"

human_verification:
  - test: "Verify PWA installability on desktop Chrome and Android"
    expected: "Chrome DevTools Application tab shows manifest with name KidneyBuddy, display standalone, three icons including maskable; service worker registered and activated at /serwist/sw.js; install icon appears in address bar; Android Chrome offers Add to Home Screen"
    why_human: "Requires a running HTTPS instance with real icons in public/icons/ and a browser with DevTools — cannot be verified by code inspection"

  - test: "Verify iOS Add-to-Home-Screen gate on real iPhone"
    expected: "Opening the site in Safari iOS (not from Home Screen icon) shows InstallPrompt interstitial ('Pasang ke Home Screen Dulu') instead of a notification permission button. After adding to Home Screen and opening from icon, tapping Aktifkan Notifikasi shows the iOS permission dialog."
    why_human: "Requires a physical iPhone, iOS Safari, and real VAPID keys configured — NOTIF-03 is impossible to test via code inspection"

  - test: "Verify per-device push subscription — two devices same account"
    expected: "After granting notification permission on two different devices (or browser profiles) with the same account, the push_subscriptions table has two rows with different endpoints. A dispatched reminder results in both devices receiving the push notification."
    why_human: "Requires two physical devices, VAPID keys, and a live backend with the timezone fix applied — NOTIF-02/REMIND-08"

  - test: "Verify responsive layout at exactly 375px, 768px, 1024px, 1280px"
    expected: "375px: single-column, 5-tab bottom nav fixed, centered FAB labeled Catat above nav, compact header with bell. 768px: list/card areas become 2-column, bottom nav + FAB unchanged. 1024px: bottom nav and FAB disappear, left sidebar with 5 nav items and Catat Cairan button appears, top bar shows page title + avatar. 1280px: content centered with max-width 1280px."
    why_human: "Visual verification at exact pixel breakpoints requires a running browser — RESPONSIVE-04"

  - test: "Verify push notification delivery (scheduled and follow-up) after CR-02 timezone fix is applied"
    expected: "A medication reminder set for 2 minutes from now (active today) fires at the correct WIB time. An unconfirmed reminder triggers exactly one follow-up push after 30 minutes."
    why_human: "Requires VAPID keys configured, real push permission granted, backend running with WIB timezone fix, and a 30-minute wait — REMIND-02/REMIND-04"

  - test: "Verify fluid offline queue sync (FLUID-05)"
    expected: "Setting DevTools Network to Offline, submitting a fluid entry shows 'Catatan disimpan dan akan disinkronkan' toast and an IndexedDB entry. Toggling back to Online triggers sync with 'Catatan berhasil disinkronkan' toast."
    why_human: "Requires a running app with a real auth session and DevTools network throttling — cannot verify by code inspection alone"
---

# Phase 02: Fluid & Medication Tracking with Reminders — Verification Report

**Phase Goal:** Patients across all therapy types (CAPD/HD/transplant) can log fluid and medication intake with automatic daily balance calculation, install KidneyBuddy as a real PWA, and receive reliable push reminders — delivered via per-device VAPID push subscriptions, with iOS gated correctly behind an Add-to-Home-Screen prompt — that survive backend restarts; caregivers on separate devices get independent, correctly-scoped push notifications via their own subscription

**Verified:** 2026-06-27T10:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Assessment

Phase 2 delivered substantial infrastructure: 113/113 backend tests pass, the fluid tracking vertical slice is complete and encrypted, the push subscription architecture is correctly per-device, the cron scheduler is Postgres-backed (restart-safe), and the responsive UI shell is in place. However, **four critical bugs found in the 02-REVIEW.md are confirmed in the actual codebase** and directly block core phase-goal behaviors.

---

## Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can log a fluid entry and immediately sees the recalculated daily in/out delta on the dashboard | VERIFIED | fluid.service.ts createEntry + getDailyBalance confirmed; DeltaCairanCard.tsx fetches /api/fluid/daily-balance; 24/24 fluid service tests pass |
| 2 | CAPD patient who logs abnormal outgoing fluid condition sees an immediate, non-dismissable red warning banner | VERIFIED | CAPDEffluentBanner.tsx has no X/close icon anywhere; only action button "Saya mengerti, hubungi dokter segera" dismisses; confirmed in code at line 96 |
| 3 | User can install KidneyBuddy to the home screen as a PWA; each device registers its own push subscription; iOS prompts Add to Home Screen first | UNCERTAIN | manifest.ts exports standalone display + maskable icon; InstallPrompt.tsx gates on isIos() && !isInStandaloneMode(); push_subscriptions UNIQUE on endpoint not user_id (NOTIF-02 architecture correct); but installability + iOS gate require real device testing |
| 4 | User can create a medication reminder and receives a real push notification at the scheduled time with a follow-up if unconfirmed after 30 minutes | FAILED | CR-03: hariAktif[] bracket notation causes 400 on every medication reminder POST; CR-02: dispatch uses UTC time, fires 7h wrong for Jakarta patients; follow-up job code is correct but depends on REMIND-02 firing |
| 5 | CAPD exchange and HD schedule reminders fire correctly per modality, survive a backend restart without silently dropping, continue to apply correctly after a therapy-method change | PARTIAL | CAPD/HD reminder creation VERIFIED (CAPDReminderForm + HDReminderForm use JSON authFetch, not FormData — CR-03 does not affect them); therapy-change hook VERIFIED (4/4 tests pass); restart-safe Postgres cron VERIFIED; but "fire correctly" is blocked by CR-02 timezone bug |
| 6 | A caregiver logged in on a separate device registers their own push subscription and receives the same reminders independently | UNCERTAIN | Architecture verified: sendToAllDevices fans to all active endpoints; push_subscriptions UNIQUE on endpoint; but actual multi-device delivery requires two physical devices with VAPID keys and CR-02 fix |
| 7 | At 375/768/1024/1280px the app shows the correct distinct layouts, verified on Chrome mobile, Safari iOS, Chrome desktop, and Firefox desktop | UNCERTAIN | AppShell.tsx, BottomNav.tsx, Sidebar.tsx all exist with lg: breakpoint classes; implementation is substantive; but cross-browser verification at exact breakpoints requires human testing |

**Score:** 2/7 roadmap success criteria VERIFIED; 4/7 UNCERTAIN or FAILED (2 FAILED, 1 PARTIAL, 3 UNCERTAIN)

---

## Must-Have Checklist (from PLAN frontmatter, all 7 plans)

### Plan 02-01: Responsive Shell (RESPONSIVE-01..04)

| Truth | Status | Evidence |
|-------|--------|----------|
| 375-767px: single-column, 5-tab bottom nav, centered FAB | UNCERTAIN | AppShell renders `lg:hidden` BottomNav + FAB; visual verification needed |
| 768-1023px: 2-column layout, bottom nav unchanged | UNCERTAIN | No explicit md: 2-col classes in AppShell itself; 2-col is per page content |
| 1024px+: left sidebar replaces bottom nav, max-width 1280px | VERIFIED | Sidebar uses `hidden lg:flex`; BottomNav uses `lg:hidden`; main maxWidth 1280px confirmed |
| Authenticated pages render inside shell; (auth) pages do not | VERIFIED | frontend/app/(app)/layout.tsx wraps AppShell; (auth) pages are outside (app) group |
| Edukasi renders 'Konten Segera Hadir' placeholder | VERIFIED | edukasi/page.tsx renders "Konten Segera Hadir" heading confirmed |

### Plan 02-02: Push Infrastructure & Encryption (NOTIF-02, REMIND-08)

| Truth | Status | Evidence |
|-------|--------|----------|
| Two devices on the same account create separate push_subscriptions rows | VERIFIED | UNIQUE constraint on endpoint only (not user_id); pushSubscription.repository.ts upsertByEndpoint confirmed |
| sendToAllDevices fans notification to every active subscription and deactivates only 410-Gone rows | VERIFIED | notification.service.ts fanOut() uses Promise.allSettled; 410 deactivates only that row; 5/5 fan-out tests pass |
| encrypt(x) then decrypt(...) returns original string; ciphertext is iv:authTag:cipher hex | VERIFIED | encryption.ts AES-256-GCM confirmed; 5/5 encryption tests pass |
| POST /api/push/subscribe requires authentication and stores under authenticated user_id | VERIFIED | push.routes.ts applies authenticate middleware; controller uses req.user.id |

### Plan 02-03: PWA + Push Client (NOTIF-01, NOTIF-03, REMIND-02 client)

| Truth | Status | Evidence |
|-------|--------|----------|
| User can install KidneyBuddy to home screen (manifest served, display standalone, icons present) | UNCERTAIN | manifest.ts confirmed (display: "standalone", maskable icon); public/icons/ .gitkeep only — real icons not committed; human testing required |
| On iOS Safari not yet added to Home Screen, shows Add-to-Home-Screen interstitial | UNCERTAIN | InstallPrompt.tsx shown when isIos() && !isInStandaloneMode() — code correct; requires real iPhone |
| Notification.requestPermission() is first expression in click handler (never after await) | VERIFIED | NotificationPermissionBanner.tsx line 112: const permission = await Notification.requestPermission() — confirmed as first statement in handleEnableClick |
| Granted device POSTs PushSubscription to /api/push/subscribe and re-subscribes on foreground | VERIFIED | pushClient.ts subscribeAndRegister() confirmed; ensureFreshSubscription() registered on visibilitychange in profil page |

### Plan 02-04: Fluid Tracking (FLUID-01..05)

| Truth | Status | Evidence |
|-------|--------|----------|
| User can log a fluid entry and immediately see recalculated daily in/out delta on Beranda | VERIFIED | CatatCairanForm.tsx + CatatCairanSheet.tsx dispatch fluid:saved event; DeltaCairanCard.tsx re-fetches on refreshKey; 24/24 tests pass |
| Daily balance computed by backend, rendered by client — never client-side | VERIFIED | getDailyBalance in fluid.service.ts; DeltaCairanCard only renders fetched delta |
| CAPD patient logging keruh/keruh_gumpalan/berdarah gets non-dismissable Alert Darurat | VERIFIED | CAPDEffluentBanner.tsx: no X icon, only action button dismisses |
| User can log retroactive entry with past date/time, flagged as late entry | VERIFIED | isLateEntry boolean in schema; CatatCairanForm.tsx has isLateEntry checkbox + RetroactiveDateTimePicker |
| Offline entry queued in IndexedDB and synced when connection returns | VERIFIED | offlineQueue.ts uses idb with fluidQueue objectStore; registerOnlineListener flushes on window online event |

### Plan 02-05: Reminder Backend (REMIND-01, 03, 05, 06, 07)

| Truth | Status | Evidence |
|-------|--------|----------|
| User can create medication reminder (name, dose, type, active days, time, optional photo) | FAILED | Backend API correct; CR-03: frontend MedicationReminderForm.tsx line 80 uses hariAktif[] (brackets) causing req.body.hariAktif to be undefined — every creation fails with 400 |
| CAPD patient can create exchange reminder; HD patient can create dialysis schedule reminder | VERIFIED | createCapdSchema + createHdSchema in reminders.service.ts; CAPDReminderForm + HDReminderForm use JSON authFetch (no FormData bracket issue) |
| Confirming a dose (POST /api/medication-log/confirm) logs against authenticated user's reminder | PARTIAL | Backend: _confirmCore validates ownership (REMIND-03 backend correct); Client via form button: ObatCard.tsx handleConfirm() works but shows undefined names (CR-04); Client via SW push action: FAILS (CR-01 relative URL) |
| Changing therapy method preserves obat reminders, deactivates only therapy-specific reminders | VERIFIED | profile.service.ts changeTherapyMethod calls deactivateTherapySpecific; 4/4 therapyChange.reminders tests pass |
| reminder_schedule extended by ALTER ADD COLUMN, never dropped/recreated | VERIFIED | ALTER TABLE ADD COLUMN IF NOT EXISTS applied via psql (documented in 02-05-SUMMARY.md); 6 new columns added |

### Plan 02-06: Cron Scheduler (REMIND-02, 04, 05, 06, 08)

| Truth | Status | Evidence |
|-------|--------|----------|
| Every minute scheduler queries Postgres for due reminders and fans push to all user devices | FAILED (timezone) | scheduler.ts + reminderDispatch.job.ts confirmed; BUT currentHHmm() uses new Date().getHours() (UTC) not WIB — fires 7h wrong for all Jakarta patients |
| Reminder schedule lives in Postgres, not memory — backend restart does not silently stop reminders | VERIFIED | startScheduler() calls dispatchDueReminders() once at boot; cron uses Postgres query each tick; 6/6 dispatch tests pass |
| Dispatched reminder creates medication_log row status tertunda, marks last_notification_sent_at | VERIFIED | _dispatchCore inserts log + calls markDispatched; duplicate-guard confirmed in tests |
| If medication reminder unconfirmed after 30 minutes, exactly one follow-up push is sent | VERIFIED | reminderFollowUp.job.ts checks follow_up_sent flag; markFollowUpSent prevents second send |
| Reminders fan out to every active device on the account (caregiver's device receives independently) | VERIFIED | dispatchDueReminders calls sendToAllDevices which fans to all active push_subscriptions |

### Plan 02-07: Reminder UI (REMIND-01, 03, 05, 06, 07)

| Truth | Status | Evidence |
|-------|--------|----------|
| User can create medication reminder via form and see it in reminder list | FAILED | CR-03: FormData hariAktif[] bracket bug means creation always returns 400 |
| CAPD patient sees CAPD form; HD patient sees HD form — form matches metodeTerapiAktif | VERIFIED | AddReminderSheet.tsx gates CAPD/HD options on user.metodeTerapiAktif; CAPDReminderForm + HDReminderForm confirmed |
| User can confirm due dose from Obat card; confirmation hits POST /api/medication-log/confirm | PARTIAL | ObatCard.tsx handleConfirm() POSTs correctly; BUT CR-04: medication names display as undefined (reminderNama vs namaObat mismatch) |
| Beranda shows today's unconfirmed meds (Obat card) and next upcoming reminder | PARTIAL | ObatCard.tsx and PengingatBerikutnyaCard.tsx exist and fetch real APIs; BUT CR-04: medication names in ObatCard are all undefined |
| Deleting a reminder requires explicit confirmation dialog | VERIFIED | DeleteReminderConfirm.tsx uses shadcn AlertDialog with "Hapus Pengingat?" copy before DELETE |

---

## Required Artifacts

| Artifact | Expected | Status | Notes |
|----------|----------|--------|-------|
| `backend/src/lib/encryption.ts` | AES-256-GCM encrypt/decrypt helpers | VERIFIED | Exports encrypt + decrypt; key validated at startup; key never logged |
| `backend/src/db/schema/pushSubscriptions.schema.ts` | push_subscriptions table, UNIQUE on endpoint | VERIFIED | UNIQUE on endpoint confirmed; no UNIQUE on user_id |
| `backend/src/services/notification.service.ts` | sendToAllDevices fan-out | VERIFIED | fanOut() + sendToAllDevices() confirmed; 5/5 tests |
| `backend/src/routes/push.routes.ts` | POST /subscribe, DELETE /unsubscribe (authenticated) | VERIFIED | Both routes apply authenticate middleware |
| `backend/src/jobs/reminderDispatch.job.ts` | dispatchDueReminders — queries due reminders, logs tertunda, fans out | VERIFIED (with bug) | Implementation correct; CR-02 timezone bug present |
| `backend/src/jobs/reminderFollowUp.job.ts` | sendFollowUpReminders — 30-min unconfirmed follow-up | VERIFIED | follow_up_sent guard confirmed |
| `backend/src/jobs/scheduler.ts` | node-cron registration + boot catch-up | VERIFIED | startScheduler() confirmed in server.ts |
| `backend/src/db/schema/fluidLog.schema.ts` | fluid_log table with encrypted catatan column | VERIFIED | catatan text column (app-layer encrypted before INSERT) |
| `backend/src/services/fluid.service.ts` | createEntry (encrypt + CAPD rule), daily balance | VERIFIED | createEntry + getDailyBalance + hasAbnormalCondition; 24/24 tests pass |
| `backend/src/services/reminders.service.ts` | create/list/update/delete for obat/capd/hd reminders | VERIFIED | Per-jenis zod schemas; ownership enforcement |
| `backend/src/db/schema/medicationLog.schema.ts` | medication_log table (status tertunda/dikonfirmasi/terlewat) | VERIFIED | Schema confirmed; namaObat column (not reminderNama) |
| `frontend/app/manifest.ts` | PWA manifest (MetadataRoute.Manifest, display standalone) | VERIFIED | Confirmed standalone + maskable icon |
| `frontend/app/sw.ts` | Service worker: push + notificationclick handlers | VERIFIED (with bug) | Push handler correct; notificationclick has CR-01 relative URL |
| `frontend/lib/pushClient.ts` | subscribeAndRegister + foreground re-subscribe | VERIFIED | subscribeAndRegister + ensureFreshSubscription confirmed |
| `frontend/components/push/InstallPrompt.tsx` | iOS Add-to-Home-Screen interstitial | VERIFIED | Renders 3-step guide when isIos() && !isInStandaloneMode() |
| `frontend/components/beranda/DeltaCairanCard.tsx` | Hero fluid balance card colored by threshold | VERIFIED | Fetches /api/fluid/daily-balance; thresholds teal/amber/red/grey |
| `frontend/components/beranda/CAPDEffluentBanner.tsx` | Non-dismissable Alert Darurat | VERIFIED | No X icon; only action button dismisses |
| `frontend/components/pengingat/MedicationReminderForm.tsx` | REMIND-01 form with photo upload | STUB (bug) | Form exists but CR-03 means submission always returns 400 |
| `frontend/components/pengingat/CAPDReminderForm.tsx` | REMIND-05 CAPD exchange form | VERIFIED | JSON authFetch — no bracket issue |
| `frontend/components/beranda/ObatCard.tsx` | Today's unconfirmed meds with inline confirm | PARTIAL | Exists and fetches /api/medication-log/today; BUT CR-04: all names render as undefined |

---

## Key Link Verification

| From | To | Via | Status | Notes |
|------|----|-----|--------|-------|
| `frontend/app/(app)/layout.tsx` | `AppShell.tsx` | import + JSX wrap | VERIFIED | AppShell wraps children in layout |
| `AppShell.tsx` | `BottomNav.tsx` | conditional render lg:hidden | VERIFIED | BottomNav rendered with lg:hidden |
| `frontend/app/(app)/dashboard/page.tsx` | `/api/fluid/daily-balance` | authFetch in useEffect | VERIFIED | DeltaCairanCard fetches daily-balance |
| `fluid.service.ts` | `encryption.ts` | encrypt(catatan) before insert | VERIFIED | realEncrypt imported and called |
| `notification.service.ts` | `pushSubscription.repository.ts` | findActiveByUser then sendNotification per row | VERIFIED | fanOut() confirmed |
| `backend/src/app.ts` | `push.routes.ts` | app.use('/api/push') | VERIFIED | Line 38: app.use('/api/push', pushRoutes) |
| `backend/src/server.ts` | `scheduler.ts` | startScheduler() after app.listen | VERIFIED | server.ts line 21: startScheduler() inside listen callback |
| `reminderDispatch.job.ts` | `notification.service.ts` | sendToAllDevices(userId, payload) | VERIFIED | deps.sendToAll in _dispatchCore |
| `profile.service.ts` | `reminderSchedule.repository.ts` | onMethodChange deactivateTherapySpecific | VERIFIED | deactivateTherapySpecific called in changeTherapyMethod line 112 |
| `ObatCard.tsx` | `/api/medication-log/confirm` | authFetch POST on confirm | VERIFIED | handleConfirm() POSTs to /api/medication-log/confirm |
| `sw.ts` | `/api/medication-log/confirm` (backend) | fetch in notificationclick | FAILED | CR-01: sw.ts line 108 uses relative URL — goes to Vercel not Railway |
| `MedicationReminderForm.tsx` | `/api/reminders` | native fetch multipart | FAILED | CR-03: hariAktif[] bracket causes 400; also hariAktif never reaches backend |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `DeltaCairanCard.tsx` | balance (masuk/keluar/delta) | GET /api/fluid/daily-balance → fluidLog.repository.getDailyBalance | Yes — DB aggregate query | FLOWING |
| `ObatCard.tsx` | entries (MedicationEntry[]) | GET /api/medication-log/today → medicationLog.repository.findTodayByUser | Yes — DB query; but namaObat vs reminderNama field mismatch | HOLLOW — names always undefined (CR-04) |
| `MedicationLogItem.tsx` | log.reminderNama | passed from MedicationLogList → API namaObat field | No — field mismatch, undefined | HOLLOW_PROP (CR-04) |
| `ReminderList.tsx` | reminders | GET /api/reminders → reminderSchedule.repository.listByUser | Yes — real DB query | FLOWING |
| `DeltaCairanCard.tsx` (hasAbnormalCondition) | hasAbnormalCondition | getDailyBalance extended to return CAPD conditions | Yes — computed from kondisiKeluar | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend 113 tests | `cd backend && npm test` | 113/113 pass (0 fail) | PASS |
| encryption round-trip | `npm test -- --test-name-pattern encrypt` | 5/5 pass | PASS |
| fan-out with 410 deactivation | `npm test -- --test-name-pattern fan` | 5/5 pass | PASS |
| fluid service tests | `npm test -- --test-name-pattern fluidLog` | 24/24 pass | PASS |
| reminder service tests | `npm test -- --test-name-pattern reminder` | 15/15 pass | PASS |
| therapy-change hook | `npm test -- --test-name-pattern REMIND-07` | 4/4 pass | PASS |
| dispatch job tests | `npm test -- --test-name-pattern dispatch` | 6/6 pass | PASS |
| hariAktif[] FormData bug | inspect MedicationReminderForm.tsx line 80 | fd.append("hariAktif[]", day) confirmed | FAIL — CR-03 |
| SW notificationclick URL | inspect sw.ts line 108 | fetch("/api/medication-log/confirm"...) — relative URL | FAIL — CR-01 |
| Reminder dispatch timezone | inspect reminderDispatch.job.ts lines 26-31 | new Date().getHours() (UTC, not WIB) | FAIL — CR-02 |
| Medication names in ObatCard | inspect ObatCard.tsx line 184 | {entry.reminderNama} but API returns namaObat | FAIL — CR-04 |

---

## Probe Execution

Step 7c: SKIPPED — no probe-*.sh scripts declared or found in this phase.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|------------|-------------|--------|----------|
| FLUID-01 | 02-04 | Log fluid entry (type, source, CAPD conc, volume, unit) | SATISFIED | fluidLog.schema.ts + fluid.service.ts + CatatCairanForm.tsx; 24/24 tests |
| FLUID-02 | 02-04 | System calculates and displays daily in/out delta | SATISFIED | getDailyBalance server-computed; DeltaCairanCard fetches and renders |
| FLUID-03 | 02-04 | CAPD abnormal effluent → immediate non-dismissable red alert | SATISFIED | CAPDEffluentBanner.tsx — no X icon, action button only |
| FLUID-04 | 02-04 | Retroactive entry with past date/time, flagged as late | SATISFIED | isLateEntry in schema + form; CatatCairanForm isLateEntry checkbox |
| FLUID-05 | 02-04 | Offline save queued in IndexedDB, synced on reconnect | SATISFIED | offlineQueue.ts with idb; registerOnlineListener confirmed |
| REMIND-01 | 02-05, 02-07 | Create medication reminder (name, dose, type, days, time, photo) | BLOCKED | CR-03: hariAktif[] FormData bracket bug — every creation returns 400 |
| REMIND-02 | 02-06 | Push notification at scheduled time showing med name | BLOCKED | CR-02: UTC vs WIB timezone — fires 7h wrong for Jakarta patients |
| REMIND-03 | 02-05, 02-07 | Confirm dose from notification — logged in backend | BLOCKED | CR-01: SW relative URL goes to Vercel not backend; CR-04: UI shows undefined names |
| REMIND-04 | 02-06 | 30-min follow-up if reminder unconfirmed | NEEDS HUMAN | Backend code correct (follow_up_sent guard); depends on REMIND-02 fix + real device |
| REMIND-05 | 02-05, 02-07 | CAPD exchange reminder (time + concentration) | SATISFIED | createCapdSchema + CAPDReminderForm (JSON POST — no CR-03 issue) |
| REMIND-06 | 02-05, 02-07 | HD schedule reminder (days + time) | SATISFIED | createHdSchema + HDReminderForm (JSON POST) |
| REMIND-07 | 02-05, 02-07 | Therapy change preserves obat reminders, deactivates CAPD/HD | SATISFIED | profile.service.ts deactivateTherapySpecific; 4/4 tests pass |
| REMIND-08 | 02-02, 02-06 | Caregiver device receives same reminders independently | NEEDS HUMAN | Architecture correct (endpoint-unique, fan-out); real device verification needed |
| NOTIF-01 | 02-03 | Install as PWA, grant notification permission | NEEDS HUMAN | manifest.ts + sw.ts + NotificationPermissionBanner.tsx built; requires real browser |
| NOTIF-02 | 02-02 | Each device registers its own push subscription independently | SATISFIED | UNIQUE on endpoint; upsertByEndpoint; fan-out to all devices |
| NOTIF-03 | 02-03 | iOS prompts Add to Home Screen before enabling notifications | NEEDS HUMAN | InstallPrompt.tsx + isIos() gate confirmed in code; requires real iPhone |
| RESPONSIVE-01 | 02-01 | 375-767px: single-column, 5-tab bottom nav, centered FAB | NEEDS HUMAN | AppShell renders lg:hidden BottomNav + FAB; visual verification needed |
| RESPONSIVE-02 | 02-01 | 768-1023px: 2-column layout, bottom nav unchanged | NEEDS HUMAN | AppShell responsive structure in place; 2-col is per page; visual check needed |
| RESPONSIVE-03 | 02-01 | 1024px+: left sidebar, bottom nav gone, max-width 1280px | SATISFIED (code) | Sidebar hidden lg:flex; BottomNav lg:hidden; maxWidth 1280px; human confirms visually |
| RESPONSIVE-04 | 02-01 | Layout verified on Chrome/Safari/Firefox at 375/768/1024/1280px | NEEDS HUMAN | Cannot verify cross-browser layout by code inspection |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/components/pengingat/MedicationReminderForm.tsx` | 80 | `fd.append("hariAktif[]", day)` — PHP-style bracket notation; multer never strips brackets | BLOCKER | Every medication reminder POST fails with 400; REMIND-01 non-functional |
| `frontend/app/sw.ts` | 108 | `fetch("/api/medication-log/confirm"...)` — relative URL in service worker | BLOCKER | SW posts to Vercel origin, not Railway backend; REMIND-03 push-confirm always 404 |
| `backend/src/jobs/reminderDispatch.job.ts` | 26-31 | `new Date().getHours()` / `new Date().getDay()` — UTC on cloud servers | BLOCKER | Reminders fire 7h wrong for all Jakarta patients (WIB = UTC+7) |
| `frontend/components/beranda/ObatCard.tsx` | 24, 184 | `reminderNama` field in interface + render; API returns `namaObat` | BLOCKER | All medication names in dashboard Obat card render as undefined |
| `frontend/components/catatan/MedicationLogItem.tsx` | 18, 99 | `reminderNama` field in interface + render; API returns `namaObat` | BLOCKER | All medication names in Catatan/Obat log render as undefined |
| `backend/src/repositories/pushSubscription.repository.ts` | 65 | `.then((rows) => rows.filter((r) => r.aktif === true))` — JS filter instead of SQL WHERE | WARNING | Fetches all subscription history over wire on every fan-out; inefficient under concurrent use |
| `backend/src/repositories/medicationLog.repository.ts` | 23-26 | `new Date()` for midnight boundary — UTC not WIB | WARNING | Log entries after UTC midnight but before WIB midnight appear on wrong day |
| `frontend/components/catatan/MedicationLogList.tsx` | ~62 | Optimistic confirm with empty catch — no revert on API error | WARNING | UI shows confirmed while backend still shows tertunda; follow-up cron fires contradicting notification |
| `backend/src/db/schema/reminderSchedule.schema.ts` | ~12-13 | `hariAktif` and `aktif` columns without `.notNull()` | WARNING | Reminder silently never dispatches if NULL slips in; SQL comparison with NULL evaluates to NULL |
| `backend/src/lib/upload.ts` | 29 | `Math.random().toString(36).slice(2, 8)` for filename — not cryptographically secure | WARNING | Filename collision possible under concurrent uploads; use crypto.randomBytes |
| `backend/src/controllers/fluid.controller.ts` | ~70 | `console.log` for CAPD acknowledgment audit instead of pino | INFO | Safety-critical audit record not queryable by field in Railway log aggregators |

---

## Human Verification Required

### 1. PWA Install on Desktop Chrome + Android Chrome

**Test:** Run the app over HTTPS (or localhost), open DevTools Application tab. Check Manifest shows name KidneyBuddy, display standalone, icons load. Check service worker is registered at /serwist/sw.js and activated. Check install icon appears in address bar. On Android Chrome, test Add to Home Screen and grant notification permission.
**Expected:** Manifest validates; SW registered; install available; Android notification permission triggers a push_subscriptions row in DB.
**Why human:** Requires running HTTPS instance with real icon files in public/icons/ and a browser with DevTools.

### 2. iOS Add-to-Home-Screen Gate (NOTIF-03)

**Test:** Open the site in Safari on a real iPhone (not from Home Screen). Check the NotificationPermissionBanner area renders the "Pasang ke Home Screen Dulu" interstitial. Then add to Home Screen, open from the icon, tap Aktifkan Notifikasi — check the iOS permission dialog appears.
**Expected:** InstallPrompt interstitial shown before any permission button on iOS Safari not in standalone mode. After installing, iOS permission dialog fires correctly (confirms Notification.requestPermission() is in click handler per NOTIF-03).
**Why human:** Requires a physical iPhone with iOS Safari; iOS push behavior cannot be emulated.

### 3. Multi-Device Caregiver Subscription (NOTIF-02 / REMIND-08)

**Test:** Log in with the same account on two different devices (or browser profiles). Grant notification permission on both. Check push_subscriptions table has two rows with different endpoints (verify with DB query). Then trigger a reminder — check both devices receive the push.
**Expected:** Two distinct rows in push_subscriptions; both devices receive notification independently.
**Why human:** Requires two physical devices with VAPID keys configured and a live Railway backend.

### 4. Responsive Layout at Exact Breakpoints (RESPONSIVE-04)

**Test:** In Chrome DevTools device toolbar: set 375px (single-column, bottom nav + FAB), then 768px (2-col content, bottom nav unchanged), then 1024px (sidebar appears, bottom nav gone, top bar), then 1280px (max-width centered). Repeat in Firefox desktop and real/emulated Safari iOS.
**Expected:** Each breakpoint shows the distinct layout specified in RESPONSIVE-01..04.
**Why human:** Visual layout correctness at exact pixel breakpoints requires browser DevTools.

### 5. Push Notification Delivery + Follow-up (REMIND-02 / REMIND-04) — After CR-02 Fix

**Test:** After applying the WIB timezone fix (CR-02), create a medication reminder for ~2 minutes from now. Wait and confirm a push arrives at the correct WIB time with the medication name. Do not confirm; wait 30+ minutes to verify exactly one follow-up push arrives ("Pengingat Terlewat") and no further ones.
**Expected:** Push at correct Jakarta time; one follow-up only.
**Why human:** Requires VAPID keys, real push permission, and a 30-minute wait; CR-02 fix must be applied first.

### 6. Fluid Offline Queue Sync (FLUID-05)

**Test:** With a logged-in session, set DevTools Network to Offline. Submit a fluid entry. Confirm the "Catatan disimpan dan akan disinkronkan" toast and an IndexedDB entry in fluidQueue. Toggle back to Online. Confirm "Catatan berhasil disinkronkan" toast and entry appears in fluid log.
**Expected:** Entry queued offline, synced automatically on reconnect.
**Why human:** Requires a running app with auth session and DevTools network throttling.

---

## Gaps Summary

Four critical bugs confirmed in the actual codebase (not just in the 02-REVIEW.md findings) block the phase goal from being fully achieved:

**CR-01 (sw.ts line 108):** The service worker uses a relative URL for the dose confirmation POST. This means push-triggered "Sudah diminum" actions silently fail — the request goes to the Vercel frontend (which returns 404), not the Railway backend. REMIND-03 (dose confirmation from notification) is non-functional.

**CR-02 (reminderDispatch.job.ts lines 26-31):** Reminder dispatch uses UTC time on a Railway/Render server where TZ=UTC. A patient in Jakarta who sets a reminder for 08:00 will receive it at 15:00 WIB (7 hours late). This affects every patient in the target market (Indonesia is WIB UTC+7). REMIND-02 (push at scheduled time) is effectively non-functional.

**CR-03 (MedicationReminderForm.tsx line 80):** The medication reminder form uses PHP-style bracket notation (`hariAktif[]`) when appending active days to FormData. Express/multer does not strip brackets — `req.body.hariAktif` is always `undefined` on the backend. Zod throws "Pilih minimal satu hari aktif" and every medication reminder creation returns HTTP 400. REMIND-01 (create medication reminder) is non-functional via the UI.

**CR-04 (ObatCard.tsx line 24+184, MedicationLogItem.tsx line 18+99):** The frontend interfaces declare `reminderNama` but the medication_log API returns `namaObat` (matching the DB column). All medication names in the Beranda Obat card and the Catatan/Obat log render as `undefined`. The medication tracking UI is visually broken for all users.

Additionally, CAPD/HD reminder creation (REMIND-05, REMIND-06) is unaffected by CR-03 since those forms use JSON authFetch, not FormData. The push subscription infrastructure, fluid tracking, and therapy-change hook are all correctly implemented. Backend tests: 113/113 pass.

The four bugs require targeted fixes (all small: one-line for CR-03, URL change for CR-01, offset calculation for CR-02, field rename for CR-04) before REMIND-01..03 can be considered working in production.

---

*Verified: 2026-06-27T10:00:00Z*
*Verifier: Claude (gsd-verifier)*
