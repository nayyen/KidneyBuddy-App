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
  readonly data: { reminderId?: string; url?: string } | null;
}

interface SwNotificationEvent extends SwExtendableEvent {
  readonly notification: SwNotification;
  readonly action: string;
}

interface SwWindowClient {
  readonly url: string;
  focus(): Promise<unknown>;
}

interface SwFetchEvent extends Event {
  readonly request: { url: string };
}

// `__SW_API_BASE__` is substituted at BUILD time by esbuild's `define` option
// (see app/serwist/[path]/route.ts's esbuildOptions.define), sourced from
// NEXT_PUBLIC_API_URL. The service worker itself has no `process.env` at
// runtime — this identifier does not exist until esbuild replaces it with a
// string literal, so it must be declared here only as a type, never assigned.
// The service worker MUST NOT cache or intercept requests to this URL.
declare const __SW_API_BASE__: string;
const API_BASE = __SW_API_BASE__;

// sw.ts runs in the ServiceWorkerGlobalScope, not Window. TypeScript's dom lib
// types `self` as `Window & typeof globalThis`. Use `unknown` as intermediate
// cast to correctly access SW-specific properties.
const swSelf = self as unknown as {
  __SW_MANIFEST: (PrecacheEntry | string)[];
  registration: {
    showNotification(title: string, options?: SwNotificationOptions): Promise<void>;
  };
  clients: {
    matchAll(options?: {
      type?: string;
      includeUncontrolled?: boolean;
    }): Promise<SwWindowClient[]>;
    openWindow(url: string): Promise<unknown>;
  };
  addEventListener(type: "push", listener: (event: SwPushEvent) => void): void;
  addEventListener(
    type: "notificationclick",
    listener: (event: SwNotificationEvent) => void,
  ): void;
  addEventListener(type: "fetch", listener: (event: SwFetchEvent) => void): void;
};

const serwist = new Serwist({
  precacheEntries: swSelf.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
});

serwist.addEventListeners();

// ─── Explicit API passthrough guard ────────────────────────────────────────
// Serwist's own listener only intercepts precached app-shell/static-asset
// requests; it never registers a route for the backend API origin, so API
// calls already pass through to the network uncached. This listener makes
// that invariant explicit and enforced (never calls respondWith for the API
// origin) rather than relying on the absence of a matching route — health
// data responses must never be cached by this service worker.
swSelf.addEventListener("fetch", (event) => {
  if (event.request.url.startsWith(API_BASE)) {
    return; // let the browser handle it normally — never cached, never intercepted
  }
});

// ─── Push notification handler (NOTIF-01, REMIND-02 client half) ──────────────
// Receives a push payload from the backend's webpush.sendNotification() call
// and displays a native notification with confirm/dismiss actions.
swSelf.addEventListener("push", (event) => {
  const data = event.data?.json() as {
    title: string;
    body: string;
    reminderId?: string;
    url?: string;
  } | null;

  if (!data) return;

  event.waitUntil(
    swSelf.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      // Carry the backend's suggested deep-link (e.g. "/catatan", "/pengingat")
      // through to notificationclick, which needs it to open/focus the app.
      data: { reminderId: data.reminderId, url: data.url },
      actions: [
        { action: "confirm", title: "Sudah diminum" },
        { action: "dismiss", title: "Tutup" },
      ],
    }),
  );
});

// ─── Notification click handler (REMIND-03 client half) ───────────────────────
// AUDIT FINDING (quick-260705-9n4 task 4): the "confirm" action used to POST
// directly from the service worker to /api/medication-log/confirm with
// `credentials: "include"`. This request could never succeed: the backend's
// `authenticate` middleware only reads a Bearer access token from the
// Authorization header — it never reads a cookie — and access tokens are
// deliberately kept in-memory only (never in a cookie or localStorage, per
// CLAUDE.md's XSS guidance), so the service worker has no token to attach.
// The request always 401'd silently, which is why "confirm from notification"
// never worked. FIX: instead of attempting an unauthenticated API call, open
// (or focus, if already open) the already-authenticated app tab at the
// reminder's page, where the user completes the confirm action normally. API
// calls to the backend host are otherwise never intercepted by this SW.
swSelf.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url ?? "/catatan";

  event.waitUntil(
    swSelf.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find((client) => client.url.includes(targetUrl));
        if (existing) return existing.focus();
        if (clientList.length > 0) return clientList[0].focus();
        return swSelf.clients.openWindow(targetUrl);
      }),
  );
});
