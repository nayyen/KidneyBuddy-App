/**
 * report.service.ts — Report aggregation business logic (REPORT-01)
 *
 * Implements:
 * - reportQuerySchema: zod validation for date range params (90-day max, ordering, format)
 * - _generateReportCore: injectable core with fake-able dependencies for testing
 * - reportService.generateReport: production wrapper calling real repository functions
 *
 * Response shape:
 * {
 *   fluidSummary: { totalIn, totalOut, balance },
 *   medicationAdherence: { taken, scheduled, pct },
 *   capdFrequency: { jernih, keruh, keruh_gumpalan, berdarah },
 *   anomalies: ReportAnomalyRow[]  // D-15 (05-07) — real anomaly_alerts data
 * }
 */
import { z } from "zod";
import * as reportRepository from "../repositories/report.repository.js";
import * as anomalyAlertRepo from "../repositories/anomalyAlert.repository.js";
import { decrypt } from "../lib/encryption.js";
import type {
  FluidSummaryRow,
  MedicationAdherenceResult,
  DialysisAdherenceResult,
  CAPDConditionCounts,
  ReportActivityRawRow,
} from "../repositories/report.repository.js";

// ─── Anomali Terdeteksi (D-15) ────────────────────────────────────────────────

export type ReportAnomalyRow = {
  tanggal: string; // WIB date derived from anomaly_alerts.createdAt
  tipeAnomali: string;
  severity: string; // "normal" | "tinggi"
  deskripsi: string; // decrypted plaintext
};

/** WIB (UTC+7) calendar date for a timestamp — mirrors utils/wib.ts's shift convention. */
function toWibDateStr(d: Date): string {
  return new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * Fetches anomaly_alerts for the report's date range (T-05-17: IDOR-scoped
 * via anomalyAlertRepo.findByUserAndRange's userId-first signature, same
 * WIB-correct range aggregation pattern as report.repository.ts's other
 * queries) and decrypts `deskripsi` (T-05-19 — never exposed as ciphertext).
 */
async function getAnomaliesByRangeForReport(
  userId: string,
  dari: string,
  sampai: string,
): Promise<ReportAnomalyRow[]> {
  const rows = await anomalyAlertRepo.findByUserAndRange(userId, dari, sampai);
  return rows.map((row) => ({
    tanggal: toWibDateStr(row.createdAt),
    tipeAnomali: row.tipeAnomali,
    severity: row.severity,
    deskripsi: decrypt(row.deskripsi),
  }));
}

// ─── Aktivitas (Fix 6, quick-260708-qqd) ─────────────────────────────────────

export type ReportActivityRow = {
  tanggal: string; // WIB date derived from waktuMulai
  waktuMulai: string; // ISO timestamp
  waktuSelesai: string | null; // ISO timestamp, null if still berlangsung
  namaKegiatan: string;
  durasiMenit: number | null; // round((waktuSelesai - waktuMulai) / 60000), null if not finished
  perasaan: string | null;
  catatan: string | null; // decrypted plaintext (catatanPerasaan)
};

/**
 * Fetches daily_activities for the report's date range and returns them with
 * catatanPerasaan DECRYPTED (T-03-02 — never exposed as ciphertext) and a
 * computed durasiMenit — mirrors getAnomaliesByRangeForReport's shape.
 */
async function getActivitiesByRangeForReport(
  userId: string,
  dari: string,
  sampai: string,
): Promise<ReportActivityRow[]> {
  const rows = await reportRepository.getActivitiesByRange(userId, dari, sampai);
  return rows.map((row: ReportActivityRawRow) => {
    const durasiMenit = row.waktuSelesai
      ? Math.round((row.waktuSelesai.getTime() - row.waktuMulai.getTime()) / 60000)
      : null;
    return {
      tanggal: toWibDateStr(row.waktuMulai),
      waktuMulai: row.waktuMulai.toISOString(),
      waktuSelesai: row.waktuSelesai ? row.waktuSelesai.toISOString() : null,
      namaKegiatan: row.namaKegiatan,
      durasiMenit,
      perasaan: row.perasaan,
      catatan: row.catatanPerasaan ? decrypt(row.catatanPerasaan) : null,
    };
  });
}

// ─── Zod validation schema ───────────────────────────────────────────────────

export const reportQuerySchema = z
  .object({
    dari: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
    sampai: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  })
  .refine((d) => d.sampai >= d.dari, {
    message: "Tanggal akhir harus setelah tanggal mulai",
  })
  .refine(
    (d) => {
      const diff =
        (new Date(d.sampai).getTime() - new Date(d.dari).getTime()) /
        (1000 * 60 * 60 * 24);
      return diff <= 90;
    },
    { message: "Rentang maksimum adalah 90 hari" },
  );

export type ReportQuery = z.infer<typeof reportQuerySchema>;

// ─── Response types ──────────────────────────────────────────────────────────

export type FluidSummary = {
  totalIn: number;
  totalOut: number;
  balance: number;
  avgDailyBalance: number;
  /** Per-day breakdown — one row per day in the range with daily balance */
  dailyBreakdown: Array<{
    tanggal: string;
    totalIn: number;
    totalOut: number;
    selisih: number;
  }>;
};

export type MedicationAdherence = {
  taken: number;
  scheduled: number;
  pct: number;
};

export type DialysisAdherence = {
  taken: number;
  scheduled: number;
  pct: number;
};

