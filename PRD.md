**PRODUCT REQUIREMENTS DOCUMENT**

# **KidneyBuddy**

Aplikasi web pendamping harian pasien gagal ginjal dan caregiver di Indonesia untuk meningkatkan kualitas hidup melalui sistem tracking, pengingat, edukasi, komunitas, dan AI anomaly detection.

| Version | v0.12 \- Draft |
| :---- | :---- |
| **Date** | Juni 2026 |
| **Team** | Kelompok 7 Nayla Raihaanah Nabilah Hakim (24523010)  Aura Dwika Medriana (24523174)  Muhammad Thaahir Ramadhan (24523081)  Ragil Wahyu Purnomo (24523185)  |
| **Product Owner** | Nayla Raihaanah Nabilah Hakim |
| **Client / Stakeholder** | Pasien gagal ginjal dan caregiver di Indonesia |
| **Status** | Draft |

---

**PART 1: PROBLEM, OBJECTIVES & SCOPE**

# **1\. Problem Statement**

### **1.1 Background & Context**

Gagal ginjal kronis (Chronic Kidney Disease/CKD) adalah kondisi yang memaksa pasien menjalani terapi pengganti ginjal seumur hidup — melalui transplantasi, hemodialisis (HD), atau Continuous Ambulatory Peritoneal Dialysis (CAPD). Di Indonesia, data dari studi multisenter di Jakarta menunjukkan bahwa dari 1.152 pasien gagal ginjal, 68,1% menjalani hemodialisis, 24,4% transplantasi ginjal, dan 7,5% CAPD — dengan penyebab utama adalah hipertensi (74,2%) dan diabetes mellitus (30,1%). Indonesia bahkan tercatat mengalami peningkatan prevalensi End-Stage Kidney Disease (ESKD) tertinggi di dunia dalam satu dekade terakhir.

Meskipun ketiga modalitas terapi ini berbeda secara teknis, pasien dari ketiganya menghadapi tantangan manajemen harian yang serupa: menjaga kepatuhan minum obat (termasuk imunosupresan seumur hidup untuk pasien transplantasi), memantau keseimbangan cairan tubuh, dan mencatat kondisi harian untuk evaluasi medis. Khusus untuk pasien CAPD, manajemen ini lebih kompleks — mereka harus melakukan exchange cairan 3–5 kali sehari secara mandiri di rumah dan memantau kondisi cairan keluar sebagai indikator dini infeksi peritonitis, yang merupakan komplikasi paling umum CAPD di Indonesia (31,9% pasien mengalami infeksi menurut studi di RS Kariadi Semarang 2024).

Penelitian juga membuktikan bahwa aktivitas fisik yang terstruktur secara signifikan meningkatkan kualitas hidup pasien dialisis — namun informasi ini tidak mudah diakses oleh pasien awam dalam bahasa Indonesia. Berdasarkan pengalaman langsung mendampingi pasien CAPD, seluruh beban manajemen ini sepenuhnya bergantung pada ingatan pasien, dan keluarga tidak memiliki akses informasi yang cukup untuk ikut membantu.

### **1.2 Problem Statement**

| Format |
| :---- |
| \[Affected group\] cannot \[do something\] because \[root cause\], which results in \[measurable negative impact\]. |

Pasien gagal ginjal kronis dan caregiver di Indonesia tidak dapat mengelola perawatan harian secara mandiri dan terstruktur karena tidak tersedianya sistem informasi terpadu yang menjembatani pencatatan kondisi harian, pengingat terapi, edukasi kontekstual berbahasa Indonesia, dan keterlibatan aktif keluarga, sehingga mengakibatkan ketidakpatuhan jadwal terapi, minimnya data akurat untuk evaluasi medis saat kontrol, dan isolasi pasien dalam mengelola kondisi kronis yang kompleks sendirian.

### **1.3 Who is Affected**

- **Pasien CAPD (Primary User):** Harus melakukan exchange cairan 3–5 kali sehari secara mandiri, memantau kondisi cairan keluar (jernih/keruh/berdarah) sebagai indikator infeksi peritonitis, mencatat volume cairan masuk dan keluar, serta mengonsumsi berbagai obat secara rutin. Tanpa sistem pencatatan dan pengingat, pasien bergantung sepenuhnya pada ingatan di tengah kondisi fisik yang menurun. Mereka tidak bisa menyelesaikan masalah ini sendiri karena tidak ada alat bantu manajemen harian yang relevan dengan kompleksitas terapi CAPD.  
    
- **Pasien Hemodialisis (Primary User):** Menjalani sesi cuci darah di fasilitas kesehatan 2–3 kali seminggu pada hari dan jam yang sudah ditetapkan RS — jadwal ini dimasukkan sendiri oleh pasien ke dalam aplikasi sebagai pengingat. Di antara sesi HD, pasien tetap harus mematuhi pengingat minum obat harian dan memantau asupan cairan. Keluarga juga perlu tahu jadwal HD agar tidak membuat rencana keluarga yang berbenturan. Mereka tidak bisa menyelesaikan ini sendiri karena tidak ada alat bantu yang menghubungkan jadwal HD dengan manajemen harian dan keterlibatan keluarga.  
    
- **Pasien Transplantasi (Primary User):** Harus mengonsumsi obat imunosupresan seumur hidup tanpa melewatkan satu dosis pun, melakukan kontrol rutin, dan memantau tanda-tanda penolakan organ. Tidak ada sistem pengingat dan pencatatan kepatuhan obat yang spesifik untuk kondisi ini. Mereka tidak bisa menyelesaikan ini sendiri karena konsekuensi kelalaian sangat serius namun tidak ada infrastruktur pendukung di luar RS.  
    
- **Caregiver / Keluarga (Secondary User):** Ingin mendampingi dan membantu pasien namun tidak memiliki informasi tentang jadwal, kondisi harian, dan kebutuhan spesifik pasien. Tanpa jembatan informasi, aktivitas keluarga sering tidak mempertimbangkan jadwal terapi pasien. Mereka tidak bisa menyelesaikan ini sendiri karena semua informasi hanya ada di kepala pasien.

---

# **2\. Objectives**

### **2.1 Business Objectives**

| \# | Objective | Why it matters | Success Indicator |
| :---: | :---- | :---- | :---- |
| **1** | Meningkatkan kepatuhan jadwal terapi harian (exchange CAPD, minum obat semua tipe pasien) hingga ≥85% dalam 3 bulan pertama penggunaan aktif | Ketidakpatuhan terapi adalah penyebab utama komplikasi yang seharusnya dapat dicegah pada pasien gagal ginjal kronis | Rasio reminder\_confirmed / total\_reminder\_sent dari reminder\_log, diukur per pengguna aktif per bulan selama 3 bulan |
| **2** | Menyediakan data tracking harian yang akurat dan terstruktur sebagai arsip evaluasi medis saat kontrol dokter | Data tracking yang akurat memungkinkan dokter membuat keputusan klinis yang lebih tepat dan pasien mendapat penanganan yang lebih baik | Jumlah hari aktif dengan minimal 1 entri fluid\_log per pengguna meningkat dari 0 (baseline) menjadi ≥24 hari per bulan dalam 3 bulan |
| **3** | Membangun komunitas pasien gagal ginjal Indonesia yang aktif saling berbagi informasi dan pengalaman | Pasien gagal ginjal membutuhkan dukungan sesama yang memahami kondisi mereka; informasi dari komunitas melengkapi informasi medis formal | Jumlah anggota aktif dan postingan per bulan di community\_activity\_log, target ≥50 postingan aktif dalam 3 bulan pertama |

### **2.2 User Objectives**

| Actor | What they need to accomplish | What stops them today |
| :---- | :---- | :---- |
| Pasien CAPD | Menyelesaikan semua sesi exchange harian tepat waktu dan mencatat volume serta kondisi cairan setiap sesi secara akurat | Tidak ada pengingat terjadwal; pencatatan hanya mengandalkan ingatan yang mudah lupa saat ketiduran atau sibuk |
| Pasien HD | Tidak melewatkan minum obat harian dan memantau asupan cairan di antara sesi HD, serta memudahkan keluarga mengetahui jadwal HD agar bisa ikut mendampingi | Tidak ada sistem pengingat obat yang terintegrasi; keluarga tidak tahu jadwal HD sehingga sering membuat rencana yang berbenturan |
| Pasien Transplantasi | Meminum obat imunosupresan secara konsisten setiap hari dan memantau kondisi tubuh sebagai tanda penolakan organ | Tidak ada sistem pencatatan kepatuhan obat dengan pengingat yang persisten dan spesifik |
| Caregiver / Keluarga | Mengetahui jadwal terapi dan kondisi harian pasien sehingga bisa aktif mendampingi dan tidak mengabaikannya dalam perencanaan aktivitas | Semua informasi kondisi pasien hanya ada di kepala pasien; tidak ada jembatan informasi ke keluarga |

---

# **3\. Success Metrics**

