/**
 * aiLifestyleSuggestion.repository.ts — ai_lifestyle_suggestions cache CRUD
 * + tracking-days gate helper (AI-04, D-16/A2)
 *
 * IDOR-safe (T-05-11): every function takes `userId` as an explicit
 * argument and every query filters `WHERE user_id = ...`. One row per
 * (userId, tanggal) via the schema's unique constraint (Assumption A2) —
 * upsertSuggestion overwrites on conflict.
 *
 * Pattern: mirrors aiDailySummary.repository.ts's onConflictDoUpdate upsert
 * shape, keyed by (userId, tanggal) same as the daily-summary cache.
 */
import { and, eq, gte } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { db } from "../lib/db.js";
import { aiLifestyleSuggestions } from "../db/schema/aiLifestyleSuggestion.schema.js";
import { fluidLog } from "../db/schema/fluidLog.schema.js";

export type AiLifestyleSuggestion = InferSelectModel<typeof aiLifestyleSuggestions>;

/**
 * Fetch the cached suggestion row for a user+date, IDOR-scoped to userId.
 */
export async function findByUserAndDate(
  userId: string,
  tanggal: string,
): Promise<AiLifestyleSuggestion | undefined> {
  const [row] = await db
    .select()
    .from(aiLifestyleSuggestions)
    .where(
      and(
        eq(aiLifestyleSuggestions.userId, userId as any),
        eq(aiLifestyleSuggestions.tanggal, tanggal),
      ),
    )
    .limit(1);
  return row;
}

/**
 * Insert-or-overwrite the cached suggestion for a user+date (unique
 * constraint on userId+tanggal) — idempotent, safe for repeated
 * lazy-generate-on-view calls (D-16).
 */
export async function upsertSuggestion(
  userId: string,
  tanggal: string,
  saranText: string,
  isFallback: boolean,
): Promise<AiLifestyleSuggestion> {
  const [row] = await db
    .insert(aiLifestyleSuggestions)
    .values({ userId, tanggal, saranText, isFallback } as any)
    .onConflictDoUpdate({
      target: [aiLifestyleSuggestions.userId, aiLifestyleSuggestions.tanggal],
      set: { saranText, isFallback },
    })
    .returning();
  return row;
}

/**
 * Count distinct calendar days (WIB `tanggal` string) on or after
 * `sinceDate` on which the user has logged at least one fluid entry —
 * the AI-04 gate signal (Assumption A3: follows the approved UI-SPEC's
 * simpler "≥3 days tracking data" gate, not PRD FR-SYS-006's stricter
 * "+ ≥1 hasil lab" wording — flagged in the plan SUMMARY).
 *
 * Fluid tracking is used as the tracking-activity signal because it's this
 * app's universal daily touchpoint across CAPD/HD/transplant patients
 * (every patient logs fluid intake/output, not every patient has medication
 * or dialysis-log rows), matching the "daysWithFluidData" concept already
 * established in aiInsight.service.ts's weekly-insight gathering.
 */
export async function countDistinctTrackingDays(
  userId: string,
  sinceDate: string,
): Promise<number> {
  const rows = await db
    .selectDistinct({ tanggal: fluidLog.tanggal })
    .from(fluidLog)
    .where(and(eq(fluidLog.userId, userId as any), gte(fluidLog.tanggal, sinceDate)));
  return rows.length;
}
