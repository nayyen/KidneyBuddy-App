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

/** YYYY-MM-DD cutoff string `days` ago from today (UTC-based, matches the
 * existing findTrendData cutoff computation — item 10). */
function daysAgoCutoffStr(days: number): string {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  return cutoffDate.toISOString().slice(0, 10);
}

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
    /** item 10: results-list range filter, days lookback (0/undefined = all data) */
    days?: number;
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
  if (options?.days) {
    conditions.push(gte(labResults.tanggalPemeriksaan, daysAgoCutoffStr(options.days)));
  }

  return db
    .select()
    .from(labResults)
    .where(and(...conditions))
    .orderBy(desc(labResults.tanggalPemeriksaan));
}

/**
 * Find distinct parameter names that a user has logged — for the trend-chart
 * parameter dropdown. Restricted to sumber='manual' rows ONLY (quick-260705-9n4
 * task 9, C3 bugfix): uploaded-file rows (sumber='upload') store the
 * uploaded document's filename/display-name in namaParameter as a
 * placeholder (see labResult.service.ts#createUploadEntry — nilai is
 * literally the string "(file)", not a real trend-plottable value), so
 * without this filter every uploaded PDF/photo's filename was polluting the
 * parameter dropdown as if it were a selectable lab parameter.
 */
export async function findDistinctParameters(userId: string): Promise<string[]> {
  const rows = await db
    .select({ name: labResults.namaParameter })
    .from(labResults)
    .where(
      and(
        eq(labResults.userId, userId as any),
        eq(labResults.diarsipkan, false),
        eq(labResults.sumber, "manual"),
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
 * Update a non-archived lab result's editable fields (IDOR-safe).
 */
export async function updateById(
  userId: string,
  id: string,
  data: Partial<{
    tanggalPemeriksaan: string;
    kategori: string | null;
    namaParameter: string;
    nilai: string;
    satuan: string | null;
    nilaiRujukan: string | null;
    catatan: string | null;
  }>,
): Promise<LabResult | null> {
  const [row] = await db
    .update(labResults)
    .set(data)
    .where(
      and(eq(labResults.userId, userId as any), eq(labResults.id, id as any), eq(labResults.diarsipkan, false)),
    )
    .returning();
  return row ?? null;
}

/**
 * Item 11: update a file-upload (sumber='upload') lab result's replaceable
 * fields — display name, tanggal, and the fileId of the newly-uploaded
 * document. Restricted to sumber='upload' rows (IDOR-safe: userId+id, plus
 * the sumber guard prevents accidentally repurposing a manual entry).
 * Deleting the OLD file from disk is the caller's (service layer)
 * responsibility, since it needs the pre-update row's fileId first.
 */
export async function updateUploadEntry(
  userId: string,
  id: string,
  data: { tanggalPemeriksaan: string; namaParameter: string; fileId: string },
): Promise<LabResult | null> {
  const [row] = await db
    .update(labResults)
    .set(data as any)
    .where(
      and(
        eq(labResults.userId, userId as any),
        eq(labResults.id, id as any),
        eq(labResults.diarsipkan, false),
        eq(labResults.sumber, "upload"),
      ),
    )
    .returning();
  return row ?? null;
}

/**
 * Find lab results for trend chart — ordered by date ascending within a
 * lookback window. Only returns non-archived manual entries (not file
 * upload placeholders).
 *
 * Item 10: `days` is now optional — omitted/undefined means ALL data (no
 * lower-bound cutoff), matching the trend chart's new "Semua data" default.
 */
export async function findTrendData(
  userId: string,
  parameter: string,
  days?: number,
): Promise<LabResult[]> {
  const conditions = [
    eq(labResults.userId, userId as any),
    eq(labResults.namaParameter, parameter),
    eq(labResults.diarsipkan, false),
    eq(labResults.sumber, "manual"),
  ];

  if (days) {
    conditions.push(gte(labResults.tanggalPemeriksaan, daysAgoCutoffStr(days)));
  }

  return db
    .select()
    .from(labResults)
    .where(and(...conditions))
    .orderBy(asc(labResults.tanggalPemeriksaan));
}