export type ReportResponse = {
  fluidSummary: FluidSummary;
  medicationAdherence: MedicationAdherence;
  dialysisAdherence: DialysisAdherence;
  capdFrequency: CAPDConditionCounts;
  anomalies: ReportAnomalyRow[];
  activities: ReportActivityRow[]; // Fix 6 (quick-260708-qqd)
};

// ─── Injectable core function ────────────────────────────────────────────────

type GetFluidFn = typeof reportRepository.getFluidSummaryByRange;
type GetMedFn = typeof reportRepository.getMedicationAdherenceByRange;
type GetDialysisFn = typeof reportRepository.getDialysisAdherenceByRange;
type GetCAPDFn = typeof reportRepository.getCAPDConditionsByRange;
type GetAnomaliesFn = typeof getAnomaliesByRangeForReport;
type GetActivitiesFn = typeof getActivitiesByRangeForReport;

/**
 * _generateReportCore — injectable core with fake-able repository functions.
 *
 * Test seam: accepts injected query functions so tests can pass in-memory fakes
 * without a live Postgres connection.
 *
 * @param userId - authenticated user ID
 * @param dari - range start YYYY-MM-DD
 * @param sampai - range end YYYY-MM-DD
 * @param getFluidFn - injected getFluidSummaryByRange
 * @param getMedFn - injected getMedicationAdherenceByRange
 * @param getDialysisFn - injected getDialysisAdherenceByRange
 * @param getCAPDFn - injected getCAPDConditionsByRange
 * @param getAnomaliesFn - injected getAnomaliesByRangeForReport (D-15, defaults
 *   to the real implementation in the production wrapper below)
 * @param getActivitiesFn - injected getActivitiesByRangeForReport (Fix 6,
 *   quick-260708-qqd). Defaults to an empty-array no-op (NOT the real DB
 *   impl) — this is an ADDITIVE param appended at the end so all 12
 *   pre-existing report.service.test.ts calls (which omit it) keep passing
 *   unchanged with `activities: []`, without needing a live DB connection.
 */
export async function _generateReportCore(
  userId: string,
  dari: string,
  sampai: string,
  getFluidFn: GetFluidFn,
  getMedFn: GetMedFn,
  getDialysisFn: GetDialysisFn,
  getCAPDFn: GetCAPDFn,
  getAnomaliesFn: GetAnomaliesFn = getAnomaliesByRangeForReport,
  getActivitiesFn: GetActivitiesFn = async () => [],
): Promise<ReportResponse> {
  // Run all queries in parallel
  const [fluidRows, medicationData, dialysisData, capdCounts, anomalies, activities] =
    await Promise.all([
      getFluidFn(userId, dari, sampai),
      getMedFn(userId, dari, sampai),
      getDialysisFn(userId, dari, sampai),
      getCAPDFn(userId, dari, sampai),
      getAnomaliesFn(userId, dari, sampai),
      getActivitiesFn(userId, dari, sampai),
    ]);

  // Compute fluid summary
  const totalIn = fluidRows.reduce((sum, row) => sum + row.masuk, 0);
  const totalOut = fluidRows.reduce((sum, row) => sum + row.keluar, 0);
  const balance = totalIn - totalOut;
  const dailyBreakdown = fluidRows.map((row) => ({
    tanggal: row.tanggal,
    totalIn: row.masuk,
    totalOut: row.keluar,
    selisih: row.masuk - row.keluar,
  }));
  const totalSelisih = dailyBreakdown.reduce((sum, day) => sum + day.selisih, 0);
  const avgDailyBalance = dailyBreakdown.length > 0 ? totalSelisih / dailyBreakdown.length : 0;


  // Compute medication adherence percentage
  const medTaken = medicationData.confirmed;
  const medScheduled = medicationData.total;
  const medPct = medScheduled === 0 ? 0 : Math.round((medTaken / medScheduled) * 100);

  // Compute dialysis adherence percentage
  const dialysisTaken = dialysisData.confirmed;
  const dialysisScheduled = dialysisData.total;
  const dialysisPct = dialysisScheduled === 0 ? 0 : Math.round((dialysisTaken / dialysisScheduled) * 100);

  return {
    fluidSummary: { totalIn, totalOut, balance, avgDailyBalance, dailyBreakdown },
    medicationAdherence: { taken: medTaken, scheduled: medScheduled, pct: medPct },
    dialysisAdherence: { taken: dialysisTaken, scheduled: dialysisScheduled, pct: dialysisPct },
    capdFrequency: capdCounts,
    anomalies, // D-15 (05-07) — real anomaly_alerts rows for the report range
    activities, // Fix 6 (quick-260708-qqd) — real daily_activities rows for the report range
  };
}

// ─── Production wrapper ──────────────────────────────────────────────────────

export const reportService = {
  /**
   * generateReport — production wrapper that calls the real repository functions.
   *
   * @param userId - authenticated user ID
   * @param dari - range start YYYY-MM-DD
   * @param sampai - range end YYYY-MM-DD
   */
  generateReport: (userId: string, dari: string, sampai: string) =>
    _generateReportCore(
      userId,
      dari,
      sampai,
      reportRepository.getFluidSummaryByRange,
      reportRepository.getMedicationAdherenceByRange,
      reportRepository.getDialysisAdherenceByRange,
      reportRepository.getCAPDConditionsByRange,
      getAnomaliesByRangeForReport,
      getActivitiesByRangeForReport,
    ),
};
