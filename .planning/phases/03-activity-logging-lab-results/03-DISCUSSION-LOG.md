# Phase 3: Activity Logging & Lab Results - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-27
**Phase:** 3-activity-logging-lab-results
**Areas discussed:** Dashboard card Aktivitas, Notifikasi aktivitas, Alur input hasil lab, Grafik tren lab

---

## Dashboard Card Aktivitas

| Option | Description | Selected |
|--------|-------------|----------|
| Tambah kartu ke-5 di Beranda | Kartu penuh "Kegiatan hari ini" menambah slot baru setelah D-04 | |
| Integrasi ke dalam card yang sudah ada / sub-section kecil | Modul kegiatan di-embed sebagai sub-section di dashboard tanpa menambah kartu baru; akses detail di tab Catatan | ✓ |

**User's choice:** TIDAK menambah kartu ke-5 agar mobile UI tidak penuh. Integrasikan "Kegiatan hari ini" ke dalam salah satu card yang sudah ada atau buat sub-section kecil. Akses detail utama di tab Catatan.

**Notes:** Constraint eksplisit: no new full card on mobile (D-04 already has 4 cards). Compact module/sub-section approach preserves mobile UX.

---

## Notifikasi Aktivitas

| Option | Description | Selected |
|--------|-------------|----------|
| Semua notifikasi via push | Push notification untuk sebelum selesai DAN notifikasi berulang 10 menit "Masih aktif" | |
| Push untuk sebelum selesai, in-app untuk berulang | Push sekali sebelum estimasi selesai; in-app banner/toast untuk notifikasi 10 menit berulang | ✓ |
| In-app banner saja | Semua notifikasi activity sebagai in-app banner, tidak ada push | |

**User's choice:** Push notification via cron untuk pengingat sebelum estimasi selesai. In-app banner/toast untuk notifikasi berulang 10 menit setelah melewati waktu — agar tidak membanjiri cron queue background.

**Notes:** Hybrid approach — push for the one-time "almost done" reminder, in-app polling for the recurring "Masih aktif" duration updates.

---

## Alur Input Hasil Lab

| Option | Description | Selected |
|--------|-------------|----------|
| Dua sheet terpisah | Dua tombol berbeda: "Unggah Dokumen" dan "Input Manual", masing-masing membuka sheet sendiri | |
| Satu sheet dengan Tab/Toggle | Satu entry point "Tambah Hasil Lab" → sheet dengan Tab 1: Input Manual, Tab 2: Unggah Dokumen | ✓ |

**User's choice:** Satu sheet/modal tunggal dengan sistem Tab/Toggle di dalamnya. Tab 1: Input Manual (primary), Tab 2: Unggah Dokumen. Lebih clean dan hemat space.

**Notes:** Tab order: Input Manual first (primary flow for trend chart data), Upload second (supplementary).

---

## Grafik Tren Lab

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-parameter overlay | Beberapa parameter lab ditampilkan sekaligus dalam satu chart | |
| Satu parameter per chart, dropdown selector | User pilih satu parameter → chart update | ✓ |

**User's choice:** Satu parameter per satu chart dengan dropdown selector. Multi-parameter overlay tidak digunakan karena skala nilai berbeda jauh (Kreatinin mg/dL vs Hemoglobin g/dL) yang akan merusak grafik.

**Notes:** Data source: manual entry ONLY (LAB-02/03). Uploaded files tidak diparsing untuk chart.

---

## Claude's Discretion

- **Activity entry form fields** — name (required) + estimated end time (required); planner decides if optional category/notes added
- **"Masih aktif" timer polling** — setInterval client-side is simplest given existing architecture
- **Chart date range presets** — planner picks presets (7 hari, 30 hari, 3 bulan, custom)
- **Lab parameter autocomplete** — common CKD parameters (Kreatinin, Hemoglobin, Ureum, GFR, Kalium) as suggestions; planner decides feasibility
- **Upload file storage path** — `lab_results/` subfolder in existing upload volume

## Deferred Ideas

None — discussion stayed within Phase 3 scope.
