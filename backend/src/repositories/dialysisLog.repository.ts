import { eq, and, gte, lte, lt, desc } from "drizzle-orm";
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
 * Find today's dialysis log entries for a user (WIB-correct day bounds by
 * default). `bounds` lets a caller supply the requesting user's own local-
 * timezone day bounds (quick-260705-9n4 task 2, via wib.ts#localDayBounds).
 */
export async function findTodayByUser(
  userId: string,
  bounds?: { start: Date; end: Date },
): Promise<DialysisLog[]> {
  const { start, end } = bounds ?? wibDayBounds();
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
): Promise<DialysisLog | undefined> {
  const conditions = [
    eq(dialysisLog.reminderId, reminderId as any),
    eq(dialysisLog.userId, userId as any),
  ];

  if (bounds) {
    conditions.push(gte(dialysisLog.waktuPengingat, bounds.start as any));
    conditions.push(lte(dialysisLog.waktuPengingat, bounds.end as any));
  }

  const [row] = await db
    .select()
    .from(dialysisLog)
    .where(and(...conditions))
    .orderBy(desc(dialysisLog.waktuPengingat))
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

/**
 * Count today's missed dialysis schedules for a user (ANOMALY-01 input).
 *
 * "Missed" is computed ad-hoc (Pitfall 1 — `status: 'terlewat'` is never
 * written outside seed data, and `markMissed` above is never called from any
 * job): a row still `tertunda` whose `waktuPengingat` has already fully
 * passed within today's WIB day counts as missed.
 */
export async function findMissedToday(userId: string): Promise<number> {
  const { start } = wibDayBounds();
  const now = new Date();

  const rows = await db
    .select({ id: dialysisLog.id })
    .from(dialysisLog)
    .where(
      and(
        eq(dialysisLog.userId, userId as any),
        eq(dialysisLog.status, "tertunda"),
        gte(dialysisLog.waktuPengingat, start as any),
        lte(dialysisLog.waktuPengingat, now as any),
      ),
    );

  return rows.length;
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
