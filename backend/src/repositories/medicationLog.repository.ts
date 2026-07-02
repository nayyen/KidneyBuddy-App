import { eq, and, gte, lt, lte } from "drizzle-orm";
import { db } from "../lib/db.js";
import { medicationLog } from "../db/schema/medicationLog.schema.js";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { wibDayBounds } from "../utils/wib.js";

export type MedicationLog = InferSelectModel<typeof medicationLog>;
export type NewMedicationLog = InferInsertModel<typeof medicationLog>;

// ─── Insert ────────────────────────────────────────────────────────────

export async function insert(data: NewMedicationLog): Promise<MedicationLog> {
  const [row] = await db.insert(medicationLog).values(data).returning();
  return row;
}

// ─── Query ────────────────────────────────────────────────────────────

/**
 * Find today's medication log entries for a user.
 * "Today" = from 00:00:00 to 23:59:59 of the current calendar date (server time).
 */
export async function findTodayByUser(userId: string): Promise<MedicationLog[]> {
  // WIB-correct day bounds (UTC+7) — a 01:00 WIB entry stored as 18:00 UTC
  // on the previous UTC day still matches the patient's local "today".
  const { start, end } = wibDayBounds();

  return db
    .select()
    .from(medicationLog)
    .where(
      and(
        eq(medicationLog.userId, userId as any),
        gte(medicationLog.waktuPengingat, start as any),
        lte(medicationLog.waktuPengingat, end as any),
      ),
    );
}

/**
 * Find unconfirmed (tertunda) log entries older than `minutes` minutes.
 * Used by the follow-up reminder cron (REMIND-04) in plan 02-06.
 */
export async function findUnconfirmedOlderThan(minutes: number): Promise<MedicationLog[]> {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  return db
    .select()
    .from(medicationLog)
    .where(
      and(
        eq(medicationLog.status, "tertunda"),
        lt(medicationLog.waktuPengingat, cutoff),
      ),
    );
}

/**
 * Find a medication log row for a specific reminder + user combination.
 * Used by the confirm flow to check if a row already exists.
 */
export async function findByReminderAndUser(
  reminderId: string,
  userId: string,
): Promise<MedicationLog | undefined> {
  const [row] = await db
    .select()
    .from(medicationLog)
    .where(
      and(
        eq(medicationLog.reminderId, reminderId as any),
        eq(medicationLog.userId, userId as any),
      ),
    )
    .limit(1);
  return row;
}

// ─── Mutations ────────────────────────────────────────────────────────

export async function markConfirmed(id: string): Promise<void> {
  await db
    .update(medicationLog)
    .set({ status: "dikonfirmasi", waktuKonfirmasi: new Date() })
    .where(eq(medicationLog.id, id as any));
}

export async function markMissed(id: string): Promise<void> {
  await db
    .update(medicationLog)
    .set({ status: "terlewat" })
    .where(eq(medicationLog.id, id as any));
}
