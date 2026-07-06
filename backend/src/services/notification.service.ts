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
    if (result.status === "fulfilled") {
      // DIAGNOSTIC (quick-260705-9n4 task 4 live-debug): fanOut previously had
      // ZERO success-path logging — a successful send was indistinguishable
      // from "nothing happened" in the logs. web-push's sendNotification()
      // resolves to a SendResult ({ statusCode, headers, body }) reflecting
      // the push service's own HTTP response when accepted for delivery
      // (NOT proof of on-device display — that happens later, client-side,
      // in the service worker's "push" handler). Log it so "delivered to
      // push service" vs "silent failure" is no longer indistinguishable.
      const sendResult = result.value as { statusCode?: number } | undefined;
      logger.info(
        { subId: subs[i].id, statusCode: sendResult?.statusCode },
        "push notification delivered to push service",
      );
    } else {
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
 * Pure helper — returns `subs` unchanged when `excludeEndpoint` is falsy,
 * otherwise filters out the subscription whose `endpoint` matches it.
 *
 * quick-260707-98x: lets the originating device's PATCH request exclude
 * itself from the "updated from another device" fan-out, since that
 * notification is meant for OTHER devices only, never the one that made
 * the change.
 */
export function excludeOriginator(
  subs: PushSubscription[],
  excludeEndpoint?: string,
): PushSubscription[] {
  if (!excludeEndpoint) return subs;
  return subs.filter((s) => s.endpoint !== excludeEndpoint);
}

/**
 * Send a notification to ALL active devices for a user.
 * Uses the production web-push client and repository.
 *
 * @param excludeEndpoint - Optional push endpoint of the originating device
 *   (quick-260707-98x). When provided, that device is excluded from the
 *   fan-out so it doesn't receive a notification about its own action.
 */
export async function sendToAllDevices(
  userId: string,
  payload: NotificationPayload,
  excludeEndpoint?: string,
): Promise<void> {
  const subs = await findActiveByUser(userId);
  const targets = excludeOriginator(subs, excludeEndpoint);

  if (targets.length === 0) {
    logger.info(
      { userId },
      "no target devices after excluding originator — skipping fan-out",
    );
    return;
  }

  await fanOut(
    targets,
    (sub) =>
      webpush.sendNotification(
        sub.subscriptionObject as Parameters<typeof webpush.sendNotification>[0],
        JSON.stringify(payload),
      ),
    deactivate,
  );
}
