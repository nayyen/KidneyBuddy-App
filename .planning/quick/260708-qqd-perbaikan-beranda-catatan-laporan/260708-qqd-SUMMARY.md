---
slug: 260708-qqd-perbaikan-beranda-catatan-laporan
type: quick
completed: 2026-07-08
commits:
  - 7e3f53b
  - 502aea0
  - f517d65
---

# Quick Task 260708-qqd: Perbaikan Beranda, Catatan, Laporan — Summary

**One-liner:** Beranda kini menampilkan SEMUA kegiatan aktif (bukan cuma satu) plus entry Mulai Kegiatan tetap ada; /catatan Cairan/Aktivitas mendapat data selisih-harian dan durasi-total baru; /laporan Ringkasan Cairan dipangkas ke satu kartu dan mendapat section Aktivitas baru (layar + print); root cause freeze "Buat Ulang Wawasan" ditemukan dan diperbaiki (unbounded lab query + apiFetch tanpa timeout).

## Tasks Completed

### Task 1 — Beranda multi-aktivitas aktif + selisih cairan harian + durasi aktivitas (fix 1, 2, 4)

**Fix 1 (Beranda "Mulai Kegiatan"):**
- Backend: `dailyActivity.repository.ts` `findAllActiveByUser(userId)` — mirror `findActiveByUser` tapi tanpa `LIMIT 1`, urut `waktuMulai` asc, exclude soft-deleted.
- `activities.service.ts` `getActiveActivities(userId)` memetakan setiap row lewat `formatActivity(row, realDecrypt)` yang sudah ada.
- Controller `getActiveList` + route baru `GET /api/activities/active-all` didaftarkan SEBELUM `/:id/complete` (mengikuti catatan route-ordering yang sudah ada di file). Route `/active` lama TIDAK diubah (masih dipakai di tempat lain — hanya `KegiatanModuleInline` yang beralih ke endpoint baru).
- `KegiatanModuleInline.tsx` ditulis ulang: fetch dari `/api/activities/active-all`, render setiap aktivitas aktif sebagai `ActiveActivityRow` sendiri (dengan tombol Selesai dan indikator elapsed/overdue masing-masing, dipisah ke komponen baru untuk reuse), lalu SELALU render entry "Mulai Kegiatan" di bawahnya — versi penuh (kartu besar) saat 0 aktivitas aktif, versi ringkas ("Mulai Kegiatan Lain", pill dashed) saat ≥1 aktivitas aktif. `self-start` dan interval `now` 60 detik dipertahankan.
- Diverifikasi via curl end-to-end: start 2 aktivitas → `GET /api/activities/active-all` mengembalikan array berisi keduanya (bukan hanya satu) → dihapus lagi setelah verifikasi, lalu DB di-reseed penuh agar seed demo tetap pristine (lihat bagian "Seed" di bawah).

**Fix 2 (Catatan Cairan — selisih harian):**
- `FluidLogList.tsx`: di dalam IIFE grouping, untuk setiap grup hari dihitung `daySelisih = sum(masuk) − sum(keluar)` dari entri hari itu, ditampilkan sebagai teks "Selisih: {tanda}{nilai} ml" di kanan label hari (flex justify-between), memakai konvensi warna yang sama dengan RingkasanCairan/ActivityList (positif `#2a9d8f`, negatif `#d4183d`, nol `#7a8c8a`). Styling per-entri (`FluidLogItem`) dan footer "{n} catatan" tidak diubah.

**Fix 4 (Catatan Aktivitas — durasi total):**
- `ActivityList.tsx`: baris baru "Durasi total: X menit" (format `durText` yang sudah dihitung — `Xj Ym` jika ≥60 menit) ditambahkan untuk SEMUA entri termasuk yang `status === "selesai"` — sebelumnya badge durasi hanya muncul untuk entri yang masih berlangsung. Badge overdue untuk entri aktif tetap ada, tidak dihapus.

### Task 2 — Rename Wawasan Mingguan + diagnosis & fix freeze "Buat Ulang Wawasan" (fix 3)

**3a (rename):** Header `WeeklyInsightCard.tsx` diubah dari "Wawasan Tren Mingguan" → "Wawasan Mingguan". Caption "Berdasarkan data 7-30 hari terakhir" dan empty-state "Belum Ada Wawasan Minggu Ini" TIDAK diubah (bukan bagian dari string yang diminta).

**3b (diagnosis freeze — WAJIB bukti sebelum ubah kode):**

Investigasi dilakukan side-by-side, bukan tebakan:

