/**
 * community.controller.ts — Thin controller for community post endpoints
 *
 * Pattern: follows labResult.controller.ts — parse req, delegate to service,
 * json/next(err). No Zod, no direct repository/db access here.
 *
 * Reply handlers (COMMUNITY-02) are added by 06-05 — not implemented here.
 */
import type { Request, Response, NextFunction } from "express";
import * as communityPostService from "../services/communityPost.service.js";

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
