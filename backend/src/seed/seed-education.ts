/**
 * seed-education.ts — Education Content Seed Script (EDU-01, D-10/D-11/D-12)
 *
 * Populates education_content with real, substantive Bahasa Indonesia articles
 * across all four therapy methods (CAPD/HD/Transplantasi/Umum). Content is
 * pre-curated and seeded — there is no in-app authoring UI (PRD v0.3 / D-12).
 *
 * Tone: calm, plain, non-diagnostic — matches aiDisclaimer.ts's established
 * voice for medical-adjacent content read by a non-technical, sometimes 50+
 * audience. No dosing instructions, no alarming language, no diagnosis.
 * gambarUrl is left null (static illustration wired in a later plan; no
 * video per D-11).
 *
 * Idempotent: clears existing rows before inserting, so re-running does not
 * duplicate content.
 *
 * Run: npm run seed:education
 * Requires: DATABASE_URL env var
 */

import "dotenv/config";
import { db, pool } from "../lib/db.js";
import { educationContent } from "../db/schema/educationContent.schema.js";
import type { NewEducationContent } from "../repositories/educationContent.repository.js";

const articles: NewEducationContent[] = [
  // ── CAPD ──────────────────────────────────────────────────────────────────
  {
    judul: "Mengatur Cairan dan Makanan untuk Pasien CAPD",
    ringkasan:
      "Panduan sederhana menjaga keseimbangan cairan dan pola makan sehari-hari selama menjalani CAPD.",
    isi:
      "Bagi pasien yang menjalani CAPD (Continuous Ambulatory Peritoneal Dialysis), menjaga keseimbangan cairan tubuh adalah bagian penting dari perawatan harian. Karena proses dialisis berlangsung terus-menerus melalui rongga perut, jumlah cairan yang keluar (ultrafiltrasi) perlu diperhatikan bersamaan dengan jumlah cairan yang masuk dari makanan dan minuman.\n\n" +
      "Beberapa kebiasaan yang dapat membantu: minum sesuai anjuran tim medis, tidak menunggu haus sebelum minum air dalam jumlah besar, dan mencatat asupan cairan setiap hari menggunakan fitur pencatatan di aplikasi ini. Mencatat secara rutin membantu Anda dan tim medis melihat pola yang mungkin perlu disesuaikan.\n\n" +
      "Dari sisi makanan, pasien CAPD umumnya dianjurkan menjaga asupan garam agar tidak memicu rasa haus berlebihan, serta memperhatikan asupan protein karena proses dialisis peritoneal dapat menyebabkan hilangnya sebagian protein tubuh. Jenis dan jumlah makanan yang tepat berbeda untuk setiap orang, sehingga sebaiknya didiskusikan langsung dengan dokter atau ahli gizi yang menangani Anda.\n\n" +
      "Jika Anda merasa cairan tubuh terasa tidak seimbang — misalnya bengkak di kaki, sesak napas ringan, atau sebaliknya sering merasa sangat haus — catat gejala tersebut dan sampaikan pada kunjungan kontrol berikutnya, atau segera hubungi tim medis bila gejalanya mengganggu aktivitas sehari-hari.",
    tipeKonten: "gaya_hidup",
    metodeTerapi: "CAPD",
    gambarUrl: null,
  },
  {
    judul: "Panduan Senam Ringan untuk Pasien CAPD",
    ringkasan:
      "Gerakan peregangan dan latihan ringan yang aman dilakukan pasien CAPD tanpa mengganggu kateter perut.",
    isi:
      "Aktivitas fisik ringan tetap dianjurkan bagi pasien CAPD, selama dilakukan dengan hati-hati agar tidak memberi tekanan berlebih pada area kateter di perut. Tujuannya bukan untuk membentuk otot atau berolahraga berat, melainkan menjaga sirkulasi darah, kekuatan otot, dan suasana hati tetap baik.\n\n" +
      "Beberapa gerakan yang umumnya aman: jalan kaki santai selama 15-20 menit di sekitar rumah atau taman, peregangan leher dan bahu sambil duduk, serta gerakan menekuk dan meluruskan pergelangan kaki untuk melancarkan aliran darah di kaki. Lakukan gerakan secara perlahan dan berhenti bila terasa nyeri, pusing, atau sesak.\n\n" +
      "Hindari sementara waktu gerakan yang melibatkan tekanan langsung pada perut, seperti sit-up, mengangkat beban berat, atau olahraga yang berisiko benturan pada area kateter. Sebaiknya latihan dilakukan pada waktu perut terasa nyaman, bukan tepat setelah cairan dialisis dimasukkan.\n\n" +
      "Sebelum memulai rutinitas aktivitas fisik baru, sebaiknya diskusikan dulu dengan tim medis Anda, terutama bila Anda baru memulai CAPD atau memiliki kondisi kesehatan lain yang menyertai.",
    tipeKonten: "panduan_senam",
    metodeTerapi: "CAPD",
    gambarUrl: null,
  },
  {
    judul: "Menjaga Kepatuhan Terapi CAPD Sehari-hari",
    ringkasan:
      "Mengapa konsistensi jadwal pertukaran cairan (exchange) CAPD sangat berpengaruh pada hasil terapi jangka panjang.",
    isi:
      "CAPD mengandalkan rutinitas pertukaran cairan dialisis (exchange) yang dilakukan beberapa kali sehari sesuai jadwal yang ditentukan tim medis. Konsistensi menjalankan jadwal ini — termasuk lama cairan berada di dalam rongga perut (dwell time) — berperan besar dalam menjaga efektivitas terapi dan mencegah penumpukan racun serta cairan berlebih dalam tubuh.\n\n" +
      "Melewatkan atau menunda jadwal exchange tanpa alasan medis dapat mengurangi efektivitas pembersihan darah dari sisa metabolisme. Menggunakan pengingat, baik melalui aplikasi ini maupun alarm pribadi, dapat membantu menjaga rutinitas tetap konsisten meski sedang bepergian atau beraktivitas di luar rumah.\n\n" +
      "Kebersihan tangan dan area kateter sebelum dan sesudah setiap exchange juga sama pentingnya dengan ketepatan waktu, karena mengurangi risiko infeksi pada area masuknya kateter (exit site) maupun peritonitis. Ikuti langkah-langkah kebersihan yang sudah diajarkan oleh perawat dialisis Anda secara konsisten.\n\n" +
      "Jika Anda mengalami kendala menjaga jadwal — misalnya karena pekerjaan, perjalanan jauh, atau kondisi tertentu — sampaikan pada tim medis. Biasanya ada penyesuaian jadwal yang bisa didiskusikan tanpa mengorbankan efektivitas terapi.",
    tipeKonten: "artikel",
    metodeTerapi: "CAPD",
    gambarUrl: null,
  },

  // ── HD ────────────────────────────────────────────────────────────────────
  {
    judul: "Mengatur Cairan dan Garam untuk Pasien Hemodialisis",
    ringkasan:
      "Panduan menjaga asupan cairan dan garam di antara jadwal sesi cuci darah (HD).",
    isi:
      "Berbeda dari CAPD yang berlangsung terus-menerus, hemodialisis (HD) biasanya dilakukan beberapa kali dalam seminggu di klinik atau rumah sakit. Karena itu, menjaga asupan cairan di antara sesi HD menjadi sangat penting agar kenaikan berat badan akibat penumpukan cairan tidak terlalu besar sebelum sesi berikutnya.\n\n" +
      "Kebiasaan yang membantu: membatasi minum sesuai anjuran tim medis, menggunakan gelas kecil untuk mengurangi kebiasaan minum dalam jumlah besar sekaligus, serta mencatat asupan cairan harian di aplikasi ini agar mudah dipantau menjelang jadwal HD berikutnya.\n\n" +
      "Asupan garam juga berperan besar terhadap rasa haus dan penumpukan cairan. Mengurangi makanan olahan, makanan kaleng, dan camilan asin dapat membantu menjaga rasa haus tetap terkendali di antara sesi cuci darah.\n\n" +
      "Bila Anda mengalami kenaikan berat badan yang terasa signifikan menjelang jadwal HD, atau muncul sesak napas dan bengkak yang mengganggu, catat kondisi tersebut dan sampaikan kepada tim medis di klinik dialisis Anda.",
    tipeKonten: "gaya_hidup",
    metodeTerapi: "HD",
    gambarUrl: null,
  },
  {
    judul: "Panduan Senam Ringan di Hari Non-Dialisis",
    ringkasan:
      "Aktivitas fisik ringan yang bermanfaat bagi pasien HD, terutama pada hari tanpa jadwal cuci darah.",
    isi:
      "Pasien hemodialisis sering merasa lelah pada hari sesi HD dilakukan, sehingga hari tanpa jadwal dialisis adalah waktu yang baik untuk melakukan aktivitas fisik ringan. Bergerak secara teratur dapat membantu menjaga stamina, kualitas tidur, dan suasana hati.\n\n" +
      "Contoh aktivitas yang umumnya aman: berjalan kaki santai 15-20 menit, peregangan ringan pada lengan dan kaki, atau bersepeda statis dengan intensitas rendah. Mulailah dengan durasi singkat dan tingkatkan secara bertahap sesuai kemampuan tubuh.\n\n" +
      "Hindari aktivitas berat tepat sebelum atau sesudah sesi HD, karena tubuh sedang menyesuaikan diri dengan perubahan cairan dan elektrolit selama proses dialisis berlangsung. Perhatikan juga area akses vaskular (fistula/kateter) — hindari tekanan langsung atau gerakan berulang yang membebani area tersebut.\n\n" +
      "Bila selama beraktivitas muncul pusing, nyeri dada, atau sesak napas, hentikan aktivitas dan istirahat. Diskusikan jenis dan intensitas aktivitas fisik yang paling sesuai dengan kondisi Anda bersama tim medis.",
    tipeKonten: "panduan_senam",
    metodeTerapi: "HD",
    gambarUrl: null,
  },
  {
    judul: "Menjaga Kepatuhan Jadwal Hemodialisis",
    ringkasan:
      "Pentingnya hadir tepat waktu dan lengkap pada setiap sesi cuci darah yang dijadwalkan.",
    isi:
      "Setiap sesi hemodialisis dirancang untuk membersihkan darah dari racun dan kelebihan cairan yang menumpuk sejak sesi sebelumnya. Melewatkan sesi, atau menghentikan sesi lebih awal dari waktu yang seharusnya, dapat mengurangi efektivitas pembersihan darah dan berdampak pada kondisi tubuh secara keseluruhan.\n\n" +
      "Mencatat jadwal HD secara rutin melalui aplikasi ini — termasuk durasi sesi dan kondisi tubuh setelahnya — dapat membantu Anda maupun tim medis memantau pola kepatuhan terapi dari waktu ke waktu.\n\n" +
      "Jika Anda mengalami kesulitan untuk hadir pada jadwal yang ditentukan, misalnya karena kendala transportasi, pekerjaan, atau kondisi kesehatan lain, sebaiknya segera komunikasikan dengan klinik dialisis. Penjadwalan ulang yang terencana jauh lebih aman dibandingkan melewatkan sesi tanpa pemberitahuan.\n\n" +
      "Menjaga komunikasi terbuka dengan tim medis mengenai kendala yang dihadapi juga membantu mereka menyesuaikan rencana terapi agar tetap realistis dijalani dalam jangka panjang.",
    tipeKonten: "artikel",
    metodeTerapi: "HD",
    gambarUrl: null,
  },

  // ── Transplantasi ────────────────────────────────────────────────────────
  {
    judul: "Menjaga Gaya Hidup dan Kepatuhan Obat Pasca Transplantasi Ginjal",
    ringkasan:
      "Kebiasaan sehari-hari yang mendukung keberhasilan jangka panjang setelah transplantasi ginjal.",
    isi:
      "Setelah menjalani transplantasi ginjal, tubuh membutuhkan obat imunosupresan secara rutin agar sistem imun tidak menolak ginjal baru. Kepatuhan terhadap jadwal minum obat ini merupakan salah satu faktor terpenting dalam menjaga fungsi ginjal cangkokan tetap baik dalam jangka panjang.\n\n" +
      "Selain kepatuhan obat, menjaga kebersihan diri dan lingkungan menjadi lebih penting karena sistem imun yang sedikit ditekan membuat tubuh lebih rentan terhadap infeksi. Mencuci tangan secara rutin, menjaga kebersihan makanan, dan menghindari kontak dekat dengan orang yang sedang sakit adalah kebiasaan sederhana yang sangat membantu.\n\n" +
      "Pola makan seimbang, cukup istirahat, dan pemeriksaan rutin sesuai jadwal dari tim medis tetap diperlukan meskipun kondisi tubuh terasa membaik pasca-transplantasi. Jangan menghentikan atau mengubah dosis obat sendiri tanpa berkonsultasi terlebih dahulu.\n\n" +
      "Gunakan fitur pencatatan obat di aplikasi ini untuk membantu menjaga rutinitas minum obat imunosupresan tetap konsisten, termasuk mencatat bila ada dosis yang terlewat agar dapat didiskusikan pada kunjungan kontrol berikutnya.",
    tipeKonten: "artikel",
    metodeTerapi: "Transplantasi",
    gambarUrl: null,
  },
  {
    judul: "Panduan Aktivitas Fisik Ringan Pasca Transplantasi Ginjal",
    ringkasan:
      "Kapan dan bagaimana memulai kembali aktivitas fisik secara bertahap setelah transplantasi ginjal.",
    isi:
      "Aktivitas fisik ringan dapat membantu proses pemulihan setelah transplantasi ginjal, namun perlu dilakukan secara bertahap dan disesuaikan dengan masa pemulihan operasi. Pada masa awal setelah operasi, fokus utama adalah istirahat cukup dan menghindari gerakan yang membebani area bekas operasi.\n\n" +
      "Setelah mendapat izin dari tim medis, aktivitas ringan seperti berjalan kaki singkat, peregangan ringan, dan latihan pernapasan dapat mulai dilakukan secara bertahap. Tingkatkan durasi dan intensitas secara perlahan mengikuti kondisi tubuh, bukan berdasarkan target waktu tertentu.\n\n" +
      "Hindari aktivitas yang melibatkan benturan langsung pada area perut atau angkat beban berat dalam beberapa bulan pertama, sesuai arahan dokter bedah dan tim transplantasi. Setiap orang memiliki masa pemulihan yang berbeda, sehingga penting mengikuti anjuran spesifik dari tim medis yang menangani Anda.\n\n" +
      "Jika muncul nyeri di area operasi, demam, atau ketidaknyamanan yang tidak biasa selama beraktivitas, hentikan aktivitas dan segera hubungi tim medis.",
    tipeKonten: "panduan_senam",
    metodeTerapi: "Transplantasi",
    gambarUrl: null,
  },

  // ── Umum ──────────────────────────────────────────────────────────────────
  {
    judul: "Memahami Fungsi Ginjal dan Penyakit Ginjal Kronis",
    ringkasan:
      "Penjelasan sederhana tentang peran ginjal dalam tubuh dan apa yang terjadi pada penyakit ginjal kronis.",
    isi:
      "Ginjal berperan penting dalam menyaring darah dari sisa metabolisme, mengatur keseimbangan cairan dan elektrolit tubuh, serta membantu mengendalikan tekanan darah. Pada penyakit ginjal kronis (PGK), kemampuan ginjal untuk menjalankan fungsi ini menurun secara bertahap seiring waktu.\n\n" +
      "Karena penurunan fungsi ginjal biasanya berlangsung perlahan, banyak pasien tidak merasakan gejala yang jelas pada tahap awal. Inilah sebabnya pemeriksaan laboratorium secara rutin — seperti kadar kreatinin dan fungsi ginjal lainnya — menjadi penting untuk memantau perkembangan kondisi dari waktu ke waktu.\n\n" +
      "Penanganan PGK bertujuan memperlambat penurunan fungsi ginjal dan menjaga kualitas hidup, melalui kombinasi terapi pengganti ginjal (seperti CAPD, hemodialisis, atau transplantasi bagi yang membutuhkan), pengaturan pola makan, serta pemantauan kondisi secara rutin bersama tim medis.\n\n" +
      "Memahami kondisi diri sendiri dapat membantu Anda lebih aktif berpartisipasi dalam perawatan sehari-hari, termasuk mencatat kondisi tubuh secara konsisten melalui aplikasi ini agar dapat didiskusikan bersama dokter pada setiap kunjungan kontrol.",
    tipeKonten: "artikel",
    metodeTerapi: "Umum",
    gambarUrl: null,
  },
  {
    judul: "Kapan Sebaiknya Menghubungi Tim Medis",
    ringkasan:
      "Tanda-tanda umum yang sebaiknya tidak ditunda untuk didiskusikan dengan dokter atau tim medis Anda.",
    isi:
      "Sebagai pasien yang menjalani perawatan ginjal jangka panjang, penting untuk mengenali kapan suatu keluhan sebaiknya segera didiskusikan dengan tim medis, bukan sekadar ditunggu hingga jadwal kontrol berikutnya. Mengenali tanda-tanda ini membantu penanganan dilakukan lebih cepat dan tepat.\n\n" +
      "Beberapa contoh kondisi yang sebaiknya segera disampaikan ke tim medis: bengkak yang bertambah parah pada kaki atau wajah, sesak napas yang mengganggu aktivitas, demam yang tidak kunjung turun, nyeri atau kemerahan di area kateter/akses dialisis, atau perubahan besar pada berat badan dalam waktu singkat.\n\n" +
      "Menggunakan fitur pencatatan harian di aplikasi ini — cairan, obat, maupun kondisi tubuh — dapat membantu Anda maupun tim medis melihat pola perubahan lebih awal, sebelum kondisi berkembang menjadi lebih serius.\n\n" +
      "Bila ragu apakah suatu gejala perlu segera ditangani atau bisa menunggu jadwal kontrol, lebih baik menghubungi tim medis terlebih dahulu untuk memastikan. Aplikasi ini membantu pencatatan dan pemantauan, namun tidak menggantikan penilaian dan keputusan medis langsung dari dokter Anda.",
    tipeKonten: "artikel",
    metodeTerapi: "Umum",
    gambarUrl: null,
  },
];

async function main() {
  console.log("Seeding education content...");

  const existing = await db.select({ id: educationContent.id }).from(educationContent);
  if (existing.length > 0) {
    console.log(
      `education_content already has ${existing.length} row(s) — clearing before re-seeding (idempotent).`,
    );
    await db.delete(educationContent);
  }

  await db.insert(educationContent).values(articles);

  console.log(`Seeded ${articles.length} education content rows.`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => {
    pool.end().catch(() => {});
  });
