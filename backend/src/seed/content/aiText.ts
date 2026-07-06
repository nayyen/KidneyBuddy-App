/**
 * content/aiText.ts — Template builders for AI-narration seed content.
 *
 * These mirror the warm, calm, non-diagnostic Indonesian voice the real
 * Groq-backed services (aiSummary/aiInsight/aiLifestyle/aiLabAnalysis) are
 * instructed to produce (see 05-UI-SPEC Copywriting Contract). Every builder
 * returns text that ALREADY has the disclaimer appended via
 * appendDisclaimer() from lib/aiDisclaimer.ts, so the JSON written to disk
 * is exactly the plaintext the loader will encrypt() and store — matching
 * the real app's "disclaimer baked into stored text" convention.
 *
 * Builders take a SeededRng so phrasing variety is picked deterministically
 * (same seed -> identical output), never via Math.random.
 */
import { appendDisclaimer } from "../../lib/aiDisclaimer.js";
import type { SeededRng } from "../lib/rng.js";

export type DailySummaryParams = {
  namaLengkap: string;
  metodeTerapi: string;
  tanggal: string;
  fluidBalanceMl: number;
  medAdherencePercent: number;
  activityNote?: string;
};

const DAILY_OPENERS = [
  "Berikut ringkasan kondisi Anda hari ini",
  "Ini rangkuman aktivitas kesehatan Anda pada",
  "Rangkuman harian untuk Anda, per",
];

export function buildDailySummary(rng: SeededRng, p: DailySummaryParams): string {
  const opener = rng.pick(DAILY_OPENERS);
  const balanceDesc =
    p.fluidBalanceMl >= 0
      ? `keseimbangan cairan tercatat positif sekitar ${Math.abs(p.fluidBalanceMl)} ml (cairan masuk lebih banyak dari yang keluar)`
      : `keseimbangan cairan tercatat negatif sekitar ${Math.abs(p.fluidBalanceMl)} ml (cairan keluar lebih banyak dari yang masuk)`;
  const adherenceDesc =
    p.medAdherencePercent >= 90
      ? "kepatuhan minum obat Anda sangat baik hari ini"
      : p.medAdherencePercent >= 70
        ? "kepatuhan minum obat Anda cukup baik, meski ada satu dua dosis yang perlu diperhatikan"
        : "ada beberapa dosis obat yang belum terkonfirmasi hari ini, ada baiknya dicek kembali";
  const activityLine = p.activityNote
    ? ` Aktivitas tercatat: ${p.activityNote}.`
    : "";

  const body =
    `${opener} ${p.tanggal}, ${p.namaLengkap}: ${balanceDesc}, dan ${adherenceDesc}.${activityLine} ` +
    `Sebagai pasien ${p.metodeTerapi}, menjaga rutinitas pencatatan harian seperti ini membantu Anda dan tim medis memantau pola kondisi dari waktu ke waktu.`;

  return appendDisclaimer(body);
}

export type WeeklyInsightParams = {
  namaLengkap: string;
  metodeTerapi: string;
  pekan: string;
  avgFluidBalanceMl: number;
  adherenceTrend: "membaik" | "stabil" | "menurun";
};

export function buildWeeklyInsight(rng: SeededRng, p: WeeklyInsightParams): string {
  const trendDesc =
    p.adherenceTrend === "membaik"
      ? "menunjukkan tren membaik dibandingkan minggu sebelumnya"
      : p.adherenceTrend === "menurun"
        ? "sedikit menurun dibandingkan minggu sebelumnya — tidak apa-apa, ini adalah hal yang wajar terjadi dan bisa diperbaiki minggu ini"
        : "relatif stabil dibandingkan minggu sebelumnya";
  const variant = rng.pick([
    `Selama pekan ${p.pekan}, pola kepatuhan terapi Anda ${trendDesc}.`,
    `Pekan ${p.pekan} ini, ${p.namaLengkap}, kepatuhan Anda ${trendDesc}.`,
  ]);
  const balanceLine =
    p.avgFluidBalanceMl >= 0
      ? `Rata-rata keseimbangan cairan harian sekitar +${p.avgFluidBalanceMl} ml.`
      : `Rata-rata keseimbangan cairan harian sekitar ${p.avgFluidBalanceMl} ml.`;

  const body =
    `${variant} ${balanceLine} Sebagai pasien ${p.metodeTerapi}, konsistensi pencatatan mingguan seperti ini membantu melihat pola jangka menengah yang tidak selalu terlihat dari catatan harian saja. ` +
    "Tetap semangat menjalani rutinitas terapi Anda.";

  return appendDisclaimer(body);
}

