/**
 * aiLabAnalysis.repository.ts — ai_lab_analyses cache CRUD (AI-03, D-16)
 *
 * One cached row per lab_results row (unique on lab_result_id). The
 * ai_lab_analyses table itself has no user_id column (it's keyed purely by
 * lab_result_id per the 05-01 schema) — IDOR safety (T-05-14) is enforced
 * here via an inner join against lab_results.user_id, so a bare labResultId
 * can never read another user's analysis.
 *
 * Pattern: mirrors aiDailySummary.repository.ts's onConflictDoUpdate upsert
 * shape, keyed by lab_result_id instead of (userId, tanggal).
 */
import { and, eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { db } from "../lib/db.js";
import { aiLabAnalyses } from "../db/schema/aiLabAnalysis.schema.js";
import { labResults } from "../db/schema/labResult.schema.js";

export type AiLabAnalysis = InferSelectModel<typeof aiLabAnalyses>;

/**
 * Fetch the cached analysis row for a lab result, IDOR-scoped via an inner
 * join against lab_results.user_id (T-05-14) even though ai_lab_analyses
 * itself is keyed only by lab_result_id.
 */
export async function findByLabResultId(
  userId: string,
  labResultId: string,
): Promise<AiLabAnalysis | undefined> {
  const [row] = await db
    .select({
      id: aiLabAnalyses.id,
      labResultId: aiLabAnalyses.labResultId,
      analisisText: aiLabAnalyses.analisisText,
      isFallback: aiLabAnalyses.isFallback,
      createdAt: aiLabAnalyses.createdAt,
    })
    .from(aiLabAnalyses)
    .innerJoin(labResults, eq(labResults.id, aiLabAnalyses.labResultId))
    .where(
      and(
        eq(labResults.userId, userId as any),
        eq(aiLabAnalyses.labResultId, labResultId as any),
      ),
    )
    .limit(1);
  return row;
}

/**
 * Insert-or-overwrite the cached analysis for a lab_result_id (unique
 * constraint) — idempotent, safe for repeated fire-and-forget triggers.
 * Callers must have already verified labResultId ownership (see
 * aiLabAnalysis.service.ts's generateAndCacheLabAnalysis, which looks the
 * lab result up via the IDOR-safe labResult.repository.ts::findById first).
 */
export async function upsertAnalysis(
  labResultId: string,
  analisisText: string,
  isFallback: boolean,
): Promise<AiLabAnalysis> {
  const [row] = await db
    .insert(aiLabAnalyses)
    .values({ labResultId, analisisText, isFallback } as any)
    .onConflictDoUpdate({
      target: [aiLabAnalyses.labResultId],
      set: { analisisText, isFallback },
    })
    .returning();
  return row;
}
