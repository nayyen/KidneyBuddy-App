/**
 * lib/webPushClient.ts — Configured web-push client (VAPID)
 *
 * Initialises VAPID details once at module load using env vars.
 * Apple APNs requires VAPID_SUBJECT to be "mailto:" or "https://".
 *
 * SECURITY: VAPID keys are loaded from env vars and NEVER logged.
 * Key values must not appear in any log statement.
 *
 * Usage: import { webpush } from "../lib/webPushClient.js";
 *        await webpush.sendNotification(subscriptionObject, payload);
 */
import webpush from "web-push";

const VAPID_SUBJECT = process.env.VAPID_SUBJECT;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_SUBJECT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  // At startup, emit a clear warning if VAPID keys are absent.
  // Not a hard throw (unlike ENCRYPTION_KEY) because VAPID keys may be
  // legitimately absent in test environments — push features simply won\'t work.
  console.warn(
    "[webPushClient] VAPID env vars missing (VAPID_SUBJECT / VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY). " +
      "Push notifications will be disabled. Run: npx web-push generate-vapid-keys",
  );
} else {
  // NEVER log the key values — only confirm they are set.
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export { webpush };
