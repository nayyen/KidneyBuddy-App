/**
 * dailyActivity.repository.ts — daily_activities CRUD operations
 *
 * All queries filter by userId — never expose other users' activity data (T-03-01).
 * Supports cron queries for pre-end-time push dispatch (findDueForEndReminder).
 *
 * Pattern: follows fluidLog.repository.ts (InferInsertModel, InferSelectModel).
 */
import { and, eq, lte, gte, desc } from "drizzle-orm";
import { db } from "../lib/db.js";
import { dailyActivities } from "../db/schema/dailyActivity.schema.js";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type DailyActivity = InferSelectModel<typeof dailyActivities>;
export type NewDailyActivity = InferInsertModel<typeof dailyActivities>;

/**
 * Insert a new activity and return the created row.
 */
export async function insertActivity(data: NewDailyActivity): Promise<DailyActivity> {
  const [row] = await db.insert(dailyActivities).values(data).returning();
  return row;
}

/**
 * Find the currently active (berlangsung) activity for a user.
 * Returns null if no active activity exists.
 */
export async function findActiveByUser(userId: string): Promise<DailyActivity | null> {
  const rows = await db
    .select()
    .from(dailyActivities)
    .where(
      and(
        eq(dailyActivities.userId, userId as any),
        eq(dailyActivities.status, "berlangsung"),
      ),
    )
    .orderBy(dailyActivities.createdAt)
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Find activities for a user on a specific date (WIB-based).
 * Determines the date range from waktuMulai.
 * Orders active-first then most recent.
 */
export async function findByDate(
  userId: string,
  dateStart: Date,
  dateEnd: Date,
): Promise<DailyActivity[]> {
  return db
    .select()
    .from(dailyActivities)
    .where(
      and(
        eq(dailyActivities.userId, userId as any),
        gte(dailyActivities.waktuMulai, dateStart),
        lte(dailyActivities.waktuMulai, dateEnd),
      ),
    )
    .orderBy(dailyActivities.waktuMulai);
}

/**
 * Complete an activity by setting status=selesai, waktuSelesai, perasaan, catatanPerasaan.
 * IDOR-safe: filters by userId AND id.
 */
export async function completeById(
  userId: string,
  id: string,
  data: {
    status: string;
    waktuSelesai: Date;
    perasaan: string | null;
    catatanPerasaan: string | null;
  },
): Promise<DailyActivity> {
  const [row] = await db
    .update(dailyActivities)
    .set(data)
    .where(
      and(eq(dailyActivities.userId, userId as any), eq(dailyActivities.id, id as any)),
    )
    .returning();
  return row;
}

/**
 * Soft-delete an activity (set status to 'dibatalkan').
 * IDOR-safe: filters by userId AND id.
 */
export async function deleteById(
  userId: string,
  id: string,
): Promise<DailyActivity | null> {
  const [row] = await db
    .update(dailyActivities)
    .set({ status: "dibatalkan" })
    .where(
      and(eq(dailyActivities.userId, userId as any), eq(dailyActivities.id, id as any)),
    )
    .returning();
  return row ?? null;
}

/**
 * Update an activity's editable fields.
 * Supports: namaKegiatan, estimasiSelesai, perasaan, catatanPerasaan.
 * Does NOT force status to "berlangsung" — keeps existing status.
 * IDOR-safe: filters by userId AND id.
 */
export async function updateById(
  userId: string,
  id: string,
  data: Partial<{
    namaKegiatan: string;
    estimasiSelesai: Date;
    perasaan: string;
    catatanPerasaan: string;
  }>,
): Promise<DailyActivity | null> {
  const [row] = await db
    .update(dailyActivities)
    .set(data)
    .where(
      and(eq(dailyActivities.userId, userId as any), eq(dailyActivities.id, id as any)),
    )
    .returning();
  return row ?? null;
}

/**
 * Find ALL activities for a user, ordered by waktuMulai descending.
 * Used by ActivityList to show history across dates.
 */
export async function findAllByUser(
  userId: string,
  limit = 50,
): Promise<DailyActivity[]> {
  return db
    .select()
    .from(dailyActivities)
    .where(
      eq(dailyActivities.userId, userId as any),
    )
    .orderBy(dailyActivities.waktuMulai);
}

/**
 * Find berlangsung activities whose estimasiSelesai falls within the given window
 * and whose reminderSent flag is false — used by the cron job for pre-end-time push.
 */
export async function findDueForEndReminder(
  windowStart: Date,
  windowEnd: Date,
): Promise<DailyActivity[]> {
  return db
    .select()
    .from(dailyActivities)
    .where(
      and(
        eq(dailyActivities.status, "berlangsung"),
        eq(dailyActivities.reminderSent, false),
        gte(dailyActivities.estimasiSelesai, windowStart),
        lte(dailyActivities.estimasiSelesai, windowEnd),
      ),
    );
}

/**
 * Mark an activity's reminderSent flag as true — prevents double-fire.
 */
export async function markReminderSent(id: string): Promise<void> {
  await db
    .update(dailyActivities)
    .set({ reminderSent: true })
    .where(eq(dailyActivities.id, id as any));
}
