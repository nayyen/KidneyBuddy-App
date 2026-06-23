# KidneyBuddy

## What This Is

KidneyBuddy adalah web app (PWA) pendamping harian untuk pasien gagal ginjal kronis di Indonesia — baik yang menjalani CAPD, hemodialisis (HD), maupun transplantasi — dan untuk caregiver/keluarga mereka. Aplikasi ini menjembatani pencatatan kondisi harian (cairan, obat, lab), pengingat terapi, edukasi kontekstual berbahasa Indonesia, AI anomaly detection, dan komunitas sesama pasien, supaya pasien bisa mengelola perawatan harian secara mandiri dan terstruktur tanpa hanya bergantung pada ingatan.

Proyek tugas akhir mata kuliah PSI, Kelompok 7 (PO: Nayla Raihaanah Nabilah Hakim), dengan PRD lengkap v0.12 di `PRD.md` sebagai sumber kebenaran utama.

## Core Value

Pasien tidak pernah melewatkan dosis obat, sesi exchange CAPD, atau jadwal HD tanpa sadar — reliabilitas sistem reminder dan pencatatan harian adalah hal yang harus berfungsi sempurna, karena ketidakpatuhan terapi adalah penyebab utama komplikasi yang seharusnya bisa dicegah pada pasien gagal ginjal kronis.

## Requirements

### Validated

(None yet — ship to validate)

### Active

Seluruh scope "IN Scope (MVP)" dari PRD.md section 4.1 — detail lengkap per-requirement ada di `PRD.md` section 5 (FR-PS-001 s/d FR-PS-018, FR-CG-001 s/d FR-CG-002, FR-SYS-001 s/d FR-SYS-006):

- [ ] Tracking harian cairan masuk/keluar (sumber, volume desimal, satuan ml/kg) untuk semua tipe pasien, dengan kolom khusus CAPD (konsentrasi cairan, kondisi cairan keluar)
- [ ] Perhitungan otomatis selisih cairan masuk/keluar, ditampilkan di dashboard
- [ ] Peringatan otomatis untuk kondisi cairan CAPD tidak normal (keruh/berdarah) sebagai indikator dini peritonitis
- [ ] Pengingat minum obat (nama, dosis, jenis, catatan waktu, foto opsional) untuk semua tipe pasien
- [ ] Pengingat jadwal exchange CAPD (jam + konsentrasi) dan jadwal HD (hari + jam)
- [ ] Upload hasil lab (PDF/JPG/PNG) dan input manual parameter lab
- [ ] Visualisasi grafik tren parameter lab dari data manual
- [ ] AI ringkasan harian (Groq Llama 3.3 70B) — narasi Bahasa Indonesia holistik dari seluruh data tracking hari itu, dengan disclaimer medis
- [ ] AI insight proaktif tren mingguan (7–30 hari) dari data lab/cairan/kepatuhan obat
- [ ] AI analisis hasil lab manual — penjelasan awam + saran langkah berikutnya, tanpa diagnosis
- [ ] AI saran makanan & lifestyle personalisasi berdasarkan tracking + lab + metode terapi aktif
- [ ] AI anomaly detection (rule-based + LLM) dengan notifikasi darurat khusus (visual mencolok, tidak bisa di-dismiss tanpa interaksi) untuk kondisi berisiko tinggi
- [ ] Komunitas model Quora (post, reply, tandai "membantu")
- [ ] Konten edukasi (artikel, panduan senam, lifestyle/makanan) terfilter berdasarkan metode terapi aktif
- [ ] Tutorial onboarding interaktif (registrasi → pilih metode terapi → atur pengingat pertama) selesai <5 menit
- [ ] Ubah metode terapi kapan saja dari halaman profil, dengan riwayat tercatat
- [ ] Laporan kontrol dokter — ringkasan data tracking per rentang tanggal
- [ ] Dashboard caregiver identik dengan pasien + notifikasi independen per device
- [ ] Catat kegiatan harian dengan skala perasaan + framing positif untuk durasi lebih lama dari rencana (bukan "overdue")
- [ ] PWA installable, web push notification (izin browser, iOS via Add to Home Screen)
- [ ] Arsitektur microservices: Frontend Next.js, Backend Express.js, Database PostgreSQL, 3 Dockerfile + 1 docker-compose.yml, komunikasi REST API only

### Out of Scope

Sesuai PRD.md section 4.1 "OUT of Scope (v1)":

- Integrasi rekam medis RS/BPJS — bukan prioritas MVP, butuh kerja sama institusional di luar kendali tim
- Aplikasi mobile native (iOS/Android) — v1 hanya web responsif (PWA)
- Sinkronisasi otomatis alat ukur medis (timbangan, tensimeter) — semua input manual oleh pengguna
- Telemedicine/konsultasi dokter online — di luar scope produk ini
- Machine learning model adaptif — v1 hanya rule-based + LLM inference (Groq), bukan model yang dilatih ulang
- Verifikasi medis atas konten komunitas — komunitas adalah platform berbagi, bukan sumber medis terverifikasi
- Multi-pasien dalam satu akun — v1: satu akun = satu pasien
- Gamifikasi/reward system — tidak relevan untuk MVP
- Video/live streaming di komunitas — cukup teks model Quora
- Chatbot AI edukasi interaktif — ditunda ke v2 (Could Have)
- Multi-device dengan notifikasi independen via akun terpisah — caregiver pakai kredensial akun yang sama, bukan akun terpisah

## Context

