/**
 * fluidLog.repository.ts — fluid_log CRUD operations
 *
 * All queries filter by userId — never expose other users' fluid data (T-02-04-01).
 * Balance computation happens here so the service always receives pre-aggregated numbers
 * and never re-implements the SQL logic.
 *
 * Pattern: follows user.repository.ts (InferInsertModel, single-row insert returning).
 */
import { and, eq } from "drizzle-orm";
import { gte, lte, asc } from "drizzle-orm";
import { db } from "../lib/db.js";
import { fluidLog } from "../db/schema/fluidLog.schema.js";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { wibDayBounds, wibDateStr } from "../utils/wib.js";

export type FluidLog = InferSelectModel<typeof fluidLog>;
export type NewFluidLog = InferInsertModel<typeof fluidLog>;

/**
 * Insert a fluid entry and return the created row.
 */
export async function insertEntry(data: NewFluidLog): Promise<FluidLog> {
  const [row] = await db.insert(fluidLog).values(data).returning();
  return row;
}

/**
 * Fetch all fluid entries for a specific user and date, ordered chronologically.
 */
export async function findByDate(userId: string, date: string): Promise<FluidLog[]> {
  return db
    .select()
    .from(fluidLog)
    .where(and(eq(fluidLog.userId, userId as any), eq(fluidLog.tanggal, date)))
    .orderBy(fluidLog.waktu);
}

/**
 * Fetch fluid entries for the last N days (WIB-correct date range).
 * Returns entries with their tanggal field for grouping on the frontend.
 */
export async function findRecentByUser(
  userId: string,
  days: number = 7,
): Promise<FluidLog[]> {
  const today = wibDateStr();
  const [y, m, d] = today.split("-").map(Number);
  const startDate = new Date(Date.UTC(y, m - 1, d) - 7 * 3600 * 1000 - (days - 1) * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  return db
    .select()
    .from(fluidLog)
    .where(
      and(
        eq(fluidLog.userId, userId as any),
        gte(fluidLog.tanggal, startDate as any),
        lte(fluidLog.tanggal, today as any),
      ),
    )
    .orderBy(asc(fluidLog.tanggal), asc(fluidLog.waktu));
}

/**
 * Build the last `days` WIB calendar-date strings (oldest first, today last),
 * using wibDateStr() as the anchor so a container running in UTC still lines
 * up with the patient's local WIB day.
 */
function lastNWibDates(days: number): string[] {
  const todayStr = wibDateStr();
  const [y, m, d] = todayStr.split("-").map(Number);
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(
      new Date(Date.UTC(y, m - 1, d) - i * 24 * 3600 * 1000).toISOString().slice(0, 10),
    );
  }
  return dates;
}

/**
 * Fetch daily total fluid OUTPUT ("keluar") for the anomalyRule.service.ts
 * `checkFluidOutputDecline` input: a 6-day window (3 prior baseline days +
 * the 3 most recent days), oldest first. A day with no logged "keluar"
 * entries is returned as `null` (missing data, not a real zero) so the rule
 * engine's D-04 silent-skip triggers correctly rather than reading a false
 * 100% decline.
 */
export async function getDailyKeluarLast3Days(
  userId: string,
): Promise<Array<number | null>> {
  const dates = lastNWibDates(6);

  const rows = await db
    .select({ tanggal: fluidLog.tanggal, volume: fluidLog.volume })
    .from(fluidLog)
    .where(
      and(
        eq(fluidLog.userId, userId as any),
        eq(fluidLog.tipe, "keluar"),
        gte(fluidLog.tanggal, dates[0]),
        lte(fluidLog.tanggal, dates[dates.length - 1]),
      ),
    );

  const sumByDate = new Map<string, number>();
  for (const row of rows) {
    sumByDate.set(row.tanggal, (sumByDate.get(row.tanggal) ?? 0) + Number(row.volume));
  }

  return dates.map((dt) => (sumByDate.has(dt) ? sumByDate.get(dt)! : null));
}

/**
 * Fetch daily total fluid INTAKE ("masuk") for the anomalyRule.service.ts
 * `checkFluidIntakeDeviation` input: a 7-day window (6 prior baseline days +
 * today), oldest first, today last. D-01: this is the patient's OWN rolling
 * history, never a population baseline. A day with no logged "masuk" entries
 * is returned as `null` so D-04's silent-skip triggers on missing data.
 */
