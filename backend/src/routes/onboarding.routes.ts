import { Router } from "express";
import * as onboardingController from "../controllers/onboarding.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// All onboarding routes require authentication
router.use(authenticate);

router.get("/progress", onboardingController.getProgress);
router.get("/therapy-content", onboardingController.getTherapyContent);
router.post("/therapy", onboardingController.saveTherapy);
router.post("/reminder", onboardingController.saveReminder);
router.post("/skip-reminder", onboardingController.skipReminder);

export default router;
