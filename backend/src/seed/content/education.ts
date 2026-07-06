/**
 * content/education.ts — hand-written education_content article bodies.
 *
 * The ONLY hand-authored prose for education content. generate-demo-data.ts
 * writes this array verbatim into seed/data/education-content.json (plus
 * an explicit generated id per row). Tone: calm, plain, non-diagnostic Bahasa
 * Indonesia — matches lib/aiDisclaimer.ts's established voice for
 * medical-adjacent content read by a non-technical, sometimes 50+ audience.
 * No dosing instructions, no alarming language, no diagnosis.
 *
 * 28 articles across metodeTerapi (CAPD 5, HD 4, Transplantasi 4, Umum 15)
 * and tipeKonten (artikel | panduan_senam | gaya_hidup).
 */

export type EducationArticle = {
  judul: string;
  ringkasan: string;
  isi: string;
  tipeKonten: "artikel" | "panduan_senam" | "gaya_hidup";
  metodeTerapi: "CAPD" | "HD" | "Transplantasi" | "Umum";
  gambarUrl: null;
};

export const educationArticles: EducationArticle[] = [
  // ── CAPD (5) ──────────────────────────────────────────────────────────────
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
  {
    judul: "Merawat Kateter CAPD Agar Bebas dari Infeksi",
    ringkasan:
      "Langkah kebersihan harian di sekitar area keluar kateter (exit site) untuk mencegah infeksi.",
    isi:
      "Area keluar kateter (exit site) adalah pintu masuk potensial bagi kuman, sehingga perawatan kebersihan harian di area ini sama pentingnya dengan ketepatan jadwal exchange. Rutinitas perawatan biasanya mencakup membersihkan area sekitar kateter dengan larutan antiseptik sesuai anjuran perawat dialisis, dan menjaga area tersebut tetap kering.\n\n" +
      "Kenakan pakaian yang longgar di sekitar perut agar kateter tidak tertekan atau tertarik, dan hindari berendam di kolam renang atau bak mandi kecuali sudah mendapat izin khusus dari tim medis. Mandi dengan shower umumnya lebih aman dibandingkan berendam.\n\n" +
      "Perhatikan tanda-tanda yang perlu diwaspadai di area kateter: kemerahan, bengkak, nyeri saat disentuh, atau keluarnya cairan yang tidak biasa. Tanda-tanda ini sebaiknya tidak ditunggu hingga jadwal kontrol berikutnya.\n\n" +
      "Segera hubungi tim medis bila muncul tanda-tanda tersebut, karena penanganan lebih awal pada infeksi area kateter dapat mencegah komplikasi yang lebih serius, termasuk peritonitis.",
    tipeKonten: "artikel",
    metodeTerapi: "CAPD",
    gambarUrl: null,
  },
  {
    judul: "Mengenali Tanda Cairan Dialisis yang Tidak Normal",
    ringkasan:
      "Ciri-ciri cairan hasil drainase CAPD yang perlu diwaspadai dan dicatat setiap hari.",
    isi:
      "Setiap kali melakukan drainase (mengeluarkan cairan dialisis dari rongga perut), memperhatikan kondisi cairan yang keluar adalah kebiasaan sederhana namun penting bagi pasien CAPD. Cairan yang normal biasanya berwarna jernih hingga sedikit kekuningan, mirip warna air seduhan teh yang sangat encer.\n\n" +
      "Cairan yang keruh, bercampur gumpalan, atau berwarna kemerahan (menandakan darah) adalah kondisi yang tidak biasa dan sebaiknya dicatat segera menggunakan fitur pencatatan cairan di aplikasi ini, lengkap dengan waktu kejadiannya.\n\n" +
      "Kondisi cairan yang keruh sering kali disertai gejala lain seperti nyeri perut, demam, atau rasa tidak nyaman di area kateter — namun terkadang cairan keruh muncul tanpa gejala lain yang terasa jelas. Karena itu, mencatat kondisi cairan setiap hari, bukan hanya saat merasa ada yang salah, membantu mendeteksi perubahan lebih dini.\n\n" +
      "Bila Anda menemukan cairan keruh, bergumpal, atau berdarah, segera hubungi tim medis atau perawat dialisis Anda untuk mendapatkan arahan lebih lanjut — jangan menunggu jadwal kontrol rutin.",
    tipeKonten: "artikel",
    metodeTerapi: "CAPD",
    gambarUrl: null,
  },

  // ── HD (4) ────────────────────────────────────────────────────────────────
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
  {
    judul: "Merawat Akses Vaskular (Fistula) Pasien HD",
    ringkasan:
      "Kebiasaan sehari-hari untuk menjaga fistula atau akses vaskular tetap berfungsi baik dan bebas infeksi.",
    isi:
      "Akses vaskular — baik fistula, graft, maupun kateter — adalah jalur penting yang digunakan setiap sesi hemodialisis, sehingga menjaganya tetap sehat berdampak langsung pada kelancaran terapi jangka panjang. Periksa area akses setiap hari untuk memastikan tidak ada tanda kemerahan, bengkak, atau nyeri yang tidak biasa.\n\n" +
      "Hindari memakai perhiasan ketat, tas berat, atau tekanan langsung (termasuk saat tidur) pada lengan tempat akses berada. Jangan biarkan siapa pun mengukur tekanan darah atau mengambil darah dari lengan akses tersebut, kecuali memang diperlukan dan diarahkan oleh tim medis.\n\n" +
      "Menjaga kebersihan tangan dan area akses sebelum dan sesudah sesi HD membantu mengurangi risiko infeksi. Rasakan getaran halus (thrill) pada fistula secara berkala — bila getaran ini hilang atau area terasa sangat nyeri, ini bisa menjadi tanda gangguan pada akses.\n\n" +
      "Segera hubungi tim medis atau klinik dialisis bila menemukan tanda-tanda gangguan akses, seperti hilangnya getaran, perdarahan yang tidak berhenti, atau tanda infeksi — penanganan cepat dapat mencegah akses tersebut rusak permanen.",
    tipeKonten: "artikel",
    metodeTerapi: "HD",
    gambarUrl: null,
  },

  // ── Transplantasi (4) ────────────────────────────────────────────────────
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
  {
    judul: "Memahami Obat Imunosupresan dan Efek Sampingnya",
    ringkasan:
      "Penjelasan sederhana tentang mengapa obat imunosupresan wajib diminum tepat waktu, seumur hidup.",
    isi:
      "Obat imunosupresan (seperti tacrolimus atau mycophenolate mofetil) bekerja menekan sebagian sistem imun tubuh agar tidak menyerang ginjal cangkokan yang dianggap 'benda asing'. Karena cara kerjanya ini, jadwal minum obat imunosupresan biasanya sangat ketat — sering kali harus diminum pada jam yang hampir sama setiap hari, seumur hidup pasca-transplantasi.\n\n" +
      "Efek samping yang umum dijumpai antara lain tremor ringan pada tangan, tekanan darah yang sedikit meningkat, atau perubahan nafsu makan. Sebagian besar efek samping ini bersifat ringan dan dapat dipantau bersama tim medis, namun tidak boleh menjadi alasan untuk menghentikan obat sendiri.\n\n" +
      "Karena sistem imun sedikit ditekan, tubuh menjadi lebih rentan terhadap infeksi biasa yang mungkin tidak berbahaya bagi orang lain. Ini bukan berarti harus menghindari aktivitas sosial sepenuhnya, namun kewaspadaan ekstra terhadap kebersihan tetap diperlukan.\n\n" +
      "Jika Anda mengalami efek samping yang mengganggu, atau ragu tentang dosis dan jadwal obat, sampaikan kepada tim transplantasi Anda — jangan menyesuaikan dosis sendiri berdasarkan perkiraan pribadi.",
    tipeKonten: "artikel",
    metodeTerapi: "Transplantasi",
    gambarUrl: null,
  },
  {
    judul: "Mengenali Tanda-tanda Penolakan Organ Sejak Dini",
    ringkasan:
      "Gejala yang sebaiknya segera dilaporkan ke tim transplantasi, tanpa menunggu jadwal kontrol.",
    isi:
      "Penolakan organ (rejection) adalah kondisi di mana sistem imun tubuh mulai bereaksi terhadap ginjal cangkokan, meski pasien sudah rutin minum obat imunosupresan. Mengenali tanda-tandanya sejak dini memungkinkan penanganan lebih cepat dan berpeluang menyelamatkan fungsi ginjal cangkokan.\n\n" +
      "Beberapa tanda yang perlu diwaspadai: penurunan jumlah urine yang signifikan, bengkak baru atau bertambah parah, demam tanpa sebab yang jelas, nyeri atau nyeri tekan di area ginjal cangkokan, serta kenaikan berat badan mendadak akibat penumpukan cairan.\n\n" +
      "Karena gejala ini bisa muncul secara halus dan mudah disalahartikan sebagai kelelahan biasa, mencatat kondisi tubuh secara rutin melalui aplikasi ini — termasuk aktivitas dan perasaan harian — membantu Anda dan tim medis melihat perubahan pola lebih awal.\n\n" +
      "Bila muncul satu atau lebih tanda di atas, segera hubungi tim transplantasi Anda, jangan menunggu jadwal kontrol rutin berikutnya. Deteksi dan penanganan dini adalah kunci utama menjaga fungsi ginjal cangkokan tetap bertahan lama.",
    tipeKonten: "artikel",
    metodeTerapi: "Transplantasi",
    gambarUrl: null,
  },

  // ── Umum: Nutrisi & Diet (5) ─────────────────────────────────────────────
  {
    judul: "Mengenal Batasan Kalium bagi Pasien Ginjal",
    ringkasan:
      "Mengapa kadar kalium perlu dipantau dan makanan apa saja yang tinggi kalium.",
    isi:
      "Kalium adalah mineral yang penting bagi fungsi jantung dan otot, namun pada pasien dengan gangguan fungsi ginjal, kelebihan kalium dalam darah (hiperkalemia) dapat menjadi berbahaya karena ginjal tidak lagi mampu membuangnya secara efektif. Kadar kalium yang terlalu tinggi dapat memengaruhi irama jantung.\n\n" +
      "Makanan yang umumnya tinggi kalium antara lain pisang, alpukat, jeruk, kentang, tomat, serta buah-buahan kering. Bukan berarti makanan ini harus dihindari sepenuhnya — jumlah dan frekuensi konsumsi yang tepat sebaiknya didiskusikan dengan ahli gizi atau dokter yang menangani kondisi Anda.\n\n" +
      "Cara memasak juga dapat memengaruhi kadar kalium dalam makanan, misalnya merendam dan merebus sayuran tertentu sebelum diolah dapat membantu mengurangi kandungan kaliumnya.\n\n" +
      "Pemeriksaan kadar kalium darah secara berkala adalah cara paling akurat untuk memantau apakah asupan kalium Anda sudah sesuai — jangan hanya mengandalkan perkiraan dari gejala fisik semata.",
    tipeKonten: "artikel",
    metodeTerapi: "Umum",
    gambarUrl: null,
  },
  {
    judul: "Menjaga Asupan Fosfor bagi Kesehatan Tulang",
    ringkasan:
      "Kaitan antara fosfor berlebih dan kesehatan tulang pada pasien penyakit ginjal kronis.",
    isi:
      "Fosfor berperan penting dalam kesehatan tulang, namun pada penyakit ginjal kronis, kadar fosfor yang terlalu tinggi dalam darah dapat menyebabkan gangguan keseimbangan kalsium-fosfor yang berdampak pada kekuatan tulang dalam jangka panjang.\n\n" +
      "Makanan olahan, minuman bersoda berwarna gelap, keju olahan, dan beberapa jenis daging olahan cenderung mengandung fosfor tambahan yang cukup tinggi. Membaca label kemasan dan memilih makanan segar dibandingkan makanan olahan dapat membantu mengelola asupan fosfor.\n\n" +
      "Beberapa pasien memerlukan obat pengikat fosfor (phosphate binder) yang diminum bersamaan dengan makanan sesuai anjuran dokter — obat ini bekerja mengurangi penyerapan fosfor dari makanan di saluran cerna.\n\n" +
      "Diskusikan dengan dokter atau ahli gizi mengenai target kadar fosfor yang sesuai dengan kondisi Anda, karena kebutuhan setiap pasien dapat berbeda tergantung tahap penyakit ginjal dan jenis terapi yang dijalani.",
    tipeKonten: "artikel",
    metodeTerapi: "Umum",
    gambarUrl: null,
  },
  {
    judul: "Mengatur Asupan Protein yang Tepat",
    ringkasan:
      "Kebutuhan protein pasien ginjal berbeda tergantung jenis terapi yang dijalani.",
    isi:
      "Kebutuhan protein pasien penyakit ginjal kronis cukup unik — terlalu sedikit protein dapat menyebabkan kelemahan otot dan malnutrisi, sementara terlalu banyak dapat membebani kerja ginjal yang tersisa atau meningkatkan sisa metabolisme yang perlu dibuang saat dialisis.\n\n" +
      "Pasien yang menjalani dialisis (baik CAPD maupun HD) umumnya justru memerlukan asupan protein yang cukup, bahkan terkadang lebih tinggi dari orang sehat pada umumnya, karena proses dialisis dapat menyebabkan hilangnya sebagian protein tubuh. Sumber protein berkualitas seperti telur, ikan, daging tanpa lemak, dan tahu tempe dalam porsi yang sesuai umumnya dianjurkan.\n\n" +
      "Kebutuhan ini berbeda untuk pasien yang belum menjalani dialisis (predialisis), yang biasanya dianjurkan membatasi protein agar tidak mempercepat penurunan fungsi ginjal yang tersisa.\n\n" +
      "Karena kebutuhan protein sangat individual dan tergantung tahap penyakit serta jenis terapi, sebaiknya jumlah dan jenis protein harian didiskusikan langsung dengan ahli gizi atau dokter yang menangani Anda.",
    tipeKonten: "artikel",
    metodeTerapi: "Umum",
    gambarUrl: null,
  },
  {
    judul: "Mengurangi Garam Tanpa Kehilangan Rasa Makanan",
    ringkasan:
      "Tips praktis mengurangi asupan garam sehari-hari tanpa membuat makanan terasa hambar.",
    isi:
      "Mengurangi asupan garam adalah salah satu perubahan pola makan yang paling sering dianjurkan bagi pasien penyakit ginjal, karena garam berlebih berkaitan erat dengan tekanan darah tinggi dan penumpukan cairan dalam tubuh.\n\n" +
      "Beberapa cara mengurangi garam tanpa kehilangan cita rasa: menggunakan bumbu alami seperti bawang putih, jahe, serai, daun jeruk, dan perasan jeruk nipis untuk menambah rasa; memasak sendiri di rumah dibandingkan membeli makanan siap saji atau restoran yang cenderung tinggi garam; serta membaca label kemasan untuk memilih produk rendah natrium.\n\n" +
      "Hindari menambahkan garam meja secara berlebihan saat makan, dan kurangi konsumsi makanan yang diawetkan seperti ikan asin, kecap asin, saus botolan, dan camilan kemasan.\n\n" +
      "Perubahan ini butuh waktu untuk terbiasa — lidah umumnya menyesuaikan diri terhadap rasa yang lebih rendah garam dalam beberapa minggu, sehingga tidak perlu terburu-buru mengubah semua kebiasaan makan sekaligus.",
    tipeKonten: "gaya_hidup",
    metodeTerapi: "Umum",
    gambarUrl: null,
  },
  {
    judul: "Camilan Sehat yang Ramah untuk Pasien Ginjal",
    ringkasan:
      "Pilihan camilan yang umumnya lebih aman dari sisi kalium, fosfor, dan garam.",
    isi:
      "Memilih camilan yang tepat bisa menjadi tantangan tersendiri bagi pasien penyakit ginjal, karena banyak camilan kemasan yang tinggi garam, fosfor tambahan, atau kalium. Namun bukan berarti Anda harus sepenuhnya menghindari camilan di sela waktu makan.\n\n" +
      "Beberapa pilihan camilan yang umumnya lebih ramah: apel potong, anggur dalam porsi wajar, kerupuk tawar tanpa penyedap berlebihan, atau roti tawar polos dengan selai buah rendah gula. Porsi tetap perlu diperhatikan meskipun jenis camilannya relatif aman.\n\n" +
      "Hindari camilan olahan tinggi natrium seperti keripik kemasan, kacang asin, dan makanan ringan kalengan, serta batasi camilan tinggi kalium seperti pisang atau alpukat sesuai anjuran ahli gizi Anda.\n\n" +
      "Bila ragu mengenai kandungan suatu camilan, membaca label nutrisi kemasan atau berkonsultasi dengan ahli gizi adalah cara paling aman untuk memastikan camilan tersebut sesuai dengan kebutuhan Anda.",
    tipeKonten: "gaya_hidup",
    metodeTerapi: "Umum",
    gambarUrl: null,
  },

  // ── Umum: Obat (2) ────────────────────────────────────────────────────────
  {
    judul: "Membangun Kebiasaan Minum Obat Tepat Waktu",
    ringkasan:
      "Tips praktis agar tidak lupa jadwal minum obat harian, apapun jenis terapi Anda.",
    isi:
      "Kepatuhan minum obat adalah salah satu faktor terbesar yang memengaruhi keberhasilan terapi jangka panjang pada penyakit ginjal, apapun jenis pengobatan yang dijalani. Namun menjaga kepatuhan ini seringkali menjadi tantangan di tengah kesibukan sehari-hari.\n\n" +
      "Beberapa kebiasaan yang membantu: menyimpan obat di tempat yang mudah terlihat (misalnya dekat meja makan), menggunakan kotak obat mingguan yang dipisah per hari dan per waktu minum, serta mengaktifkan pengingat di aplikasi ini agar tidak bergantung sepenuhnya pada ingatan.\n\n" +
      "Bila bepergian, siapkan obat dalam jumlah cukup sejak awal dan simpan di tas yang selalu dibawa, bukan di koper yang mungkin terpisah dari Anda. Menyiapkan obat cadangan kecil untuk situasi darurat juga merupakan kebiasaan yang baik.\n\n" +
      "Jika Anda sering lupa minum obat meskipun sudah mencoba berbagai cara, sampaikan hal ini kepada tim medis — mungkin ada penyesuaian jadwal atau bentuk obat yang bisa membantu tanpa mengurangi efektivitas terapi.",
    tipeKonten: "artikel",
    metodeTerapi: "Umum",
    gambarUrl: null,
  },
  {
    judul: "Apa yang Harus Dilakukan Jika Lupa Minum Obat",
    ringkasan:
      "Langkah aman ketika menyadari ada dosis obat yang terlewat.",
    isi:
      "Melewatkan dosis obat sesekali adalah hal yang bisa terjadi pada siapa saja, termasuk pasien yang sudah sangat disiplin. Yang terpenting adalah mengetahui langkah yang tepat saat hal ini terjadi, bukan menghindarinya sepenuhnya.\n\n" +
      "Secara umum, jika Anda menyadari lupa minum obat tidak lama setelah jadwalnya, obat masih bisa diminum sesegera mungkin. Namun jika sudah mendekati jadwal dosis berikutnya, jangan menggandakan dosis untuk 'menebus' dosis yang terlewat — ini justru dapat berbahaya untuk beberapa jenis obat.\n\n" +
      "Setiap obat memiliki aturan yang sedikit berbeda mengenai apa yang harus dilakukan jika terlewat, terutama obat-obatan dengan jadwal ketat seperti imunosupresan pasca-transplantasi. Sebaiknya tanyakan langsung kepada dokter atau apoteker mengenai aturan spesifik untuk obat yang Anda konsumsi.\n\n" +
      "Mencatat dosis yang terlewat di aplikasi ini membantu Anda dan tim medis melihat pola kepatuhan dari waktu ke waktu, sehingga dapat didiskusikan dan dicarikan solusi bersama pada kunjungan kontrol berikutnya.",
    tipeKonten: "artikel",
    metodeTerapi: "Umum",
    gambarUrl: null,
  },

  // ── Umum: Gaya Hidup (2) ─────────────────────────────────────────────────
  {
    judul: "Menjaga Kualitas Tidur bagi Pasien Ginjal",
    ringkasan:
      "Mengapa tidur yang cukup dan berkualitas penting, dan tips sederhana untuk mendapatkannya.",
    isi:
      "Gangguan tidur cukup umum dialami pasien penyakit ginjal kronis, baik karena ketidaknyamanan fisik, kram kaki di malam hari, maupun kekhawatiran terkait kondisi kesehatan. Padahal tidur yang cukup dan berkualitas turut mendukung pemulihan tubuh dan menjaga suasana hati tetap stabil.\n\n" +
      "Beberapa kebiasaan yang dapat membantu: menjaga jadwal tidur yang konsisten setiap hari, menghindari kafein di sore dan malam hari, serta menciptakan suasana kamar yang tenang dan nyaman untuk tidur.\n\n" +
      "Bagi pasien HD, sebaiknya hindari tidur siang terlalu lama pada hari non-dialisis agar tidak mengganggu jadwal tidur malam. Bagi pasien CAPD, penjadwalan exchange malam sebaiknya disesuaikan agar tidak terlalu sering mengganggu waktu tidur.\n\n" +
      "Jika gangguan tidur berlangsung terus-menerus dan mengganggu aktivitas sehari-hari, sampaikan kepada tim medis Anda — terkadang ada penyebab medis yang bisa ditangani, bukan sekadar kebiasaan tidur yang perlu diperbaiki sendiri.",
    tipeKonten: "gaya_hidup",
    metodeTerapi: "Umum",
    gambarUrl: null,
  },
  {
    judul: "Mengelola Stres Sehari-hari sebagai Pasien Ginjal",
    ringkasan:
      "Cara sederhana menjaga kondisi mental tetap stabil di tengah rutinitas terapi jangka panjang.",
    isi:
      "Menjalani terapi jangka panjang untuk penyakit ginjal kronis dapat menimbulkan tekanan emosional tersendiri, baik karena keterbatasan aktivitas, biaya perawatan, maupun kekhawatiran terhadap masa depan kesehatan. Mengelola stres ini sama pentingnya dengan menjaga kondisi fisik.\n\n" +
      "Beberapa cara sederhana yang dapat membantu: meluangkan waktu untuk aktivitas yang disukai meski dalam skala kecil, berbicara terbuka dengan keluarga tentang perasaan yang dialami, dan tetap menjaga hubungan sosial dengan teman maupun komunitas sesama pasien.\n\n" +
      "Latihan pernapasan sederhana atau relaksasi singkat sebelum tidur juga dapat membantu meredakan kecemasan yang muncul di malam hari. Menuliskan perasaan harian, seperti fitur catatan aktivitas di aplikasi ini, juga bisa menjadi cara menyalurkan pikiran yang menumpuk.\n\n" +
      "Jika perasaan cemas atau sedih terasa berat dan berlangsung lama, tidak ada salahnya mencari dukungan profesional seperti psikolog, selain tetap berkonsultasi dengan tim medis mengenai kondisi fisik Anda.",
    tipeKonten: "gaya_hidup",
    metodeTerapi: "Umum",
    gambarUrl: null,
  },

  // ── Umum: Mental & Dukungan (3) ──────────────────────────────────────────
  {
    judul: "Peran Keluarga dalam Mendukung Pasien Ginjal",
    ringkasan:
      "Bagaimana dukungan keluarga dapat membantu keberhasilan terapi jangka panjang.",
    isi:
      "Dukungan keluarga memiliki peran besar dalam keberhasilan terapi pasien penyakit ginjal kronis, baik dari sisi praktis seperti mengingatkan jadwal obat dan terapi, maupun dari sisi emosional seperti memberi semangat saat pasien merasa lelah menjalani rutinitas.\n\n" +
      "Keluarga dapat membantu dengan cara sederhana: ikut memahami pola makan yang perlu dijaga sehingga tidak menawarkan makanan yang sebaiknya dibatasi, menemani saat kontrol atau sesi dialisis bila memungkinkan, dan menjadi pengingat yang suportif tanpa terkesan menghakimi saat ada dosis atau jadwal yang terlewat.\n\n" +
      "Fitur di aplikasi ini yang memungkinkan keluarga memantau kondisi pasien (dashboard caregiver) dapat membantu keluarga tetap mengetahui perkembangan kondisi tanpa harus terus-menerus bertanya, yang terkadang justru terasa melelahkan bagi pasien.\n\n" +
      "Komunikasi terbuka antara pasien dan keluarga tentang kebutuhan dan batasan masing-masing adalah kunci agar dukungan yang diberikan benar-benar terasa membantu, bukan menjadi tekanan tambahan.",
    tipeKonten: "artikel",
    metodeTerapi: "Umum",
    gambarUrl: null,
  },
  {
    judul: "Manfaat Bergabung dengan Komunitas Sesama Pasien",
    ringkasan:
      "Mengapa berbagi pengalaman dengan sesama pasien ginjal dapat membantu proses menjalani terapi.",
    isi:
      "Menjalani terapi penyakit ginjal kronis terkadang terasa lebih berat bila dijalani sendirian, tanpa berbicara dengan orang lain yang memahami pengalaman serupa. Bergabung dengan komunitas sesama pasien dapat memberikan rasa tidak sendirian dalam menjalani proses ini.\n\n" +
      "Melalui komunitas, pasien dapat saling berbagi tips praktis sehari-hari — mulai dari cara mengatasi rasa haus, pengalaman menjalani sesi dialisis pertama kali, hingga cara menjelaskan kondisi kepada rekan kerja atau lingkungan sosial.\n\n" +
      "Fitur forum komunitas di aplikasi ini dirancang sebagai ruang berbagi pengalaman dan bertanya antar sesama pasien, dikelompokkan berdasarkan jenis terapi (CAPD, HD, atau Transplantasi) agar diskusi lebih relevan dengan kondisi masing-masing.\n\n" +
      "Perlu diingat bahwa pengalaman dan saran dari sesama pasien di komunitas bersifat berbagi cerita pribadi, bukan pengganti nasihat medis profesional — keputusan terkait pengobatan tetap perlu didiskusikan dengan dokter atau tim medis Anda.",
    tipeKonten: "artikel",
    metodeTerapi: "Umum",
    gambarUrl: null,
  },
  {
    judul: "Menerima Diagnosis Penyakit Ginjal Kronis",
    ringkasan:
      "Proses emosional yang wajar dialami setelah menerima diagnosis, dan cara menghadapinya secara bertahap.",
    isi:
      "Menerima diagnosis penyakit ginjal kronis, baik saat pertama kali didiagnosis maupun ketika harus memulai terapi pengganti ginjal, adalah proses emosional yang wajar dan berbeda bagi setiap orang. Perasaan kaget, sedih, marah, atau bahkan menyangkal pada tahap awal adalah reaksi yang umum terjadi.\n\n" +
      "Memberi diri sendiri waktu untuk memproses perasaan tersebut, tanpa terburu-buru merasa harus 'kuat' sejak hari pertama, adalah hal yang wajar. Setiap orang memiliki kecepatan yang berbeda dalam menerima dan menyesuaikan diri dengan kondisi baru ini.\n\n" +
      "Berbicara dengan keluarga, sesama pasien di komunitas, atau tenaga profesional seperti psikolog dapat membantu proses penerimaan ini terasa lebih ringan. Mencatat kondisi harian melalui aplikasi ini juga bisa menjadi cara untuk merasa lebih memegang kendali atas kondisi kesehatan sendiri.\n\n" +
      "Seiring waktu, banyak pasien menemukan bahwa menjalani rutinitas terapi menjadi bagian dari kehidupan sehari-hari yang bisa dijalani, bukan sesuatu yang terus-menerus terasa berat. Prosesnya bertahap, dan tidak apa-apa jika belum sampai pada titik itu sekarang.",
    tipeKonten: "artikel",
    metodeTerapi: "Umum",
    gambarUrl: null,
  },

  // ── Umum: umum lainnya (3) ───────────────────────────────────────────────
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
  {
    judul: "Memahami Hasil Pemeriksaan Laboratorium Ginjal",
    ringkasan:
      "Penjelasan sederhana tentang beberapa parameter lab yang umum dipantau pasien ginjal.",
    isi:
      "Pemeriksaan laboratorium rutin adalah bagian penting dari pemantauan penyakit ginjal kronis. Beberapa parameter yang umum diperiksa antara lain kreatinin dan ureum (menggambarkan seberapa baik ginjal menyaring darah), hemoglobin (terkait risiko anemia), serta elektrolit seperti kalium dan natrium.\n\n" +
      "Nilai-nilai ini biasanya dibandingkan dengan rentang rujukan (nilai normal) yang tertera pada hasil lab. Namun penting diingat bahwa rentang normal ini bersifat umum, sedangkan target ideal untuk pasien penyakit ginjal kronis bisa sedikit berbeda tergantung tahap penyakit dan jenis terapi yang dijalani.\n\n" +
      "Aplikasi ini menyediakan fitur pencatatan hasil lab beserta grafik tren dari waktu ke waktu, sehingga Anda dapat melihat apakah suatu nilai cenderung membaik, stabil, atau memburuk dibandingkan pemeriksaan sebelumnya — pola ini seringkali lebih bermakna dibandingkan satu angka tunggal.\n\n" +
      "Selalu diskusikan hasil lab lengkap dengan dokter yang menangani Anda, karena dokter dapat menginterpretasikan angka-angka ini bersama dengan kondisi klinis Anda secara keseluruhan — sesuatu yang tidak dapat dilakukan hanya dari angka semata.",
    tipeKonten: "artikel",
    metodeTerapi: "Umum",
    gambarUrl: null,
  },
];
