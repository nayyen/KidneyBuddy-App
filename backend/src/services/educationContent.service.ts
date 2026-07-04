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

// IN-01: without a custom errorMap, an actual invalid-enum value (correct
// type, value not in the allowed set) falls back to Zod's untranslated
// default message ("Invalid enum value..."). Localize it to Bahasa
// Indonesia per CLAUDE.md's "Seluruh UI dan konten edukasi dalam Bahasa
// Indonesia awam" constraint — see communityPost.service.ts's enumErrorMap
// for the fuller rationale (kept local here since these filters are
// `.optional()` and have no "required" case to localize).
function invalidEnumErrorMap(message: string): z.ZodErrorMap {
  return (issue, ctx) => {
    if (
      issue.code === z.ZodIssueCode.invalid_enum_value ||
      issue.code === z.ZodIssueCode.invalid_type
    ) {
      return { message };
    }
    return { message: ctx.defaultError };
  };
}

export const listQuerySchema = z.object({
  metodeTerapi: z
    .enum(["CAPD", "HD", "Transplantasi", "Umum"], {
      errorMap: invalidEnumErrorMap("Metode terapi tidak valid"),
    })
    .optional(),
  tipeKonten: z
    .enum(["artikel", "panduan_senam", "gaya_hidup"], {
      errorMap: invalidEnumErrorMap("Tipe konten tidak valid"),
    })
    .optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

// WR-01: format-validate the :id route param as a UUID before it reaches a
// Drizzle `eq(uuidColumn, id)` clause — see communityPost.service.ts's
// isValidUuid for the full rationale (avoids a raw Postgres "invalid input
// syntax for type uuid" surfacing as a generic 500 instead of a 404).
const uuidParamSchema = z.string().uuid();
function isValidUuid(value: string): boolean {
  return uuidParamSchema.safeParse(value).success;
}

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
  if (!isValidUuid(id)) return null;
  return deps.findById(id);
}
