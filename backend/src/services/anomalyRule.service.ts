/**
 * anomalyRule.service.ts — Deterministic anomaly rule engine (ANOMALY-01, D-01..D-04)
 *
 * Pure, dependency-free TypeScript functions. This file MUST NOT import the
 * Groq client lib, the database module, or anything from the repositories
 * layer — the absence of those imports is the D-03 hard boundary
 * enforcement: type, severity, and confidence are decided ENTIRELY here,
 * never by the LLM.
 *
 * The LLM (wired in a later plan) only ever receives this module's output
 * (`RuleResult`) and writes a Bahasa Indonesia explanation — it is never
 * asked to judge whether an anomaly is real or how confident to be.
 *
 * D-02: severity is fixed per anomaly type, never dynamically scored:
 *   - penurunan_volume_keluar   -> "normal"
 *   - kondisi_cairan_abnormal   -> "tinggi"
 *   - jadwal_terlewat           -> "tinggi"
 *   - pola_asupan_menyimpang    -> "normal"
 *
 * D-04: rules requiring historical data silently return `null` (no alert, no
 * error) until enough history exists. CAPD-effluent and missed-schedule
 * rules have no history requirement and are active from day one.
 */

export type RuleResult = {
  tipeAnomali:
    | "penurunan_volume_keluar"
    | "kondisi_cairan_abnormal"
    | "jadwal_terlewat"
    | "pola_asupan_menyimpang";
  severity: "normal" | "tinggi"; // D-02: fixed per type, never computed dynamically
  confidenceScore: number; // D-03: rule-engine-owned, 0-100
  ruleData: Record<string, number | string>; // underlying numbers, passed to LLM prompt only for narration
};

const DECLINE_THRESHOLD_PERCENT = 30;
const INTAKE_DEVIATION_THRESHOLD_PERCENT = 30;

// ─── D-01/D-04: fluid-output decline — always "normal" severity ──────────────

/**
 * Fires when the patient's recent 3-day average fluid output has declined
 * >=30% relative to their own prior baseline (the days preceding the recent
 * 3-day window).
 *
 * D-04: silently returns null with fewer than 3 recent days + a prior
 * baseline (minimum 6 total data points: >=3 baseline + exactly 3 recent),
 * or if any entry is null/missing (insufficient data, not a real decline).
 */
export function checkFluidOutputDecline(
  dailyKeluar: Array<number | null | undefined>,
): RuleResult | null {
  // D-04: need at least 3 recent days plus some prior baseline days
  if (dailyKeluar.length < 6) return null;
  if (dailyKeluar.some((v) => v == null)) return null;

  const recent = dailyKeluar.slice(-3) as number[];
  const baseline = dailyKeluar.slice(0, -3) as number[];

  const baselineAvg = baseline.reduce((sum, v) => sum + v, 0) / baseline.length;
  const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length;

  if (baselineAvg === 0) return null; // avoid divide-by-zero false positive

  const declinePercent = ((baselineAvg - recentAvg) / baselineAvg) * 100;
  if (declinePercent < DECLINE_THRESHOLD_PERCENT) return null;

  // D-03: confidence scales with how far past the threshold the decline is
  const confidenceScore = Math.min(
    100,
    Math.round(50 + (declinePercent - DECLINE_THRESHOLD_PERCENT) * 2),
  );

  return {
    tipeAnomali: "penurunan_volume_keluar",
    severity: "normal", // D-02: this type is always normal
    confidenceScore,
    ruleData: {
      declinePercent: Math.round(declinePercent),
      thresholdPercent: DECLINE_THRESHOLD_PERCENT,
    },
  };
}

// ─── D-02: CAPD abnormal effluent — always "tinggi", no history requirement ──

/**
 * Fires whenever the CAPD effluent condition is anything other than "jernih"
 * (clear). No history requirement (D-04) — active from day one.
 */
export function checkCapdEffluentAnomaly(
  kondisiKeluar: string | null | undefined,
): RuleResult | null {
  if (kondisiKeluar == null || kondisiKeluar === "jernih") return null;

  return {
    tipeAnomali: "kondisi_cairan_abnormal",
    severity: "tinggi", // D-02: this type is always tinggi
    confidenceScore: 100, // deterministic categorical match — no gradient
    ruleData: { kondisiKeluar },
  };
}

// ─── D-02: >2 missed schedules in a day — always "tinggi", no history requirement ──

/**
 * Fires when more than 2 therapy schedules (medication or dialysis) were
 * missed today. No history requirement (D-04) — active from day one.
 */
export function checkMissedSchedules(missedCountToday: number): RuleResult | null {
  if (missedCountToday <= 2) return null; // threshold: MORE than 2

  return {
    tipeAnomali: "jadwal_terlewat",
    severity: "tinggi", // D-02: this type is always tinggi
    confidenceScore: Math.min(100, 60 + (missedCountToday - 2) * 15),
    ruleData: { missedCountToday },
  };
}

// ─── D-01/D-04: fluid-intake pattern deviation — always "normal" severity ────

/**
 * Fires when today's fluid intake deviates significantly from the patient's
 * OWN 7-day rolling baseline (D-01: personal baseline only, never a
 * population baseline or doctor-set limit).
 *
 * D-04: silently returns null with fewer than 7 days of history (6 baseline
 * days + today), or if any entry is null/missing.
 */
export function checkFluidIntakeDeviation(
  history: Array<number | null | undefined>,
): RuleResult | null {
  // D-04: need 6 baseline days + today = 7 total data points
  if (history.length < 7) return null;
  if (history.some((v) => v == null)) return null;

  const today = history[history.length - 1] as number;
  const baseline = history.slice(0, -1) as number[];
  const baselineAvg = baseline.reduce((sum, v) => sum + v, 0) / baseline.length;

  if (baselineAvg === 0) return null; // avoid divide-by-zero false positive

  const deviationPercent = (Math.abs(today - baselineAvg) / baselineAvg) * 100;
  if (deviationPercent < INTAKE_DEVIATION_THRESHOLD_PERCENT) return null;

  // D-03: confidence scales with how far past the threshold the deviation is
  const confidenceScore = Math.min(
    100,
    Math.round(50 + (deviationPercent - INTAKE_DEVIATION_THRESHOLD_PERCENT) * 2),
  );

  return {
    tipeAnomali: "pola_asupan_menyimpang",
    severity: "normal", // D-02: this type is always normal
    confidenceScore,
    ruleData: {
      deviationPercent: Math.round(deviationPercent),
      thresholdPercent: INTAKE_DEVIATION_THRESHOLD_PERCENT,
      todayIntake: today,
      sevenDayAvg: Math.round(baselineAvg),
    },
  };
}
