import { Router } from "express";
import {
  confirm,
  today,
  confirmById,
  unconfirmById,
} from "../controllers/dialysisLog.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// All dialysis-log routes require authentication
router.use(authenticate);

// POST /confirm — Confirm a dialysis session (Cuci Darah)
// Body: { reminderId: string }
router.post("/confirm", authenticate, confirm);

// GET /today — Today's dialysis log entries
router.get("/today", authenticate, today);

// POST /:logId/confirm — Confirm a specific dialysis log entry
// Body: { reminderId: string }
router.post("/:logId/confirm", authenticate, confirmById);

// POST /:logId/unconfirm — Unconfirm a specific dialysis log entry
// Body: { reminderId: string }
router.post("/:logId/unconfirm", authenticate, unconfirmById);

export default router;
