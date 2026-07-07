import { eq, and, gte, lt, lte, desc } from "drizzle-orm";
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
 *
 * `bounds` lets a caller supply the requesting USER's own local-timezone day
 * bounds (quick-260705-9n4 task 2, via wib.ts#localDayBounds) instead of the
 * hardcoded WIB default — defaults to wibDayBounds() to preserve existing
 * behavior for any caller that doesn't yet pass the user's timezone.
 */
export async function findTodayByUser(
  userId: string,
  bounds?: { start: Date; end: Date },
): Promise<MedicationLog[]> {
  // WIB-correct day bounds (UTC+7) — a 01:00 WIB entry stored as 18:00 UTC
  // on the previous UTC day still matches the patient's local "today".
  const { start, end } = bounds ?? wibDayBounds();

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
 *
 * `bounds`, when supplied, scopes the lookup to the caller's local day
 * (`gte`/`lte` on `waktuPengingat`) — this fixes a bug where confirming
 * today's reminder could touch an arbitrary OLD row from a previous
 * day/month. Left OPTIONAL and unbounded by default so existing callers
 * (and in-memory test fakes) keep working unchanged. Results are ordered
 * newest-first for determinism instead of an arbitrary row.
 */
export async function findByReminderAndUser(
  reminderId: string,
  userId: string,
  bounds?: { start: Date; end: Date },
): Promise<MedicationLog | undefined> {
  const conditions = [
    eq(medicationLog.reminderId, reminderId as any),
    eq(medicationLog.userId, userId as any),
  ];

  if (bounds) {
    conditions.push(gte(medicationLog.waktuPengingat, bounds.start as any));
    conditions.push(lte(medicationLog.waktuPengingat, bounds.end as any));
  }

  const [row] = await db
    .select()
    .from(medicationLog)
    .where(and(...conditions))
    .orderBy(desc(medicationLog.waktuPengingat))
    .limit(1);
  return row;
}

/**
 * Count today's missed medication schedules for a user (ANOMALY-01 input).
 *
 * "Missed" is computed ad-hoc (Pitfall 1 — `status: 'terlewat'` is never
 * written outside seed data): a row still `tertunda` whose `waktuPengingat`
 * has already fully passed within today's WIB day counts as missed. This
 * intentionally does NOT rely on a `terlewat` status transition existing.
 */
export async function findMissedToday(userId: string): Promise<number> {
  const { start } = wibDayBounds();
  const now = new Date();

  const rows = await db
    .select({ id: medicationLog.id })
    .from(medicationLog)
    .where(
      and(
        eq(medicationLog.userId, userId as any),
        eq(medicationLog.status, "tertunda"),
        gte(medicationLog.waktuPengingat, start as any),
        lte(medicationLog.waktuPengingat, now as any),
      ),
    );

  return rows.length;
}

// ─── Mutations ────────────────────────────────────────────────────────

export async function markConfirmed(id: string): Promise<void> {
  await db
    .update(medicationLog)
    .set({ status: "dikonfirmasi", waktuKonfirmasi: new Date() })
    .where(eq(medicationLog.id, id as any));
}

export async function markConfirmedById(logId: string, userId: string): Promise<void> {
  await db
    .update(medicationLog)
    .set({ status: "dikonfirmasi", waktuKonfirmasi: new Date() })
    .where(
      and(
        eq(medicationLog.id, logId as any),
        eq(medicationLog.userId, userId as any)
      )
    );
}

export async function markUnconfirmedById(logId: string, userId: string): Promise<void> {
  await db
    .update(medicationLog)
    .set({ status: "tertunda", waktuKonfirmasi: null })
    .where(
      and(
        eq(medicationLog.id, logId as any),
        eq(medicationLog.userId, userId as any)
      )
    );
}