- **Domain:** Indonesia punya peningkatan prevalensi ESKD (End-Stage Kidney Disease) tercepat di dunia dalam satu dekade terakhir. Dari 1.152 pasien (studi multisenter Jakarta): 68,1% HD, 24,4% transplantasi, 7,5% CAPD. Pasien CAPD di RS Kariadi Semarang (2024): 31,9% mengalami infeksi peritonitis — komplikasi paling umum dan paling bisa dicegah lewat deteksi dini kondisi cairan keruh/berdarah.
- **Constraint akademik:** Tugas akhir mata kuliah dengan milestone mingguan dari dosen — PRD section 10 sudah punya rencana 5 milestone selama 13 minggu (PRD final Wk2, Design Wk4, Core Tracking & Reminder Wk7, AI & Community Wk10, Go-Live MVP Wk13). Roadmap GSD sebaiknya selaras dengan urutan ini: tracking+reminder dulu, baru AI+komunitas, baru go-live.
- **Reference visual:** `DESIGN_SYSTEM_KidneyBuddy_v3.md` (teal #2a9d8f, amber #ef9f27, cream #fdf9f3, font Plus Jakarta Sans + DM Sans) — sudah diverifikasi cocok 100% dengan `KidneyBuddy_Design/src/styles/theme.css` (export asli Figma Make). Sumber kebenaran visual untuk semua styling.
- **Reference struktur (BUKAN base code):** `KidneyBuddy_Design/` adalah export Figma Make berbasis Vite + shadcn/ui. Hanya 5 dari 27 halaman yang sudah didesain di sana (Onboarding, Dashboard, CatatCairan, Pengingat, BottomNav). Boleh dilihat untuk pola layout/komponen shadcn, tapi seluruh app dibangun ulang dari nol di Next.js — jangan port kode Vite itu langsung.
- **AI in-app (bukan tooling development):** Groq API, model Llama 3.3 70B (gratis, tanpa kartu kredit), dipanggil dari Backend Container untuk 5 fungsi: ringkasan harian (FR-SYS-002), anomaly detection rule-based+LLM (FR-SYS-001), insight tren mingguan (FR-SYS-004), analisis hasil lab (FR-SYS-005), saran lifestyle personalisasi (FR-SYS-006). Semua output AI wajib disclaimer "bukan pengganti saran medis profesional" dan bahasa yang menenangkan, tidak memicu panik.
- **Bahasa & aksesibilitas:** Semua UI dan konten edukasi dalam Bahasa Indonesia awam (istilah medis disertai penjelasan singkat dalam kurung). UI harus nyaman untuk semua usia (termasuk 50+), bukan hanya pengguna melek teknologi.

## Constraints

- **Arsitektur**: Microservices wajib — minimal 3 container terpisah (Frontend Next.js, Backend Express.js, Database PostgreSQL), masing-masing dengan Dockerfile sendiri, terhubung lewat satu `docker-compose.yml`, komunikasi antar container via REST API saja (Frontend tidak pernah akses database langsung) — requirement dosen, tidak bisa dinegosiasi.
- **Hosting**: Vercel untuk frontend, Railway/Render untuk backend+database — harus bisa diakses publik via internet, bukan hanya localhost.
- **PWA**: Wajib installable ke home screen, web push notification aktif setelah izin browser diberikan; di iOS perlu Add to Home Screen dulu.
- **AI**: Groq API (Llama 3.3 70B) dipanggil dari Backend Container saja, bukan dari Frontend.
- **Bahasa**: Seluruh UI dan konten edukasi dalam Bahasa Indonesia awam.
- **Privasi/Keamanan**: Data kesehatan sensitif (fluid_log, medication_log, lab_result) wajib dienkripsi at-rest; transmisi via TLS 1.2+; informed consent eksplisit saat registrasi; 5x gagal login dalam 10 menit → lockout 15 menit (NFR-02, NFR-03).
- **Performance**: Dashboard utama harus load ≤3 detik untuk 95% request dengan ≤100 concurrent user (NFR-01).
- **Availability**: Uptime ≥99%/bulan — pasien bergantung pada reminder yang time-critical (NFR-04).
- **Desain visual**: Wajib mengikuti `DESIGN_SYSTEM_KidneyBuddy_v3.md` (palet teal/amber/cream, font Plus Jakarta Sans + DM Sans) — sudah final dan terverifikasi dari Figma Make export.
- **Timeline**: Mengikuti milestone akademik PRD section 10 (13 minggu, 5 milestone) — bukan timeline bebas.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Core value = reliabilitas reminder & tracking harian | Ketidakpatuhan terapi adalah penyebab utama komplikasi yang bisa dicegah; ini yang dikonfirmasi user sebagai prioritas tertinggi di atas AI detection maupun data arsip dokter | — Pending |
| v1 requirements = seluruh scope MVP PRD (bukan slice lebih kecil) | User memilih scope penuh karena PRD section 4.1 sudah eksplisit menandai semua fitur ini (termasuk AI, komunitas, edukasi) sebagai MVP, sejalan dengan milestone akademik 13 minggu | — Pending |
| Kode Figma Make (`KidneyBuddy_Design/`) hanya referensi visual/struktur, bukan base code | User menegaskan dua kali agar tidak terjadi port langsung dari Vite ke Next.js — arsitektur dan konvensi berbeda total | ✓ Good |
| Design tokens pakai `DESIGN_SYSTEM_KidneyBuddy_v3.md` + `theme.css` lokal, tidak perlu OAuth Figma MCP live | Sudah diverifikasi cocok 100% dengan export asli; user mengonfirmasi tidak perlu re-fetch dari Figma | ✓ Good |
| Arsitektur microservices 3-container (Next.js/Express/Postgres) | Requirement dosen, bukan pilihan teknis tim — wajib REST API antar container, tidak ada monolith | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-24 after initialization*
