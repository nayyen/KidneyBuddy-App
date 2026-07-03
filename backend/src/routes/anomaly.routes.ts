/**
 * anomaly.routes.ts — /api/anomaly route definitions
 *
 * ALL routes require authentication — anomaly alerts are user-specific health
 * data (T-05-05). Pattern: follows fluid.routes.ts's authenticate-on-every-route.
 */
import { Router } from "express";
import * as anomalyController from "../controllers/anomaly.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// GET /api/anomaly — alert history (D-09)
router.get("/", authenticate, anomalyController.list);

// GET /api/anomaly/active-high-severity — emergency modal re-check (D-07)
router.get("/active-high-severity", authenticate, anomalyController.activeHighSeverity);

// PATCH /api/anomaly/:id/feedback — relevan/tidak_relevan feedback (ANOMALY-04)
router.patch("/:id/feedback", authenticate, anomalyController.feedback);

// POST /api/anomaly/:id/acknowledge — status aktif -> dibaca (ANOMALY-04/D-07)
router.post("/:id/acknowledge", authenticate, anomalyController.acknowledge);

export default router;
