---
status: testing
phase: 03-activity-logging-lab-results
source:
  - phase-3/03-01-SUMMARY.md
  - phase-3/03-02-SUMMARY.md
  - phase-3/03-03-SUMMARY.md
  - phase-3/03-04-SUMMARY.md
  - phase-3/03-05-SUMMARY.md
  - phase-3/03-06-SUMMARY.md
started: 2026-06-28T14:18:00.000Z
updated: 2026-06-28T14:18:00.000Z
---

## Current Test
number: 10
name: Lab — Arsip (Soft Delete)
expected: |
  1. Klik icon arsip di hasil lab → konfirmasi
  2. Hilang dari daftar aktif
  3. Tidak ada opsi hapus permanen
awaiting: user response

number: 10
name: Lab — Upload & Arsip (optional)
expected: |
  1. User bisa upload file PDF/JPG/PNG ≤10MB via tab Unggah Dokumen
  2. User bisa arsipkan lab result (soft delete)
awaiting: user response

## Tests

### 1. Register & Login — Persiapan
expected: Form registrasi muncul. Setelah submit, user langsung login dan redirect ke dashboard.
result: pass

### 2. Beranda — KegiatanModuleInline tampil
expected: Di Beranda, ada modul "Kegiatan hari ini" dengan tombol "Mulai Kegiatan" (teal, play icon).
result: pass

### 2. Beranda — KegiatanModuleInline tampil
expected: Di Beranda, ada modul "Kegiatan hari ini" dengan tombol "Mulai Kegiatan" (teal, play icon).
result: pending

### 3. Mulai Kegiatan — Form aktivitas
expected: Klik "Mulai Kegiatan" → sheet terbuka dengan form nama kegiatan + estimasi selesai (HH:mm). Submit → status "Berlangsung".
result: pass

### 4. Aktivitas — Status "Berlangsung" & "Masih aktif"
expected: Aktivitas yang berjalan menunjukkan badge "Berlangsung" (amber). Setelah melewati estimasi selesai, badge berubah jadi "Masih aktif · X menit lebih" (amber, positif).
result: issue
reported: "Tidak ada teks status badge (Berlangsung/Masih aktif) — hanya icon Clock dan tombol Selesaikan"
severity: minor

### 5. Aktivitas — Selesai & Feelings Rating
expected: Klik "Tandai Selesai" → sheet 2×2 grid feelings (Nyaman/Biasa/Lelah/Berat) + catatan opsional. Submit → status "Selesai".
result: pass

### 6. Catatan / Aktivitas — Riwayat Aktivitas
expected: Tab Catatan → Aktivitas menampilkan daftar aktivitas hari ini dengan status masing-masing.
result: pass

### 7. Lab — Tambah Hasil Lab (Input Manual)
expected: Tab Catatan → Lab → "Tambah Hasil Lab" → sheet dengan 2 tab. Tab "Input Manual": isi parameter, nilai, satuan, tanggal. Submit → muncul di daftar.
result: pass

### 8. Lab — Upload Dokumen
expected: Tab "Unggah Dokumen": pilih file PDF/JPG/PNG ≤10MB + tanggal. Submit → muncul di daftar lab.
result: pass

### 9. Lab — Grafik Tren Parameter
expected: Pilih parameter dari dropdown → recharts LineChart muncul dengan data 90 hari. Empty state jika belum ada data.
result: pass

### 10. Lab — Arsip (Soft Delete)
expected: Klik "Arsipkan Hasil Lab" → konfirmasi → hilang dari daftar aktif. Tidak ada opsi hapus permanen.
result: pending

## Summary

total: 10
passed: 7
issues: 1
blocked: 0
pending: 4
skipped: 0

## Gaps
## Summary

total: 10
passed: 8
issues: 2
blocked: 0
pending: 0
skipped: 0

## Gaps

- truth: "Activity status badge menampilkan teks 'Berlangsung'/'Masih aktif' (amber)"
  status: failed
  reason: "Hanya icon Clock dan tombol Selesaikan — tidak ada teks status badge"
  severity: cosmetic
  test: 4
  root_cause: "ActivityList.tsx tidak menampilkan teks badge status"

- truth: "Arsip lab result berfungsi dengan token valid"
  status: failed
  reason: "authFetch tidak auto-refresh token"
  severity: minor
  test: 10
  root_cause: "authFetch tidak memiliki refresh token otomatis"

<!-- No gaps yet -->
