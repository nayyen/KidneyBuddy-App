import { eq, and, gte, lte, lt } from "drizzle-orm";
import { db } from "../lib/db.js";
import { dialysisLog } from "../db/schema/dialysisLog.schema.js";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { wibDayBounds } from "../utils/wib.js";

export type DialysisLog = InferSelectModel<typeof dialysisLog>;
export type NewDialysisLog = InferInsertModel<typeof dialysisLog>;

// ─── Insert ────────────────────────────────────────────────────────────

export async function insert(data: NewDialysisLog): Promise<DialysisLog> {
  const [row] = await db.insert(dialysisLog).values(data).returning();
  return row;
}

// ─── Query ────────────────────────────────────────────────────────────

/**
 * Find today's dialysis log entries for a user (WIB-correct day bounds).
 */
export async function findTodayByUser(userId: string): Promise<DialysisLog[]> {
  const { start, end } = wibDayBounds();
  return db
    .select()
    .from(dialysisLog)
    .where(
      and(
        eq(dialysisLog.userId, userId as any),
        gte(dialysisLog.waktuPengingat, start as any),
        lte(dialysisLog.waktuPengingat, end as any),
      ),
    );
}

/**
 * Find a dialysis log row for a specific reminder + user combination.
 */
export async function findByReminderAndUser(
  reminderId: string,
  userId: string,
): Promise<DialysisLog | undefined> {
  const [row] = await db
    .select()
    .from(dialysisLog)
    .where(
      and(
        eq(dialysisLog.reminderId, reminderId as any),
        eq(dialysisLog.userId, userId as any),
      ),
    )
    .limit(1);
  return row;
}

/**
 * Find unconfirmed dialysis entries older than `minutes` minutes.
 */
export async function findUnconfirmedOlderThan(
  minutes: number,
): Promise<DialysisLog[]> {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  return db
    .select()
    .from(dialysisLog)
    .where(
      and(
        eq(dialysisLog.status, "tertunda"),
        lt(dialysisLog.waktuPengingat, cutoff),
      ),
    );
}

// ─── Mutations ────────────────────────────────────────────────────────

export async function markConfirmed(id: string): Promise<void> {
  await db
    .update(dialysisLog)
    .set({ status: "dikonfirmasi", waktuKonfirmasi: new Date() })
    .where(eq(dialysisLog.id, id as any));
}

export async function markConfirmedById(logId: string, userId: string): Promise<void> {
  await db
    .update(dialysisLog)
    .set({ status: "dikonfirmasi", waktuKonfirmasi: new Date() })
    .where(
      and(
        eq(dialysisLog.id, logId as any),
        eq(dialysisLog.userId, userId as any),
      ),
    );
}

export async function markUnconfirmedById(logId: string, userId: string): Promise<void> {
  await db
    .update(dialysisLog)
    .set({ status: "tertunda", waktuKonfirmasi: null })
    .where(
      and(
        eq(dialysisLog.id, logId as any),
        eq(dialysisLog.userId, userId as any),
      ),
    );
}

export async function markMissed(id: string): Promise<void> {
  await db
    .update(dialysisLog)
    .set({ status: "terlewat" })
    .where(eq(dialysisLog.id, id as any));
}
