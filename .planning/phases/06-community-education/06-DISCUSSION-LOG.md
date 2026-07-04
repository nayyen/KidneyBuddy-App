# Phase 6: Community & Education - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-04
**Phase:** 6-community-education
**Areas discussed:** Navigasi Komunitas, Struktur feed & sorting Komunitas, Mekanisme tandai "membantu", Konten edukasi & seeding

---

## Navigasi Komunitas

| Option | Description | Selected |
|--------|-------------|----------|
| Tab ke-6 di bottom nav | Komunitas jadi tab setara, tapi bottom nav lebih padat di mobile | |
| Sub-tab di dalam halaman Edukasi | Mirip pola /catatan, bottom nav tetap 5 item | |
| Ganti salah satu tab existing | Edukasi dan Komunitas digabung jadi satu tab | ✓ |

**User's choice:** Ganti salah satu tab existing (gabung Edukasi + Komunitas)

| Option | Description | Selected |
|--------|-------------|----------|
| Sub-tab pill row | Mirip pola /catatan, dua pill Edukasi/Komunitas | ✓ |
| Dua section dalam satu scroll | Edukasi di atas, Komunitas di bawah, satu halaman panjang | |
| Toggle switch sederhana | Switch/segmented control di header | |

**User's choice:** Sub-tab pill row

| Option | Description | Selected |
|--------|-------------|----------|
| "Edukasi" | Label nav tidak berubah, Komunitas jadi sub-bagian | ✓ |
| "Komunitas" | Ganti label jadi Komunitas | |
| Label baru gabungan | Nama lain yang mencakup keduanya | |

**User's choice:** "Edukasi"

| Option | Description | Selected |
|--------|-------------|----------|
| Edukasi | Default sub-tab saat pertama buka | ✓ |
| Komunitas | Default ke Komunitas | |
| Ingat pilihan terakhir user | localStorage-based | |

**User's choice:** Edukasi (default sub-tab)

| Option | Description | Selected |
|--------|-------------|----------|
| Satu route /edukasi dengan state lokal | Mirip /catatan, tidak berubah di URL | |
| Route terpisah /edukasi dan /edukasi/komunitas | URL berubah, bisa di-bookmark/share | ✓ |

**User's choice:** Route terpisah /edukasi dan /edukasi/komunitas
**Notes:** User memilih routing terpisah agar komunitas bisa di-link langsung — deviasi sengaja dari pola /catatan yang pakai local state.

---

## Struktur feed & sorting Komunitas

| Option | Description | Selected |
|--------|-------------|----------|
| Satu feed dengan filter | List tunggal, filter kategori + metode terapi | ✓ |
| Tab per kategori | 3 tab terpisah per kategori | |
| Feed polos tanpa filter | Kronologis tanpa filter | |

**User's choice:** Satu feed dengan filter

| Option | Description | Selected |
|--------|-------------|----------|
| Terbaru dulu | Postingan baru selalu di atas | ✓ |
| Paling banyak balasan/membantu dulu | Postingan populer duluan | |

**User's choice:** Terbaru dulu

| Option | Description | Selected |
|--------|-------------|----------|
| Pill chips horizontal | Chip kategori bisa discroll horizontal | ✓ |
| Dropdown/select | Dropdown terpisah kategori + metode terapi | |

**User's choice:** Pill chips horizontal

| Option | Description | Selected |
|--------|-------------|----------|
| Tampilkan semua by default | Tidak auto-filter ke metode terapi user | ✓ |
| Default ke metode terapi aktif user | Auto-filter saat pertama buka | |

**User's choice:** Tampilkan semua by default

---

## Mekanisme tandai "membantu"

| Option | Description | Selected |
|--------|-------------|----------|
| Per-reply, siapa saja bisa menandai | Setiap balasan punya tombol Membantu terpisah, siapa pun bisa | ✓ |
| Per-reply, hanya pembuat post yang bisa pilih | Mirip accepted answer StackOverflow | |
| Di level postingan (sesuai PRD) | Upvote pada postingan, bukan reply | |

**User's choice:** Per-reply, siapa saja bisa menandai
**Notes:** Ini deviasi dari PRD §8.6 yang menyebut "Jumlah Upvote" di level postingan — user secara eksplisit memilih level reply, terbuka untuk semua pembaca.

| Option | Description | Selected |
|--------|-------------|----------|
| Sekali per user, bisa di-toggle | Unique constraint di database, klik lagi untuk batalkan | ✓ |
| Tanpa batas, hanya counter | Tidak ada dedup, bisa disparam sama user yang sama | |

**User's choice:** Sekali per user, bisa di-toggle

---

## Konten edukasi & seeding

| Option | Description | Selected |
|--------|-------------|----------|
| Claude buatkan contoh placeholder | Artikel contoh realistis Bahasa Indonesia sebagai seed | ✓ (dimodifikasi) |
| Saya sudah punya draft konten | User sudah siapkan sendiri | |

**User's choice:** Opsi 1, tapi dengan syarat eksplisit: konten harus BENERAN dan SESUAI, bukan sekadar template/placeholder generik — user tidak punya draft sendiri sama sekali.

| Option | Description | Selected |
|--------|-------------|----------|
| Teks + gambar/ilustrasi | Langkah tertulis + gambar statis | ✓ |
| Termasuk video | Video demonstrasi embed | |

**User's choice:** Teks + gambar/ilustrasi

---

## Claude's Discretion

- Exact wording/copy/count/length of seeded education articles (within the "must be real, not placeholder" constraint the user set).
- Exact DB schema shape for community tables beyond the reply-level/toggle/unique-constraint requirements locked above.

## Deferred Ideas

None — discussion stayed within phase scope.
