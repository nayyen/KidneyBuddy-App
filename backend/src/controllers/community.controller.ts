/**
 * community.controller.ts — Thin controller for community post + reply
 * endpoints
 *
 * Pattern: follows labResult.controller.ts — parse req, delegate to service,
 * json/next(err). No Zod, no direct repository/db access here.
 *
 * Reply + "membantu" handlers (COMMUNITY-02) added by 06-05.
 */
import type { Request, Response, NextFunction } from "express";
import * as communityPostService from "../services/communityPost.service.js";
import * as communityReplyService from "../services/communityReply.service.js";

/**
 * POST /api/community
 * Create a new community post for the authenticated user.
 */
export async function createPost(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const row = await communityPostService.createPost(req.user!.id, req.body);
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/community
 * List the public community feed, optionally filtered by ?kategori= and
 * ?metodeTerapi= query params. Newest-first, non-archived only.
 */
export async function listPosts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const kategori =
      typeof req.query.kategori === "string" ? req.query.kategori : undefined;
    const metodeTerapi =
      typeof req.query.metodeTerapi === "string" ? req.query.metodeTerapi : undefined;

    const posts = await communityPostService.listFeed({ kategori, metodeTerapi });
    res.json({ posts });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/community/:id
 * Get a single post's detail, with a server-derived isMine flag.
 */
export async function getPost(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const row = await communityPostService.getPostDetail(
      req.user!.id,
      req.params.id as string,
    );
    if (!row) {
      res.status(404).json({ code: "NOT_FOUND", message: "Postingan tidak ditemukan" });
      return;
    }
    res.json(row);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/community/:id/archive
 * Archive (soft-delete) the caller's own post. IDOR-safe: another user's
 * post id returns 404, never a silent success on someone else's row.
 */
export async function archivePost(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const row = await communityPostService.archivePost(
      req.user!.id,
      req.params.id as string,
    );
    if (!row) {
      res.status(404).json({ code: "NOT_FOUND", message: "Postingan tidak ditemukan" });
      return;
    }
    res.json(row);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/community/:id/replies
 * Create a new reply on a post for the authenticated user.
 */
export async function createReply(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const row = await communityReplyService.createReply(
      req.user!.id,
      req.params.id as string,
      req.body,
    );
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/community/:id/replies
 * List all replies for a post, each with helpfulCount and markedByMe.
 */
export async function listReplies(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const replies = await communityReplyService.listReplies(
      req.params.id as string,
      req.user!.id,
    );
    res.json({ replies });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/community/replies/:replyId/helpful
 * Toggle a "membantu" mark on a reply. Open to any authenticated user —
 * not restricted to the post's author (D-08).
 */
export async function toggleHelpful(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await communityReplyService.toggleHelpful(
      req.user!.id,
      req.params.replyId as string,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}