| Metric | Baseline (now) | Target (3 bulan) | How it is measured |
| :---- | :---: | :---: | :---- |
| Persentase jadwal terapi yang diselesaikan tepat waktu | 0% terukur (tidak ada sistem pencatatan) | ≥85% per pengguna aktif | Rasio reminder\_confirmed / total\_reminder\_sent dari reminder\_log per bulan |
| Jumlah hari aktif dengan data cairan tercatat | 0 hari (tidak ada pencatatan) | ≥24 hari per bulan per pengguna aktif | Jumlah hari dengan minimal 1 entri fluid\_log per user\_id per bulan |
| Frekuensi anomali terdeteksi AI sebelum pasien melaporkan sendiri | Tidak terukur (tidak ada sistem deteksi) | ≥1 anomali terdeteksi dan dikonfirmasi relevan per pengguna aktif per bulan | Jumlah anomaly\_alert yang dikirim dan ditandai "relevan" oleh pengguna via feedback\_flag |
| Jumlah postingan aktif di komunitas | 0 (tidak ada platform) | ≥50 postingan per bulan dalam 3 bulan pertama | community\_activity\_log: total post aktif per bulan |

---

# **4\. Scope**

### **4.1 In Scope & Out of Scope (MVP)**

| ✅ IN Scope (MVP) | ❌ OUT of Scope (v1) |
| :---- | :---- |
| Tracking harian cairan: volume masuk (dengan sumber: minuman / makanan / cairan CAPD) dan volume keluar (ml atau kg), untuk semua tipe pasien | Integrasi langsung dengan sistem rekam medis RS atau BPJS |
| Pencatatan selisih cairan masuk dan keluar secara otomatis di akhir hari, untuk semua tipe pasien | Aplikasi mobile native (iOS/Android) — v1 hanya website responsif |
| Pengingat minum obat untuk semua tipe pasien, dengan input nama obat, dosis, dan foto obat | Sinkronisasi otomatis dengan alat ukur medis (timbangan digital, tensimeter) |
| Pengingat jadwal exchange CAPD (harian, per jam) dan jadwal HD (kalender \+ jam) | Fitur telemedicine atau konsultasi dokter online |
| Penyimpanan hasil lab: upload file (PDF/JPG/PNG) dan input manual parameter laboratorium | Machine learning model adaptif — v1 hanya rule-based \+ LLM inference |
| Visualisasi grafik tren parameter laboratorium berdasarkan data yang diinput manual | Verifikasi medis atas konten yang dibagikan pengguna di komunitas |
| AI ringkasan harian: data tracking diubah menjadi narasi Bahasa Indonesia yang mudah dipahami | Manajemen multi-pasien dalam satu akun (v1: satu akun \= satu pasien) |
| AI anomaly detection: deteksi pola data menyimpang dengan peringatan awal | Fitur gamifikasi atau reward system |
| Komunitas model Quora: pasien saling berbagi informasi, pengalaman, dan tanya jawab seputar kehidupan dengan gagal ginjal | Fitur video atau live streaming di komunitas |
| Konten edukasi: artikel, panduan senam/aktivitas fisik, dan informasi lifestyle & makanan untuk pasien gagal ginjal dalam Bahasa Indonesia, dikelola oleh Content Manager | Chatbot AI edukasi interaktif (ditunda ke v2 sebagai Could Have) |
| Tutorial onboarding interaktif untuk pengguna baru yang memandu langkah demi langkah | Multi-device via satu akun dengan notifikasi independen per perangkat |
| Metode terapi dapat diubah kapan saja melalui halaman profil (pasien bisa berpindah dari HD ke transplantasi, dll.) |  |

### **4.2 Assumptions & Constraints**

| Type | Description |
| :---- | :---- |
| **Assumption** | Pasien atau caregiver memiliki akses ke smartphone atau komputer dengan browser modern (Chrome/Safari/Firefox) dan koneksi internet yang cukup untuk mengakses website |
| **Assumption** | Pengguna bersedia memasukkan data harian secara manual — sistem tidak mengambil data otomatis dari alat medis |
| **Assumption** | Caregiver yang menggunakan akun yang sama dengan pasien adalah anggota keluarga terpercaya |
| **Assumption** | Data tracking yang dimasukkan adalah tanggung jawab pengguna sendiri — sistem tidak memvalidasi kebenaran medis, hanya mencatat dan menganalisis pola |
| **Assumption** | Konten edukasi disiapkan dan dikurasi oleh tim KidneyBuddy sebelum launch — tidak ada role Content Manager di dalam aplikasi |
| **Constraint** | Semua output AI wajib menyertakan disclaimer bahwa informasi bukan pengganti saran medis profesional |
| **Constraint** | Semua konten edukasi dan antarmuka dalam Bahasa Indonesia dengan bahasa awam yang dapat dipahami tanpa latar belakang medis |
| **Constraint** | Sistem tidak boleh menyimpan data medis pengguna tanpa persetujuan eksplisit (informed consent saat registrasi) |
| **Constraint** | UI harus dapat digunakan oleh semua kalangan usia — tidak mengasumsikan pengguna melek teknologi |
| **Constraint** | Aplikasi wajib dibangun sebagai **PWA (Progressive Web App)** — pengguna dapat menginstall ke home screen HP dan menerima push notification tanpa perlu publish ke App Store atau Google Play |
| **Constraint** | Web push notification wajib diimplementasikan untuk semua jenis pengingat — hanya aktif setelah pengguna memberikan izin notifikasi di browser. Di iOS, pengguna perlu Add to Home Screen terlebih dahulu |
| **Constraint** | Aplikasi wajib menggunakan arsitektur **microservices** dengan minimal 3 container terpisah: Frontend (Next.js), Backend (Express.js), dan Database (PostgreSQL) — sesuai requirement dosen. Setiap container memiliki Dockerfile sendiri dan dihubungkan melalui satu docker-compose.yml. Komunikasi antar container menggunakan REST API, bukan akses langsung antar layer |
| **Constraint** | Aplikasi dapat diakses publik melalui internet menggunakan **Vercel** sebagai hosting dengan domain `kidneybuddy.vercel.app` atau custom domain — bukan hanya localhost |
| **Constraint** | Development menggunakan Stitch AI untuk mockup, Claude Code untuk vibe-coding implementasi, dan Groq API (Llama 3.3 70B, gratis) untuk fitur AI di dalam app |

### **4.3 Tech Stack & Arsitektur Microservices**

Sesuai requirement dosen, KidneyBuddy dibangun dengan arsitektur **microservices** — tiga container terpisah yang independen, masing-masing dengan tanggung jawab dan Dockerfile sendiri, saling berkomunikasi melalui REST API (bukan monolith satu container).

| Layer | Teknologi | Alasan |
| :---- | :---- | :---- |
| **Frontend Container** | Next.js (React) | Hanya menangani UI/rendering dan PWA — fetch data dari Backend Container via REST API, tidak menyimpan business logic |
| **Backend Container** | Express.js (Node.js) | Menangani seluruh business logic: autentikasi, validasi data, koneksi ke database, dan integrasi AI (Groq API) — terpisah penuh dari frontend |
| **Database Container** | PostgreSQL (via Supabase self-hosted atau container PostgreSQL mandiri) | Menyimpan seluruh data terstruktur — hanya diakses oleh Backend Container, tidak pernah diakses langsung oleh Frontend |
| **AI / LLM** | Groq API (model Llama 3.3 70B) | Dipanggil dari Backend Container — gratis tanpa kartu kredit, tercepat di antara LLM gratis, capable untuk Bahasa Indonesia |
| **Push Notification** | Web Push API \+ Service Worker | Berjalan di Frontend Container, dipicu oleh event dari Backend Container |
| **Containerization** | Docker \+ docker-compose (3 service terpisah) | Requirement dosen — `frontend`, `backend`, `database` masing-masing punya Dockerfile, dihubungkan melalui satu `docker-compose.yml` |
| **Hosting** | Vercel (frontend) \+ Railway atau Render (backend \+ database) | Vercel optimal untuk Next.js frontend; Railway/Render mendukung deployment multi-container untuk backend dan database secara gratis di tier awal |
| **DNS Publik** | Vercel domain (frontend) \+ subdomain backend dari Railway/Render | Frontend dan backend punya endpoint publik masing-masing, frontend melakukan API call ke backend melalui environment variable URL |
| **Vibe-coding** | Claude Code (development tool) | Untuk ngoding ketiga service — terpisah dari AI yang dirasakan pengguna di dalam app |

### **4.4 Struktur Docker Compose**

services:

  frontend:

    build: ./frontend

    ports:

      \- "3000:3000"

    environment:

      \- NEXT\_PUBLIC\_API\_URL=http://backend:5000

    depends\_on:

      \- backend

  backend:

    build: ./backend

    ports:

      \- "5000:5000"

    environment:

      \- DATABASE\_URL=postgresql://user:password@database:5432/kidneybuddy

      \- GROQ\_API\_KEY=${GROQ\_API\_KEY}

    depends\_on:

      \- database

  database:

    image: postgres:16

    environment:

      \- POSTGRES\_DB=kidneybuddy

      \- POSTGRES\_USER=user

      \- POSTGRES\_PASSWORD=password

    volumes:

      \- db\_data:/var/lib/postgresql/data

