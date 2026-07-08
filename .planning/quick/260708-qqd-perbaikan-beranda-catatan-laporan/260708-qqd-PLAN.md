---
slug: 260708-qqd-perbaikan-beranda-catatan-laporan
type: quick
autonomous: true
tasks: 3
files_modified:
  - backend/src/repositories/dailyActivity.repository.ts
  - backend/src/services/activities.service.ts
  - backend/src/controllers/activities.controller.ts
  - backend/src/routes/activities.routes.ts
  - frontend/components/aktivitas/KegiatanModuleInline.tsx
  - frontend/components/catatan/FluidLogList.tsx
  - frontend/components/aktivitas/ActivityList.tsx
  - frontend/components/lab/WeeklyInsightCard.tsx
  - backend/src/services/aiInsight.service.ts
  - backend/src/repositories/report.repository.ts
  - backend/src/services/report.service.ts
  - backend/src/test/report.service.test.ts
  - frontend/components/laporan/sections/RingkasanCairan.tsx
  - frontend/components/laporan/sections/AktivitasReport.tsx
  - frontend/components/laporan/LaporanPreviewContent.tsx
commit_prefix: "quick-260708-qqd"
---

<objective>
Six UI/UX & report fixes across /beranda, /catatan, and /laporan for KidneyBuddy (Bahasa Indonesia app, teal/amber/cream design system).

1. Beranda "Mulai Kegiatan": show ALL currently-in-progress activities (each with its own "Selesai" button), while keeping the "Mulai Kegiatan" start entry point.
2. Catatan tab Cairan: after each day-group header (Hari Ini / Kemarin / date), also show that day's total fluid balance (selisih = total masuk − total keluar).
3. Catatan "AI Wawasan Tren Mingguan": rename visible text to "Wawasan Mingguan", AND diagnose+fix the browser freeze when clicking "Buat Ulang Wawasan".
4. Catatan tab Aktivitas: display total duration in minutes for each activity entry (including completed).
5. Laporan "Ringkasan Cairan": remove Total Masuk, Total Keluar, Selisih Total — keep only Rata-rata Selisih Harian.
6. Laporan: add a new "Aktivitas" section with a table of ALL activity data (nama, tanggal, waktu, durasi menit, perasaan, catatan) — on screen AND print/PDF.

Purpose: PO-requested polish before demo. No regressions; seed must stay consistent.
Output: working fixes verified via frontend build + backend tsc (must stay at exactly 4 pre-existing errors) + API smoke checks.
</objective>

<context>
@.planning/STATE.md
@CLAUDE.md

Key facts gathered during planning (executor: trust these, but re-read files before editing):
- Frontend Next.js 16 App Router (`frontend/`), backend Express 5 + Drizzle (`backend/`). JSON API calls go same-origin via `authFetch` → `/api/*` (Next rewrites proxy). Keep that pattern.
- Backend has EXACTLY 4 pre-existing tsc errors (2 in `dialysisLog.controller.ts` lines 46/68, 2 in `medicationLog.controller.ts` lines 47/69 — all `string | string[]`). These MUST NOT grow. Any NEW error is a regression.
- Backend deploy fact: container CMD is plain `node --import tsx src/server.ts` (NO nodemon) — source edits require `docker restart kidneybuddy-backend` to take effect. Frontend prod build is baked into the image — needs rebuild to see changes. (Local `npm run build` / `npx tsc` verification does NOT require Docker.)
- Commits: conventional, mention `quick-260708-qqd`, NO Co-Authored-By lines. NEVER `git add -A` — stage explicit paths only (repo has unrelated dirty files).
- Encryption: `daily_activities.catatanPerasaan` is AES-256-GCM encrypted at rest; `activities.service.ts` decrypts via `formatActivity(..., realDecrypt)`. Report activity notes MUST be decrypted in the service layer before returning (never expose ciphertext).
- Seed: `backend/src/seed/generate-demo-data.ts` `generateActivities()` ALREADY populates `waktuMulai`, `waktuSelesai`, and `catatanPerasaan` for completed activities (ACTIVITY_POOL lines 671-680 + doctor visit). Durations and notes already exist — seed changes are LIKELY UNNECESSARY. Only touch the seed if you find a genuine data gap; if you do, note that the RNG stream is sequential (a prior task documented that editing generation shifts downstream JSON UUIDs/content — see STATE.md 260707-01r), so re-generate + re-load deterministically and prefer the smallest change.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Beranda multiple in-progress activities + fluid daily balance + activity duration (fixes 1, 2, 4)</name>
  <files>
    backend/src/repositories/dailyActivity.repository.ts,
    backend/src/services/activities.service.ts,
    backend/src/controllers/activities.controller.ts,
    backend/src/routes/activities.routes.ts,
    frontend/components/aktivitas/KegiatanModuleInline.tsx,
    frontend/components/catatan/FluidLogList.tsx,
    frontend/components/aktivitas/ActivityList.tsx
  </files>
  <action>
