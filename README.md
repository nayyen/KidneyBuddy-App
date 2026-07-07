# KidneyBuddy 🫘

**Pendamping harian untuk pasien gagal ginjal kronis di Indonesia.**

KidneyBuddy adalah web app (PWA) yang membantu pasien gagal ginjal kronis — baik yang menjalani CAPD, hemodialisis (HD), maupun transplantasi — serta caregiver/keluarga mereka dalam mengelola perawatan sehari-hari: pencatatan cairan, obat, dan hasil lab; pengingat terapi yang andal; edukasi berbahasa Indonesia; deteksi anomali berbasis AI; dan komunitas sesama pasien.

> **Core value:** pasien tidak pernah melewatkan dosis obat, sesi exchange CAPD, atau jadwal HD tanpa sadar — reliabilitas pengingat dan pencatatan harian adalah fitur yang harus berfungsi sempurna.

## Fitur Utama

- **Pencatatan harian** — cairan masuk/keluar (termasuk drainase CAPD), konsumsi obat (dengan foto), sesi cuci darah, aktivitas, dan hasil lab (input manual atau upload PDF/foto).
- **Pengingat terapi** — jadwal obat, exchange CAPD, dan HD per hari dalam seminggu, dengan web push notification ke perangkat (termasuk saat app tidak dibuka) dan follow-up jika belum dikonfirmasi.
- **Dashboard beranda** — keseimbangan cairan harian (visual siluet tubuh), pengingat berikutnya, status obat & cuci darah hari ini.
- **AI insights & deteksi anomali** — analisis mingguan, penjelasan hasil lab, dan peringatan anomali (Groq / Llama 3.3 70B) dengan safety-gate berlapis.
- **Laporan dokter** — rekap periodik yang siap dicetak untuk dibawa saat kontrol.
- **Caregiver mode** — keluarga dapat memantau kepatuhan terapi pasien.
- **Komunitas & edukasi** — tanya-jawab sesama pasien dan artikel edukasi berbahasa Indonesia awam.
- **PWA** — installable ke home screen (Android/iOS/desktop), manifest + service worker (Serwist).

## Arsitektur

Tiga kontainer terpisah yang berkomunikasi hanya lewat REST API (frontend tidak pernah mengakses database langsung):

```
┌──────────────────┐      REST API      ┌──────────────────┐      SQL       ┌──────────────────┐
│    Frontend      │ ─────────────────► │     Backend      │ ─────────────► │     Database     │
│  Next.js (PWA)   │                    │    Express.js    │                │  PostgreSQL 16   │
│    port 3000     │ ◄───────────────── │    port 4000     │ ◄───────────── │   (internal)     │
└──────────────────┘                    └──────────────────┘                └──────────────────┘
```

- Data kesehatan sensitif dienkripsi at-rest (AES-256-GCM di layer aplikasi).
- Autentikasi JWT: access token in-memory + refresh token httpOnly cookie.
- Push notification via Web Push API (VAPID), dijadwalkan `node-cron` yang membaca jadwal dari PostgreSQL.

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack), Tailwind CSS 4, shadcn/ui, Serwist (service worker), Recharts |
| Backend | Express 5, Drizzle ORM, Zod, node-cron, web-push, Groq SDK, Argon2 |
| Database | PostgreSQL 16 |
| Lainnya | Docker Compose, Resend (email reset password) |

## Menjalankan Secara Lokal

Prasyarat: Docker + Docker Compose.

1. Salin `.env.example` menjadi `.env` di root, lalu isi nilainya (kunci enkripsi, JWT secret, VAPID key, dsb.):

   ```bash
   cp .env.example .env
   # generate VAPID key: npx web-push generate-vapid-keys
   ```

2. Jalankan ketiga kontainer:

   ```bash
   docker compose up --build -d
   ```

3. Jalankan migrasi database (sekali di awal):

   ```bash
   docker exec kidneybuddy-backend npx drizzle-kit migrate
   ```

4. Buka `http://localhost:3000`.

Catatan pengembangan: backend tidak memakai hot-reload (`docker restart kidneybuddy-backend` setelah mengubah `backend/src`); perubahan frontend membutuhkan rebuild image (`docker compose up --build -d frontend`).

## Struktur Folder

```
├── docker-compose.yml      # Orkestrasi 3 kontainer
├── frontend/               # Kontainer Next.js (PWA)
│   ├── app/                # App Router: beranda, catatan, pengingat, edukasi, laporan, dst.
│   ├── components/         # Komponen UI per fitur
│   └── lib/                # API client, push client, validator zod
├── backend/                # Kontainer Express.js
│   └── src/
│       ├── routes/         # Definisi endpoint REST
│       ├── controllers/    # HTTP handler
│       ├── services/       # Logika bisnis
│       ├── repositories/   # Akses data (Drizzle)
│       ├── jobs/           # Cron pengingat & follow-up
│       └── db/schema/      # Skema tabel Drizzle
├── PRD.md                  # Product Requirements Document (sumber kebenaran)
└── DESIGN_SYSTEM_KidneyBuddy_v3.md
```

## Tim

Proyek tugas akhir mata kuliah **Pengembangan Sistem Informasi (PSI)** — **Kelompok 7**, Universitas Islam Indonesia.

Product Owner: Nayla Raihaanah Nabilah Hakim.
