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

// GET /api/activities/all — list ALL activities across dates
router.get("/all", authenticate, activitiesController.listAll);

// GET /api/activities/active — get currently active activity
router.get("/active", authenticate, activitiesController.getActive);

// GET /api/activities/active-all — get ALL currently active activities
// (quick-260708-qqd fix 1). Must also come BEFORE /:id/complete, same
// route-ordering reason as /active above.
router.get("/active-all", authenticate, activitiesController.getActiveList);

// PATCH /api/activities/:id/complete — mark an activity as complete
router.patch("/:id/complete", authenticate, activitiesController.complete);

// PUT /api/activities/:id — update activity
router.put("/:id", authenticate, activitiesController.update);

// DELETE /api/activities/:id — cancel/delete activity
router.delete("/:id", authenticate, activitiesController.remove);

export default router;
