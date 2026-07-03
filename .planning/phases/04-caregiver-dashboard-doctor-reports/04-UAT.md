---
status: testing
phase: 04-caregiver-dashboard-doctor-reports
source:
  - 04-02-SUMMARY.md
  - 04-03-SUMMARY.md
  - 04-04-SUMMARY.md
started: 2026-06-30T12:00:00.000Z
updated: 2026-06-30T12:00:00.000Z
---

## Current Test

number: 1
name: Cold Start Smoke Test — Backend starts
expected: |
  Backend server starts successfully. No crash on boot.
  Report endpoint is reachable: GET /api/report returns 401 (unauthenticated) as expected for protected routes.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test — Backend starts
expected: |
  Backend server starts successfully. No crash on boot.
  Report endpoint is reachable: GET /api/report returns 401 (unauthenticated) as expected for protected routes.
result: [pending]

### 2. Navigasi ke halaman Laporan
expected: |
  User dapat membuka /laporan setelah login.
  Halaman menampilkan:
  - Judul "Buat Laporan"
  - Date range selector dengan 3 preset pill: "7 Hari", "30 Hari", "90 Hari"
  - Opsi "Pilih Tanggal" untuk custom date range
  - Textarea untuk catatan dokter (optional) dengan character counter (max 500)
  - Tombol "Buat Laporan" (disabled sampai date range valid)
result: [pending]

### 3. Date range selector — preset pills
expected: |
  Mengklik "7 Hari" mengisi tanggal dari 7 hari lalu sampai hari ini.
  Mengklik "30 Hari" mengisi dari 30 hari lalu.
  Mengklik "90 Hari" mengisi dari 90 hari lalu.
  Pilihan "Pilih Tanggal" menampilkan 2 input date picker (Dari/Sampai).
  Validasi: end date >= start date, max 90 hari, max = hari ini.
result: [pending]

### 4. Catatan dokter — character counter
expected: |
  Mengetik di textarea catatan dokter menunjukkan karakter counter "0/500".
  Mengetik 500+ karakter tidak bisa (atau counter merah).
  Catatan bersifat opsional — bisa kosong.
result: [pending]

### 5. Tombol "Buat Laporan" — disabled state
expected: |
  Saat date range belum valid (default), tombol "Buat Laporan" disabled.
  Memilih preset atau date range yang valid → tombol menjadi aktif.
  Mengklik tombol navigasi ke /laporan/preview?dari=X&sampai=Y&catatan=Z.
result: [pending]

### 6. Halaman preview — laporan tampil
expected: |
  Setelah klik "Buat Laporan", halaman /laporan/preview menampilkan:
  - Loading state "Memuat data laporan..." saat fetch
  - Header: "Laporan Kunjungan Dokter" dengan nama, metode terapi, periode, tanggal dibuat
  - 4 section: Ringkasan Cairan, Kepatuhan Obat, Kondisi CAPD (jika CAPD), Anomali Terdeteksi
  - Catatan dokter (jika diisi) muncul sebagai bordered box
result: [pending]

### 7. Ringkasan Cairan section
expected: |
  Menampilkan total cairan masuk (ml), total cairan keluar (ml), dan selisih (balance).
  Jika tidak ada data di periode → menampilkan empty state: icon Droplets + "Tidak ada data cairan".
result: [pending]

### 8. Kepatuhan Obat section
expected: |
  Menampilkan persentase kepatuhan minum obat dalam periode.
  Progress bar visual + metric number besar.
  Jika tidak ada data → empty state: icon Pill + "Tidak ada data obat".
result: [pending]

### 9. Kondisi CAPD section
expected: |
  Hanya muncul jika metode terapi = CAPD.
  Menampilkan frekuensi: jernih, keruh, keruh_gumpalan, berdarah.
  Jika berdarah > 0 → teks merah #d4183d.
  Jika bukan CAPD → section tidak dirender.
  Jika CAPD tapi tidak ada data → empty state: icon Activity + "Tidak ada data kondisi CAPD".
result: [pending]

### 10. Anomali section (placeholder)
expected: |
  Menampilkan placeholder: "Deteksi anomali akan tersedia setelah fitur AI diaktifkan."
  Icon AlertTriangle.
result: [pending]

### 11. Tombol "Cetak / Simpan PDF"
expected: |
  Mengklik "Cetak / Simpan PDF" membuka dialog print browser (window.print()).
  Print preview menunjukkan:
  - Layout A4 portrait
  - Navigasi (sidebar, bottom nav, top bar) tidak muncul
  - Hanya konten laporan yang tampil
  - Section cards terlihat rapi dengan page-break-inside: avoid
result: [pending]

### 12. Caregiver sync — push notification
expected: |
  Ketika user A (di perangkat lain) mengupdate jadwal pengingat, user B menerima:
  - Push notification dengan title "Pengingat Diperbarui"
  - Body: "Jadwal pengingat telah diperbarui dari perangkat lain."
result: [pending]

### 13. Caregiver sync — polling 30s + Sonner toast
expected: |
  Saat kedua perangkat login ke akun yang sama dan halaman Pengingat terbuka:
  - Setiap 30 detik, halaman mengecek perubahan via GET /api/reminders
  - Jika ada perubahan updated_at → muncul Sonner toast: "Jadwal pengingat diperbarui dari perangkat lain."
  - Tanpa perubahan → tidak ada toast (tidak spam)
result: [pending]

## Summary

total: 13
passed: 0
issues: 0
pending: 13
skipped: 0
blocked: 0

## Gaps
