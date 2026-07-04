/**
 * educationContent.service.ts — Education content browsing business logic (EDU-01)
 *
 * - listContent: validates optional metodeTerapi/tipeKonten filters against a
 *   fixed Zod enum before they reach the SQL WHERE clause (T-06-04), then
 *   delegates to the repository for server-side filtering.
 * - getContentDetail: fetches a single article's full body, or null.
 *
 * Content is public/shared reference material, not sensitive health data —
 * no encryption import here (RESEARCH Pitfall 1 / 06-01 key-decisions).
 *
 * Test seam: both functions accept an optional trailing `deps` object that
 * defaults to the real repository, matching the 06-01 RED scaffold's fixed
 * deps-injection contract: listContent(options, { findAll }).
 */
import { z } from "zod";
import pino from "pino";
import * as educationContentRepository from "../repositories/educationContent.repository.js";
import type { EducationContent } from "../repositories/educationContent.repository.js";

const logger = pino({ name: "educationContent.service" });

// ─── Zod validation schema ────────────────────────────────────────────────────

export const listQuerySchema = z.object({
  metodeTerapi: z.enum(["CAPD", "HD", "Transplantasi", "Umum"]).optional(),
  tipeKonten: z.enum(["artikel", "panduan_senam", "gaya_hidup"]).optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

// ─── Injectable deps ───────────────────────────────────────────────────────────
//
// Loosely typed (matches labResult.service.ts's InsertFn convention) so that
// test doubles returning a minimal row shape (a subset of EducationContent's
// columns, e.g. the 06-01 RED scaffold's in-memory store) still type-check
// against the real repository's stricter signature.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FindAllFn = (options?: {
  metodeTerapi?: string;
  tipeKonten?: string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}) => Promise<any[]>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FindByIdFn = (id: string) => Promise<any | null>;

export interface ListContentDeps {
  findAll: FindAllFn;
}

export interface GetContentDetailDeps {
  findById: FindByIdFn;
}

// ─── Production functions ──────────────────────────────────────────────────────

/**
 * List education content, optionally filtered by metodeTerapi/tipeKonten.
 * Filters are validated against a fixed enum before hitting the repository.
 */
export async function listContent(
  options?: { metodeTerapi?: string; tipeKonten?: string },
  deps: ListContentDeps = { findAll: educationContentRepository.findAll },
): Promise<EducationContent[]> {
  const parsed: ListQuery = options ? listQuerySchema.parse(options) : {};

  logger.info({ filters: parsed }, "listing education content");

  return deps.findAll(parsed);
}

/**
 * Get a single education content article's full body, or null if not found.
 */
export async function getContentDetail(
  id: string,
  deps: GetContentDetailDeps = { findById: educationContentRepository.findById },
): Promise<EducationContent | null> {
  return deps.findById(id);
}
