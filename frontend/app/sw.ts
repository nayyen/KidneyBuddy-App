// Service worker source — compiled by @serwist/turbopack via the Route Handler
// at app/serwist/[path]/route.ts and served at /serwist/sw.js.
//
// self.__SW_MANIFEST is replaced at build time by esbuild's define option
// (injectionPoint: "self.__SW_MANIFEST") with the precache manifest array.
// Using Serwist for precaching only — runtime caching of static assets.
// API calls to port 4000 must NEVER be intercepted by the service worker.
import { Serwist, type PrecacheEntry } from "serwist";

// ─── Local type definitions for the ServiceWorker environment ─────────────────
// PushEvent, NotificationEvent, and SW-specific NotificationOptions extensions
// are not fully exposed by lib.dom — define locally for type safety.

interface SwExtendableEvent extends Event {
  waitUntil(f: Promise<unknown>): void;
}

interface SwPushMessageData {
  json(): unknown;
  text(): string;
}

interface SwPushEvent extends SwExtendableEvent {
  readonly data: SwPushMessageData | null;
}

interface SwNotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface SwNotificationOptions extends NotificationOptions {
  badge?: string;
  actions?: SwNotificationAction[];
  data?: unknown;
}

interface SwNotification {
  close(): void;
  readonly data: { reminderId?: string } | null;
}

interface SwNotificationEvent extends SwExtendableEvent {
  readonly notification: SwNotification;
  readonly action: string;
}

// HARDCODED — no process.env (undefined in SW context).
// In dev: http://localhost:4000. In production, update this before deploy.
// The service worker MUST NOT cache or intercept requests to this URL.
const API_BASE = "http://localhost:4000";

// sw.ts runs in the ServiceWorkerGlobalScope, not Window. TypeScript's dom lib
// types `self` as `Window & typeof globalThis`. Use `unknown` as intermediate
// cast to correctly access SW-specific properties.
const swSelf = self as unknown as {
  __SW_MANIFEST: (PrecacheEntry | string)[];
  registration: {
    showNotification(title: string, options?: SwNotificationOptions): Promise<void>;
  };
  addEventListener(type: "push", listener: (event: SwPushEvent) => void): void;
  addEventListener(
    type: "notificationclick",
    listener: (event: SwNotificationEvent) => void,
  ): void;
};

const serwist = new Serwist({
  precacheEntries: swSelf.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Only cache same-origin same-origin static assets — NEVER cache API calls.
  // defaultCache includes NetworkFirst for navigation which can interfere with
  // cross-origin fetch() calls to port 4000. Use a minimal allowlist instead.
  runtimeCaching: [
    {
      urlPattern: ({ request }) =>
        request.destination === "style" ||
        request.destination === "script" ||
        request.destination === "font" ||
        request.destination === "image",
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
  ],
});

serwist.addEventListeners();

// ─── Push notification handler (NOTIF-01, REMIND-02 client half) ──────────────
// Receives a push payload from the backend's webpush.sendNotification() call
// and displays a native notification with confirm/dismiss actions.
swSelf.addEventListener("push", (event) => {
  const data = event.data?.json() as {
    title: string;
    body: string;
    reminderId?: string;
  } | null;

  if (!data) return;

  event.waitUntil(
    swSelf.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      data: { reminderId: data.reminderId },
      actions: [
        { action: "confirm", title: "Sudah diminum" },
        { action: "dismiss", title: "Tutup" },
      ],
    }),
  );
});

// ─── Notification click handler (REMIND-03 client half) ───────────────────────
// When user taps "Sudah diminum" (confirm action), POST to the medication-log
// confirm endpoint with credentials so the session cookie is sent.
// The backend endpoint /api/medication-log/confirm is implemented in plan 02-05.
swSelf.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "confirm") {
    event.waitUntil(
      fetch(`${API_BASE}/api/medication-log/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminderId: event.notification.data?.reminderId,
        }),
        credentials: "include",
      }),
    );
  }
});
