---
status: testing
phase: 01-foundation-auth-onboarding
source:
  - 01-SKELETON.md
  - 01-01-PLAN.md
  - 01-02-PLAN.md
  - 01-03-PLAN.md
  - 01-04-PLAN.md
  - 01-05-PLAN.md
started: 2026-06-26T00:00:00.000Z
updated: 2026-06-26T00:00:00.000Z
---

## Current Test

number: 10
name: Onboarding — Sukses & Auto-redirect
expected: |
  1. Selesaikan onboarding → auto-redirect ke dashboard
name: Dashboard — Banner Pengingat (jika skip)
expected: |
  1. Lakukan onboarding dengan "Lewati untuk sekarang"
  2. Selesai → dashboard muncul
  3. Diharapkan: banner amber "Atur Pengingat" dengan pesan kalem
  4. Ada tombol "Atur Pengingat" yang navigasi ke /onboarding
awaiting: user response

## Tests

### 1. Register User Baru
expected: Form registrasi muncul dengan benar. Setelah submit berhasil, user redirect ke dashboard yang menampilkan nama user.
result: pending
reported: "Informed consent checkbox tidak ada + setelah submit redirect ke /login. Sudah diperbaiki: informed consent ditambahkan, register sekarang issue token + set refresh cookie."
severity: major
fix: "✓ Informed consent checkbox (frontend + backend schema + column migration 0004). ✓ Register langsung issue access token + set refresh cookie. Dashboard langsung terbuka tanpa login ulang. 46/46 tests pass."

### 2. Login & Persistent Session
expected: User bisa login dengan email+password yang sudah didaftarkan. Setelah refresh browser, user tetap login (tidak kembali ke halaman login).
result: pending
reported: "passed"

### 3. Logout
expected: Klik tombol logout dari dashboard → user kembali ke halaman login. Setelah logout, akses ke /dashboard redirect ke /login.
result: pending

### 4. Account Lockout — 5 Gagal Login
expected: Setelah 5x gagal login dalam 10 menit, akun terkunci selama 15 menit. User melihat countdown "Coba lagi dalam 14:32" dengan pesan "Demi keamanan akunmu" — bukan warning keras.
result: pending

### 5. Lupa Password — Request Reset Link
expected: Di halaman login ada link "Lupa password?". Klik → form input email. Submit → pesan "Jika email terdaftar, tautan reset sudah dikirim" (tidak membocorkan email terdaftar/tidak).
result: pending

### 6. Reset Password via Link
expected: Email reset link muncul di log backend. Buka link → form password baru + konfirmasi. Submit → sukses. Login dengan password baru berhasil. Login dengan password lama gagal. Link yang sama tidak bisa dipakai lagi (single-use).
result: pending

### 7. Onboarding — Step 1: Pilih Metode Terapi
expected: Register sebagai user baru → redirect ke /onboarding. Step indicator 1/3. Tersedia 3 kartu (CAPD teal, HD amber, Transplantasi purple). Tap "Apa ini?" pada kartu → kartu mengembang inline (bukan modal) menampilkan penjelasan 1-2 kalimat. Pilih salah satu → "Lanjutkan" aktif.
result: pending

### 8. Onboarding — Step 2: Atur / Lewati Pengingat Pertama
expected: Step indicator 2/3. Isi minimal satu pengingat (nama, jam, jenis) → "Simpan & Mulai" aktif. Atau klik "Lewati untuk sekarang". Ada tombol "Kembali".
result: pending

### 9. Onboarding — Resume jika Ditutup
expected: Di tengah onboarding (setelah step 1), tutup tab. Buka /onboarding lagi → lanjut ke step 2 (bukan mulai dari awal).
result: pending

### 10. Onboarding — Sukses & Auto-redirect
expected: Setelah menyelesaikan step 2, animasi "KidneyBuddy siap mendampingi kamu!" selama 1-2 detik → auto-redirect ke dashboard.
result: pending

### 11. Dashboard — Banner Pengingat (jika skip)
expected: Jika onboarding di-skip (tidak atur pengingat), dashboard menampilkan banner kalem untuk mengingatkan atur pengingat nanti.
result: pending

### 12. Profil — Lihat Metode Terapi Aktif
expected: Buka /profil. Menampilkan metode terapi aktif user saat ini dengan warna yang sesuai (teal/amber/purple).
result: pending

### 13. Profil — Ubah Metode Terapi dengan Konfirmasi
expected: Klik "Ubah Metode Terapi" → dialog muncul. Pilih metode lain → muncul konfirmasi "Yakin ubah metode terapi ke {X}?". Konfirmasi → metode berubah. Batalkan → tidak berubah.
result: pending

### 14. Profil — Riwayat Perubahan Terapi
expected: Setelah mengubah metode terapi, di halaman profil muncul riwayat perubahan (metode sebelumnya → metode baru, dengan timestamp).
result: pending

### 15. Profil — Putar Tutorial Ulang
expected: Di profil ada tombol "Lihat Tutorial". Klik → navigasi ke /onboarding. Data terapi dan pengingat yang sudah ada tidak hilang setelah keluar dari tutorial.
result: pending

## Summary

total: 15
passed: 1
issues: 0
pending: 13
skipped: 0
blocked: 0

## Gaps

<!-- No gaps yet -->
## Gaps

- truth: "Register form memiliki informed consent checkbox"
  status: fixed
  reason: "Checkbox informed consent tidak ada — sudah ditambahkan ke frontend register page, backend register schema, dan tabel users (migration 0004)"
  severity: minor
  test: 1

- truth: "Setelah register, user redirect ke dashboard dalam keadaan login"
  status: fixed
  reason: "Register endpoint tidak mengeluarkan access token / refresh cookie — sudah diubah. Register sekarang behaviour sama seperti login: issue access token + set httpOnly refresh cookie. Frontend langsung redirect ke /dashboard."
  severity: major
  test: 1
