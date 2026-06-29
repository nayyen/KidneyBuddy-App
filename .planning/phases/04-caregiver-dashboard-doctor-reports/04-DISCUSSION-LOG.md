# Phase 4: Caregiver Dashboard & Doctor Reports - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-29
**Phase:** 4-caregiver-dashboard-doctor-reports
**Areas discussed:** Real-time sync, Format laporan dokter, Caregiver identity & role, Anomali di report

---

## Real-Time Sync (CAREGIVER-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Polling interval pendek | Frontend polling GET /api/reminders setiap 30 detik. Tidak butuh infrastruktur baru, cocok dg 3-container constraint. | ✓ |
| Server-Sent Events (SSE) | Express endpoint GET /api/events yang stream events. Stateless tapi butuh persistent connection + retry logic. | |
| Push notification VAPID + refresh | Kirim push ke device lain, refresh saat app dibuka. Bukan real-time jika app sedang aktif. | |

**Notifikasi ke device lain:**

| Option | Description | Selected |
|--------|-------------|----------|
| In-app toast saja | Sonner toast saat polling deteksi versi baru. Hanya terlihat jika app sedang dibuka. | |
| Push notification + in-app toast | VAPID push ke device lain + Sonner toast dari polling. Terlihat meski app tertutup. | ✓ |
| In-app banner persistent | Banner yang harus di-dismiss. | |

**Change detection:**

| Option | Description | Selected |
|--------|-------------|----------|
| Pakai updated_at yang sudah ada | Cek max(updated_at) dari reminder_schedule. Tidak butuh kolom baru. | ✓ |
| Tambah kolom version integer | Increment tiap update. Lebih eksplisit tapi butuh migration tambahan. | |
| Claude yang putuskan | Bebas ke implementasi. | |

**Notes:** 3-container constraint adalah faktor utama pemilihan polling vs SSE/WebSocket.

---

## Format Laporan Dokter (REPORT-01, REPORT-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Print-friendly webpage | CSS @print media query, window.print(). Tidak butuh library tambahan. | ✓ |
| PDF download (server-side) | pdfkit/puppeteer. Butuh library baru + memory overhead. | |
| In-app view saja | Tanpa export/print. | |

**Date range:**

| Option | Description | Selected |
|--------|-------------|----------|
| Preset + custom | Preset 7 hari/30 hari/3 bulan + custom date picker. Sama dengan LabTrendChart. | ✓ |
| Custom date range saja | Hanya date picker from/to. | |
| Preset saja | Lebih simpel tapi kurang fleksibel. | |

**REPORT-02 catatan opsional:**

| Option | Description | Selected |
|--------|-------------|----------|
| Di halaman preview sebelum print | Textarea di preview page, tampil di print, tidak persist ke DB. | ✓ |
| Disimpan ke DB (DoctorReport entity) | Butuh tabel baru doctor_reports. Riwayat laporan tersimpan. | |
| Claude yang putuskan | | |

---

## Caregiver Identity & Role (CAREGIVER-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Tidak perlu dibedakan | Satu akun = dashboard identik otomatis. Tidak ada role badge/switching. | ✓ |
| Deklarasi role saat login | User pilih Pasien/Caregiver saat login. Role tersimpan di sesi. | |
| Role dari users.role otomatis | users.role = 'Caregiver' menampilkan UI berbeda. | |

**Notes:** CAREGIVER-01 ("dashboard identik") terpenuhi otomatis karena satu akun shared. Tidak ada pekerjaan tambahan untuk ini di Phase 4 selain sync (CAREGIVER-02).

---

## Anomali di Report (Phase 5 dependency)

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder "Belum tersedia" | Section ada tapi dengan teks placeholder. Layout siap untuk Phase 5. | ✓ |
| Pakai data CAPD proxy | CAPD keruh/berdarah dari fluid_log sebagai proxy anomali. | |
| Omit section anomali | Tidak tampilkan section sampai Phase 5. | |

---

## Claude's Discretion

- Exact report layout/typography (must be print-friendly, ≥12pt font, no dark backgrounds)
- Polling implementation detail (`setInterval(30000)` in `useEffect` with cleanup)
- Which push subscription to exclude from CAREGIVER-02 push (originating device)
- Medication adherence calculation formula

## Deferred Ideas

None — discussion stayed within Phase 4 scope.
