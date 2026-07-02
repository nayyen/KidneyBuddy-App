/**
 * fluid.routes.ts — /api/fluid route definitions
 *
 * ALL routes require authentication — fluid data is user-specific health data (T-02-04-01).
 * Pattern: follows auth.routes.ts with authenticate middleware on every route.
 */
import { Router } from "express";
import * as fluidController from "../controllers/fluid.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// POST /api/fluid — log a new fluid entry
router.post("/", authenticate, fluidController.create);

// GET /api/fluid/daily-balance?date=YYYY-MM-DD — server-computed daily balance
router.get("/daily-balance", authenticate, fluidController.getDailyBalance);

// POST /api/fluid/acknowledge-abnormal — patient acknowledges CAPD effluent anomaly (T-02-04-05)
router.post("/acknowledge-abnormal", authenticate, fluidController.acknowledgeAbnormal);

// GET /api/fluid?date=YYYY-MM-DD — list entries for a date
router.get("/", authenticate, fluidController.list);

// PATCH /api/fluid/:id — update an existing fluid entry
router.patch("/:id", authenticate, fluidController.update);
// DELETE /api/fluid/:id — permanently delete a fluid entry
router.delete("/:id", authenticate, fluidController.remove);

export default router;