FIX 1 — All in-progress activities on beranda:
Backend: add `findAllActiveByUser(userId)` to `dailyActivity.repository.ts` returning an ARRAY of `status = 'berlangsung'` rows (mirror the existing `findActiveByUser` single-row query but drop the LIMIT 1 / return all, ordered by `waktuMulai` asc; keep the same soft-delete exclusion the other finders use). Add `getActiveActivities(userId): Promise<ActivityResult[]>` in `activities.service.ts` mapping rows through the existing `formatActivity(row, realDecrypt)`. Add controller `getActiveList` in `activities.controller.ts` and register `GET /api/activities/active-all` in `activities.routes.ts` BEFORE the `/:id/complete` route (route-ordering note already in that file). Do NOT change the existing `/active` route (only KegiatanModuleInline consumes it — grep-confirmed — but leave it intact to avoid surprise breakage).
Frontend `KegiatanModuleInline.tsx`: switch the fetch from `/api/activities/active` (single) to `/api/activities/active-all` (array). Render EVERY active activity as its own row, each keeping the existing within-estimate elapsed "· Xm" vs past-estimasi "Terlambat X Menit" indicator logic and its own "Selesai" button (each dispatches the existing `activity:complete` CustomEvent with that activity's id + namaKegiatan). Additionally ALWAYS render the "Mulai Kegiatan" start entry (the existing teal-gradient Play card that dispatches `activity:start`) — when there are 0 active activities it is the only thing shown (current behavior); when there are ≥1 active activities, show the active rows AND keep a (compact) "Mulai Kegiatan" entry so the user can start another. Preserve `self-start`, the 60s `now` tick, device-timezone formatters, and the amber overdue styling. Keep design tokens (#2a9d8f teal, #ef9f27 amber, #d4183d red, rounded 16).

FIX 2 — Daily fluid balance per group in `FluidLogList.tsx`:
Inside the grouped render (the IIFE that maps `sortedDates`), for each day-group compute `selisih = sum(volume where tipe==='masuk') − sum(volume where tipe==='keluar')` over `groups[dateKey]`. Render it next to / under the day label (`getGroupLabel(dateKey)`), e.g. a small pill/text "Selisih: {sign}{selisih} ml" using the same +/−/0 color convention already used elsewhere (positive #2a9d8f, negative #d4183d, zero #7a8c8a). Keep the existing label styling; do not disturb the per-entry `FluidLogItem` rendering or the "{n} catatan" footer.

FIX 4 — Activity total duration (minutes) per entry in `ActivityList.tsx`:
`computeDurationMinutes(waktuMulai, waktuSelesai)` already exists and works for both completed (uses waktuSelesai) and active (falls back to now). Currently the duration badge only renders for `status !== 'selesai'`. Add a visible "Durasi total: X menit" (or "Xj Ym" when ≥60, reuse the existing hours/mins split already computed as `durText`) for EVERY entry INCLUDING completed ones. Place it in the details column (e.g. under the date/time line at ~13px #3d6b66) so completed activities also show their total duration. Do not remove the existing overdue badge for active entries.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit 2>&1 | grep -c "error TS"</automated>
    (Expect exactly 4 — the pre-existing baseline. Any higher = regression, fix before continuing.)
  </verify>
  <done>Backend exposes `GET /api/activities/active-all` returning an array of berlangsung activities; beranda renders all in-progress activities each with a Selesai button plus a Mulai Kegiatan entry; /catatan Cairan shows per-day selisih; /catatan Aktivitas shows total duration in minutes on every entry. Backend tsc still at 4 errors.</done>
</task>

<task type="auto">
  <name>Task 2: Weekly insight rename + diagnose & fix regenerate freeze (fix 3)</name>
  <files>
    frontend/components/lab/WeeklyInsightCard.tsx,
    backend/src/services/aiInsight.service.ts
  </files>
  <action>
RENAME (fix 3a): In `WeeklyInsightCard.tsx`, change the visible header text "Wawasan Tren Mingguan" → "Wawasan Mingguan". Leave the internal component name, comments, and the "Berdasarkan data 7-30 hari terakhir" caption as-is unless they contain the user-visible phrase. Do not change API routes or the empty-state heading "Belum Ada Wawasan Minggu Ini" (that's a different string).

DIAGNOSE FIRST — DO NOT GUESS (fix 3b): The user reports Chrome freezes / "not responding" when clicking "Buat Ulang Wawasan" (regenerate weekly insight), while "Buat Ulang Ringkasan" (daily summary) is fine. Before changing ANY behavior, READ and COMPARE both code paths end-to-end and write down (in your head / SUMMARY) the concrete root cause:
  - Frontend: `WeeklyInsightCard.tsx handleGenerate` vs `AiDailySummaryCard.tsx handleGenerate` (they look near-identical — POST `/api/ai/weekly-insight/regenerate` vs `/api/ai/daily-summary/regenerate`, both go through `splitAiText`). Confirm whether the freeze is actually client-side (main-thread block / re-render loop) or a very-long-running/among request that only APPEARS as a freeze.
  - Backend: `aiInsight.service.ts generateAndCacheWeeklyInsight` / `gatherWeeklyData` vs the daily summary equivalent in `aiSummary.service.ts`. Note candidate causes to verify (do not assume): (a) `labResultRepo.findByUser(userId, { includeArchived:false })` fetches ALL lab rows unbounded then filters — check row volume; (b) the 6-way `Promise.all` gathering 30 days across fluid/CAPD/med/dialysis/lab/activity — compare against daily's data-gathering cost; (c) Groq call config `{ timeout: 20_000, maxRetries: 2 }` → up to ~60s worst case, vs daily's config — a 60s hang with retries can present as an unresponsive tab if the UI or an upstream proxy blocks; (d) any difference in how the two frontend cards mount/re-render (WeeklyInsightCard renders on EVERY /catatan sub-tab, always mounted).
  Identify the ACTUAL cause with evidence (compare the two paths side by side; if backend, reproduce with a curl to the regenerate endpoint and observe latency). THEN apply the minimal fix that makes weekly regenerate behave like daily regenerate (fast, no freeze) — e.g. bound the lab query to the same date range as the other gathers, align the Groq timeout/retry config with the daily path, and/or fix any frontend re-render issue you actually find. Keep the D-18 throw-on-Groq-failure contract (AppError 503 AI_UNAVAILABLE, no cached fallback) — do NOT introduce a cached fallback.
  Document the confirmed root cause in the SUMMARY.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit 2>&1 | grep -c "error TS"</automated>
    (Expect 4.) Then, with the backend running (docker or local), smoke-check the endpoint responds in reasonable time:
    <automated>curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" -X POST -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/ai/weekly-insight/regenerate</automated>
    (Skip the curl if no running backend/token is available; rely on the code-path diagnosis + build instead.)
  </verify>
  <done>Header reads "Wawasan Mingguan"; the regenerate freeze root cause is identified with evidence and fixed so "Buat Ulang Wawasan" completes without freezing Chrome; D-18 error contract preserved; backend tsc still 4 errors; frontend builds.</done>
</task>

<task type="auto">
  <name>Task 3: Laporan — trim Ringkasan Cairan + add Aktivitas table section (fixes 5, 6)</name>
  <files>
    frontend/components/laporan/sections/RingkasanCairan.tsx,
    frontend/components/laporan/sections/AktivitasReport.tsx,
    frontend/components/laporan/LaporanPreviewContent.tsx,
    backend/src/repositories/report.repository.ts,
    backend/src/services/report.service.ts,
    backend/src/test/report.service.test.ts
  </files>
  <action>
FIX 5 — Trim Ringkasan Cairan summary: In `RingkasanCairan.tsx`, REMOVE the three summary cards "Total Masuk", "Total Keluar", and "Selisih Total" from the top grid. KEEP ONLY the "Rata-rata Selisih Harian" card (it can now be a single full-width card instead of a 2-col grid item). KEEP the "Rincian Harian" per-day table below unchanged (user did not ask to remove it). The `totalIn`/`totalOut`/`balance` fields stay in the data type/props (backend still sends them) — just stop rendering the three cards; leave `hasData` logic intact. This applies to both the on-screen preview and print (same component renders both).

FIX 6 — Aktivitas report section (screen + print):
Backend — data:
  - In `report.repository.ts`, add `getActivitiesByRange(userId, startDate, endDate)` returning the user's daily_activities within the WIB-correct range (mirror `getDialysisAdherenceByRange`'s `T00:00:00+07:00` / `T23:59:59+07:00` boundary pattern, filtering on `waktuMulai`; exclude soft-deleted rows the same way other activity finders do). Select the raw columns needed: namaKegiatan, waktuMulai, waktuSelesai, estimasiSelesai, status, perasaan, catatanPerasaan (still ENCRYPTED here). Order by waktuMulai asc.
  - In `report.service.ts`: add a `getActivitiesByRangeForReport(userId, dari, sampai)` helper (like the existing `getAnomaliesByRangeForReport`) that calls the repo and returns rows with `catatanPerasaan` DECRYPTED (use `decrypt` already imported) and a computed `durasiMenit` = round((waktuSelesai − waktuMulai)/60000) when waktuSelesai present, else null. Define a `ReportActivityRow` type (tanggal WIB-date via the existing `toWibDateStr`, waktuMulai, waktuSelesai, namaKegiatan, durasiMenit, perasaan, catatan). Add `activities: ReportActivityRow[]` to `ReportResponse`.
  - Thread it through `_generateReportCore`: add a final param `getActivitiesFn: GetActivitiesFn = async () => []` (DEFAULT MUST be the empty-array no-op, NOT the real DB impl — this keeps the 12 existing `report.service.test.ts` calls green without a DB and without editing them; the field is additive so existing assertions are unaffected). Include `activities` (await it inside the `Promise.all`) in the returned object. In the production `reportService.generateReport` wrapper, PASS the real `getActivitiesByRangeForReport` as that final argument.
  - Add ONE new assertion to `report.service.test.ts`: call `_generateReportCore` with a fake activities fn returning a sample row and assert `result.activities` is passed through with decrypted catatan + computed durasiMenit. (Keep all existing calls exactly as they are — they simply omit the new param and get `[]`.)
Frontend — UI:
  - Create `frontend/components/laporan/sections/AktivitasReport.tsx` exporting an `ActivityReportRow` type and a default `AktivitasReport({ activities })` component. Render a section card titled "Aktivitas" (same `.laporan-section-card` wrapper + teal left-accent header pattern as `RingkasanCairan.tsx`), containing a table with columns: Tanggal, Kegiatan, Durasi (menit), Perasaan, Catatan. Show catatan text (the finish-time note). Empty state mirrors RingkasanCairan's empty pattern when `activities.length === 0`. Use the same table styling as the "Rincian Harian" table. All labels in Bahasa Indonesia.
  - In `LaporanPreviewContent.tsx`: add `activities: ActivityReportRow[]` to `ReportData`, import `AktivitasReport`, and render `<AktivitasReport activities={report.activities} />` as a new section (place it after Kepatuhan Obat / Cuci Darah, before or after Anomali — pick a sensible clinical order and keep it consistent). Since the preview component renders both the on-screen view and the print/PDF (window.print of the same DOM), this automatically covers print.
Seed: The demo seed already populates activity waktuSelesai + catatanPerasaan (verified). Do NOT modify the seed unless a smoke check reveals the report activities table is empty/missing notes for a demo persona — only then apply the smallest deterministic seed fix and re-generate + re-load.
  </action>
  <verify>
    <automated>cd backend && npx tsc --noEmit 2>&1 | grep -c "error TS"</automated>
    (Expect 4.) Then run the report unit tests:
    <automated>cd backend && npx tsx --test src/test/report.service.test.ts 2>&1 | tail -15</automated>
    (All existing report tests + the new activities assertion pass.)
  </verify>
  <done>Ringkasan Cairan shows only Rata-rata Selisih Harian (three summary cards removed, daily table kept); the report (screen + print) has an Aktivitas section listing every activity with tanggal, kegiatan, durasi in minutes, perasaan, and the finish-time catatan (decrypted); backend response includes `activities`; report unit tests green; backend tsc still 4 errors.</done>
</task>

</tasks>

<verification>
Run after all tasks complete:
1. Backend types (must equal the pre-existing baseline, not grow):
   `cd backend && npx tsc --noEmit 2>&1 | grep -c "error TS"` → expect **4**.
   Confirm they are the SAME 4 (dialysisLog.controller 46/68, medicationLog.controller 47/69), not new ones.
2. Backend report tests: `cd backend && npx tsx --test src/test/report.service.test.ts` → all pass.
3. Frontend production build (WSL /mnt/c is SLOW — use a long timeout, ~10-15 min):
   `cd frontend && npm run build` → succeeds with no type errors.
4. API smoke (only if a backend + auth token are handy; otherwise skip):
   - `GET /api/activities/active-all` → 200, JSON array.
   - `POST /api/ai/weekly-insight/regenerate` → completes promptly (record time_total), returns 200 or the D-18 503, not a hang.
   - `GET /api/report?dari=YYYY-MM-DD&sampai=YYYY-MM-DD` → 200, response includes an `activities` array.
</verification>

<success_criteria>
- Fix 1: /beranda shows all in-progress activities, each with a working Selesai button, and the Mulai Kegiatan start entry remains.
- Fix 2: /catatan Cairan shows each day's total selisih next to the day label.
- Fix 3: header says "Wawasan Mingguan"; "Buat Ulang Wawasan" no longer freezes Chrome; root cause documented in SUMMARY.
- Fix 4: /catatan Aktivitas shows total duration in minutes on every activity entry.
- Fix 5: Laporan Ringkasan Cairan shows only Rata-rata Selisih Harian.
- Fix 6: Laporan has an Aktivitas section (table w/ all data incl. notes + durations) on screen and in print/PDF.
- No regressions: backend tsc stays at exactly 4 pre-existing errors; frontend builds; report tests pass; seed remains consistent (unchanged unless a genuine gap is found).
- Commits use conventional format mentioning `quick-260708-qqd`, no Co-Authored-By, explicit path staging only.
</success_criteria>

<output>
Create `.planning/quick/260708-qqd-perbaikan-beranda-catatan-laporan/260708-qqd-SUMMARY.md` when done. In it, MUST document the confirmed root cause of the fix-3 regenerate freeze (with the evidence that identified it) and note whether the seed was touched (and why/why not).
</output>
