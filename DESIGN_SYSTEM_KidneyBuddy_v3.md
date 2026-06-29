# KidneyBuddy — Design System v3.0 (FINAL — sesuai Figma Make export)
*Visual direction: warm teal & amber, soft cream background*
*Sumber warna: Figma Make project "KidneyBuddy mobile app UI" — diekstrak dari kode export (theme.css)*

---

## VISUAL DIRECTION

KidneyBuddy menggunakan estetika **health lifestyle** yang hangat dan menenangkan:
- Background cream lembut (#FDF9F3) — bukan putih steril, bukan biru
- Teal sebagai warna utama — menenangkan, dikaitkan dengan kesehatan dan ketenangan
- Amber sebagai warna aksen — untuk highlight, status "berlangsung", dan kehangatan
- Card putih bersih di atas background cream
- Tipografi besar dan bold untuk angka/data utama
- Tidak ada warna hitam (#000000) di manapun — teks tergelap pakai dark teal

---

## WARNA

### Brand Teal (PRIMARY — dari Figma Make export)
```
Primary teal       : #2a9d8f
Primary teal dark  : #1e8578  (untuk gradient hero)
Secondary teal bg   : #f0faf9 (background card teal sangat muda)
Foreground (teks tergelap) : #1a2e2c
Muted text          : #7a8c8a
```

### Brand Amber (SECONDARY/ACCENT)
```
Amber accent        : #ef9f27
Amber dark          : #e8901a (untuk gradient)
Amber bg muda        : #fdf3e3
```

### Background
```
Page background (CREAM) : #fdf9f3
Card background          : #ffffff
Input background         : #f3f3f5
Muted background         : #f3ede5
```

### Semantic Colors
```
Destructive/Darurat : #d4183d
Border default        : rgba(0, 0, 0, 0.1)
```

```

### Hero Gradient
```
background: linear-gradient(145deg, #f0faf9 0%, #e0f5f2 40%, #cdeee9 70%, #b8e3dc 100%)
```

### AI Card Gradient
```
background: linear-gradient(135deg, #f0faf9, #e0f5f2)
```

### FAB Gradient
```
background: linear-gradient(135deg, #7a8c8a, #2a9d8f)
```

### Therapy Identity Colors
```
CAPD         : #2a9d8f (primary teal) / bg #f0faf9 / text #1a2e2c
Hemodialisis : #ef9f27 (amber) / bg #fdf3e3 / text #7a4c0a
Transplantasi: #6b5ca5 (soft purple, baru — belum ada di Figma export, 
               konsisten dengan warm palette) / bg #f1eef9 / text #2e2752
```
*Catatan: Figma Make export yang ada hanya mendesain untuk pasien CAPD (Pak Lukman). 
Warna Hemodialisis dan Transplantasi di atas adalah ekstensi yang konsisten dengan 
palet warm teal/amber yang sudah ada — perlu dikonfirmasi visual saat halaman 
Pilih Metode Terapi didesain.*

### Semantic Colors
```
Danger/Emergency : #d4183d (dari --destructive Figma) / bg #fdecee / border-left 3px #d4183d
Warning          : #ef9f27 / bg #fdf3e3
Success          : #2a9d8f / bg #f0faf9
Overdue (framing positif) : #ef9f27 / bg #fdf3e3 / dot #ef9f27
```

### Backgrounds
```
Screen bg         : #FFFFFF
Hero section      : gradient (lihat di atas)
Body bg           : #FFFFFF
Card bg           : #ffffff (sangat muda)
Card hover        : #FFFFFF
Page bg secondary : #fdf9f3
```

### ATURAN WARNA — WAJIB DIPATUHI
- TIDAK ADA warna hitam (#000000 atau #111 atau #222) di manapun
- Teks tergelap yang boleh dipakai: #1a2e2c
- Semua teks menggunakan turunan biru: #1a2e2c / #1a2e2c / #2a9d8f / #7a8c8a
- Teks di atas background berwarna: gunakan warna 800 dari ramp yang sama

---

## TIPOGRAFI

### Font Families — WAJIB KONSISTEN DI SEMUA HALAMAN
```
Heading font : "Plus Jakarta Sans" — weight 700 atau 800
Body font    : "DM Sans" — weight 400 atau 500
```

Import Google Fonts:
```
https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap
```

### Scale
```
Hero name / H1  : 22-24px, Plus Jakarta Sans 800
Section title   : 13-14px, Plus Jakarta Sans 700
Card title      : 12-13px, Plus Jakarta Sans 700 atau 600
Body text       : 10-12px, DM Sans 400
Caption/label   : 8-10px,  DM Sans 500
Metric value    : 18-20px, Plus Jakarta Sans 800
```

### ATURAN TIPOGRAFI — WAJIB DIPATUHI
- SEMUA heading, title, nama, angka: Plus Jakarta Sans
- SEMUA body text, deskripsi, label: DM Sans
- Tidak boleh mencampur font — jika ragu, Plus Jakarta Sans untuk judul, DM Sans untuk isi
- Tidak ada font system default (Arial, Helvetica, sans-serif saja)

---

## SPACING
```
4px / 8px / 10px / 12px / 14px / 16px / 20px / 24px / 32px
```

---

## BORDER RADIUS
```
Badge/chip/pill : 20px
Button          : 20px (pill) untuk primary, 8px untuk secondary
Input field     : 10px
Card            : 14-16px
Icon container  : 8-10px
Avatar          : 50%
Modal/sheet     : 20px
```

---

## NAVIGASI — IDENTIK DI SEMUA 27 HALAMAN

### Bottom Navigation (5 slot — TIDAK BOLEH BERUBAH)
```
Tab 1 : Home icon    → label "Beranda"
Tab 2 : Bell icon    → label "Pengingat"
Tab 3 : FAB CENTER   → droplet icon (ti-droplet), label "Catat Cairan"
         Style FAB: width 44px, height 44px, border-radius 50%
         background: linear-gradient(135deg, #7a8c8a, #2a9d8f)
         border: 3px solid #fff
         box-shadow: 0 4px 14px rgba(82,163,214,.35)
         margin-top: -12px (elevated)
Tab 4 : Book icon    → label "Edukasi"
Tab 5 : Users icon   → label "Komunitas"

Nav bg: #FFFFFF
Nav border-top: 0.5px solid #f0faf9
Active tab color: #2a9d8f
Inactive tab color: #cfe8e4
Active indicator: dot 4px #2a9d8f di bawah label
```

### Header (IDENTIK DI SEMUA HALAMAN)
```
Kiri  : nama halaman atau greeting (tergantung halaman)
Kanan : ikon flask (Lab) + ikon clipboard-list (Laporan) + avatar circle
Ikon kanan style: background rgba(putih atau biru muda tergantung bg), border-radius 8px, 28x28px
```

---

## KOMPONEN LIBRARY

### Hero Section
```
Background  : gradient linear-gradient(145deg, #f0faf9, #e0f5f2, #cdeee9, #b8e3dc)
Orbs dekoratif: 3 circle dengan background rgba(255,255,255,.45), rgba(255,255,255,.3), rgba(82,163,214,.08)
Wave separator di bawah hero: SVG path melengkung ke putih
Metric cards di dalam hero: background rgba(255,255,255,.65), border .5px rgba(255,255,255,.8), border-radius 14px
```

### Card Standar
```
background    : #ffffff
border        : 0.5px solid #f0faf9
border-radius : 14-16px
padding       : 12-14px
box-shadow    : none (flat design)
```

### Alert Darurat
```
background    : #fdecee
border-left   : 3px solid #d4183d (bukan full border)
border-radius : 16px
padding       : 11px 13px
Icon container: 30x30px, background #fbd9dd, border-radius 9px, icon warna #d4183d
Tidak bisa di-dismiss tanpa interaksi aktif
```

### Alert AI / Info
```
background    : linear-gradient(135deg, #f0faf9, #e0f5f2)
border        : 0.5px solid #cfe8e4
border-radius : 16px
Icon container: 30x30px, background rgba(255,255,255,.7), border-radius 9px, icon #2a9d8f
```

### Card Kegiatan
```
background    : linear-gradient(135deg, #F0F7FF, #E8F3FC)
border        : 0.5px solid #cfe8e4
border-radius : 16px
Status dots   : running = #EF9F27, done = #2a9d8f, overdue = #d4183d
Feeling prompt: background rgba(255,255,255,.7), border-radius 10px
```

### Therapy Badge (pill)
```
background    : rgba(255,255,255,.6)
border        : 0.5px solid rgba(82,163,214,.25)
border-radius : 20px
padding       : 4px 10px
dot           : 5px, color #2a9d8f
text          : 10px, DM Sans 600, color #1a2e2c
```

### Quick Access Grid
```
Layout        : 4 kolom grid
Item bg       : #ffffff
Item border   : 0.5px solid #f0faf9
Item radius   : 14px
Icon size     : 32x32px, radius 10px
Label         : 9px, DM Sans 500, #1a2e2c
```

### Reminder Item
```
background    : #ffffff
border        : 0.5px solid #f0faf9
border-radius : 13px
padding       : 9px 11px
Done opacity  : 0.6
Check circle done : background #2a9d8f
Check circle pending : border 1.5px #cfe8e4
```

### Form Input
```
background    : #FFFFFF
border        : 0.5px solid #cfe8e4
border-radius : 10px
focus         : border-color #2a9d8f, box-shadow 0 0 0 3px rgba(82,163,214,.15)
text          : #1a2e2c
placeholder   : #cfe8e4
```

### Button Primary
```
background    : #2a9d8f
color         : #ffffff
border-radius : 20px (pill)
padding       : 8px 20px
font          : DM Sans 600
```

### Button Secondary
```
background    : transparent
border        : 0.5px solid #2a9d8f
color         : #2a9d8f
border-radius : 20px
```

### Pill Toggle (Masuk/Keluar, Obat/Terapi)
```
Active  : background #2a9d8f, color #ffffff
Inactive: background #f0faf9, color #1a2e2c
border-radius: 20px
```

### Education Card
```
background    : #ffffff
border        : 0.5px solid #f0faf9
border-radius : 14px
min-width     : 110px (horizontal scroll)
Illustration  : SVG flat, 46-52px height, bg warna pastel per kategori
Tag badge     : pill, 8px, DM Sans 600
```

---

## ILUSTRASI

### Style
- SVG-based, flat, organic shapes
- Warna dari brand palette (biru, teal, ungu, amber)
- Tidak ada outline hitam — stroke menggunakan warna lebih gelap dari fill
- Stroke width: 1.2-1.6px
- Shapes: ellipse untuk shadow, kombinasi rect+ellipse+circle+path organik

### Per halaman yang WAJIB ada ilustrasi
```
01. Splash       : ilustrasi ginjal/gelombang besar, biru
02. Registrasi   : ilustrasi orang dengan clipboard, biru
03. Pilih Terapi : ilustrasi berbeda per card (CAPD=biru, HD=teal, Transplantasi=ungu)
05. Dashboard    : orb dekoratif + SVG abstrak di hero
07. Catat Cairan : ilustrasi droplet/ginjal kecil di atas form
10. Pengingat    : ilustrasi bell/jam kecil di empty state
14. Hasil Lab    : ilustrasi dokumen lab di empty state
19. Komunitas    : ilustrasi orang-orang terhubung
23. Edukasi      : ilustrasi buku/artikel per kategori
```

---

## STATUS KEGIATAN

```
Berlangsung : dot #EF9F27 (amber), badge bg #fdf3e3 text #7a4c0a
Selesai     : dot #2a9d8f (green), badge bg #f0faf9 text #1a2e2c
Overdue     : dot #d4183d (red), badge bg #fbd9dd text #9c1530
             + notifikasi berulang setiap 10 menit
```

---

## CATATAN WAKTU MINUM OBAT
Field teks bebas di form pengingat obat. Contoh nilai:
- "30 menit sebelum makan"
- "Setelah makan malam"
- "Sebelum tidur"
- "Setelah cuci darah"
- "Bersamaan dengan makan"

Ditampilkan di bawah nama obat pada reminder item dengan font DM Sans 400, warna #7a8c8a.

---

## DAFTAR 27 HALAMAN
*5 halaman sudah ada di Figma Make export (Onboarding, Dashboard, CatatCairan, 
Pengingat, BottomNav). 22 halaman sisanya perlu didesain mengikuti palet 
teal/amber/cream ini agar konsisten.*

### BATCH 1 — Core screens (design dulu, review sebelum lanjut)
```
05. Dashboard Utama
07. Form Catat Cairan (FAB)
10. Daftar Semua Pengingat
02. Registrasi
03. Pilih Metode Terapi
```

### BATCH 2 — Onboarding & Notifikasi
```
01. Splash / Welcome
04. Atur Pengingat Pertama
06. Halaman Notifikasi & Alert
```

### BATCH 3 — Tracking
```
08. Riwayat Cairan Harian
09. Ringkasan AI Harian
11. Form Tambah Pengingat Obat
12. Form Pengingat Terapi CAPD
13. Form Pengingat Terapi HD
```

### BATCH 4 — Lab & Laporan
```
14. Daftar Hasil Lab
15. Upload & Input Manual Lab
16. Grafik Tren Parameter Lab
17. Buat Laporan Kontrol
18. Tampilan Laporan
```

### BATCH 5 — Komunitas & Edukasi
```
19. Feed Komunitas
20. Detail Postingan + Form Jawab
21. Form Buat Postingan
22. Profil Anggota Komunitas
23. Daftar Konten Edukasi
24. Detail Konten Edukasi
```

### BATCH 6 — Profil
```
25. Profil Pengguna
26. Ubah Metode Terapi
27. Pengaturan Akun
```

---

## MOBILE SPECS
```
Design width   : 375px (iPhone SE — minimum)
Tap target min : 44x44px
Bottom nav     : 60px height + safe area
Header         : 56px height
Font minimum   : 9px
Responsive     : hingga 1280px desktop
```
