import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as medicationLogController from "../controllers/medicationLog.controller.js";

const router = Router();

// All medication-log routes require authentication
router.use(authenticate);

// POST /confirm — Confirm a dose (REMIND-03)
// Body: { reminderId: string }
router.post("/confirm", medicationLogController.confirm);

// GET /today — Today's medication log entries (D-04 Obat card)
router.get("/today", medicationLogController.today);

export default router;
