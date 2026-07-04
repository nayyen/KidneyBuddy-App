/**
 * communityReply.repository.ts — community_replies + community_reply_helpful
 * operations (COMMUNITY-02)
 *
 * findByPost is NOT userId-scoped (public, peer-visible replies, same
 * precedent as communityPost.repository.ts's findFeed/findById) — every
 * authenticated reader sees the same replies for a post, augmented with a
 * per-reader markedByMe flag.
 *
 * toggleHelpful has NO userId-ownership WHERE guard tying the mark to the
 * reply's author — ANY authenticated user may mark ANY reply as "membantu"
 * (D-08, intentional open access, not IDOR). Dedup is enforced by the
 * community_reply_helpful table's unique(reply_id, user_id) constraint
 * (D-09) — this function's check-then-act logic is a toggle-UX convenience
 * on top of that DB-level backstop, not the source of truth.
 *
 * helpfulCount is always computed live via COUNT(*) against
 * community_reply_helpful — no denormalized counter column exists on
 * community_replies (RESEARCH Anti-Patterns).
 *
 * findByPost left-joins `users` to attach an `authorName` display field
 * (06-07 deviation, same Rule 2 precedent as communityPost.repository.ts's
 * 06-06 authorName join — a reply with zero author attribution is a real
 * UX gap in a Quora-style thread, not cosmetic).
 *
 * Pattern: follows communityPost.repository.ts's public-read shape;
 * toggle logic follows 06-RESEARCH.md's check-then-act example.
 */
import { and, asc, eq, getTableColumns, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import { communityReplies } from "../db/schema/communityReply.schema.js";
import { communityReplyHelpful } from "../db/schema/communityReplyHelpful.schema.js";
import { users } from "../db/schema/users.schema.js";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type CommunityReply = InferSelectModel<typeof communityReplies>;
export type NewCommunityReply = InferInsertModel<typeof communityReplies>;

export type CommunityReplyWithMeta = CommunityReply & {
  authorName: string | null;
  helpfulCount: number;
  markedByMe: boolean;
};

/**
 * Insert a community reply row and return the created row.
 */
export async function createReply(data: NewCommunityReply): Promise<CommunityReply> {
  const [row] = await db.insert(communityReplies).values(data).returning();
  return row;
}

/**
 * Find all replies for a post, ordered oldest-first, each augmented with a
 * live COUNT(*)-based helpfulCount (from community_reply_helpful) and a
 * markedByMe boolean (whether currentUserId has an existing mark on that
 * reply). NOT userId-scoped for visibility — every reader sees every reply.
 */
export async function findByPost(
  postId: string,
  currentUserId: string,
): Promise<CommunityReplyWithMeta[]> {
  const replies = await db
    .select({ ...getTableColumns(communityReplies), authorName: users.namaLengkap })
    .from(communityReplies)
    .leftJoin(users, eq(communityReplies.userId, users.userId))
    .where(eq(communityReplies.postId, postId))
    .orderBy(asc(communityReplies.createdAt));

  return Promise.all(
    replies.map(async (reply) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(communityReplyHelpful)
        .where(eq(communityReplyHelpful.replyId, reply.id));

      const [markRow] = await db
        .select()
        .from(communityReplyHelpful)
        .where(
          and(
            eq(communityReplyHelpful.replyId, reply.id),
            eq(communityReplyHelpful.userId, currentUserId),
          ),
        )
        .limit(1);

      return { ...reply, helpfulCount: count, markedByMe: !!markRow };
    }),
  );
}

/**
 * Toggle a "membantu" mark on a reply for a user. Check-then-act against
 * the unique(reply_id, user_id) join table: if a mark already exists,
 * delete it (unmark, returns marked:false); otherwise insert one (mark,
 * returns marked:true). No userId-ownership guard tying this to the
 * reply's author — open to any authenticated user (D-08).
 */
export async function toggleHelpful(
  userId: string,
  replyId: string,
): Promise<{ marked: boolean }> {
  const existing = await db
    .select()
    .from(communityReplyHelpful)
    .where(
      and(
        eq(communityReplyHelpful.userId, userId),
        eq(communityReplyHelpful.replyId, replyId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(communityReplyHelpful)
      .where(
        and(
          eq(communityReplyHelpful.userId, userId),
          eq(communityReplyHelpful.replyId, replyId),
        ),
      );
    return { marked: false };
  }

  await db.insert(communityReplyHelpful).values({ userId, replyId });
  return { marked: true };
}
