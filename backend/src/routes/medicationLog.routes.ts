import { Router } from "express";
import {
  confirm,
  today,
  confirmById,
  unconfirmById,
} from "../controllers/medicationLog.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// Legacy endpoint, keep for now
router.post("/confirm", authenticate, confirm);

router.post("/:logId/confirm", authenticate, confirmById);
router.post("/:logId/unconfirm", authenticate, unconfirmById);

router.get("/today", authenticate, today);

export default router;
