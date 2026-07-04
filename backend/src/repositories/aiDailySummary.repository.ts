/**
 * aiDailySummary.repository.ts — ai_daily_summaries cache CRUD (AI-01, D-16)
 *
 * IDOR-safe (T-05-11): every function takes `userId` as an explicit argument
 * and every query filters `WHERE user_id = ...`. One row per (userId, tanggal)
 * via the schema's unique constraint — upsertSummary overwrites on conflict so
 * a forced regenerate (manual trigger, D-10) never grows duplicate rows.
 *
 * Pattern: follows anomalyAlert.repository.ts's IDOR-safe shape and
 * pushSubscription.repository.ts's onConflictDoUpdate upsert shape.
 */
import { and, eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { db } from "../lib/db.js";
import { aiDailySummaries } from "../db/schema/aiDailySummary.schema.js";

export type AiDailySummary = InferSelectModel<typeof aiDailySummaries>;

/**
 * Fetch the cached summary row for a user+date, IDOR-scoped to userId.
 */
export async function findByUserAndDate(
  userId: string,
  tanggal: string,
): Promise<AiDailySummary | undefined> {
  const [row] = await db
    .select()
    .from(aiDailySummaries)
    .where(and(eq(aiDailySummaries.userId, userId as any), eq(aiDailySummaries.tanggal, tanggal)))
    .limit(1);
  return row;
}

/**
 * Insert-or-overwrite the cached summary for a user+date (unique constraint
 * on userId+tanggal) — idempotent, safe for both the 20:00 batch's boot
 * catch-up (Pitfall 2) and a manual force-regenerate (D-10).
 */
export async function upsertSummary(
  userId: string,
  tanggal: string,
  ringkasanText: string,
  isFallback: boolean,
): Promise<AiDailySummary> {
  const [row] = await db
    .insert(aiDailySummaries)
    .values({ userId, tanggal, ringkasanText, isFallback } as any)
    .onConflictDoUpdate({
      target: [aiDailySummaries.userId, aiDailySummaries.tanggal],
      set: { ringkasanText, isFallback },
    })
    .returning();
  return row;
}
