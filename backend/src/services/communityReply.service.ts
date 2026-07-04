/**
 * communityReply.service.ts — Community reply + "membantu" business logic
 * (COMMUNITY-02)
 *
 * - createReply: validates payload with Zod, persists a reply scoped to
 *   (postId, userId)
 * - listReplies: fetches all replies for a post, each with a live
 *   COUNT-based helpfulCount and a markedByMe flag for the caller
 * - toggleHelpful: marks/unmarks a reply as "membantu" — open to ANY
 *   authenticated user, not just the post's author (D-08); one mark per
 *   user per reply, enforced at the DB level (D-09)
 *
 * Community replies are public/peer-visible content, NOT sensitive health
 * data — no encrypt()/decrypt() import here (RESEARCH Pitfall 1).
 *
 * Test seam: createReply/toggleHelpful accept an optional trailing `deps`
 * object that defaults to the real repository, matching the 06-01 RED
 * scaffold's fixed deps-injection contract exactly:
 *   createReply(userId, postId, payload, { insert })
 *   toggleHelpful(userId, replyId, { toggle })
 */
import { z } from "zod";
import pino from "pino";
import * as communityReplyRepository from "../repositories/communityReply.repository.js";
import type { CommunityReplyWithMeta } from "../repositories/communityReply.repository.js";
import * as communityPostRepository from "../repositories/communityPost.repository.js";
import { AppError } from "../middleware/errorHandler.js";

const logger = pino({ name: "communityReply.service" });

// ─── Zod validation schemas ───────────────────────────────────────────────────

export const createReplySchema = z.object({
  isi: z
    .string({
      required_error: "Isi balasan wajib diisi",
    })
    .min(1, "Isi balasan tidak boleh kosong")
    .max(2000, "Isi balasan maksimal 2000 karakter"),
});

export type CreateReplyPayload = z.infer<typeof createReplySchema>;

// WR-01: format-validate :id/:replyId route params as UUIDs before they
// reach a Drizzle `eq(uuidColumn, id)` clause — see communityPost.service
// .ts's isValidUuid for the full rationale (avoids a raw Postgres "invalid
// input syntax for type uuid" surfacing as a generic 500 instead of a 404).
const uuidParamSchema = z.string().uuid();
function isValidUuid(value: string): boolean {
  return uuidParamSchema.safeParse(value).success;
}

// ─── Injectable deps ────────────────────────────────────────────────────────
//
// Loosely typed (matches communityPost.service.ts's InsertFn convention) so
// the 06-01 RED scaffold's minimal in-memory store row shape type-checks
// against the real repository's stricter signature.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InsertFn = (data: any) => Promise<any>;
type ToggleFn = (userId: string, replyId: string) => Promise<{ marked: boolean }>;
type FindPostFn = (
  id: string,
) => Promise<{ diarsipkan: boolean } | null>;

export interface CreateReplyDeps {
  insert: InsertFn;
  findPost: FindPostFn;
}

export interface ToggleHelpfulDeps {
  toggle: ToggleFn;
}

// ─── Production functions ────────────────────────────────────────────────────

/**
 * Create a new reply on a post, scoped to the authenticated user.
 */
export async function createReply(
  userId: string,
  postId: string,
  rawPayload: unknown,
  deps: CreateReplyDeps = {
    insert: communityReplyRepository.createReply,
    findPost: communityPostRepository.findById,
  },
) {
  const parsed = createReplySchema.parse(rawPayload);

  // WR-01: reject a malformed postId before it ever reaches deps.findPost's
  // `eq(uuid, postId)` clause.
  if (!isValidUuid(postId)) {
    throw new AppError(404, "NOT_FOUND", "Postingan tidak ditemukan");
  }

  // WR-06: archiving a post is meant to freeze the discussion — the archive
  // dialog tells the owner it "akan disembunyikan dari feed komunitas".
  // findById/getPostDetail deliberately still return archived posts (so a
  // direct link/bookmark doesn't 404), but new replies against an archived
  // post are rejected here.
  const post = await deps.findPost(postId);
  if (!post) {
    throw new AppError(404, "NOT_FOUND", "Postingan tidak ditemukan");
  }
  if (post.diarsipkan) {
    throw new AppError(
      410,
      "POST_ARCHIVED",
      "Postingan ini sudah diarsipkan dan tidak dapat dibalas lagi",
    );
  }

  logger.info({ userId, postId }, "creating community reply");

  return deps.insert({
    postId,
    userId,
    isi: parsed.isi,
  });
}

/**
 * List all replies for a post, each augmented with a live helpfulCount
 * (COUNT(*) against community_reply_helpful) and a markedByMe flag for the
 * current caller. Never scoped away for visibility — every authenticated
 * reader sees the same replies for a post.
 */
export async function listReplies(
  postId: string,
  currentUserId: string,
  deps: { findByPost: typeof communityReplyRepository.findByPost } = {
    findByPost: communityReplyRepository.findByPost,
  },
): Promise<CommunityReplyWithMeta[]> {
  // WR-01: reject a malformed postId before it ever reaches deps.findByPost's
  // `eq(uuid, postId)` clause.
  if (!isValidUuid(postId)) {
    throw new AppError(404, "NOT_FOUND", "Postingan tidak ditemukan");
  }
  return deps.findByPost(postId, currentUserId);
}

/**
 * Toggle a "membantu" mark on a reply. No ownership guard — any
 * authenticated user may mark any reply (D-08, intentional open access).
 * Dedup is enforced at the DB level (D-09); this is toggle-UX logic only.
 */
export async function toggleHelpful(
  userId: string,
  replyId: string,
  deps: ToggleHelpfulDeps = { toggle: communityReplyRepository.toggleHelpful },
): Promise<{ marked: boolean }> {
  // WR-01: reject a malformed replyId before it ever reaches deps.toggle's
  // `eq(uuid, replyId)` clause (this also replaces the old dead-code
  // typeof/length guard — Express route params are always non-empty
  // strings by construction, but never format-validated as UUIDs).
  if (!isValidUuid(replyId)) {
    throw new AppError(404, "NOT_FOUND", "Balasan tidak ditemukan");
  }

  return deps.toggle(userId, replyId);
}
