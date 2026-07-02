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
import { db } from "../lib/db.js";
import { fluidLog } from "../db/schema/fluidLog.schema.js";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

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
