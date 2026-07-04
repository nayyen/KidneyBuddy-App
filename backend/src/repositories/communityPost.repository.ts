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
import { and, eq, desc, getTableColumns, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import { communityPosts } from "../db/schema/communityPost.schema.js";
import { communityReplies } from "../db/schema/communityReply.schema.js";
import { communityReplyHelpful } from "../db/schema/communityReplyHelpful.schema.js";
import { users } from "../db/schema/users.schema.js";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type CommunityPost = InferSelectModel<typeof communityPosts>;
export type NewCommunityPost = InferInsertModel<typeof communityPosts>;
export type CommunityPostWithAuthor = CommunityPost & { authorName: string | null };
// WR-02: feed rows additionally carry live reply/helpful aggregates. Kept as
// a separate type (rather than adding these fields to CommunityPostWithAuthor
// directly) since findById/archiveById don't compute them and the post
// detail page doesn't render them.
export type CommunityFeedItem = CommunityPostWithAuthor & {
  replyCount: number;
  helpfulTotal: number;
};

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
}): Promise<CommunityFeedItem[]> {
  const conditions = [eq(communityPosts.diarsipkan, false)];

  if (options?.kategori) {
    conditions.push(eq(communityPosts.kategori, options.kategori));
  }
  if (options?.metodeTerapi) {
    conditions.push(eq(communityPosts.metodeTerapi, options.metodeTerapi));
  }

  // WR-02: replyCount/helpfulTotal computed via a single query (two LEFT
  // JOINs + GROUP BY) rather than one query per post, to avoid N+1.
  // COUNT(DISTINCT community_replies.id) dedups the fan-out introduced by
  // the second join against community_reply_helpful; COUNT(community_reply
  // _helpful.id) then sums every helpful mark across all of the post's
  // replies. GROUP BY communityPosts.id is sufficient (Postgres allows
  // selecting other communityPosts.* columns via primary-key functional
  // dependency); users.namaLengkap is added to the GROUP BY since it isn't
  // functionally dependent on communityPosts.id.
  return db
    .select({
      ...getTableColumns(communityPosts),
      authorName: users.namaLengkap,
      replyCount: sql<number>`count(distinct ${communityReplies.id})::int`,
      helpfulTotal: sql<number>`count(${communityReplyHelpful.id})::int`,
    })
    .from(communityPosts)
    .leftJoin(users, eq(communityPosts.userId, users.userId))
    .leftJoin(communityReplies, eq(communityReplies.postId, communityPosts.id))
    .leftJoin(
      communityReplyHelpful,
      eq(communityReplyHelpful.replyId, communityReplies.id),
    )
    .where(and(...conditions))
    .groupBy(communityPosts.id, users.namaLengkap)
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
