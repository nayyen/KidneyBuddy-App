/**
 * aiWeeklyInsight.repository.ts — ai_weekly_insights cache CRUD (AI-02, D-16)
 *
 * IDOR-safe (T-05-11): every function takes `userId` as an explicit argument
 * and every query filters `WHERE user_id = ...`. One row per (userId, pekan)
 * via the schema's unique constraint — upsertInsight overwrites on conflict.
 *
 * Pattern: mirrors aiDailySummary.repository.ts (same shape, keyed by ISO
 * week instead of calendar date).
 */
import { and, eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { db } from "../lib/db.js";
import { aiWeeklyInsights } from "../db/schema/aiWeeklyInsight.schema.js";

export type AiWeeklyInsight = InferSelectModel<typeof aiWeeklyInsights>;

/**
 * Fetch the cached insight row for a user+ISO-week, IDOR-scoped to userId.
 */
export async function findByUserAndWeek(
  userId: string,
  pekan: string,
): Promise<AiWeeklyInsight | undefined> {
  const [row] = await db
    .select()
    .from(aiWeeklyInsights)
    .where(and(eq(aiWeeklyInsights.userId, userId as any), eq(aiWeeklyInsights.pekan, pekan)))
    .limit(1);
  return row;
}

/**
 * Insert-or-overwrite the cached insight for a user+ISO-week (unique
 * constraint on userId+pekan) — idempotent, safe for both the Sunday 19:00
 * batch's boot catch-up (Pitfall 2) and any future manual regenerate.
 */
export async function upsertInsight(
  userId: string,
  pekan: string,
  wawasanText: string,
  isFallback: boolean,
): Promise<AiWeeklyInsight> {
  const [row] = await db
    .insert(aiWeeklyInsights)
    .values({ userId, pekan, wawasanText, isFallback } as any)
    .onConflictDoUpdate({
      target: [aiWeeklyInsights.userId, aiWeeklyInsights.pekan],
      set: { wawasanText, isFallback },
    })
    .returning();
  return row;
}