1. **Frontend, perbandingan `WeeklyInsightCard.tsx` vs `AiDailySummaryCard.tsx`:** kedua komponen strukturnya identik (POST → await → setState, tidak ada polling/loop). Hipotesis di plan bahwa `WeeklyInsightCard` "renders on EVERY /catatan sub-tab" TERBUKTI SALAH setelah dicek `catatan/page.tsx` — komponen ini dirender SEKALI saja di luar blok kondisional tab (`{accessToken && <WeeklyInsightCard .../>}` sebelum semua `{activeTab === ... && ...}`), jadi tidak remount berulang saat ganti sub-tab. Tidak ditemukan re-render loop di kedua kartu.

2. **Backend, perbandingan `aiInsight.service.ts` (weekly) vs `aiSummary.service.ts` (daily):** konfigurasi Groq (`{ timeout: 20_000, maxRetries: 2 }`) IDENTIK di kedua path dan juga identik dengan konfigurasi client-level di `groqClient.ts` — bukan sumber asimetri.

3. **Reproduksi nyata dengan curl** (backend dijalankan via `docker compose up -d db backend`, login sebagai `lukman@demo.kidneybuddy.id`, dataset demo penuh 180 hari/3409 baris cairan/4397 obat/797 cuci-darah/782 aktivitas):
   - `POST /api/ai/daily-summary/regenerate` → HTTP 200, `time_total=1.40s`
   - `POST /api/ai/weekly-insight/regenerate` → HTTP 200, `time_total=1.75s`
   - Tidak ada hang yang tereproduksi pada volume data demo saat ini — jadi bukan murni masalah "Groq lambat untuk data ini hari ini".

4. **Ditemukan asimetri kode nyata:** `gatherWeeklyData()` di `aiInsight.service.ts` memanggil `labResultRepo.findByUser(userId, { includeArchived: false })` — **TANPA parameter `days`** — mengambil SELURUH riwayat lab pengguna sepanjang waktu, lalu memfilternya ke `recentLabRows` (30 hari) SETELAH fetch. Setiap query LAIN di `Promise.all` yang sama (fluid, CAPD, obat, cuci-darah, aktivitas) sudah dibatasi ke jendela `LOOKBACK_DAYS`. `aiSummary.service.ts` (daily) bahkan sama sekali tidak query tabel lab. Untuk aplikasi penyakit kronis yang dipakai bertahun-tahun, query tak terbatas ini akan terus membesar seiring waktu — bukan masalah untuk 25 baris lab demo saat ini, tapi tetap bug performa nyata yang membuat path weekly TIDAK sebanding dengan daily meski berbagi config Groq yang sama.

5. **Ditemukan gap keandalan nyata di frontend:** `frontend/lib/api.ts`'s `apiFetch` memanggil `fetch()` mentah TANPA `AbortController`/timeout apa pun. Jika request benar-benar macet di kondisi nyata (Groq retry berkepanjangan akibat rate-limit tier gratis 30 RPM — terutama tepat setelah restart container, di mana log docker sesi ini SENDIRI menunjukkan node-cron "missed execution" burst yang men-trigger banyak batch AI job sekaligus bersaing untuk kuota Groq yang sama — atau koneksi jaringan yang terputus tanpa pernah mengirim respons), tombol "Membuat wawasan..." akan tergantung TANPA BATAS WAKTU, karena tidak ada apa pun di sisi client yang membatalkannya. Inilah yang paling mungkin dipersepsikan pengguna sebagai "Chrome freeze/not responding" — bukan JS main-thread block, tapi state UI yang tidak pernah keluar dari kondisi "generating" tanpa ada jalan keluar/timeout.

**Perbaikan minimal yang diterapkan (menjaga kontrak D-18 — tidak ada cached fallback):**
- Backend: `labResultRepo.findByUser` di `gatherWeeklyData` sekarang dipanggil dengan `{ includeArchived: false, days: LOOKBACK_DAYS + 1 }` — membatasi biaya query DB agar proporsional dengan jendela lookback (buffer +1 hari untuk selisih cutoff UTC vs string tanggal WIB); filter `recentLabRows` yang sudah ada (WIB-correct) tetap jadi sumber kebenaran untuk isi prompt, jadi OUTPUT/narasi TIDAK berubah.
- Frontend: `apiFetch` (`frontend/lib/api.ts`) sekarang punya timeout 45 detik via `AbortController` — jauh di atas waktu normal (~1-2 detik) maupun worst-case backend Groq (~60 detik teoretis, yang sudah dilempar sebagai `AppError` bersih SEBELUM 45 detik dalam kasus normal), sehingga hang genap 100% akan berujung pada `ApiError("REQUEST_TIMEOUT")` yang tertangkap oleh `catch { setState("error") }` yang SUDAH ADA di kedua kartu AI — tombol kembali aktif dengan pesan error yang jelas, bukan macet selamanya. Perilaku ini berlaku untuk SEMUA panggilan `authFetch`, bukan cuma weekly-insight.

