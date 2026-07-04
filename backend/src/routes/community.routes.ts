/**
 * community.routes.ts — /api/community route definitions
 *
 * ALL routes require authentication. Pattern: follows labResult.routes.ts.
 *
 * Reply + "membantu" routes (COMMUNITY-02) added by 06-05.
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

// POST /api/community/:id/replies — create a reply on a post
router.post("/:id/replies", authenticate, communityController.createReply);

// GET /api/community/:id/replies — list a post's replies (helpfulCount + markedByMe)
router.get("/:id/replies", authenticate, communityController.listReplies);

// POST /api/community/replies/:replyId/helpful — toggle a "membantu" mark (open access, D-08)
router.post("/replies/:replyId/helpful", authenticate, communityController.toggleHelpful);

// GET /api/community/:id — get a single post's detail
router.get("/:id", authenticate, communityController.getPost);

export default router;
