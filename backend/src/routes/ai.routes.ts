/**
 * ai.routes.ts — /api/ai route definitions
 *
 * ALL routes require authentication — AI-generated content is derived from
 * user-specific health data (T-05-11). Pattern: follows fluid.routes.ts's
 * authenticate-on-every-route.
 */
import { Router } from "express";
import * as aiController from "../controllers/ai.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// GET /api/ai/daily-summary — cache-only read of today's summary (AI-01, D-16)
router.get("/daily-summary", authenticate, aiController.getDailySummary);

// POST /api/ai/daily-summary/regenerate — manual trigger, forces fresh Groq call (D-10)
router.post("/daily-summary/regenerate", authenticate, aiController.regenerateDailySummary);

// GET /api/ai/weekly-insight — cache-only read of this week's insight (AI-02, D-16)
router.get("/weekly-insight", authenticate, aiController.getWeeklyInsight);

// POST /api/ai/weekly-insight/regenerate — manual trigger, forces fresh Groq
// call (code review WR-01, 2026-07-04) — recovers from a missed/failed
// Sunday 19:00 WIB batch without waiting a full week
router.post("/weekly-insight/regenerate", authenticate, aiController.regenerateWeeklyInsight);

// GET /api/ai/lab-analysis/:labResultId — cache read of a lab result's AI
// analysis (AI-03, D-14 async), ALSO triggering on-demand fire-and-forget
// generation on a cache miss so pre-existing results get analyzed too
router.get("/lab-analysis/:labResultId", authenticate, aiController.getLabAnalysis);

// GET /api/ai/lifestyle — gate-checked lazy-generate-or-cache lifestyle
// suggestion (AI-04); no separate regenerate route (D-13 simplicity)
router.get("/lifestyle", authenticate, aiController.getLifestyleSuggestion);

export default router;
