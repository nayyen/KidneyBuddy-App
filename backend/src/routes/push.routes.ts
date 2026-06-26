/**
 * push.routes.ts — /api/push routes
 *
 * Both endpoints require authentication — subscriptions are stored under
 * the caller\'s user_id only (T-02-02-01 mitigation).
 *
 * POST /api/push/subscribe   — register or refresh a device\'s push subscription
 * DELETE /api/push/unsubscribe — deactivate a subscription by endpoint
 */
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import * as pushController from "../controllers/push.controller.js";

const router = Router();

// POST /api/push/subscribe — requires authenticate; body: PushSubscription JSON
router.post("/subscribe", authenticate, pushController.subscribeHandler);

// DELETE /api/push/unsubscribe — requires authenticate; body: { endpoint: string }
router.delete("/unsubscribe", authenticate, pushController.unsubscribeHandler);

export default router;
