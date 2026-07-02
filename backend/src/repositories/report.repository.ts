/**
 * report.repository.ts — Date-range aggregation queries for doctor-visit report
 *
 * Implements REPORT-01: three IDOR-safe, WIB-correct aggregation queries
 * across fluid_log and medication_log.
 *
 * All queries filter by userId (IDOR guard, non-negotiable).
 * Medication adherence uses WIB-correct timestamp boundaries (Pitfall 4).
 */
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "../lib/db.js";
import { fluidLog } from "../db/schema/fluidLog.schema.js";
import { medicationLog } from "../db/schema/medicationLog.schema.js";
import { dialysisLog } from "../db/schema/dialysisLog.schema.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export type FluidSummaryRow = {
  tanggal: string;
  masuk: number;
  keluar: number;
};

export type MedicationAdherenceResult = {
  total: number;
  confirmed: number;
  byReminder: Array<{
    namaObat: string;
    total: number;
    confirmed: number;
  }>;
};

export type DialysisAdherenceResult = {
  total: number;
  confirmed: number;
};

export type CAPDConditionCounts = {
  jernih: number;
  keruh: number;
  keruh_gumpalan: number;
  berdarah: number;
};

// ─── Fluid Summary ───────────────────────────────────────────────────────────

/**
 * Aggregates fluid intake (masuk) and output (keluar) per day for a date range.
 * Returns per-day rows with total masuk and keluar as numbers.
 *
 * @param userId - authenticated user ID
 * @param startDate - range start (YYYY-MM-DD, inclusive)
 * @param endDate - range end (YYYY-MM-DD, inclusive)
 */
export async function getFluidSummaryByRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<FluidSummaryRow[]> {
  const rows = await db
    .select({
      tanggal: fluidLog.tanggal,
      tipe: fluidLog.tipe,
      volume: fluidLog.volume,
    })
    .from(fluidLog)
    .where(
      and(
        eq(fluidLog.userId, userId as any),
        gte(fluidLog.tanggal, startDate),
        lte(fluidLog.tanggal, endDate),
      ),
    );

  // Aggregate in application layer: group by tanggal, sum masuk/keluar
  const dayMap = new Map<string, { masuk: number; keluar: number }>();

  for (const row of rows) {
    if (!dayMap.has(row.tanggal)) {
      dayMap.set(row.tanggal, { masuk: 0, keluar: 0 });
    }
    const day = dayMap.get(row.tanggal)!;
    const vol = Number(row.volume) || 0;
    if (row.tipe === "masuk") {
      day.masuk += vol;
    } else if (row.tipe === "keluar") {
      day.keluar += vol;
    }
  }

  return Array.from(dayMap.entries())
    .map(([tanggal, { masuk, keluar }]) => ({ tanggal, masuk, keluar }))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

// ─── Medication Adherence ────────────────────────────────────────────────────

/**
 * Counts scheduled vs confirmed medication doses for a date range.
 * Uses WIB-correct timestamp boundaries (Pitfall 4): medication_log.waktuPengingat
 * is stored as UTC timestamp; naive UTC-midnight query drops the first 7 hours
 * of each WIB day.  We append +07:00 offset to the date strings.
 *
 * @param userId - authenticated user ID
 * @param startDate - range start (YYYY-MM-DD)
 * @param endDate - range end (YYYY-MM-DD)
 */
export async function getMedicationAdherenceByRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<MedicationAdherenceResult> {
  // WIB-correct boundaries (Pitfall 4)
  const wibStart = new Date(`${startDate}T00:00:00+07:00`);
  const wibEnd = new Date(`${endDate}T23:59:59+07:00`);

  const rows = await db
    .select({
      namaObat: medicationLog.namaObat,
      status: medicationLog.status,
    })
    .from(medicationLog)
    .where(
      and(
        eq(medicationLog.userId, userId as any),
        gte(medicationLog.waktuPengingat, wibStart),
        lte(medicationLog.waktuPengingat, wibEnd),
      ),
    );

  // Aggregate in application layer
  const total = rows.length;
  const confirmed = rows.filter((r) => r.status === "dikonfirmasi").length;

  // Per-medication breakdown
  const medMap = new Map<string, { total: number; confirmed: number }>();
  for (const row of rows) {
    if (!medMap.has(row.namaObat)) {
      medMap.set(row.namaObat, { total: 0, confirmed: 0 });
    }
    const med = medMap.get(row.namaObat)!;
    med.total++;
    if (row.status === "dikonfirmasi") {
      med.confirmed++;
    }
  }

  const byReminder = Array.from(medMap.entries()).map(
    ([namaObat, { total, confirmed }]) => ({ namaObat, total, confirmed }),
  );

  return { total, confirmed, byReminder };
}

// ─── Dialysis Adherence ────────────────────────────────────────────────────

/**
 * Counts scheduled vs confirmed dialysis sessions for a date range.
 * Uses WIB-correct timestamp boundaries.
 *
 * @param userId - authenticated user ID
 * @param startDate - range start (YYYY-MM-DD)
 * @param endDate - range end (YYYY-MM-DD)
 */
export async function getDialysisAdherenceByRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<DialysisAdherenceResult> {
  const wibStart = new Date(`${startDate}T00:00:00+07:00`);
  const wibEnd = new Date(`${endDate}T23:59:59+07:00`);

  const rows = await db
    .select({
      status: dialysisLog.status,
    })
    .from(dialysisLog)
    .where(
      and(
        eq(dialysisLog.userId, userId as any),
        gte(dialysisLog.waktuPengingat, wibStart),
        lte(dialysisLog.waktuPengingat, wibEnd),
      ),
    );

  const total = rows.length;
  const confirmed = rows.filter((r) => r.status === "dikonfirmasi").length;

  return { total, confirmed };
}

// ─── CAPD Condition Frequency ───────────────────────────────────────────────

/**
 * Counts CAPD effluent condition frequency for a date range.
 * Only counts keluar entries with kondisiKeluar set.
 *
 * @param userId - authenticated user ID
 * @param startDate - range start (YYYY-MM-DD, inclusive)
 * @param endDate - range end (YYYY-MM-DD, inclusive)
 */
export async function getCAPDConditionsByRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<CAPDConditionCounts> {
  const rows = await db
    .select({
      kondisiKeluar: fluidLog.kondisiKeluar,
    })
    .from(fluidLog)
    .where(
      and(
        eq(fluidLog.userId, userId as any),
        eq(fluidLog.tipe, "keluar"),
        gte(fluidLog.tanggal, startDate),
        lte(fluidLog.tanggal, endDate),
      ),
    );

  const counts: CAPDConditionCounts = {
    jernih: 0,
    keruh: 0,
    keruh_gumpalan: 0,
    berdarah: 0,
  };

  for (const row of rows) {
    switch (row.kondisiKeluar) {
      case "jernih":
        counts.jernih++;
        break;
      case "keruh":
        counts.keruh++;
        break;
      case "keruh_gumpalan":
        counts.keruh_gumpalan++;
        break;
      case "berdarah":
        counts.berdarah++;
        break;
      // null or unknown conditions are ignored
    }
  }

  return counts;
}
