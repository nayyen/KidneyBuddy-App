/**
 * activities.routes.ts — /api/activities route definitions
 *
 * ALL routes require authentication — activity data is user-specific health data (T-03-01).
 * Pattern: follows fluid.routes.ts with authenticate middleware on every route.
 *
 * Route ordering note: /active must be defined BEFORE /:id/complete so Express
 * doesn't interpret "active" as an :id parameter.
 */
import { Router } from "express";
import * as activitiesController from "../controllers/activities.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// POST /api/activities — create a new activity
router.post("/", authenticate, activitiesController.create);

// GET /api/activities — list activities for a date (?date=YYYY-MM-DD)
router.get("/", authenticate, activitiesController.list);

// GET /api/activities/active — get currently active activity
router.get("/active", authenticate, activitiesController.getActive);

// PATCH /api/activities/:id/complete — mark an activity as complete
router.patch("/:id/complete", authenticate, activitiesController.complete);

export default router;
