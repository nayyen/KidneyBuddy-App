---
status: testing
phase: 02-fluid-medication-tracking-with-reminders
source:
  - 02-01-SUMMARY.md
  - 02-02-SUMMARY.md
  - 02-03-SUMMARY.md
  - 02-04-SUMMARY.md
  - 02-05-SUMMARY.md
  - 02-06-SUMMARY.md
  - 02-07-SUMMARY.md
started: 2026-06-27T00:00:00.000Z
updated: 2026-06-27T00:00:00.000Z
---

## Current Test

number: 1
name: Responsive Layout — Bottom Nav & Sidebar
expected: |
  1. Buka http://localhost:3000 setelah login
  2. Pada viewport ≤767px: ada 5-tab bottom navigation (Beranda, Catatan, Pengingat, Edukasi, Profil)
  3. Pada viewport ≥1024px: bottom nav hilang, sidebar kiri muncul dengan nav items + tombol "Catat Cairan"
  4. FAB (droplets icon) "Catat" muncul di atas bottom nav (mobile) atau di sidebar (desktop)
awaiting: user response

## Tests

### 1. Responsive Layout — Bottom Nav & Sidebar
expected: Mobile: 5-tab bottom nav, FAB "Catat". Desktop: sidebar kiri, top bar, no bottom nav.
result: pending

### 2. PWA Manifest & Service Worker
expected: DevTools Application tab shows manifest with name "KidneyBuddy", display standalone, icons. Service worker registered at /serwist/sw.js.
result: pending

### 3. Dashboard — Beranda D-04 Cards
expected: Dashboard menampilkan DeltaCairanCard (masuk/keluar/delta), PengingatBerikutnyaCard, ObatCard (jika ada log obat hari ini), AiPlaceholderCard.
result: pending

### 4. Catat Cairan — Form & Submit
expected: Tap FAB "Catat" → Sheet muncul. Form: tipe (masuk/keluar), sumber, volume, satuan. CAPD user: konsentrasi + kondisi keluar. Submit → tersimpan, delta terupdate.
result: pending

### 5. Catat Cairan — CAPD Effluent Alert
expected: Pilih kondisi keluar "keruh" atau "berdarah" → muncul Alert Darurat merah non-dismissable.
result: pending

### 6. Catat Cairan — Offline Queue (FLUID-05)
expected: Matikan jaringan, submit catat cairan → muncul toast "Catatan disimpan dan akan disinkronkan". Hidupkan jaringan → auto-sync.
result: pending

### 7. Pengingat — Tambah Pengingat Obat
expected: Buka /pengingat → tap "Tambah Pengingat" → pilih "Obat". Form: nama, dosis, jenis (minum/suntik), hari aktif, jam, foto opsional. Submit → sukses, muncul di list.
result: pending

### 8. Pengingat — Tambah CAPD / HD Reminder
expected: CAPD user: opsi CAPD muncul. HD user: opsi HD muncul. Form sesuai jenis dengan warna identitas.
result: pending

### 9. Pengingat — List, Toggle Aktif, Hapus
expected: Reminder list menampilkan waktu, hari aktif, badge jenis. Switch toggle aktif/nonaktif. Hapus → konfirmasi AlertDialog.
result: pending

### 10. Beranda — ObatCard Confirm "Sudah Diminum"
expected: ObatCard menampilkan obat hari ini. Tap lingkaran konfirmasi → status jadi teal check + "Sudah diminum".
result: pending

### 11. Catatan — Fluid Log & Medication Log
expected: Buka /catatan → tab "Cairan" menampilkan list fluid entries. Tab "Obat" menampilkan medication log hari ini.
result: pending

### 12. Push Notification Enable/Disable
expected: Di /profil, tombol "Aktifkan Notifikasi" muncul. Tap → request permission → berhasil.
result: pending

## Summary

total: 12
passed: 0
issues: 0
pending: 12
skipped: 0
blocked: 0

## Gaps
