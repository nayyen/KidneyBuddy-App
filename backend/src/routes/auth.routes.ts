import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

// Legacy (Plan 01) — kept for backward compatibility
router.get("/profile", authController.getProfile);

// Authenticated routes
router.get("/me", authenticate, authController.me);

// Public — password reset (no auth required)
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

export default router;
