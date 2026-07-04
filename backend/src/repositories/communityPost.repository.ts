/**
 * communityPost.repository.ts — community_posts CRUD operations (COMMUNITY-01/03)
 *
 * Feed reads are NOT scoped to a single userId — the community feed is public
 * across all users (unlike labResult.repository.ts's per-account findByUser).
 * Only archiveById is userId-scoped, and that scoping exists purely for the
 * IDOR guard (a user may only archive their own post).
 *
 * Uses soft-delete (diarsipkan = true) — rows are never hard-deleted
 * (COMMUNITY-03). No hard-delete call exists anywhere in this file.
 *
 * Pattern: follows labResult.repository.ts's findByUser options/conditions
 * shape and archiveById's compound IDOR WHERE clause.
 *
 * findFeed/findById left-join `users` to attach an `authorName` display field
 * (06-06 deviation — a Quora-style feed with no author attribution at all is
 * a real UX gap, not a cosmetic one; the join is read-only and does not
 * affect the IDOR-safe archiveById path).
 */
import { and, eq, desc, getTableColumns } from "drizzle-orm";
import { db } from "../lib/db.js";
import { communityPosts } from "../db/schema/communityPost.schema.js";
import { users } from "../db/schema/users.schema.js";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type CommunityPost = InferSelectModel<typeof communityPosts>;
export type NewCommunityPost = InferInsertModel<typeof communityPosts>;
export type CommunityPostWithAuthor = CommunityPost & { authorName: string | null };

/**
 * Insert a community post row and return the created row.
 */
export async function create(data: NewCommunityPost): Promise<CommunityPost> {
  const [row] = await db.insert(communityPosts).values(data).returning();
  return row;
}

/**
 * Find the public community feed, optionally filtered by kategori and/or
 * metodeTerapi. Base condition excludes archived posts. NOT userId-scoped —
 * every authenticated user sees every other user's non-archived posts
 * (D-05/D-06/D-07).
 */
export async function findFeed(options?: {
  kategori?: string;
  metodeTerapi?: string;
}): Promise<CommunityPostWithAuthor[]> {
  const conditions = [eq(communityPosts.diarsipkan, false)];

  if (options?.kategori) {
    conditions.push(eq(communityPosts.kategori, options.kategori));
  }
  if (options?.metodeTerapi) {
    conditions.push(eq(communityPosts.metodeTerapi, options.metodeTerapi));
  }

  return db
    .select({ ...getTableColumns(communityPosts), authorName: users.namaLengkap })
    .from(communityPosts)
    .leftJoin(users, eq(communityPosts.userId, users.userId))
    .where(and(...conditions))
    .orderBy(desc(communityPosts.createdAt));
}

/**
 * Find a single community post by id (no userId scoping — any authenticated
 * user may view any post's detail; ownership is only checked for archive).
 */
export async function findById(id: string): Promise<CommunityPostWithAuthor | null> {
  const [row] = await db
    .select({ ...getTableColumns(communityPosts), authorName: users.namaLengkap })
    .from(communityPosts)
    .leftJoin(users, eq(communityPosts.userId, users.userId))
    .where(eq(communityPosts.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Soft-archive a community post (set diarsipkan = true).
 * IDOR-safe: filters by userId AND id — a user can only archive their own
 * post; a cross-user attempt matches zero rows and returns null.
 */
export async function archiveById(
  userId: string,
  id: string,
): Promise<CommunityPost | null> {
  const [row] = await db
    .update(communityPosts)
    .set({ diarsipkan: true })
    .where(and(eq(communityPosts.userId, userId), eq(communityPosts.id, id)))
    .returning();
  return row ?? null;
}
