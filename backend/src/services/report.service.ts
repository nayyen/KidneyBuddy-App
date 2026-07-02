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
 *   anomalies: []  // Phase 4 placeholder — Phase 5 fills with real data
 * }
 */
import { z } from "zod";
import * as reportRepository from "../repositories/report.repository.js";
import type {
  FluidSummaryRow,
  MedicationAdherenceResult,
  DialysisAdherenceResult,
  CAPDConditionCounts,
} from "../repositories/report.repository.js";

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
  anomalies: unknown[];
};

// ─── Injectable core function ────────────────────────────────────────────────

type GetFluidFn = typeof reportRepository.getFluidSummaryByRange;
type GetMedFn = typeof reportRepository.getMedicationAdherenceByRange;
type GetDialysisFn = typeof reportRepository.getDialysisAdherenceByRange;
type GetCAPDFn = typeof reportRepository.getCAPDConditionsByRange;

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
 */
export async function _generateReportCore(
  userId: string,
  dari: string,
  sampai: string,
  getFluidFn: GetFluidFn,
  getMedFn: GetMedFn,
  getDialysisFn: GetDialysisFn,
  getCAPDFn: GetCAPDFn,
): Promise<ReportResponse> {
  // Run all queries in parallel
  const [fluidRows, medicationData, dialysisData, capdCounts] = await Promise.all([
    getFluidFn(userId, dari, sampai),
    getMedFn(userId, dari, sampai),
    getDialysisFn(userId, dari, sampai),
    getCAPDFn(userId, dari, sampai),
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
    anomalies: [], // Phase 4 placeholder — Phase 5 fills with real detection data
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
    ),
};
