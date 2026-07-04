/**
 * communityPost.service.ts — Community post business logic (COMMUNITY-01/03)
 *
 * - createPost: validates payload with Zod, persists a row scoped to userId
 * - listFeed: validates optional kategori/metodeTerapi filters, delegates to
 *   the public (non-userId-scoped) feed query
 * - getPostDetail: fetches a single post, deriving isMine server-side from
 *   the authenticated caller's id — never trust a client-supplied flag
 * - archivePost: soft-archives (diarsipkan=true) only the caller's own post;
 *   a cross-user attempt returns null (IDOR-safe, COMMUNITY-03)
 *
 * Community posts are public/peer-visible content, NOT sensitive health
 * data — no encrypt()/decrypt() import here (RESEARCH Pitfall 1).
 *
 * Test seam: createPost/archivePost accept an optional trailing `deps` object
 * that defaults to the real repository, matching the 06-01 RED scaffold's
 * fixed deps-injection contract exactly:
 *   createPost(userId, payload, { insert })
 *   archivePost(userId, id, { archiveById })
 */
import { z } from "zod";
import pino from "pino";
import * as communityPostRepository from "../repositories/communityPost.repository.js";
import type { CommunityPostWithAuthor } from "../repositories/communityPost.repository.js";

const logger = pino({ name: "communityPost.service" });

// ─── Zod validation schemas ───────────────────────────────────────────────────

export const createPostSchema = z.object({
  judul: z
    .string({
      required_error: "Judul wajib diisi",
    })
    .min(1, "Judul tidak boleh kosong")
    .max(200, "Judul maksimal 200 karakter"),
  isi: z
    .string({
      required_error: "Isi wajib diisi",
    })
    .min(1, "Isi tidak boleh kosong")
    .max(5000, "Isi maksimal 5000 karakter"),
  kategori: z.enum(["pertanyaan", "berbagi_pengalaman", "informasi"], {
    required_error: "Kategori wajib diisi",
    invalid_type_error: "Kategori tidak valid",
  }),
  metodeTerapi: z.enum(["CAPD", "HD", "Transplantasi", "Umum"], {
    required_error: "Metode terapi wajib diisi",
    invalid_type_error: "Metode terapi tidak valid",
  }),
});

export type CreatePostPayload = z.infer<typeof createPostSchema>;

export const listFeedQuerySchema = z.object({
  kategori: z.enum(["pertanyaan", "berbagi_pengalaman", "informasi"]).optional(),
  metodeTerapi: z.enum(["CAPD", "HD", "Transplantasi", "Umum"]).optional(),
});

export type ListFeedQuery = z.infer<typeof listFeedQuerySchema>;

// ─── Injectable deps ────────────────────────────────────────────────────────
//
// Loosely typed (matches labResult.service.ts's InsertFn / educationContent
// .service.ts's FindAllFn convention) so the 06-01 RED scaffold's minimal
// in-memory store row shape type-checks against the real repository's
// stricter signature.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InsertFn = (data: any) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ArchiveByIdFn = (userId: string, id: string) => Promise<any | null>;

export interface CreatePostDeps {
  insert: InsertFn;
}

export interface ArchivePostDeps {
  archiveById: ArchiveByIdFn;
}

// ─── Production functions ────────────────────────────────────────────────────

/**
 * Create a new community post scoped to the authenticated user.
 */
export async function createPost(
  userId: string,
  rawPayload: unknown,
  deps: CreatePostDeps = { insert: communityPostRepository.create },
) {
  const parsed = createPostSchema.parse(rawPayload);

  logger.info({ userId, kategori: parsed.kategori, metodeTerapi: parsed.metodeTerapi }, "creating community post");

  return deps.insert({
    userId,
    judul: parsed.judul,
    isi: parsed.isi,
    kategori: parsed.kategori,
    metodeTerapi: parsed.metodeTerapi,
  });
}

/**
 * List the public community feed, optionally filtered by kategori and/or
 * metodeTerapi. Never scoped to a single user — every authenticated reader
 * sees the same non-archived, newest-first feed (D-05/D-06/D-07).
 */
export async function listFeed(
  options?: { kategori?: string; metodeTerapi?: string },
  deps: { findFeed: typeof communityPostRepository.findFeed } = {
    findFeed: communityPostRepository.findFeed,
  },
): Promise<CommunityPostWithAuthor[]> {
  const parsed: ListFeedQuery = options ? listFeedQuerySchema.parse(options) : {};

  return deps.findFeed(parsed);
}

/**
 * Get a single post's detail, with a server-derived isMine flag (never a
 * client-supplied one) based on the authenticated caller's id.
 */
export async function getPostDetail(
  currentUserId: string,
  id: string,
  deps: { findById: typeof communityPostRepository.findById } = {
    findById: communityPostRepository.findById,
  },
): Promise<(CommunityPostWithAuthor & { isMine: boolean }) | null> {
  const row = await deps.findById(id);
  if (!row) return null;
  return { ...row, isMine: row.userId === currentUserId };
}

/**
 * Archive (soft-delete) a community post. IDOR-safe: only the post's owner
 * may archive it — a different user's attempt returns null (COMMUNITY-03).
 * No code path here (or in the repository) ever issues a hard DELETE.
 */
export async function archivePost(
  userId: string,
  id: string,
  deps: ArchivePostDeps = { archiveById: communityPostRepository.archiveById },
) {
  const row = await deps.archiveById(userId, id);
  if (!row) return null;
  return row;
}