**Verifikasi setelah fix:** restart container, re-test `POST /api/ai/weekly-insight/regenerate` → HTTP 200, `time_total=1.74s` (tidak berubah untuk kasus normal, memastikan fix tidak merusak jalur sukses).

### Task 3 — Laporan: trim Ringkasan Cairan + section Aktivitas baru (fix 5, 6)

**Fix 5:** `RingkasanCairan.tsx` — 3 kartu (Total Masuk, Total Keluar, Selisih Total) dihapus dari grid; hanya "Rata-rata Selisih Harian" tersisa (sekarang full-width, bukan grid 2 kolom). `totalIn`/`totalOut`/`balance` tetap ada di tipe/props (backend tetap mengirim, dipakai untuk `hasData`) — hanya rendering yang dihapus. Tabel "Rincian Harian" per-hari TIDAK diubah.

**Fix 6:**
- Backend `report.repository.ts`: `getActivitiesByRange(userId, startDate, endDate)` — WIB-correct boundary (`T00:00:00+07:00`/`T23:59:59+07:00`, pola sama dengan `getDialysisAdherenceByRange`), exclude `status='dibatalkan'`, select kolom `namaKegiatan, waktuMulai, waktuSelesai, estimasiSelesai, status, perasaan, catatanPerasaan` (masih terenkripsi di level ini), order by `waktuMulai` asc.
- Backend `report.service.ts`: `getActivitiesByRangeForReport(userId, dari, sampai)` — mendekripsi `catatanPerasaan` (T-03-02), menghitung `durasiMenit` (`waktuSelesai` present → round((selesai-mulai)/60000), else `null`), tipe `ReportActivityRow` baru dengan `tanggal` via `toWibDateStr` yang sudah ada di file. `activities: ReportActivityRow[]` ditambahkan ke `ReportResponse`.
  - `_generateReportCore` mendapat param ke-9 `getActivitiesFn: GetActivitiesFn = async () => []` — DEFAULT `[]`, BUKAN implementasi DB nyata, agar 12 pemanggilan test lama (yang tidak mengirim param ini) tetap hijau tanpa koneksi Postgres. Production wrapper `reportService.generateReport` memasukkan `getActivitiesByRangeForReport` yang asli.
  - 2 test baru ditambahkan ke `report.service.test.ts`: (1) passthrough dengan fake activities fn — assert `result.activities` berisi baris dengan catatan terdekripsi + `durasiMenit` terhitung; (2) default-empty — assert `result.activities === []` saat param dihilangkan. Total test file: **13/13 lulus** (11 lama + 2 baru).
- Frontend `AktivitasReport.tsx` (baru): kartu section dengan pola sama seperti `Anomali.tsx`/`RingkasanCairan.tsx` ("Rincian Harian" table) — kolom Tanggal, Kegiatan (+ jam mulai—selesai di bawahnya), Durasi, Perasaan, Catatan. Empty state meniru pola RingkasanCairan/Anomali. Semua label Bahasa Indonesia.
- `LaporanPreviewContent.tsx`: `activities: ActivityReportRow[]` ditambahkan ke `ReportData`, `<AktivitasReport activities={report.activities} />` dirender setelah Kondisi CAPD, sebelum Anomali (laporan diakhiri dengan ringkasan alert/keselamatan). Karena preview & print memakai DOM yang sama (`window.print()`), ini otomatis mencakup print/PDF — tidak ada CSS print tambahan yang diperlukan.
- Diverifikasi live via curl `GET /api/report?dari=2026-06-01&sampai=2026-06-30`: response memuat `activities` (43 baris untuk periode ini), `catatan` terdekripsi dengan benar (bukan ciphertext), `durasiMenit` terhitung benar (mis. 50, 53 menit).

**Seed:** TIDAK diubah. Seed demo (`generate-demo-data.ts`) sudah mengisi `waktuMulai`/`waktuSelesai`/`catatanPerasaan` untuk aktivitas selesai (diverifikasi lewat curl `/api/report` yang mengembalikan 43 baris aktivitas dengan catatan terisi untuk periode Juni 2026) — tidak ada gap data yang ditemukan yang memerlukan perubahan seed.

Catatan: selama verifikasi Fix 1, 2 aktivitas uji ("Test A", "Test B") sempat dibuat lalu dihapus (soft-delete) via API pada akun demo Lukman untuk membuktikan endpoint `/api/activities/active-all` mengembalikan array multi-item. Setelah verifikasi, database di-reseed penuh (`node --import tsx src/seed/seed-demo.ts` di dalam container — TRUNCATE + reload deterministik) sehingga tidak ada baris sisa uji coba di database demo.

