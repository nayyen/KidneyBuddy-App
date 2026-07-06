/**
 * content/community.ts — hand-written community_posts / community_replies
 * body templates (COMMUNITY-01/02/03).
 *
 * Two kinds of content:
 * 1. ANCHORED_POSTS — 3 specific narrative posts tied to real seed-data
 *    events (Lukman's April effluent-keruh question, Sari's post-Lebaran
 *    potassium/fruit post, Budi's "6 bulan pasca-transplan" milestone).
 *    The generator places these at specific dates.
 * 2. POST_TEMPLATES / REPLY_TEMPLATES — generic supportive-tone template
 *    "shapes" with {persona} / {angka} placeholders the generator fills in
 *    (via rng-picked values) to produce the remaining ~35-45 posts and their
 *    replies without hand-authoring each one individually.
 *
 * Public/peer-visible content only — no clinical claims, no diagnosis,
 * supportive Quora-style tone (D-05/D-06/D-07).
 */

export type AnchoredPost = {
  judul: string;
  isi: string;
  kategori: "pertanyaan" | "berbagi_pengalaman" | "informasi";
  metodeTerapi: "CAPD" | "HD" | "Transplantasi" | "Umum";
  authorKey: "lukman" | "sari" | "budi";
  /** ISO date (YYYY-MM-DD) this post should be anchored to. */
  tanggal: string;
  replies: Array<{ authorKey: "lukman" | "sari" | "budi"; isi: string }>;
};

export const ANCHORED_POSTS: AnchoredPost[] = [
  {
    judul: "Cairan drainase siang ini keruh, apa ini normal?",
    isi:
      "Halo semua, hari ini pas exchange siang cairan yang keluar dari perut saya keruh, biasanya jernih. Tidak ada demam atau nyeri sih, tapi saya jadi agak khawatir. Ada yang pernah mengalami hal serupa? Apa yang biasanya dilakukan sebelum menghubungi rumah sakit?",
    kategori: "pertanyaan",
    metodeTerapi: "CAPD",
    authorKey: "lukman",
    tanggal: "2026-04-14",
    replies: [
      {
        authorKey: "sari",
        isi: "Wah semoga cepat baikan Pak Lukman. Kalau saya dulu pernah dengar dari perawat, cairan keruh walau tanpa gejala lain tetap sebaiknya dilaporkan ke tim medis, bukan ditunggu. Semangat ya!",
      },
      {
        authorKey: "budi",
        isi: "Setuju sama komentar di atas, meski saya bukan CAPD tapi prinsipnya sama — kalau ada yang beda dari biasanya di area perawatan, lebih baik cepat dicek daripada menunggu. Semoga tidak apa-apa Pak.",
      },
    ],
  },
  {
    judul: "Kalium naik habis lebaran, gimana cara ngerem lagi?",
    isi:
      "Assalamualaikum, izin cerita. Habis lebaran kemarin kadar kalium saya naik lumayan, kemungkinan besar karena banyak buah dan makanan bersantan pas open house keluarga. Sekarang lagi coba lebih hati-hati pilih buah. Ada yang punya tips praktis mengatur pola makan pasca lebaran khusus untuk pasien HD?",
    kategori: "berbagi_pengalaman",
    metodeTerapi: "HD",
    authorKey: "sari",
    tanggal: "2026-03-25",
    replies: [
      {
        authorKey: "lukman",
        isi: "Sama Bu Sari, saya juga biasanya 'kebablasan' pas lebaran. Setelah itu saya coba kurangi dulu buah tinggi kalium seperti pisang dan durian, ganti apel atau nanas dalam porsi kecil.",
      },
      {
        authorKey: "budi",
        isi: "Ikut belajar dari sini, kebetulan saya juga sempat kelewat batas pas lebaran meski bukan soal kalium. Semoga next lebaran kita semua bisa lebih siap-siap dari awal.",
      },
    ],
  },
  {
    judul: "6 bulan pasca-transplan, alhamdulillah stabil",
    isi:
      "Mau berbagi kabar baik, hari ini genap 6 bulan sejak operasi transplantasi ginjal saya. Alhamdulillah kondisi stabil, obat imunosupresan rutin diminum sesuai jadwal, dan hasil lab terakhir juga bagus. Awalnya berat banget menyesuaikan diri dengan jadwal minum obat yang ketat, tapi lama-lama jadi rutinitas biasa. Buat teman-teman yang baru menjalani transplantasi, semangat ya, prosesnya memang butuh waktu tapi bisa dijalani.",
    kategori: "berbagi_pengalaman",
    metodeTerapi: "Transplantasi",
    authorKey: "budi",
    tanggal: "2026-04-10",
    replies: [
      {
        authorKey: "lukman",
        isi: "Alhamdulillah, ikut senang dengar kabar baiknya Pak Budi. Semoga terus sehat dan lancar ke depannya.",
      },
      {
        authorKey: "sari",
        isi: "Selamat ya Pak Budi! Ceritanya jadi motivasi buat yang lain juga nih, termasuk saya yang kadang masih suka lupa jadwal.",
      },
    ],
  },
];

