"use client";

import { authFetch } from "@/lib/api";

/**
 * Convert a URL-safe Base64 string (VAPID public key format) to an ArrayBuffer.
 * Required by `PushManager.subscribe({ applicationServerKey: ... })`.
 * The VAPID public key is stored in NEXT_PUBLIC_VAPID_PUBLIC_KEY.
 *
 * Returns `ArrayBuffer` (not `Uint8Array`) to satisfy TypeScript's strict
 * `BufferSource` constraint in `PushSubscriptionOptionsInit.applicationServerKey`.
 */
function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  // Slice to produce a plain ArrayBuffer (strips the Uint8Array generic constraint)
  return outputArray.buffer.slice(0);
}

/**
 * Subscribe the current device to push notifications and register it with
 * the backend's push_subscriptions table.
 *
 * Behavior:
 * - If a subscription already exists: re-POST to refresh `last_confirmed_at`
 *   (Pitfall 5 mitigation: keeps the row fresh, surfaces stale subscriptions).
 * - If no subscription exists: call `pushManager.subscribe()` with the VAPID
 *   public key, then POST the full subscription JSON to the backend.
 *
 * IMPORTANT: `Notification.requestPermission()` must have been called (and
 * granted) by the caller BEFORE invoking this function. This function only
 * creates/refreshes the subscription — it never requests permission itself.
 *
 * @param accessToken - The user's current JWT access token for authFetch.
 */
export async function subscribeAndRegister(accessToken: string): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    console.warn("[pushClient] Service workers are not supported in this browser.");
    return;
  }
  if (!("PushManager" in window)) {
    console.warn("[pushClient] Push notifications are not supported in this browser.");
    return;
  }

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();

  if (existing) {
    // Re-POST the existing subscription to keep last_confirmed_at up to date.
    // This guards against the iOS silent expiry (RESEARCH.md Pitfall 5).
    await authFetch<unknown>("/api/push/subscribe", accessToken, {
      method: "POST",
      body: JSON.stringify(existing.toJSON()),
    });
    return;
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.warn(
      "[pushClient] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured. " +
        "Add it to .env.local to enable push notifications.",
    );
    return;
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey),
  });

  await authFetch<unknown>("/api/push/subscribe", accessToken, {
    method: "POST",
    body: JSON.stringify(sub.toJSON()),
  });
}

/**
 * Read this device's own push endpoint, if a subscription exists.
 *
 * quick-260707-98x: used by reminder update call sites to identify the
 * originating device via the `X-Push-Endpoint` request header, so the
 * backend can exclude it from the "updated from another device" fan-out.
 *
 * Never throws — returns `null` on any unsupported/missing-subscription
 * condition so callers can safely omit the header without side effects.
 */
export async function getCurrentPushEndpoint(): Promise<string | null> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return null;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub?.endpoint ?? null;
  } catch {
    return null;
  }
}

/**
 * Re-subscribe if the current device's subscription is null or stale.
 * Should be called on the `visibilitychange` event (app comes to foreground)
 * to handle iOS subscription silent expiry (RESEARCH.md Pitfall 5).
 *
 * No-ops silently when:
 * - `accessToken` is null (user not authenticated)
 * - Service workers / Push are not supported
 * - Push permission has not been granted (avoids unwanted re-prompts)
 *
 * @param accessToken - The user's current JWT access token, or null.
 */
export async function ensureFreshSubscription(
  accessToken: string | null,
): Promise<void> {
  if (!accessToken) return;
  if (!("serviceWorker" in navigator)) return;
  if (!("PushManager" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    await subscribeAndRegister(accessToken);
  } catch (err) {
    // Log but swallow — a failed re-subscription should not crash the app.
    // The backend will surface stale rows via last_confirmed_at monitoring.
    console.warn("[pushClient] Failed to refresh push subscription:", err);
  }
}