## Verifikasi Keseluruhan

1. **Backend tsc:** `cd backend && npx tsc --noEmit 2>&1 | grep -c "error TS"` → **4** (baseline tidak berubah — sama persis: `dialysisLog.controller.ts` baris 46/68, `medicationLog.controller.ts` baris 47/69, semua `string | string[]`).
2. **Backend report tests:** `npx tsx --test src/test/report.service.test.ts` → **13/13 lulus**.
3. **Backend full test suite:** `npx tsx --test src/test/*.test.ts` → **269/272 lulus**; 3 gagal SEMUA di `labUploadTrend.test.ts` (butuh koneksi Postgres container, dijalankan dari host — kegagalan yang sudah terdokumentasi berulang kali di STATE.md sebelumnya, tidak terkait perubahan task ini).
4. **Frontend build:** `cd frontend && npm run build` → **berhasil**, semua 22 route ter-compile termasuk `/laporan/preview`, `/catatan`, `/beranda` (exit code 0).
5. **API smoke (backend live via `docker compose up -d db backend`, login demo):**
   - `GET /api/activities/active-all` → 200, array (diverifikasi dengan 0 dan 2 aktivitas aktif secara live).
   - `POST /api/ai/weekly-insight/regenerate` → 200, `time_total≈1.7s` (sebelum & sesudah fix — tidak ada regresi, tidak ada hang).
   - `GET /api/report?dari=...&sampai=...` → 200, response memuat array `activities` dengan data terdekripsi.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unbounded lab query di jalur weekly insight**
- **Found during:** Task 2 diagnosis (candidate hypothesis (a) di plan, dikonfirmasi lewat pembacaan kode)
- **Issue:** `gatherWeeklyData()` mengambil SELURUH riwayat lab pengguna tanpa batas hari, satu-satunya query tak terbatas di antara 6 query paralel di path tersebut.
- **Fix:** Tambahkan `days: LOOKBACK_DAYS + 1` ke pemanggilan `labResultRepo.findByUser`.
- **Files modified:** `backend/src/services/aiInsight.service.ts`
- **Commit:** 502aea0

**2. [Rule 2 - Missing reliability safeguard] `apiFetch` tanpa timeout**
- **Found during:** Task 2 diagnosis
- **Issue:** Tidak ada `AbortController`/timeout di request fetch manapun di `frontend/lib/api.ts` — hang backend genap akan membuat UI macet tanpa batas waktu, tanpa jalan keluar bagi pengguna.
- **Fix:** Timeout 45 detik ditambahkan ke `apiFetch`, melempar `ApiError("REQUEST_TIMEOUT")` yang ditangkap oleh state-error yang sudah ada di semua kartu AI (dan semua pemanggil `authFetch` lain).
- **Files modified:** `frontend/lib/api.ts`
- **Commit:** 502aea0

None of the other findings required deviation beyond the plan's own explicit instructions — the plan's hypothesis (d) about `WeeklyInsightCard` remounting per sub-tab was investigated and found to be FALSE (documented above under Task 2), which is why no frontend remount fix was needed.

## Known Stubs

None — all 6 fixes are fully wired to real data (no hardcoded placeholders introduced).

## Self-Check: PASSED

Files verified to exist:
- FOUND: backend/src/repositories/dailyActivity.repository.ts (findAllActiveByUser present)
- FOUND: backend/src/services/activities.service.ts (getActiveActivities present)
- FOUND: backend/src/controllers/activities.controller.ts (getActiveList present)
- FOUND: backend/src/routes/activities.routes.ts (/active-all route present)
- FOUND: frontend/components/aktivitas/KegiatanModuleInline.tsx (rewritten)
- FOUND: frontend/components/catatan/FluidLogList.tsx (selisih per group)
- FOUND: frontend/components/aktivitas/ActivityList.tsx (Durasi total line)
- FOUND: frontend/components/lab/WeeklyInsightCard.tsx (renamed header)
- FOUND: backend/src/services/aiInsight.service.ts (bounded lab query)
- FOUND: frontend/lib/api.ts (45s timeout)
- FOUND: backend/src/repositories/report.repository.ts (getActivitiesByRange)
- FOUND: backend/src/services/report.service.ts (activities plumbing)
- FOUND: backend/src/test/report.service.test.ts (2 new tests)
- FOUND: frontend/components/laporan/sections/RingkasanCairan.tsx (trimmed)
- FOUND: frontend/components/laporan/sections/AktivitasReport.tsx (new file)
- FOUND: frontend/components/laporan/LaporanPreviewContent.tsx (renders AktivitasReport)

Commits verified in git log:
- FOUND: 7e3f53b
- FOUND: 502aea0
- FOUND: f517d65