volumes:

  db\_data:

### **4.5 Prinsip Komunikasi Antar Container**

- **Frontend → Backend**: HTTP request (REST API) melalui `NEXT_PUBLIC_API_URL`, tidak pernah mengakses database secara langsung  
- **Backend → Database**: koneksi melalui connection string PostgreSQL, satu-satunya pintu masuk ke data  
- **Backend → Groq API**: HTTP request eksternal untuk fitur AI (ringkasan, anomali, analisis lab, saran lifestyle)  
- Setiap container dapat di-deploy, di-scale, dan di-restart secara independen tanpa mengganggu container lain — inilah yang membedakan microservices dari monolith

---

**PART 2: FUNCTIONAL REQUIREMENTS & WORKFLOWS**

# **5\. Functional Requirements**

### **5.1 FR Table: Pasien (semua tipe)**

| FR ID | Actor | The system shall… | Condition / Trigger | Priority | MoSCoW |
| :---: | :---: | :---- | :---- | :---: | :---: |
| **FR-PS-001** | Pasien | menampilkan form pencatatan cairan yang seragam untuk semua tipe pasien, dengan kolom: tipe catatan (masuk / keluar), sumber cairan masuk (minuman / makanan / cairan CAPD / lainnya — opsi cairan CAPD hanya muncul untuk pasien CAPD), jenis cairan CAPD jika dipilih (Dextrose 1,5% / 2,5% / 4,25% / Icodextrin 7,5% / lainnya), volume dalam angka desimal, dan satuan (ml / kg) | Ketika pasien membuka halaman Tracking Harian | High | M |
| **FR-PS-002** | Pasien | menghitung dan menampilkan selisih total cairan masuk dan keluar secara otomatis untuk semua tipe pasien, dengan nilai desimal (contoh: 1,5 L masuk − 1,2 L keluar \= 0,3 L selisih), diperbarui setiap kali entri baru disimpan dan ditampilkan sebagai ringkasan di dashboard harian | Setiap kali pengguna menyimpan entri cairan baru | High | M |
| **FR-PS-003** | Pasien | menampilkan kolom kondisi cairan keluar (jernih / keruh / keruh dengan gumpalan putih / berdarah) khusus untuk pasien CAPD, dengan peringatan otomatis jika kondisi tidak normal — karena cairan keruh adalah tanda klinis utama peritonitis yang bisa dideteksi pasien sendiri di rumah sebelum ke dokter | Ketika pasien CAPD mengisi form cairan keluar | High | M |
| **FR-PS-004** | Pasien | mengirimkan notifikasi pengingat minum obat sesuai jadwal yang dikonfigurasi, untuk semua tipe pasien | Ketika waktu sistem mencapai jadwal reminder\_obat yang tersimpan | High | M |
| **FR-PS-005** | Pasien | memungkinkan pengguna menambahkan data obat lengkap dalam satu jadwal pengingat: nama obat, dosis, jenis (minum/suntik), catatan waktu minum (teks bebas, contoh: "30 menit sebelum makan", "setelah makan malam", "sebelum tidur"), dan foto obat (opsional) | Ketika pengguna membuka form tambah pengingat obat | High | M |
| **FR-PS-006** | Pasien | menampilkan form pengingat exchange CAPD dengan input jam pengingat dan pilihan jenis/konsentrasi cairan yang akan digunakan (Dextrose 1,5% / 2,5% / 4,25% / Icodextrin 7,5% / Lainnya), karena tiap sesi bisa menggunakan konsentrasi berbeda sesuai instruksi dokter; dan form pengingat jadwal HD dengan input hari dalam seminggu (pilihan multi-hari) dan jam, yang diisi sendiri oleh pasien berdasarkan jadwal dari RS | Ketika pasien membuka halaman Pengingat dan memilih tipe pengingat terapi sesuai metode aktif | High | M |
| **FR-PS-007** | Pasien | memungkinkan upload file hasil lab (PDF/JPG/PNG, maks. 10 MB) dengan input tanggal pemeriksaan | Ketika pasien memilih opsi "Unggah Dokumen" di halaman Hasil Lab | High | M |
| **FR-PS-008** | Pasien | memungkinkan input manual parameter laboratorium (nama parameter, nilai, satuan, tanggal) sebagai alternatif atau pelengkap upload file | Ketika pasien memilih opsi "Input Manual" di halaman Hasil Lab | High | M |
| **FR-PS-009** | Pasien | menampilkan grafik tren nilai parameter laboratorium berdasarkan data manual yang tersimpan, dengan rentang tanggal yang dapat dipilih | Ketika pasien membuka halaman Hasil Lab dan memilih parameter serta rentang tanggal | Medium | S |
| **FR-PS-010** | Pasien | menampilkan ringkasan AI harian dalam Bahasa Indonesia yang menganalisis seluruh data hari itu secara holistik — mencakup: keseimbangan cairan (selisih masuk/keluar), kondisi cairan CAPD jika ada, kepatuhan minum obat, dan aktivitas harian — disajikan sebagai narasi yang mudah dipahami pasien dan caregiver awam, disertai disclaimer bukan pengganti saran medis | Setiap hari pukul 20.00 waktu lokal, atau ketika dipicu manual oleh pengguna | High | M |
| **FR-PS-010b** | Pasien | menampilkan insight proaktif berbasis tren data jangka pendek (7–30 hari) yang dihasilkan AI, misalnya: tren nilai lab yang konsisten naik/turun, pola kepatuhan obat yang menurun, atau pola selisih cairan yang tidak stabil — disajikan sebagai saran konkret dalam Bahasa Indonesia seperti "Nilai kreatinin kamu naik 3 minggu berturut-turut, pertimbangkan untuk mendiskusikan ini dengan dokter saat kontrol berikutnya" | Setiap minggu pada hari Minggu pukul 19.00, atau ketika AI mendeteksi tren signifikan dari data terbaru | High | M |
| **FR-PS-010c** | Pasien | menampilkan analisis AI terhadap hasil lab yang diinput manual — mendeteksi nilai yang berada di luar rentang normal umum untuk pasien gagal ginjal, menjelaskan artinya dalam Bahasa Indonesia awam, dan menyarankan langkah berikutnya tanpa memberikan diagnosis | Ketika pengguna menyimpan hasil lab dengan input manual dan data parameter tersedia | High | M |
| **FR-PS-010d** | Pasien | menampilkan saran makanan dan lifestyle yang dipersonalisasi berdasarkan kombinasi data tracking harian, hasil lab terbaru, dan metode terapi aktif — misalnya saran pembatasan kalium berdasarkan nilai lab, atau saran jenis senam ringan yang sesuai kondisi pasien hari itu | Ketika pengguna membuka halaman Edukasi atau meminta saran dari dashboard, dan tersedia data tracking minimal 3 hari terakhir | Medium | S |
| **FR-PS-011** | Pasien | menampilkan peringatan anomali dengan penjelasan Bahasa Indonesia yang jelas dan saran langkah konkret berikutnya ketika AI mendeteksi pola data menyimpang | Ketika AI anomaly service menghasilkan alert dengan confidence score ≥ threshold | High | M |
| **FR-PS-011b** | Pasien | menampilkan notifikasi darurat dengan tampilan yang berbeda dan lebih mencolok dari reminder biasa (warna merah, bunyi berbeda, tidak bisa di-dismiss tanpa interaksi aktif) untuk kondisi yang membutuhkan perhatian segera dari semua tipe pasien, yaitu: kondisi cairan keluar CAPD keruh/berdarah, lebih dari 2 jadwal terapi terlewat dalam satu hari (berlaku untuk CAPD, HD, maupun pengingat obat), atau anomali AI dengan severity tinggi pada data tracking pasien manapun | Ketika sistem mendeteksi kondisi darurat dari entri tracking terbaru, berlaku untuk semua tipe pasien | High | M |
| **FR-PS-012** | Pasien | memungkinkan pengguna mengakses dan memfilter konten edukasi (artikel, panduan senam, informasi makanan/lifestyle) berdasarkan metode terapi aktif | Ketika pasien membuka halaman Edukasi | Medium | S |
| **FR-PS-013** | Pasien | memungkinkan pengguna membuat postingan di komunitas, membalas postingan lain, dan menandai postingan sebagai "membantu" — model interaksi Quora | Ketika pasien membuka halaman Komunitas | Medium | S |
| **FR-PS-014** | Pasien | menampilkan tutorial onboarding interaktif langkah demi langkah yang memandu pengguna baru menyelesaikan setup awal (registrasi → pilih terapi → atur pengingat pertama) | Ketika pengguna baru berhasil registrasi untuk pertama kali | High | M |
| **FR-PS-015** | Pasien | memungkinkan pengguna mengubah metode terapi aktif kapan saja melalui halaman profil, dengan konfirmasi eksplisit dan penyesuaian tampilan fitur secara otomatis | Ketika pengguna membuka Pengaturan Profil dan memilih opsi "Ubah Metode Terapi" | High | M |
| **FR-PS-016** | Pasien | menghasilkan ringkasan data untuk kontrol dokter yang merangkum data tracking periode tertentu (cairan masuk/keluar, kepatuhan obat, kondisi cairan CAPD, anomali yang terdeteksi) dalam format yang mudah ditunjukkan kepada dokter saat kunjungan kontrol | Ketika pasien membuka halaman "Laporan Kontrol" dan memilih rentang tanggal | High | M |
| **FR-PS-017** | Pasien | memungkinkan pengguna mencatat kegiatan harian dengan nama kegiatan dan perkiraan waktu selesai, menampilkan status real-time (Berlangsung / Selesai / Overdue), mengirimkan notifikasi pengingat beberapa menit sebelum waktu selesai, mengirimkan notifikasi overdue jika kegiatan belum dihentikan setelah melewati perkiraan selesai, dan menampilkan prompt skala perasaan (Nyaman / Biasa / Lelah / Berat) beserta kolom catatan singkat setelah pengguna menandai kegiatan selesai | Ketika pengguna membuka card "Kegiatan hari ini" di dashboard dan menekan tombol "Mulai" | High | M |
| **FR-PS-018** | Pasien | menampilkan status kegiatan yang melewati perkiraan waktu selesai dengan framing positif — bukan "terlambat" atau "overdue" — melainkan label "Masih aktif · \[durasi\] lebih" dengan warna amber (\#EF9F27) dan teks motivasi "Kamu sudah beraktivitas lebih dari rencana 😊", karena bagi pasien gagal ginjal, beraktivitas lebih lama dari yang direncanakan adalah hal yang positif; mengirimkan notifikasi pengingat yang bersifat informatif (bukan alarm darurat) setiap interval default 10 menit yang dapat dikustomisasi | Ketika waktu sistem melewati perkiraan waktu selesai kegiatan yang statusnya masih "Berlangsung" | High | M |

### **5.2 FR Table: Caregiver**

| FR ID | Actor | The system shall… | Condition / Trigger | Priority | MoSCoW |
| :---: | :---: | :---- | :---- | :---: | :---: |
| **FR-CG-001** | Caregiver | mengirimkan notifikasi pengingat jadwal terapi pasien ke perangkat caregiver secara independen ketika caregiver login dari perangkat berbeda dan mengaktifkan notifikasi | Ketika jadwal reminder aktif dan caregiver login di perangkat berbeda dengan notifikasi diaktifkan | High | M |
| **FR-CG-002** | Caregiver | menampilkan dashboard yang identik dengan tampilan pasien, mencakup data tracking harian, ringkasan AI, dan alert anomali | Ketika caregiver membuka dashboard setelah login | High | M |

### **5.3 FR Table: Sistem (Automated)**

| FR ID | Actor | The system shall… | Condition / Trigger | Priority | MoSCoW |
| :---: | :---: | :---- | :---- | :---: | :---: |
| **FR-SYS-001** | Sistem | menjalankan analisis anomali rule-based terhadap data tracking harian untuk semua tipe pasien, mencakup: penurunan volume cairan keluar ≥30% selama 3 hari berturut-turut, kondisi cairan keruh/berdarah pada CAPD, lebih dari 2 jadwal terapi terlewat dalam satu hari, dan pola asupan cairan menyimpang signifikan — serta memicu notifikasi darurat jika severity tinggi | Setiap kali entri tracking baru disimpan, dan setiap hari pukul 21.00 sebagai batch check | High | M |
| **FR-SYS-002** | Sistem | menghasilkan ringkasan harian menggunakan LLM yang mengintegrasikan seluruh data tersedia hari itu — cairan masuk/keluar, kondisi cairan CAPD, kepatuhan obat, kegiatan harian (durasi, status overdue, skala perasaan) — menjadi narasi Bahasa Indonesia yang kohesif dan mudah dipahami, disertai disclaimer bukan pengganti saran medis | Setiap hari pukul 20.00 waktu lokal atau dipicu manual | High | M |
| **FR-SYS-003** | Sistem | menyesuaikan tampilan fitur, konten edukasi yang direkomendasikan, dan parameter tracking secara otomatis berdasarkan metode terapi aktif pengguna | Ketika pengguna login, atau ketika metode terapi diubah di halaman profil | High | M |
| **FR-SYS-004** | Sistem | menjalankan analisis tren mingguan menggunakan LLM terhadap data 7–30 hari terakhir (cairan, lab, kepatuhan obat) dan menghasilkan insight proaktif dalam Bahasa Indonesia jika ditemukan tren signifikan — contoh: "Nilai kreatinin naik 3 minggu berturut-turut, pertimbangkan diskusi dengan dokter saat kontrol berikutnya" | Setiap Minggu pukul 19.00, atau ketika data lab baru disimpan dan tren terdeteksi | High | M |
| **FR-SYS-005** | Sistem | menganalisis nilai parameter lab yang diinput manual menggunakan LLM, membandingkannya dengan rentang referensi umum untuk pasien gagal ginjal, dan menghasilkan penjelasan serta saran dalam Bahasa Indonesia awam tanpa memberikan diagnosis medis | Ketika pengguna menyimpan hasil lab dengan input manual | High | M |
| **FR-SYS-006** | Sistem | menghasilkan saran makanan dan lifestyle yang dipersonalisasi menggunakan LLM berdasarkan kombinasi metode terapi aktif, hasil lab terbaru, dan pola tracking harian — contoh: saran pembatasan kalium jika nilai kalium lab tinggi, atau rekomendasi senam ringan jika aktivitas harian rendah | Ketika pengguna membuka halaman Edukasi dan tersedia data tracking minimal 3 hari \+ minimal 1 hasil lab | Medium | S |

---

# **6\. User Workflows**

## **6.1 Workflow: Onboarding & Tutorial Pengguna Baru**

| Actor | Pengguna baru (Pasien atau Caregiver) |
| :---- | :---- |
| **Goal** | Menyelesaikan setup awal aplikasi — dari registrasi hingga pengingat pertama terkonfigurasi — dengan panduan tutorial langkah demi langkah tanpa bantuan eksternal |
| **FRs covered** | FR-PS-014, FR-PS-015, FR-PS-004, FR-PS-005, FR-PS-006 |

### **Ideal Path**

| \# | Step description |
| :---: | :---- |
| **1** | Pengguna membuka KidneyBuddy untuk pertama kali. Sistem menampilkan halaman Selamat Datang dengan dua pilihan: "Daftar Akun Baru" atau "Masuk". Pengguna memilih "Daftar Akun Baru". |
| **2** | Sistem menampilkan form registrasi dengan field: nama lengkap, email, password, konfirmasi password, nomor HP, dan tanggal lahir. Pengguna mengisi semua field dan mengklik "Daftar". Sistem memvalidasi dan membuat akun baru. |
| **3** | Sistem menampilkan halaman "Pilih Metode Terapi" dengan tiga pilihan yang disertai ilustrasi dan penjelasan singkat awam: Transplantasi Ginjal / Hemodialisis / CAPD. Pengguna memilih metode terapinya. |
| **4** | Sistem menampilkan konfirmasi pilihan dan menjelaskan bahwa tampilan aplikasi akan disesuaikan dengan metode terapi ini — dan bisa diubah kapan saja. Pengguna mengklik "Lanjut". |
| **5** | Sistem menampilkan halaman "Atur Pengingat Pertama" dengan tutorial overlay yang menunjukkan cara mengisi form pengingat. Untuk CAPD: form pengingat exchange (jam \+ konsentrasi cairan). Untuk HD: form pengingat jadwal HD (hari \+ jam). Untuk semua: form pengingat obat pertama (nama obat, dosis, jam). |
| **6** | Pengguna mengisi minimal satu pengingat dan mengklik "Simpan & Mulai". Sistem menyimpan pengingat dan menampilkan animasi sukses singkat: "KidneyBuddy siap mendampingi kamu\!" |
| **7** | Sistem mengarahkan pengguna ke dashboard utama. Di dashboard, muncul tooltip singkat yang menunjukkan lokasi fitur-fitur utama (tracking harian, pengingat, hasil lab, komunitas, edukasi) secara berurutan — pengguna bisa klik "Lewati" kapan saja. |

### **Decision Points**

| Decision Point | YES / Success path | NO / Error path |
| :---- | :---- | :---- |
| Apakah email yang dimasukkan sudah terdaftar? | Sistem menampilkan pesan "Email ini sudah terdaftar. Masuk?" dengan tautan ke halaman login | Registrasi dilanjutkan normal |
| Apakah pengguna melewati langkah "Atur Pengingat Pertama"? | Pengguna bisa memilih "Lewati untuk sekarang" — sistem tetap membuka dashboard dan menyimpan reminder bahwa pengingat belum dikonfigurasi, ditampilkan sebagai banner di dashboard | Pengingat tersimpan dan pengguna masuk ke dashboard |
| Apakah pengguna menutup aplikasi di tengah onboarding sebelum selesai? | Saat membuka kembali, sistem mendeteksi onboarding belum selesai dan menampilkan pilihan "Lanjutkan dari langkah terakhir" atau "Mulai ulang" | Tidak relevan jika onboarding selesai normal |

### **Edge Cases**

| Edge Case | What the system must do |
| :---- | :---- |
| Pengguna tidak yakin metode terapinya apa | Setiap pilihan metode terapi dilengkapi tombol "Apa ini?" yang membuka penjelasan singkat dalam bahasa awam tanpa meninggalkan halaman onboarding |
| Pengguna ingin melihat tutorial lagi setelah onboarding selesai | Sistem menyediakan opsi "Lihat Tutorial" di halaman Pengaturan yang memutar ulang tooltip panduan di dashboard |

| Actor | Pasien CAPD |
| :---- | :---- |
| **Goal** | Mencatat sesi exchange lengkap hari ini dengan volume dan kondisi cairan, serta menerima peringatan AI jika ada pola yang perlu diperhatikan |
| **FRs covered** | FR-PS-001, FR-PS-002, FR-PS-003, FR-PS-010, FR-PS-011, FR-SYS-001, FR-SYS-002 |

### **Ideal Path**

| \# | Step description |
| :---: | :---- |
| **1** | Notifikasi pengingat exchange muncul di HP pasien. Pasien membuka KidneyBuddy dan melihat dashboard harian — menampilkan berapa sesi exchange sudah selesai dan berapa tersisa hari ini. |
| **2** | Pasien membuka form "Catat Cairan". Sistem menampilkan form dengan kolom: tipe catatan (masuk / keluar), sumber cairan masuk (minuman / makanan / cairan CAPD / lainnya — opsi CAPD hanya muncul untuk pasien CAPD), jika dipilih cairan CAPD maka muncul pilihan konsentrasi (1,5% / 2,5% / 4,25% / Icodextrin 7,5% / Lainnya), volume dalam angka desimal, satuan (ml / kg), dan untuk cairan keluar pasien CAPD: kondisi cairan (jernih / keruh / keruh dengan gumpalan putih / berdarah). |
| **3** | Pasien mengisi data dan mengklik "Simpan". Sistem menyimpan entri, memperbarui akumulasi cairan harian, dan menampilkan selisih cairan masuk vs keluar yang diperbarui di dashboard. |
| **4** | Sistem menjalankan analisis anomali terhadap entri baru. Kondisi cairan: jernih. Tidak ada anomali terdeteksi. |
| **5** | Pukul 20.00, sistem men-generate ringkasan harian AI. Pasien membuka ringkasan. Sistem menampilkan narasi: total cairan masuk/keluar, selisih, kepatuhan jadwal exchange hari ini, dan catatan kondisi — dalam Bahasa Indonesia yang mudah dipahami, disertai disclaimer. |

### **Decision Points**

| Decision Point | YES / Success path | NO / Error path |
| :---- | :---- | :---- |
| Apakah kondisi cairan keluar yang dicatat adalah "keruh" atau "berdarah"? | Sistem langsung menampilkan banner peringatan merah: "Kondisi cairan tidak normal — ini bisa menjadi tanda infeksi. Segera hubungi dokter atau perawat CAPD Anda." Peringatan ini juga tercatat sebagai anomaly\_alert | Entri disimpan normal tanpa peringatan tambahan |
| Apakah AI anomaly service mendeteksi pola anomali dari akumulasi data beberapa hari? | Sistem menampilkan card peringatan di dashboard dengan penjelasan Bahasa Indonesia: apa yang terdeteksi, mengapa perlu diperhatikan, dan saran langkah berikutnya (tanpa diagnosis) | Tidak ada peringatan, dashboard menampilkan status normal |

### **Edge Cases**

| Edge Case | What the system must do |
| :---- | :---- |
| Pasien lupa mencatat exchange dan baru mengisi data keesokan harinya | Sistem memungkinkan input retrospektif dengan pilihan tanggal dan waktu. Data tersimpan dengan label "entri terlambat" di log — tetap dihitung dalam analisis anomali |
| Koneksi internet terputus saat menyimpan data | Sistem menyimpan entri sementara di local storage browser dan menampilkan pesan "Data tersimpan — akan dikirim otomatis saat koneksi kembali" |

## **6.2 Workflow: Pencatatan Cairan Harian & Deteksi Anomali AI (Pasien CAPD)**

| Actor | Pasien CAPD |
| :---- | :---- |
| **Goal** | Mencatat sesi exchange hari ini dengan volume, sumber, konsentrasi cairan, dan kondisi cairan keluar — serta menerima peringatan AI jika ada pola yang perlu diperhatikan |
| **FRs covered** | FR-PS-001, FR-PS-002, FR-PS-003, FR-PS-010, FR-PS-011, FR-PS-011b, FR-SYS-001, FR-SYS-002 |

### **Ideal Path**

| \# | Step description |
| :---: | :---- |
| **1** | Notifikasi pengingat exchange muncul di HP pasien. Pasien membuka KidneyBuddy dan melihat dashboard harian — menampilkan ringkasan cairan hari ini dan berapa sesi exchange sudah tercatat. |
| **2** | Pasien membuka form "Catat Cairan". Sistem menampilkan form dengan kolom: tipe catatan (masuk / keluar), sumber cairan masuk (minuman / makanan / cairan CAPD / lainnya), jika dipilih cairan CAPD maka muncul pilihan konsentrasi (1,5% / 2,5% / 4,25% / Icodextrin 7,5% / Lainnya), volume desimal, satuan (ml / kg), dan untuk cairan keluar: kondisi cairan (jernih / keruh / keruh dengan gumpalan putih / berdarah). |
| **3** | Pasien mengisi data dan mengklik "Simpan". Sistem menyimpan entri, memperbarui akumulasi harian, dan menampilkan selisih cairan masuk vs keluar yang diperbarui di dashboard. |
| **4** | Sistem menjalankan analisis anomali terhadap entri baru. Kondisi cairan: jernih. Tidak ada anomali terdeteksi. |
| **5** | Pukul 20.00, sistem men-generate ringkasan harian AI. Pasien membuka ringkasan berisi narasi Bahasa Indonesia: total cairan masuk/keluar per sumber, selisih, kepatuhan jadwal exchange hari ini — disertai disclaimer bukan pengganti saran medis. |

### **Decision Points**

| Decision Point | YES / Success path | NO / Error path |
| :---- | :---- | :---- |
| Apakah kondisi cairan keluar yang dicatat keruh, keruh dengan gumpalan putih, atau berdarah? | Sistem langsung memicu notifikasi darurat (merah, bunyi berbeda, tidak bisa di-dismiss tanpa interaksi aktif): "Kondisi cairan tidak normal — ini bisa tanda infeksi. Segera hubungi dokter atau perawat CAPD Anda." Alert tercatat sebagai anomaly\_alert severity tinggi | Entri disimpan normal tanpa peringatan tambahan |
| Apakah AI anomaly service mendeteksi pola anomali dari akumulasi data beberapa hari? | Sistem menampilkan card peringatan di dashboard dengan penjelasan Bahasa Indonesia: apa yang terdeteksi, mengapa perlu diperhatikan, dan saran langkah berikutnya | Tidak ada peringatan, dashboard menampilkan status normal |

### **Edge Cases**

| Edge Case | What the system must do |
| :---- | :---- |
| Pasien lupa mencatat exchange dan baru mengisi data keesokan harinya | Sistem memungkinkan input retrospektif dengan pilihan tanggal dan waktu. Data tersimpan dengan label "entri terlambat" — tetap dihitung dalam analisis anomali |
| Koneksi internet terputus saat menyimpan data | Sistem menyimpan entri sementara di local storage browser dan menampilkan pesan "Data tersimpan sementara — akan dikirim otomatis saat koneksi kembali" |

## **6.3 Workflow: Pencatatan Cairan Harian (Pasien HD & Transplantasi)**

| Actor | Pasien HD / Transplantasi |
| :---- | :---- |
| **Goal** | Mencatat asupan dan keluaran cairan harian serta melihat selisihnya sebagai informasi kondisi tubuh hari itu |
| **FRs covered** | FR-PS-001, FR-PS-002, FR-PS-010, FR-PS-011b, FR-SYS-001 |

### **Ideal Path**

| \# | Step description |
| :---: | :---- |
| **1** | Pasien membuka halaman Tracking Harian. Dashboard menampilkan total cairan masuk dan keluar hari ini beserta selisihnya (dalam desimal). |
| **2** | Pasien memilih "Tambah Catatan Cairan". Sistem menampilkan form: tipe catatan (masuk / keluar), sumber cairan masuk (minuman / makanan / lainnya), volume desimal, satuan (ml / kg). Tidak ada opsi cairan CAPD karena bukan pasien CAPD. |
| **3** | Pasien mengisi data dan menyimpan. Sistem memperbarui akumulasi harian dan menampilkan selisih terbaru di dashboard. |
| **4** | Pukul 20.00, ringkasan AI harian digenerate — merangkum total cairan hari ini dalam narasi Bahasa Indonesia sederhana. |

### **Decision Points**

| Decision Point | YES / Success path | NO / Error path |
| :---- | :---- | :---- |
| Apakah AI mendeteksi pola asupan cairan yang menyimpang signifikan dari rata-rata beberapa hari terakhir, atau lebih dari 2 pengingat obat terlewat dalam satu hari? | Sistem memicu notifikasi darurat (merah, bunyi berbeda, tidak bisa di-dismiss) dengan penjelasan Bahasa Indonesia dan saran langkah berikutnya | Tidak ada peringatan, dashboard normal |

### **Edge Cases**

| Edge Case | What the system must do |
| :---- | :---- |
| Pasien lupa mencatat dan baru mengisi keesokan harinya | Sistem memungkinkan input retrospektif dengan pilihan tanggal — data tersimpan dengan label "entri terlambat" |

## **6.4 Workflow: Pengaturan Pengingat Obat (Semua Tipe Pasien)**

| Actor | Pasien (semua tipe) |
| :---- | :---- |
| **Goal** | Mengatur jadwal pengingat minum obat dengan detail obat lengkap agar tidak ada dosis yang terlewat |
| **FRs covered** | FR-PS-004, FR-PS-005 |

### **Ideal Path**

| \# | Step description |
| :---: | :---- |
| **1** | Pasien membuka halaman Pengingat dan memilih "Tambah Pengingat Obat". Sistem menampilkan form pengaturan. |
| **2** | Pasien mengisi: nama obat, jenis (minum / suntik), dosis, hari aktif (pilihan hari dalam seminggu), dan jam pengingat. Foto obat dapat ditambahkan secara opsional. |
| **3** | Pasien mengklik "Simpan". Sistem menyimpan data dan menampilkan daftar pengingat yang sudah dikonfigurasi, diurutkan kronologis seperti tampilan alarm. |
| **4** | Pada jam yang ditentukan, sistem mengirimkan notifikasi ke perangkat pasien (dan caregiver jika login di perangkat lain). Notifikasi menampilkan nama obat dan foto obat jika tersedia. |
| **5** | Pasien membuka notifikasi dan mengkonfirmasi sudah minum obat. Sistem mencatat kepatuhan ke reminder\_log. |

### **Decision Points**

| Decision Point | YES / Success path | NO / Error path |
| :---- | :---- | :---- |
| Apakah pasien mengkonfirmasi sudah minum obat dalam 30 menit setelah notifikasi? | Sistem mencatat status "dikonfirmasi" dan tidak mengirim notifikasi ulang untuk jadwal tersebut | Sistem mengirimkan satu notifikasi pengingat susulan setelah 30 menit dengan pesan "Apakah kamu sudah minum obat ini?" |

### **Edge Cases**

| Edge Case | What the system must do |
| :---- | :---- |
| Pasien mengganti metode terapi (misal dari HD ke transplantasi) | Sistem mempertahankan semua pengingat obat yang ada. Hanya pengingat jadwal terapi (HD/CAPD) yang disesuaikan otomatis dengan metode baru |

## **6.5 Workflow: Caregiver Memantau Kondisi Pasien**

| Actor | Caregiver |
| :---- | :---- |
| **Goal** | Mengetahui jadwal dan kondisi harian pasien dari perangkat sendiri agar bisa aktif mendampingi |
| **FRs covered** | FR-CG-001, FR-CG-002 |

### **Ideal Path**

| \# | Step description |
| :---: | :---- |
| **1** | Caregiver login di HP mereka sendiri menggunakan akun yang sama dengan pasien. |
| **2** | Sistem menampilkan dashboard identik dengan pasien: status cairan hari ini, obat yang sudah/belum dikonfirmasi, ringkasan AI terakhir, dan alert anomali jika ada. |
| **3** | Notifikasi pengingat exchange atau obat muncul di HP caregiver secara bersamaan dengan HP pasien. Caregiver dapat mengingatkan pasien secara langsung. |
| **4** | Jika ada alert anomali AI, caregiver melihatnya di dashboard dan bisa mendiskusikan dengan pasien untuk mempertimbangkan kontak dokter. |

### **Decision Points**

| Decision Point | YES / Success path | NO / Error path |
| :---- | :---- | :---- |
| Apakah caregiver mengaktifkan notifikasi di perangkat mereka? | Caregiver menerima semua reminder jadwal terapi secara independen di HP mereka | Caregiver hanya bisa melihat data saat aktif membuka aplikasi |

### **Edge Cases**

| Edge Case | What the system must do |
| :---- | :---- |
| Caregiver dan pasien login bersamaan dan salah satu mengubah jadwal pengingat | Sistem menerapkan perubahan secara real-time di kedua perangkat dan menampilkan notifikasi "Jadwal pengingat telah diperbarui" di perangkat yang tidak melakukan perubahan |

---

# **7\. Design Considerations**

## **7.1 Design Consideration 1**

| Kategori | Accessibility Standard |
| :---- | :---- |
| **Pernyataan** | Semua teks antarmuka dan konten edukasi menggunakan Bahasa Indonesia awam yang dapat dipahami tanpa latar belakang medis — istilah medis wajib disertai penjelasan singkat dalam tanda kurung, diverifikasi melalui usability test dengan minimal 2 pengguna non-medis dari berbagai kelompok usia sebelum go-live. |

## **7.2 Design Consideration 2**

| Kategori | Platform Requirement |
| :---- | :---- |
| **Pernyataan** | Aplikasi dibangun mobile-first namun wajib fully responsive hingga desktop. Mobile (375px–767px): single column, bottom navigation 5 tab, FAB tengah, header ringkas. Tablet (768px–1023px): layout 2 kolom untuk dashboard dan daftar (misal: card metric berdampingan), bottom nav tetap. Desktop (1024px ke atas): navigasi utama berpindah ke sidebar kiri (bukan bottom nav), konten utama memakai layout multi-kolom dengan max-width 1280px agar tidak melebar berlebihan, header menjadi top bar dengan shortcut Lab/Laporan/Profil tetap terlihat. Komponen FAB "Catat Cairan" di desktop menjadi tombol primary button tetap terlihat di sidebar atau pojok kanan bawah. Diverifikasi melalui browser testing di Chrome mobile, Safari iOS, Chrome desktop, dan Firefox desktop pada breakpoint 375px, 768px, 1024px, dan 1280px. |

## **7.3 Design Consideration 3**

| Kategori | UX Goal |
| :---- | :---- |
| **Pernyataan** | Pengguna baru dari semua kalangan usia harus dapat menyelesaikan onboarding (registrasi → pilih metode terapi → atur pengingat pertama) dengan panduan tutorial interaktif dalam waktu tidak lebih dari 5 menit tanpa bantuan eksternal, diverifikasi melalui unmoderated usability test dengan minimal 3 pengguna baru dari kelompok usia berbeda (termasuk minimal 1 pengguna usia 50+) sebelum go-live. |

## **7.4 Design Consideration 4**

| Kategori | UX Goal |
| :---- | :---- |
| **Pernyataan** | Setiap peringatan AI (anomali atau ringkasan harian) harus menggunakan bahasa yang menenangkan dan tidak menimbulkan kepanikan, selalu disertai saran langkah konkret dan disclaimer bahwa ini bukan diagnosis medis, diverifikasi melalui review konten oleh minimal 1 orang dengan pengalaman merawat pasien gagal ginjal sebelum go-live. |

## **7.5 Design Consideration 5**

| Kategori | UX Goal |
| :---- | :---- |
| **Pernyataan** | Desain visual harus estetik, modern, dan nyaman digunakan oleh semua kalangan usia — menghindari elemen terlalu kecil, kontras rendah, atau layout yang terlalu padat — diverifikasi melalui pengujian dengan pengguna dari rentang usia 20–65 tahun sebelum go-live. |

---

# **8\. Data Requirements**

## **8.1 Data Entity 1: Pengguna (User)**

| Field | Detail |
| :---- | :---- |
| **Nama Entitas** | Pengguna |
| **Primary Key (PK)** | user\_id (UUID, auto-generated) |
| **Foreign Key (FK)** | Tidak ada |
| **Atribut Kunci** | Nama Lengkap, Email, Password (hashed), Tanggal Lahir, Jenis Kelamin, Nomor Telepon, Metode Terapi Aktif (CAPD / HD / Transplantasi), Tanggal Mulai Terapi Aktif, Role (Pasien / Caregiver / Content Manager), Riwayat Metode Terapi (JSON array untuk mencatat pergantian terapi) |
| **Business Constraint** | Satu email hanya boleh digunakan untuk satu akun aktif. Metode terapi dapat diubah kapan saja melalui profil dengan konfirmasi eksplisit — perubahan dicatat di riwayat terapi. Data pengguna tidak dapat dihapus permanen (soft delete). |
| **Relasi ke Entitas Lain** | Satu Pengguna memiliki banyak FluidLog, MedicationLog, ReminderSchedule, LabResult, CommunityPost, dan AnomalyAlert. |

## **8.2 Data Entity 2: Catatan Cairan Harian (FluidLog)**

| Field | Detail |
| :---- | :---- |
| **Nama Entitas** | Catatan Cairan Harian |
| **Primary Key (PK)** | log\_id (UUID, auto-generated) |
| **Foreign Key (FK)** | user\_id (FK → Pengguna) |
| **Atribut Kunci** | Tanggal, Waktu, Tipe Cairan (masuk / keluar), Sumber Cairan Masuk (minuman / makanan / cairan CAPD / lainnya — nullable untuk cairan keluar), Konsentrasi Cairan CAPD (1,5% / 2,5% / 4,25% / Icodextrin 7,5% / lainnya — nullable, hanya untuk sumber cairan CAPD masuk), Volume (desimal, contoh: 1.5, 0.75), Satuan (ml / kg), Kondisi Cairan Keluar (khusus CAPD: jernih / keruh / keruh dengan gumpalan putih / berdarah — nullable untuk tipe lain), Catatan Tambahan, is\_late\_entry (boolean) |
| **Business Constraint** | Kondisi cairan keluar wajib diisi untuk entri cairan keluar pasien CAPD. Volume tidak boleh negatif dan harus mendukung nilai desimal hingga 2 angka di belakang koma. Sumber cairan wajib dipilih untuk entri cairan masuk. Konsentrasi cairan CAPD wajib diisi jika sumber dipilih "cairan CAPD". |
| **Relasi ke Entitas Lain** | Banyak FluidLog merujuk pada satu Pengguna. Digunakan oleh AI Service untuk deteksi anomali dan generate ringkasan harian. |

## **8.3 Data Entity 3: Catatan Kepatuhan Obat (MedicationLog)**

| Field | Detail |
| :---- | :---- |
| **Nama Entitas** | Catatan Kepatuhan Obat |
| **Primary Key (PK)** | med\_log\_id (UUID, auto-generated) |
| **Foreign Key (FK)** | user\_id (FK → Pengguna), reminder\_id (FK → ReminderSchedule) |
| **Atribut Kunci** | Nama Obat, Dosis, Jenis Obat (minum / suntik), Catatan Waktu Minum (teks bebas, nullable — contoh: "30 menit sebelum makan", "setelah makan malam"), Foto Obat (file path, nullable), Tanggal dan Waktu Pengingat, Status Konfirmasi (dikonfirmasi / terlewat / tertunda), Timestamp Konfirmasi (nullable) |
| **Business Constraint** | Status hanya bisa berubah dari "tertunda" ke "dikonfirmasi" atau "terlewat" — tidak bisa diubah kembali setelah 24 jam untuk menjaga integritas data kepatuhan. |
| **Relasi ke Entitas Lain** | Banyak MedicationLog merujuk pada satu Pengguna dan satu ReminderSchedule. Digunakan oleh AI Service untuk analisis kepatuhan dalam ringkasan harian. |

## **8.4 Data Entity 4: Jadwal Pengingat (ReminderSchedule)**

| Field | Detail |
| :---- | :---- |
| **Nama Entitas** | Jadwal Pengingat |
| **Primary Key (PK)** | reminder\_id (UUID, auto-generated) |
| **Foreign Key (FK)** | user\_id (FK → Pengguna) |
| **Atribut Kunci** | Tipe Pengingat (exchange CAPD / jadwal HD / minum obat), Nama Obat (nullable), Dosis (nullable), Jenis Obat (nullable), Catatan Waktu Minum (teks bebas, nullable — contoh: "30 menit sebelum makan"), Foto Obat (file path, nullable), Konsentrasi Cairan CAPD (nullable), Hari Aktif (JSON array: Senin–Minggu), Jam Pengingat, Tanggal Spesifik (nullable, untuk HD), Status Aktif (boolean) |
| **Business Constraint** | Tipe "exchange CAPD" hanya tersedia untuk pengguna dengan metode terapi CAPD. Tipe "jadwal HD" hanya untuk pasien HD. Pengingat tidak bisa dijadwalkan di waktu lampau. |
| **Relasi ke Entitas Lain** | Banyak ReminderSchedule merujuk pada satu Pengguna. Digunakan oleh Notification Service untuk mengirim push notification ke semua perangkat aktif yang login dengan akun yang sama. |

## **8.5 Data Entity 5: Hasil Laboratorium (LabResult)**

| Field | Detail |
| :---- | :---- |
| **Nama Entitas** | Hasil Laboratorium |
| **Primary Key (PK)** | lab\_id (UUID, auto-generated) |
| **Foreign Key (FK)** | user\_id (FK → Pengguna) |
| **Atribut Kunci** | Tanggal Pemeriksaan, Tipe Input (upload file / manual), File Path (nullable), Parameter Lab (JSON array: nama parameter, nilai, satuan — untuk input manual), Catatan Tambahan, Status (aktif / diarsipkan) |
| **Business Constraint** | Format file diterima: PDF, JPG, PNG ≤10 MB. Data manual wajib menyertakan nama parameter dan nilai. Hasil lab tidak bisa dihapus permanen — hanya diarsipkan. |
| **Relasi ke Entitas Lain** | Banyak LabResult merujuk pada satu Pengguna. Data parameter manual digunakan untuk visualisasi grafik tren di halaman Hasil Lab. |

## **8.6 Data Entity 6: Postingan Komunitas (CommunityPost)**

| Field | Detail |
| :---- | :---- |
| **Nama Entitas** | Postingan Komunitas |
| **Primary Key (PK)** | post\_id (UUID, auto-generated) |
| **Foreign Key (FK)** | user\_id (FK → Pengguna) |
| **Atribut Kunci** | Judul, Isi Postingan, Kategori (pertanyaan / berbagi pengalaman / informasi), Metode Terapi Relevan (CAPD / HD / Transplantasi / Umum), Timestamp, Jumlah Upvote, Status (aktif / diarsipkan) |
| **Business Constraint** | Semua pengguna terdaftar dapat membuat postingan tanpa batasan metode terapi. Postingan dapat diarsipkan oleh pengguna sendiri atau admin. |
| **Relasi ke Entitas Lain** | Satu CommunityPost dapat memiliki banyak CommunityReply. Banyak CommunityPost merujuk pada satu Pengguna. |

## **8.7 Data Entity 7: Laporan Kontrol Dokter (DoctorVisitReport)**

| Field | Detail |
| :---- | :---- |
| **Nama Entitas** | Laporan Kontrol Dokter |
| **Primary Key (PK)** | report\_id (UUID, auto-generated) |
| **Foreign Key (FK)** | user\_id (FK → Pengguna) |
| **Atribut Kunci** | Rentang Tanggal (tanggal awal dan akhir), Ringkasan Cairan (total masuk/keluar per hari, rata-rata), Ringkasan Kepatuhan Obat (persentase dikonfirmasi vs terlewat), Kondisi Cairan CAPD (ringkasan frekuensi tiap kondisi — khusus CAPD), Anomali Terdeteksi (daftar alert dalam periode), Catatan Pengguna (opsional untuk ditambahkan sebelum ke dokter), Timestamp Dibuat |
| **Business Constraint** | Laporan dibuat berdasarkan data yang sudah tersimpan di FluidLog, MedicationLog, dan AnomalyAlert — tidak bisa diedit isinya. Pengguna hanya bisa menambahkan catatan opsional. |
| **Relasi ke Entitas Lain** | Merujuk pada data FluidLog, MedicationLog, dan AnomalyAlert dalam rentang tanggal yang dipilih. |

## **8.8 Data Entity 8: AI Anomaly Alert**

| Field | Detail |
| :---- | :---- |
| **Nama Entitas** | AI Anomaly Alert |
| **Primary Key (PK)** | alert\_id (UUID, auto-generated) |
| **Foreign Key (FK)** | user\_id (FK → Pengguna) |
| **Atribut Kunci** | Timestamp Deteksi, Tipe Pasien (CAPD / HD / Transplantasi), Tipe Anomali (penurunan volume cairan / kondisi cairan abnormal — khusus CAPD / jadwal terapi terlewat berulang / pola asupan cairan menyimpang), Severity (normal / tinggi — severity tinggi memicu notifikasi darurat), Deskripsi Bahasa Indonesia, Confidence Score, Status (aktif / dibaca / ditindaklanjuti), Feedback Pengguna (relevan / tidak relevan) |
| **Business Constraint** | Alert hanya dibuat oleh sistem secara otomatis. Feedback wajib diisi untuk setiap alert yang dibaca agar akurasi AI dapat dievaluasi. |
| **Relasi ke Entitas Lain** | Banyak AnomalyAlert merujuk pada satu Pengguna. Data feedback digunakan untuk mengukur success metric akurasi AI. |

---

# **9\. Non-Functional Requirements (NFRs)**

## **9.1 NFR 1: Performance**

| Komponen | Isian |
| :---- | :---- |
| **NFR ID** | NFR-01 |
| **Kategori** | Performance |
| **Pernyataan Lengkap** | Halaman dashboard utama harus memuat seluruh data tracking harian dan ringkasan AI dalam waktu tidak lebih dari 3 detik untuk 95% permintaan ketika jumlah pengguna concurrent ≤100, diverifikasi menggunakan k6 load test yang mensimulasikan 100 pengguna concurrent mengakses dashboard secara bersamaan sebelum go-live. |

## **9.2 NFR 2: Security**

| Komponen | Isian |
| :---- | :---- |
| **NFR ID** | NFR-02 |
| **Kategori** | Security |
| **Pernyataan Lengkap** | Seluruh data pengguna yang ditransmisikan antara browser dan server harus dienkripsi menggunakan TLS 1.2 atau lebih tinggi, dan data kesehatan sensitif yang disimpan di database (fluid\_log, medication\_log, lab\_result) harus dienkripsi at-rest, diverifikasi melalui security audit sebelum go-live. |

## **9.3 NFR 3: Security**

| Komponen | Isian |
| :---- | :---- |
| **NFR ID** | NFR-03 |
| **Kategori** | Security |
| **Pernyataan Lengkap** | Lima kali percobaan login gagal dalam 10 menit harus memicu penguncian akun sementara selama 15 menit secara otomatis, diverifikasi melalui automated test script yang mensimulasikan skenario brute-force login sebelum go-live. |

## **9.4 NFR 4: Availability**

| Komponen | Isian |
| :---- | :---- |
| **NFR ID** | NFR-04 |
| **Kategori** | Availability |
| **Pernyataan Lengkap** | Uptime sistem harus mencapai 99% atau lebih tinggi diukur per bulan — mengingat pasien bergantung pada sistem pengingat untuk terapi yang bersifat time-critical — dimonitor menggunakan Uptime Kuma atau layanan monitoring setara yang dikonfigurasi sebelum go-live. |

## **9.5 NFR 5: Scalability**

| Komponen | Isian |
| :---- | :---- |
| **NFR ID** | NFR-05 |
| **Kategori** | Scalability |
| **Pernyataan Lengkap** | Arsitektur sistem harus dapat menangani peningkatan jumlah pengguna aktif hingga 10x dari jumlah awal tanpa perubahan kode — hanya dengan penambahan resource server — diverifikasi melalui load test bertahap sebelum go-live. |

---

# **10\. Release & Milestone Plan**

## **10.1 Milestone 1: PRD Final & Approved**

| Nama Milestone | Owner | Minggu | Acceptance Criterion |
| :---- | :---: | :---- | :---- |
| PRD Final Approval | Product Owner | Wk 2 | Seluruh bagian PRD (Part 1–3) diisi lengkap, direview semua anggota tim, tidak ada placeholder tersisa, dan mendapat persetujuan dosen. |

## **10.2 Milestone 2: Design & Mockup Complete**

| Nama Milestone | Owner | Minggu | Acceptance Criterion |
| :---- | :---: | :---- | :---- |
| Design & Mockup Complete | Product Owner | Wk 4 | Seluruh halaman utama (onboarding \+ tutorial, dashboard, tracking harian, pengingat obat & terapi, hasil lab, komunitas, edukasi, ringkasan AI, halaman admin Content Manager) selesai di-mockup menggunakan Stitch AI, direview tim, dan disetujui sebagai acuan development. |

## **10.3 Milestone 3: Core Tracking & Reminder Ready**

| Nama Milestone | Owner | Minggu | Acceptance Criterion |
| :---- | :---: | :---- | :---- |
| Core Tracking & Reminder Ready | Tech Lead | Wk 7 | Fitur tracking cairan harian (FluidLog \+ MedicationLog) dan sistem pengingat (ReminderSchedule \+ push notification multi-device) berfungsi end-to-end untuk ketiga metode terapi. Semua FR Must Have terkait tracking dan pengingat lulus unit test. Pergantian metode terapi berfungsi dan fitur menyesuaikan otomatis. |

## **10.4 Milestone 4: AI & Community Features Complete**

| Nama Milestone | Owner | Minggu | Acceptance Criterion |
| :---- | :---: | :---- | :---- |
| AI & Community Features Complete | Tech Lead | Wk 10 | AI ringkasan harian dan AI anomaly detection berfungsi di staging environment. Minimal 3 skenario anomali terdeteksi dengan benar dalam pengujian manual. Halaman komunitas (posting, reply, upvote) dan halaman edukasi dengan Content Manager berfungsi. Output AI dapat dibaca pengguna non-medis tanpa kebingungan. |

## **10.5 Milestone 5: Go-Live MVP**

| Nama Milestone | Owner | Minggu | Acceptance Criterion |
| :---- | :---: | :---- | :---- |
| Go-Live MVP | Product Owner & Tech Lead | Wk 13 | Semua FR Must Have lulus pengujian di staging. Tidak ada bug kritis terbuka. Tutorial onboarding berfungsi. Minimal 2 sesi user testing dengan pasien atau caregiver nyata dari kelompok usia berbeda sudah dilakukan dan feedback kritis sudah ditangani. |

---

# **Revision History**

| Version | Date | Author | Changes |
| :---: | :---- | :---- | :---- |
| v0.1 | Juni 2026 | Nayla Raihaanah Nabilah Hakim | Initial draft — Part 1 & 2 lengkap |
| v0.2 | Juni 2026 | Nayla Raihaanah Nabilah Hakim | Revisi berdasarkan 9 catatan: penambahan aktor Content Manager, revisi pencatatan cairan (sumber \+ satuan fleksibel) untuk semua pasien, pengingat obat universal, foto obat, metode terapi bisa berganti, komunitas model Quora, konten edukasi senam & lifestyle, pertimbangan UI semua usia \+ tutorial |
| v0.3 | Juni 2026 | Nayla Raihaanah Nabilah Hakim | Hapus role Content Manager (konten edukasi in-house, Model A). Koreksi framing HD. Detail pengingat CAPD vs HD. Kondisi cairan CAPD berbasis medis peritonitis. Tambah FR laporan kontrol dokter dan Data Entity DoctorVisitReport. |
| v0.4 | Juni 2026 | Nayla Raihaanah Nabilah Hakim | Semua tipe pasien setara. Opsi sumber cairan seragam \+ opsi CAPD khusus pasien CAPD. Tambah opsi "Lainnya" di konsentrasi cairan. Volume desimal. |
| v0.5 | Juni 2026 | Nayla Raihaanah Nabilah Hakim | Tambah Workflow 6.1 Onboarding. Tambah Workflow 6.3 HD & Transplantasi. Tambah FR-PS-011b notifikasi darurat. |
| v0.6 | Juni 2026 | Nayla Raihaanah Nabilah Hakim | Notifikasi darurat diperluas ke semua tipe pasien (bukan hanya CAPD). Update FR-PS-011b, FR-SYS-001, Workflow 6.3, dan AnomalyAlert entity. |
| v0.7 | Juni 2026 | Nayla Raihaanah Nabilah Hakim | Perluas scope AI: ringkasan harian holistik, insight proaktif tren mingguan, analisis nilai lab, saran makanan & lifestyle dipersonalisasi. Tambah FR-SYS-004, FR-SYS-005, FR-SYS-006, FR-PS-010b, FR-PS-010c, FR-PS-010d. |
| v0.8 | Juni 2026 | Nayla Raihaanah Nabilah Hakim | Tambah PWA constraint, Docker requirement, Vercel hosting, DNS publik. Tambah section 4.3 Tech Stack (Next.js, Supabase, Anthropic API, Docker, Vercel, Claude Code). |
| v0.9 | Juni 2026 | Nayla Raihaanah Nabilah Hakim | Tambah FR-PS-017 (catat kegiatan \+ skala perasaan dari dashboard), FR-PS-018 (notifikasi overdue kegiatan berulang). Tambah catatan waktu minum obat (teks bebas) ke FR-PS-005, ReminderSchedule, MedicationLog. Update FR-SYS-002 agar data kegiatan masuk analisis AI harian. |
| v0.9b | Juni 2026 | Nayla Raihaanah Nabilah Hakim | Update FR-PS-018: framing overdue kegiatan diubah dari negatif ('Terlambat') ke positif ('Masih aktif · X lebih') karena beraktivitas lebih lama dari rencana adalah hal positif bagi pasien gagal ginjal. |
| v0.10 | Juni 2026 | Nayla Raihaanah Nabilah Hakim | Perjelas spesifikasi responsive: breakpoint mobile/tablet/desktop dengan layout berbeda per ukuran (bottom nav di mobile, sidebar di desktop). Sebelumnya hanya menyebut mobile 375px tanpa detail desktop. |
| v0.11 | Juni 2026 | Nayla Raihaanah Nabilah Hakim | Restrukturisasi arsitektur dari monolith menjadi microservices sesuai requirement dosen: 3 container terpisah (Frontend Next.js, Backend Express.js, Database PostgreSQL) dengan Dockerfile masing-masing dan komunikasi via REST API. Tambah section 4.4 docker-compose.yml dan 4.5 Prinsip Komunikasi Antar Container. |
| v0.12 | Juni 2026 | Nayla Raihaanah Nabilah Hakim | Tidak ada perubahan substansi FR/NFR. Catatan: palet warna final diputuskan dari hasil Figma Make export (TEAL \#2a9d8f, AMBER \#ef9f27, CREAM \#fdf9f3) menggantikan palet biru \#52A3D6 yang dipakai di draft Design System sebelumnya. Detail lengkap di DESIGN\_SYSTEM\_KidneyBuddy\_v3.md. |

