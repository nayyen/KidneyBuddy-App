/**
 * report.routes.ts — /api/report route definitions
 *
 * GET /api/report — aggregated report for a date range (REPORT-01).
 * Route is authenticated — all report data is user-scoped health data (T-04-05).
 * Pattern: matches labResult.routes.ts authenticate middleware.
 */
import { Router } from "express";
import { getReport } from "../controllers/report.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// GET /api/report?dari=YYYY-MM-DD&sampai=YYYY-MM-DD
router.get("/", authenticate, getReport);

export default router;
