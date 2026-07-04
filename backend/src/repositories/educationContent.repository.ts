/**
 * educationContent.repository.ts — education_content read operations (EDU-01)
 *
 * Content is shared/public reference material, NOT scoped to any individual
 * account — unlike every other repository in this codebase, there is no
 * per-account base condition here by design (06-PATTERNS.md / 06-CONTEXT.md:
 * education content is pre-curated and seeded, visible to every authenticated
 * reader regardless of who is asking).
 *
 * Pattern: follows labResult.repository.ts's findByUser options/conditions
 * shape, minus the account-scoping base condition.
 */
import { and, eq, desc } from "drizzle-orm";
import { db } from "../lib/db.js";
import { educationContent } from "../db/schema/educationContent.schema.js";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type EducationContent = InferSelectModel<typeof educationContent>;
export type NewEducationContent = InferInsertModel<typeof educationContent>;

/**
 * Find education content rows, optionally filtered by therapy method and/or
 * content type. Both filters are applied server-side via Drizzle eq() in the
 * WHERE clause (never a post-fetch JS filter).
 */
export async function findAll(options?: {
  metodeTerapi?: string;
  tipeKonten?: string;
}): Promise<EducationContent[]> {
  const conditions = [];

  if (options?.metodeTerapi) {
    conditions.push(eq(educationContent.metodeTerapi, options.metodeTerapi));
  }
  if (options?.tipeKonten) {
    conditions.push(eq(educationContent.tipeKonten, options.tipeKonten));
  }

  const query = db.select().from(educationContent);

  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(desc(educationContent.createdAt));
  }

  return query.orderBy(desc(educationContent.createdAt));
}

/**
 * Find a single education content row by id.
 */
export async function findById(id: string): Promise<EducationContent | null> {
  const [row] = await db
    .select()
    .from(educationContent)
    .where(eq(educationContent.id, id))
    .limit(1);
  return row ?? null;
}
