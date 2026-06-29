/**
 * labResult.repository.ts — lab_results CRUD operations
 *
 * All queries filter by userId — never expose other users' lab data (T-04-01).
 * Uses soft-delete (diarsipkan = true) — rows are never hard-deleted (LAB-04).
 *
 * Pattern: follows fluidLog.repository.ts and dailyActivity.repository.ts.
 */
import { and, eq, desc, asc, gte } from "drizzle-orm";
import { db } from "../lib/db.js";
import { labResults } from "../db/schema/labResult.schema.js";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type LabResult = InferSelectModel<typeof labResults>;
export type NewLabResult = InferInsertModel<typeof labResults>;

/**
 * Insert a lab result row and return the created row.
 */
export async function insertLabResult(data: NewLabResult): Promise<LabResult> {
  const [row] = await db.insert(labResults).values(data).returning();
  return row;
}

/**
 * Find lab results for a user, optionally filtered by date and parameter.
 * Excludes archived results unless explicitly requested.
 */
export async function findByUser(
  userId: string,
  options?: {
    tanggal?: string;
    parameter?: string;
    includeArchived?: boolean;
  },
): Promise<LabResult[]> {
  const conditions = [eq(labResults.userId, userId as any)];

  if (!options?.includeArchived) {
    conditions.push(eq(labResults.diarsipkan, false));
  }
  if (options?.tanggal) {
    conditions.push(eq(labResults.tanggalPemeriksaan, options.tanggal));
  }
  if (options?.parameter) {
    conditions.push(eq(labResults.namaParameter, options.parameter));
  }

  return db
    .select()
    .from(labResults)
    .where(and(...conditions))
    .orderBy(desc(labResults.tanggalPemeriksaan));
}

/**
 * Find distinct parameter names that a user has logged.
 */
export async function findDistinctParameters(userId: string): Promise<string[]> {
  const rows = await db
    .select({ name: labResults.namaParameter })
    .from(labResults)
    .where(
      and(
        eq(labResults.userId, userId as any),
        eq(labResults.diarsipkan, false),
      ),
    )
    .groupBy(labResults.namaParameter)
    .orderBy(labResults.namaParameter);

  return rows.map((r) => r.name);
}

/**
 * Soft-delete a lab result (set diarsipkan = true).
 * IDOR-safe: filters by userId AND id.
 */
export async function archiveById(
  userId: string,
  id: string,
): Promise<LabResult | null> {
  const [row] = await db
    .update(labResults)
    .set({ diarsipkan: true })
    .where(
      and(eq(labResults.userId, userId as any), eq(labResults.id, id as any)),
    )
    .returning();
  return row ?? null;
}

/**
 * Find a single lab result by userId and id (IDOR-safe).
 */
export async function findById(
  userId: string,
  id: string,
): Promise<LabResult | null> {
  const [row] = await db
    .select()
    .from(labResults)
    .where(
      and(eq(labResults.userId, userId as any), eq(labResults.id, id as any)),
    )
    .limit(1);
  return row ?? null;
}

  /**
   * Restore an archived lab result (set diarsipkan = false).
   */
  export async function restoreById(
    userId: string,
    id: string,
  ): Promise<LabResult | null> {
    const [row] = await db
      .update(labResults)
      .set({ diarsipkan: false })
      .where(
        and(eq(labResults.userId, userId as any), eq(labResults.id, id as any)),
      )
      .returning();
    return row ?? null;
  }

/**
 * Find lab results for trend chart — ordered by date ascending within a lookback window.
 * Only returns non-archived manual entries (not file upload placeholders).
 */
export async function findTrendData(
  userId: string,
  parameter: string,
  days: number,
): Promise<LabResult[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);

  return db
    .select()
    .from(labResults)
    .where(
      and(
        eq(labResults.userId, userId as any),
        eq(labResults.namaParameter, parameter),
        eq(labResults.diarsipkan, false),
        eq(labResults.sumber, "manual"),
        gte(labResults.tanggalPemeriksaan, cutoffStr),
      ),
    )
    .orderBy(asc(labResults.tanggalPemeriksaan));
}