export type LifestyleSuggestionParams = {
  namaLengkap: string;
  metodeTerapi: string;
  tanggal: string;
  focusArea: "cairan" | "aktivitas" | "obat" | "istirahat";
};

const LIFESTYLE_BY_FOCUS: Record<LifestyleSuggestionParams["focusArea"], string[]> = {
  cairan: [
    "Cobalah menggunakan gelas berukuran tetap untuk minum, sehingga lebih mudah memperkirakan total cairan yang masuk sepanjang hari.",
    "Bila terasa haus di luar jadwal minum, coba kumur air dingin atau isap potongan es batu kecil sebagai alternatif yang lebih ringan untuk cairan tubuh.",
  ],
  aktivitas: [
    "Luangkan waktu 15-20 menit untuk jalan kaki santai hari ini, sesuai kemampuan tubuh Anda — gerakan ringan membantu menjaga sirkulasi darah.",
    "Coba selingi waktu duduk lama dengan peregangan ringan setiap satu dua jam agar tubuh tidak kaku.",
  ],
  obat: [
    "Menyiapkan obat malam sebelumnya di tempat yang mudah terlihat dapat membantu mengurangi risiko lupa dosis pagi hari.",
    "Jika ada dosis yang terlewat, jangan menggandakan dosis berikutnya — catat saja dan lanjutkan jadwal seperti biasa.",
  ],
  istirahat: [
    "Usahakan waktu tidur yang cukup dan konsisten setiap malam, karena istirahat yang baik turut mendukung pemulihan tubuh.",
    "Bila merasa lelah berlebihan, tidak apa-apa untuk mengurangi aktivitas hari ini dan lebih banyak beristirahat.",
  ],
};

export function buildLifestyleSuggestion(rng: SeededRng, p: LifestyleSuggestionParams): string {
  const tip = rng.pick(LIFESTYLE_BY_FOCUS[p.focusArea]);
  const body =
    `Saran untuk ${p.namaLengkap} pada ${p.tanggal}: ${tip} Sebagai pasien ${p.metodeTerapi}, ` +
    "kebiasaan kecil yang konsisten setiap hari biasanya memberi dampak lebih besar dibandingkan perubahan besar yang sulit dipertahankan.";

  return appendDisclaimer(body);
}

export type LabAnalysisParams = {
  namaLengkap: string;
  metodeTerapi: string;
  tanggalPemeriksaan: string;
  namaParameter: string;
  nilai: string;
  satuan: string | null;
  nilaiRujukan: string | null;
  statusDesc: "dalam rentang normal" | "sedikit di luar rentang normal" | "di luar rentang normal";
};

export function buildLabAnalysis(rng: SeededRng, p: LabAnalysisParams): string {
  const rujukanLine = p.nilaiRujukan
    ? ` (nilai rujukan: ${p.nilaiRujukan}${p.satuan ? ` ${p.satuan}` : ""})`
    : "";
  const opener = rng.pick([
    `Hasil pemeriksaan ${p.namaParameter} tanggal ${p.tanggalPemeriksaan}`,
    `Melihat hasil lab ${p.namaParameter} Anda pada ${p.tanggalPemeriksaan}`,
  ]);
  const body =
    `${opener}: nilai ${p.nilai}${p.satuan ? ` ${p.satuan}` : ""}${rujukanLine} tercatat ${p.statusDesc} untuk pasien ${p.metodeTerapi}. ` +
    `${p.namaLengkap}, hasil ini merupakan salah satu bagian dari gambaran kondisi Anda secara keseluruhan — ` +
    "diskusikan bersama dokter pada kunjungan kontrol berikutnya untuk penjelasan dan tindak lanjut yang lebih lengkap.";

  return appendDisclaimer(body);
}
