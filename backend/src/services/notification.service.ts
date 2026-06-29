/**
 * notification.service.ts — Push notification fan-out
 *
 * sendToAllDevices fans a notification out to every active push_subscription
 * for a given user_id. This implements NOTIF-02 (per-device) and
 * REMIND-08 (caregiver multi-device) by addressing ALL rows for a user,
 * not just one.
 *
 * 410 handling: when the push service returns HTTP 410 (Gone) the browser
 * subscription has expired — deactivate ONLY that row so other devices
 * are unaffected. Other errors are logged but do not throw (partial
 * delivery is better than halting the entire fan-out).
 *
 * SECURITY: subscription objects and VAPID keys are NEVER logged.
 */
import pino from "pino";
import { webpush } from "../lib/webPushClient.js";
import {
  findActiveByUser,
  deactivate,
} from "../repositories/pushSubscription.repository.js";
import type { PushSubscription } from "../repositories/pushSubscription.repository.js";

const logger = pino({ name: "notification.service" });

export type NotificationPayload = {
  title: string;
  body: string;
  reminderId?: string;
  url?: string;
};

type SendFn = (sub: PushSubscription) => Promise<unknown>;
type DeactivateFn = (id: string) => Promise<void>;

/**
 * Core fan-out logic — exported separately for unit testing with injected mocks.
 * Production callers use sendToAllDevices() which wires real implementations.
 */
export async function fanOut(
  subs: PushSubscription[],
  send: SendFn,
  deactivateFn: DeactivateFn,
): Promise<void> {
  const results = await Promise.allSettled(subs.map((sub) => send(sub)));

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      const err = result.reason as { statusCode?: number; message?: string };
      if (err?.statusCode === 410) {
        // Subscription expired — deactivate ONLY this device\'s row
        await deactivateFn(subs[i].id);
        logger.info({ subId: subs[i].id }, "push_sub deactivated: 410 Gone");
      } else {
        // Other errors: log without exposing subscription data or keys
        logger.warn(
          { statusCode: err?.statusCode, message: err?.message, subId: subs[i].id },
          "push notification delivery failed — partial delivery continues",
        );
      }
    }
  }
}

/**
 * Send a notification to ALL active devices for a user.
 * Uses the production web-push client and repository.
 */
export async function sendToAllDevices(
  userId: string,
  payload: NotificationPayload,
): Promise<void> {
  const subs = await findActiveByUser(userId);

  if (subs.length === 0) {
    logger.info({ userId }, "no active push subscriptions — skipping fan-out");
    return;
  }

  await fanOut(
    subs,
    (sub) =>
      webpush.sendNotification(
        sub.subscriptionObject as Parameters<typeof webpush.sendNotification>[0],
        JSON.stringify(payload),
      ),
    deactivate,
  );
}
