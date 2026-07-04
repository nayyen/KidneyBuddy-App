/**
 * education.routes.ts — /api/education route definitions
 *
 * Both routes require authentication for consistency with every other route
 * file in this codebase (T-06-03: shared-account model means no unauthenticated
 * read path is needed, even though the underlying content is not sensitive).
 */
import { Router } from "express";
import * as educationController from "../controllers/education.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// GET /api/education — list education content (?metodeTerapi=&tipeKonten=)
router.get("/", authenticate, educationController.list);

// GET /api/education/:id — get one article's full body
router.get("/:id", authenticate, educationController.getById);

export default router;
