/**
 * community.routes.ts — /api/community route definitions
 *
 * ALL routes require authentication. Pattern: follows labResult.routes.ts.
 *
 * Reply routes (COMMUNITY-02) are added by 06-05 under this same router.
 */
import { Router } from "express";
import * as communityController from "../controllers/community.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// POST /api/community — create a new community post
router.post("/", authenticate, communityController.createPost);

// GET /api/community — list the public feed (?kategori=&metodeTerapi=)
router.get("/", authenticate, communityController.listPosts);

// PATCH /api/community/:id/archive — archive (soft-delete) own post
router.patch("/:id/archive", authenticate, communityController.archivePost);

// GET /api/community/:id — get a single post's detail
router.get("/:id", authenticate, communityController.getPost);

export default router;