export async function getIntakeVsSevenDayAvg(
  userId: string,
): Promise<Array<number | null>> {
  const dates = lastNWibDates(7);

  const rows = await db
    .select({ tanggal: fluidLog.tanggal, volume: fluidLog.volume })
    .from(fluidLog)
    .where(
      and(
        eq(fluidLog.userId, userId as any),
        eq(fluidLog.tipe, "masuk"),
        gte(fluidLog.tanggal, dates[0]),
        lte(fluidLog.tanggal, dates[dates.length - 1]),
      ),
    );

  const sumByDate = new Map<string, number>();
  for (const row of rows) {
    sumByDate.set(row.tanggal, (sumByDate.get(row.tanggal) ?? 0) + Number(row.volume));
  }

  return dates.map((dt) => (sumByDate.has(dt) ? sumByDate.get(dt)! : null));
}

// Worst-first priority so the anomaly rule engine's ruleData reflects the most
// severe condition logged today, if the patient logged more than one "keluar" entry.
const ABNORMAL_KONDISI_PRIORITY = ["berdarah", "keruh_gumpalan", "keruh"] as const;

/**
 * Fetch the worst abnormal CAPD effluent condition ("keruh" | "keruh_gumpalan" |
 * "berdarah") logged today for a user, or `null` if today's "keluar" entries are
 * all "jernih" (clear) or there are none — feeds anomalyRule.service.ts's
 * `checkCapdEffluentAnomaly` (no history requirement, D-04).
 */
export async function getTodayAbnormalKondisiKeluar(
  userId: string,
): Promise<string | null> {
  const today = wibDateStr();
  const rows = await db
    .select({ kondisiKeluar: fluidLog.kondisiKeluar })
    .from(fluidLog)
    .where(
      and(
        eq(fluidLog.userId, userId as any),
        eq(fluidLog.tipe, "keluar"),
        eq(fluidLog.tanggal, today),
      ),
    );

  for (const priority of ABNORMAL_KONDISI_PRIORITY) {
    if (rows.some((r) => r.kondisiKeluar === priority)) return priority;
  }
  return null;
}

const ABNORMAL_CONDITIONS_REPO = new Set(["keruh", "keruh_gumpalan", "berdarah"]);

/**
 * Compute the daily fluid balance for a user on a given date.
 * Returns masuk (total intake), keluar (total output), delta (masuk - keluar),
 * unit, and hasAbnormalCondition (true if any effluent entry today is keruh/berdarah).
 *
 * Server-computed — never delegated to the client (T-02-04-04, dual-truth prevention).
 */
export async function getDailyBalance(
  userId: string,
  date: string,
): Promise<{ masuk: number; keluar: number; delta: number; unit: string; hasAbnormalCondition: boolean }> {
  const rows = await db
    .select({ tipe: fluidLog.tipe, volume: fluidLog.volume, kondisiKeluar: fluidLog.kondisiKeluar })
    .from(fluidLog)
    .where(and(eq(fluidLog.userId, userId as any), eq(fluidLog.tanggal, date)));

  const masuk = rows
    .filter((r) => r.tipe === "masuk")
    .reduce((sum, r) => sum + Number(r.volume), 0);

  const keluar = rows
    .filter((r) => r.tipe === "keluar")
    .reduce((sum, r) => sum + Number(r.volume), 0);

  const hasAbnormalCondition = rows.some(
    (r) => r.kondisiKeluar && ABNORMAL_CONDITIONS_REPO.has(r.kondisiKeluar),
  );

  return { masuk, keluar, delta: masuk - keluar, unit: "ml", hasAbnormalCondition };
}

/**
 * Update a fluid log entry's editable fields (IDOR-safe).
 * Returns undefined if no row was found (wrong userId or id).
 */
export async function updateById(
  userId: string,
  id: string,
  data: Partial<{
    volume: string | null;
    sumber: string | null;
    konsentrasiCapd: string | null;
    kondisiKeluar: string | null;
    catatan: string | null;
  }>,
): Promise<FluidLog | undefined> {
  const [row] = await db
    .update(fluidLog)
    .set(data as any)
    .where(and(eq(fluidLog.userId, userId as any), eq(fluidLog.id, id as any)))
    .returning();
  return row;
}

/**
 * Delete a fluid log entry (IDOR-safe — filters by userId).
 * Returns true if a row was deleted, false if not found.
 */
export async function deleteById(userId: string, id: string): Promise<boolean> {
  const result = await db
    .delete(fluidLog)
    .where(and(eq(fluidLog.userId, userId as any), eq(fluidLog.id, id as any)))
    .returning({ id: fluidLog.id });
  return result.length > 0;
}
