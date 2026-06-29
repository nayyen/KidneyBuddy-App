import { Router } from "express";
import * as profileController from "../controllers/profile.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// All profile routes require authentication
router.use(authenticate);

router.post("/therapy", profileController.changeTherapy);
router.get("/therapy-history", profileController.getTherapyHistory);

export default router;
