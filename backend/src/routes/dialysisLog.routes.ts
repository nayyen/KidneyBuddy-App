import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as dialysisLogController from "../controllers/dialysisLog.controller.js";

const router = Router();

// All dialysis-log routes require authentication
router.use(authenticate);

// POST /confirm — Confirm a dialysis session (Cuci Darah)
// Body: { reminderId: string }
router.post("/confirm", dialysisLogController.confirm);

// GET /today — Today's dialysis log entries
router.get("/today", dialysisLogController.today);

export default router;