export type PostTemplate = {
  judulTemplate: string;
  isiTemplate: string;
  kategori: "pertanyaan" | "berbagi_pengalaman" | "informasi";
  metodeTerapi: "CAPD" | "HD" | "Transplantasi" | "Umum";
};

/** {angka} placeholders are filled in by the generator via rng.randInt(). */
export const POST_TEMPLATES: PostTemplate[] = [
  {
    judulTemplate: "Tips supaya tidak lupa jadwal minum obat?",
    isiTemplate:
      "Akhir-akhir ini saya beberapa kali hampir lupa jadwal minum obat karena kesibukan kerja. Ada yang punya cara praktis supaya lebih disiplin? Selain pakai pengingat di aplikasi ini tentunya.",
    kategori: "pertanyaan",
    metodeTerapi: "Umum",
  },
  {
    judulTemplate: "Pengalaman pertama kali menjalani terapi",
    isiTemplate:
      "Ingin berbagi pengalaman waktu pertama kali mulai terapi dulu, rasanya campur aduk antara khawatir dan berusaha menerima keadaan. Sekarang setelah beberapa bulan berjalan, sudah mulai terasa jadi rutinitas. Buat yang baru mulai, tidak apa-apa kalau masih merasa berat di awal.",
    kategori: "berbagi_pengalaman",
    metodeTerapi: "Umum",
  },
  {
    judulTemplate: "Rekomendasi menu sahur/sarapan rendah garam",
    isiTemplate:
      "Sedang cari-cari ide menu sarapan yang rendah garam tapi tetap enak dan mengenyangkan. Kalau teman-teman punya menu andalan sehari-hari, boleh dong dibagikan di sini.",
    kategori: "pertanyaan",
    metodeTerapi: "Umum",
  },
  {
    judulTemplate: "Cara mengatasi rasa haus berlebihan",
    isiTemplate:
      "Belakangan ini saya sering merasa sangat haus padahal sudah coba batasi minum. Apakah ini normal? Ada tips dari teman-teman untuk mengatasi rasa haus tanpa harus minum berlebihan?",
    kategori: "pertanyaan",
    metodeTerapi: "Umum",
  },
  {
    judulTemplate: "Berbagi pengalaman kontrol rutin bulan ini",
    isiTemplate:
      "Baru selesai kontrol rutin bulan ini, alhamdulillah hasilnya cukup stabil dibanding bulan lalu. Rasanya lega tiap kali hasil kontrol menunjukkan progres yang baik, jadi motivasi buat tetap konsisten menjalani rutinitas.",
    kategori: "berbagi_pengalaman",
    metodeTerapi: "Umum",
  },
  {
    judulTemplate: "Bagaimana cara menjelaskan kondisi ke rekan kerja?",
    isiTemplate:
      "Ada yang punya pengalaman menjelaskan kondisi kesehatan ke rekan kerja atau atasan, terutama soal jadwal terapi yang kadang bentrok dengan jam kerja? Ingin dengar pengalaman teman-teman menghadapinya.",
    kategori: "pertanyaan",
    metodeTerapi: "Umum",
  },
  {
    judulTemplate: "Info: pentingnya menjaga kebersihan area akses/kateter",
    isiTemplate:
      "Mau berbagi info yang saya dapat dari perawat waktu kontrol kemarin — pentingnya konsisten menjaga kebersihan area akses/kateter setiap hari, bukan cuma pas ingat saja. Katanya banyak komplikasi bisa dicegah dari kebiasaan sederhana ini.",
    kategori: "informasi",
    metodeTerapi: "Umum",
  },
  {
    judulTemplate: "Olahraga ringan apa yang aman dilakukan?",
    isiTemplate:
      "Ingin mulai olahraga ringan lagi setelah beberapa waktu vakum, tapi masih ragu jenis dan intensitas yang aman. Ada rekomendasi dari teman-teman yang sudah rutin olahraga ringan?",
    kategori: "pertanyaan",
    metodeTerapi: "Umum",
  },
  {
    judulTemplate: "Cerita hari ke-{angka} menjalani rutinitas terapi",
    isiTemplate:
      "Hari ke-{angka} menjalani rutinitas terapi, rasanya sudah mulai lebih terbiasa dibanding awal-awal dulu. Pencatatan harian di aplikasi ini lumayan membantu melihat progres dari waktu ke waktu.",
    kategori: "berbagi_pengalaman",
    metodeTerapi: "Umum",
  },
  {
    judulTemplate: "Menu buka puasa yang aman untuk pasien ginjal",
    isiTemplate:
      "Buat yang menjalani puasa, ada rekomendasi menu buka puasa yang tetap memperhatikan batasan cairan dan garam? Ingin coba variasi menu baru bulan ini.",
    kategori: "pertanyaan",
    metodeTerapi: "Umum",
  },
  {
    judulTemplate: "Dukungan keluarga sangat membantu proses ini",
    isiTemplate:
      "Ingin berterima kasih ke keluarga yang selalu mengingatkan jadwal obat dan terapi tanpa pernah terasa menghakimi. Rasanya proses menjalani terapi jadi jauh lebih ringan kalau ada yang mendukung di rumah.",
    kategori: "berbagi_pengalaman",
    metodeTerapi: "Umum",
  },
  {
    judulTemplate: "Bagaimana mengatur waktu exchange CAPD saat bepergian?",
    isiTemplate:
      "Rencana mau bepergian keluar kota minggu depan, agak bingung mengatur jadwal exchange supaya tetap sesuai jam biasanya. Ada tips dari teman-teman sesama pengguna CAPD yang sering bepergian?",
    kategori: "pertanyaan",
    metodeTerapi: "CAPD",
  },
  {
    judulTemplate: "Pengalaman exchange CAPD di hari ke-{angka}",
    isiTemplate:
      "Mau update, exchange hari ke-{angka} berjalan lancar, cairan jernih semua. Senang rasanya kalau semua sesuai jadwal dan kondisi normal terus.",
    kategori: "berbagi_pengalaman",
    metodeTerapi: "CAPD",
  },
  {
    judulTemplate: "Tips menjaga kebersihan tangan sebelum exchange",
    isiTemplate:
      "Sharing kebiasaan kecil yang saya lakukan supaya tidak lupa cuci tangan dengan benar sebelum tiap exchange — saya taruh pengingat kecil di dekat tempat exchange biasa dilakukan.",
    kategori: "informasi",
    metodeTerapi: "CAPD",
  },
  {
    judulTemplate: "Fistula terasa agak nyeri, apa perlu langsung ke klinik?",
    isiTemplate:
      "Area fistula terasa agak nyeri sejak sesi HD terakhir, tapi getarannya masih ada. Apakah ini perlu langsung dicek ke klinik atau bisa ditunggu sampai jadwal HD berikutnya?",
    kategori: "pertanyaan",
    metodeTerapi: "HD",
  },
  {
    judulTemplate: "Sesi HD hari ini terasa lebih ringan",
    isiTemplate:
      "Alhamdulillah sesi HD hari ini terasa lebih ringan dari biasanya, mungkin karena minggu ini lebih disiplin jaga cairan. Senang rasanya kalau efeknya langsung terasa begini.",
    kategori: "berbagi_pengalaman",
    metodeTerapi: "HD",
  },
  {
    judulTemplate: "Info: pentingnya menjaga akses vaskular tetap terjaga",
    isiTemplate:
      "Mau sharing info dari perawat dialisis soal pentingnya tidak membiarkan tekanan atau tas berat di lengan akses. Kadang hal kecil begini suka terlupa di kesibukan sehari-hari.",
    kategori: "informasi",
    metodeTerapi: "HD",
  },
  {
    judulTemplate: "Tips mengatasi lelah setelah sesi HD",
    isiTemplate:
      "Biasanya setelah sesi HD saya suka merasa lelah sepanjang sore. Ada tips dari teman-teman untuk mengatasi rasa lelah ini supaya tetap bisa beraktivitas ringan?",
    kategori: "pertanyaan",
    metodeTerapi: "HD",
  },
  {
    judulTemplate: "Efek samping obat imunosupresan, siapa yang pernah alami?",
    isiTemplate:
      "Belakangan tangan saya sedikit tremor, mungkin efek dari obat imunosupresan. Ada teman-teman pasien transplantasi lain yang pernah mengalami hal serupa? Bagaimana biasanya diatasi?",
    kategori: "pertanyaan",
    metodeTerapi: "Transplantasi",
  },
  {
    judulTemplate: "Kontrol rutin bulan ke-{angka} pasca transplan",
    isiTemplate:
      "Update kontrol rutin bulan ke-{angka} pasca transplantasi, hasil lab masih dalam batas yang baik alhamdulillah. Tetap semangat menjaga jadwal obat setiap hari.",
    kategori: "berbagi_pengalaman",
    metodeTerapi: "Transplantasi",
  },
  {
    judulTemplate: "Info kebersihan untuk pasien pasca transplantasi",
    isiTemplate:
      "Sharing pengingat dari tim transplantasi soal pentingnya jaga kebersihan tangan dan makanan karena daya tahan tubuh sedikit menurun akibat obat imunosupresan. Kecil tapi penting untuk selalu diingat.",
    kategori: "informasi",
    metodeTerapi: "Transplantasi",
  },
];

export type ReplyTemplate = string;

export const REPLY_TEMPLATES: ReplyTemplate[] = [
  "Terima kasih sudah berbagi, ikut belajar dari pengalaman ini.",
  "Setuju banget, saya juga pernah mengalami hal serupa dan itu yang saya lakukan.",
  "Semangat terus ya, prosesnya memang tidak instan tapi pasti ada hasilnya.",
  "Wah bermanfaat sekali infonya, langsung saya coba terapkan.",
  "Ikut senang dengar progres yang baik ini, jadi motivasi buat saya juga.",
  "Sama, kadang saya juga masih suka lupa, tapi pelan-pelan jadi terbiasa kok.",
  "Kalau ragu sebaiknya tetap dikonsultasikan ke tim medis ya, tapi terima kasih sudah cerita.",
  "Boleh juga nih tipsnya, akan saya coba untuk minggu ini.",
  "Terima kasih pengingatnya, kadang hal kecil begini suka terlewat kalau lagi sibuk.",
  "Semoga lekas membaik dan tetap semangat menjalani rutinitasnya.",
];
