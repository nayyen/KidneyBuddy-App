# Phase 2: Fluid & Medication Tracking with Reminders — Research

**Researched:** 2026-06-26
**Domain:** PWA installability, VAPID web push, Drizzle schema extension, AES-256-GCM encryption, node-cron with Postgres persistence, responsive layout system, IndexedDB offline queue
**Confidence:** HIGH (stack verified via npm registry + official docs); MEDIUM (iOS push behavior patterns, fluid balance threshold recommendations)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Navigation Structure**
- D-01: Bottom navigation has 5 tabs: Beranda / Catatan / Pengingat / Edukasi / Profil — in that order.
- D-02: "Catatan" tab shows Cairan and Obat sub-tabs only in Phase 2. Sub-tab slots for Aktivitas and Lab are designed in as "coming soon" placeholders.
- D-03: "Edukasi" tab present in nav from Phase 2 onward; content built in Phase 6. Phase 2 renders a placeholder state.

**Dashboard (Beranda) Content**
- D-04: Beranda shows cards in order: (1) Delta cairan card (large, colored by threshold), (2) Obat card (unconfirmed meds with quick-confirm), (3) Pengingat berikutnya card, (4) AI summary placeholder grey card ("Ringkasan AI tersedia di Phase 5").
- D-05: "No reminder configured" banner from onboarding (ONBOARD-03) remains until at least one reminder is configured.

**FAB**
- D-06: FAB is always "Catat Cairan" on mobile across all pages. Label "Catat" (short) with fluid-drop icon. Color: primary teal gradient. Sits centered above bottom nav (Material-style placement — separate from tabs, not a tab itself).

**Responsive Layout — Three Distinct Layouts**
- D-07 (Mobile 375–767px): Single-column. 5-tab bottom navigation fixed at bottom. FAB centered above bottom nav. Compact header: app name + notification bell.
- D-08 (Tablet 768–1023px): 2-column dashboard/list layout. Bottom nav unchanged from mobile. FAB still present above bottom nav.
- D-09 (Desktop 1024px+): Left sidebar replaces bottom nav entirely. Sidebar: logo at top, vertical nav (Beranda/Catatan/Pengingat/Edukasi/Profil), "Catat Cairan" primary button fixed at bottom. Content: multi-column, max-width 1280px. Header becomes a top bar (page title + user avatar).

### Claude's Discretion
- Nav icon set: Beranda=house, Catatan=clipboard/pencil, Pengingat=bell, Edukasi=book, Profil=person. Standard Lucide icons.
- Active state: Bottom nav → filled icon + teal label. Sidebar → left border teal accent + teal text + subtle teal background.
- Empty states: Delta card with no data shows "0 ml balance" in neutral grey (not red).
- Desktop header: page title (left) + notification bell + user avatar (right). No logo in top bar.
- Breakpoints: Use Tailwind `md:` (768px) and `lg:` (1024px) — close enough to 768/1024 targets; verify at exact widths per RESPONSIVE-04.
- CAPD effluent non-dismissable warning: full-width red banner at TOP of Beranda, requires "Saya mengerti, hubungi dokter segera" button to dismiss.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within Phase 2 scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FLUID-01 | Log fluid entry with type, source, CAPD concentration, decimal volume, unit | FluidLog schema + fluidLog service + form with conditional CAPD fields |
| FLUID-02 | Auto-calculate daily in/out delta on dashboard, updated on each new entry | Backend computes sum(masuk) - sum(keluar) per day; returned in API response |
| FLUID-03 | CAPD: log outgoing fluid condition; immediate non-dismissable red banner if abnormal | Service-layer rule check (keruh/berdarah → anomaly); Alert Darurat component on Beranda |
| FLUID-04 | Retroactive entry with past date/time, flagged as late entry | `is_late_entry` boolean + `waktu` timestamp user-selectable in form |
| FLUID-05 | Offline entry stored locally, synced when connection returns | IndexedDB queue (idb library); sync on `online` event; service worker background sync |
| REMIND-01 | Create medication reminder with name, dose, type, timing note, active days, time, optional photo | Extended reminder_schedule schema + multer for photo upload |
| REMIND-02 | Push notification at scheduled reminder time with med name + photo | node-cron queries Postgres each minute; web-push sends to all push_subscriptions for user |
| REMIND-03 | Confirm dose taken directly from notification; confirmation logged in medication_log | Service worker `notificationclick` action handler; POST /api/medication-log/confirm |
| REMIND-04 | Follow-up reminder if unconfirmed after 30 minutes | node-cron second-pass at tick + 30min: check medication_log for 'tertunda' rows older than 30min |
| REMIND-05 | CAPD patient sets exchange reminders with time and fluid concentration | jenis='capd' in reminder_schedule + konsentrasiCapd field; CAPD-only conditional UI |
| REMIND-06 | HD patient sets dialysis schedule with day(s) of week and time | jenis='hd' in reminder_schedule + tanggalSpesifik + hariAktif array |
| REMIND-07 | Therapy change preserves medication reminders; auto-adjusts therapy-specific (CAPD/HD) reminders | therapyService.onMethodChange() sets aktif=false for CAPD/HD reminders when method changes |
| REMIND-08 | Caregiver on separate device receives same reminders independently | Per-device push_subscriptions table (one-to-many from user_id); fan-out to all rows |
| NOTIF-01 | Install KidneyBuddy as PWA; grant browser push permission | @serwist/turbopack + manifest.ts + permission request inside click handler |
| NOTIF-02 | Each device registers its own push subscription independently | push_subscriptions table, unique on endpoint; POST /api/push/subscribe |
| NOTIF-03 | iOS: prompt Add to Home Screen before enabling notifications | iOS detection (navigator.standalone + UA); interstitial shown if iOS and not standalone |
| RESPONSIVE-01 | Mobile (375–767px): single-column, 5-tab bottom nav, FAB | Tailwind default + FAB component; shell in layout.tsx |
| RESPONSIVE-02 | Tablet (768–1023px): 2-column dashboard/list, bottom nav unchanged | Tailwind `md:grid-cols-2` for card grids; nav unchanged |
| RESPONSIVE-03 | Desktop (1024px+): left sidebar replaces bottom nav, multi-column, max-width 1280px | Tailwind `lg:` breakpoint; conditional render of BottomNav vs Sidebar |
| RESPONSIVE-04 | Verified on Chrome mobile, Safari iOS, Chrome desktop, Firefox desktop at 375/768/1024/1280px | Manual browser testing checklist; no automated test can cover this fully |
</phase_requirements>

---

## Summary

Phase 2 is the system's highest-risk, highest-value phase — it builds the core tracking features that define KidneyBuddy's clinical value proposition (fluid balance with CAPD safety alerts, medication adherence with push delivery) while simultaneously establishing three cross-cutting foundations that every later phase depends on: the full responsive UI shell, the VAPID push subscription infrastructure, and PWA installability. The phase has unusual technical complexity because multiple independently difficult problems must ship together in one phase: iOS push gating, per-device subscription fan-out for caregiver multi-device, in-process cron resilience across container restarts, application-layer AES-256-GCM encryption for health data, and offline-first form submission via IndexedDB.

The most critical architectural decision for this phase is that **push subscriptions must be modeled per-device** (one-to-many from user_id) — getting this wrong at the schema level cannot be patched without a data migration. The second most critical decision is using **`@serwist/turbopack`** (not `@serwist/next`) for service worker integration, since Next.js 16's default Turbopack bundler requires the Turbopack-specific Serwist package. The third is that **node-cron jobs must query Postgres on every tick** rather than maintain in-memory state — Railway/Render free-tier containers restart frequently, and in-memory schedules vanish silently on every restart.

**Primary recommendation:** Build the responsive shell and PWA/push infrastructure in Wave 1 (the foundation everything else rests on), then add fluid logging and dashboard in Wave 2, then medication reminders and cron delivery in Wave 3. Do not defer push subscription plumbing to the end — it is the load-bearing infrastructure for reminder delivery.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fluid log form (input collection) | Browser/Client | — | UI state only; no computation |
| Daily fluid balance calculation | API/Backend | — | PRD constraint: no business logic in frontend |
| CAPD effluent anomaly rule check | API/Backend | — | Rule must fire server-side; frontend only displays result flag |
| CAPD effluent banner display | Browser/Client | — | UI rendering of server-computed `hasAbnormalCondition` flag |
| Offline form queue | Browser/Client (IndexedDB) | Service Worker | Client-side persistence; SW handles background sync |
| PWA manifest | Frontend Server (Next.js) | — | Native `app/manifest.ts` generates `/manifest.json` |
| Service worker (push handler, cache) | Browser/Client (SW) | Frontend Server builds SW | SW runs in browser; Next.js build injects precache manifest |
| Push subscription registration | Browser/Client | API/Backend (store) | `PushManager.subscribe()` client-side; subscription POSTed to backend |
| Push notification delivery | API/Backend | External Push Service | `web-push` library calls Apple/Google/Mozilla push service |
| node-cron reminder scheduler | API/Backend | — | In-process, reads Postgres for due reminders each tick |
| AES-256-GCM encryption/decryption | API/Backend | — | Encrypt before INSERT, decrypt after SELECT — key never leaves backend |
| Responsive layout shell | Browser/Client | Frontend Server (RSC) | CSS breakpoints in layout.tsx; rendered per-client |
| iOS install gate UI | Browser/Client | — | Detect `navigator.standalone`; show interstitial in browser only |
| Photo upload (medication photo) | API/Backend (multer) | — | Backend receives multipart, stores file path in DB |

---

## Standard Stack

### Phase 2 New Packages — Backend

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `web-push` | 3.6.7 | VAPID push notification delivery | De facto Node.js web push standard; used in MDN examples; actively maintained at `web-push-libs/web-push` |
| `node-cron` | 4.5.0 | In-process scheduled job for reminder checks | Rewrote in TypeScript v4 (zero deps); 3-container constraint rules out Redis/BullMQ |
| `multer` | 2.2.0 | Multipart file upload (medication photos) | Official expressjs org package; storage engine swappable to S3 post-MVP |
| `helmet` | 8.2.0 | HTTP security headers (CSP, HSTS, X-Frame-Options) | Standard baseline hardening; needed in Phase 2 since auth APIs go live here |
| `@types/web-push` | 3.6.4 | TypeScript types for web-push | Official DT types |
| `@types/multer` | 2.1.0 | TypeScript types for multer | Official DT types |

### Phase 2 New Packages — Frontend

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@serwist/turbopack` | 9.5.11 | Service worker + PWA integration for Next.js + Turbopack | Required for Turbopack mode (Next.js 16 default); `@serwist/next` is webpack-only |
| `serwist` | 9.5.11 | Core Serwist runtime (peer dependency of @serwist/turbopack) | Same version as @serwist/turbopack; provides the Serwist class in sw.ts |
| `esbuild` | 0.28.1 | Service worker bundling (peer dependency of @serwist/turbopack) | Required by @serwist/turbopack for SW compilation |
| `idb` | 8.0.3 | IndexedDB wrapper for offline form queue (FLUID-05) | Jake Archibald / Google; tiny, typed, promise-based; avoids raw IndexedDB verbosity |

**Note — @serwist/next vs @serwist/turbopack:** The existing STACK.md and CLAUDE.md reference `@serwist/next`. **This is incorrect for Next.js 16 + Turbopack.** Serwist maintains a separate `@serwist/turbopack` package specifically for Turbopack. Using `@serwist/next` (webpack-based) with Turbopack requires `next build --no-turbo` which adds a production build difference from dev. Use `@serwist/turbopack` to avoid this. [VERIFIED: serwist.pages.dev/docs/next/turbo]

### Already Installed (Phase 1) — Reused Without Change

| Library | Purpose |
|---------|---------|
| `drizzle-orm@0.45.x` + `drizzle-kit@0.31.x` | Schema extension, migrations |
| `pg@8.22.x` | Postgres pool |
| `zod@3.24.x` | Validation (server + client) |
| `react-hook-form@7.x` + `@hookform/resolvers` | Form management |
| `jsonwebtoken@9.0.x` | JWT auth on all Phase 2 routes |
| `pino@9.x` | Structured logging for cron job heartbeat |
| `tailwindcss@4.x`, `shadcn/ui` | Styling and component primitives |
| `lucide-react` | Icons (nav icons, FAB icon) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@serwist/turbopack` | `@serwist/next` + `next build --no-turbo` | Webpack builds are slower; adds production/dev divergence |
| `idb` | Raw IndexedDB API | Verbose, callback-based without promisification; idb is tiny (2KB) and typed |
| `node-cron@4.x` | `node-cron@3.x` | v4 is TypeScript-native with zero deps — no reason to pin to v3 for new code |
| App-layer AES-256-GCM | pgcrypto `pgp_sym_encrypt` | pgcrypto key transits query logs/pg_stat_statements; app-layer keeps key out of DB entirely |
| Local Docker volume | Railway Buckets / Cloudflare R2 | Railway Buckets cost money; local volume is free and sufficient for MVP photo storage |

**Installation (Phase 2 additions):**
```bash
# Backend additions
cd backend
npm install web-push node-cron multer helmet
npm install -D @types/web-push @types/multer

# Frontend additions
cd frontend
npm install @serwist/turbopack serwist esbuild idb
```

---

## Package Legitimacy Audit

> slopcheck was not available at research time. All packages verified via npm registry (npm view) and cross-referenced against known authoritative source repositories. No package with slopcheck [SLOP] or [SUS] verdict to report.

| Package | Registry | Age | Source Repo | npm view verified | Disposition |
|---------|----------|-----|-------------|-------------------|-------------|
| `web-push` | npm | ~9 yrs | github.com/web-push-libs/web-push | 3.6.7 ✓ | [ASSUMED] Approved — expressjs-adjacent, MDN-referenced |
| `node-cron` | npm | ~9 yrs | github.com/node-cron/node-cron | 4.5.0 ✓ | [ASSUMED] Approved — wide use, TypeScript-native in v4 |
| `multer` | npm | ~10 yrs | github.com/expressjs/multer | 2.2.0 ✓ | [ASSUMED] Approved — expressjs org official |
| `helmet` | npm | ~12 yrs | github.com/helmetjs/helmet | 8.2.0 ✓ | [ASSUMED] Approved — security standard, very long history |
| `@serwist/turbopack` | npm | ~2 yrs | github.com/serwist/serwist | 9.5.11 ✓ | [ASSUMED] Approved — official Serwist package |
| `serwist` | npm | ~2 yrs | github.com/serwist/serwist | 9.5.11 ✓ | [ASSUMED] Approved — same monorepo |
| `esbuild` | npm | ~5 yrs | github.com/evanw/esbuild | 0.28.1 ✓ | [ASSUMED] Approved — Evan Wallace, extremely well-known |
| `idb` | npm | ~8 yrs | github.com/jakearchibald/idb | 8.0.3 ✓ | [ASSUMED] Approved — Jake Archibald (Google Chrome team) |
| `@types/web-push` | npm | ~6 yrs | microsoft/DefinitelyTyped | 3.6.4 ✓ | [ASSUMED] Approved |
| `@types/multer` | npm | ~8 yrs | microsoft/DefinitelyTyped | 2.1.0 ✓ | [ASSUMED] Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable at research time — all packages are tagged [ASSUMED]. The planner should consider adding a `checkpoint:human-verify` before any npm install of these packages if the team has not used them before. Given all packages are well-known and have authoritative source repos, risk is LOW.*

---

## Architecture Patterns

### System Architecture Diagram (Phase 2 additions shown in bold)

```
Browser (iOS Safari / Chrome)
  ├── Next.js App (RSC + Client)
  │   ├── Shell (layout.tsx): responsive sidebar / bottom-nav conditional
  │   ├── Beranda: delta card, obat card, pengingat card, AI placeholder
  │   ├── Catatan/Cairan + Catatan/Obat: fluid log list + medication log
  │   ├── Pengingat: reminder list + create/edit form
  │   ├── Edukasi: placeholder
  │   └── Profil: (Phase 1 profile page)
  ├── Service Worker (app/sw.ts → public/sw.js via @serwist/turbopack)
  │   ├── push event → showNotification(name, dose, photo)
  │   ├── notificationclick → confirm action → POST /api/medication-log/confirm
  │   └── fetch intercept → offline queue → IndexedDB (idb)
  └── PushManager.subscribe() → POST /api/push/subscribe → Backend

Backend (Express 5 — same container as Phase 1)
  ├── New routes: /api/fluid, /api/medication-log, /api/reminders, /api/push
  ├── encrypt(plaintext) / decrypt(ciphertext) helpers [Node crypto AES-256-GCM]
  ├── node-cron tick (every minute):
  │   └── query reminder_schedule WHERE jam_pengingat matches AND NOT yet sent today
  │       → notificationService.sendToAllDevices(userId, payload)
  │           → pushSubscriptionRepo.findActiveByUser(userId)
  │               → webpush.sendNotification() × N devices (Promise.allSettled)
  │                   → 410 Gone → deactivate that row only
  ├── boot-time catch-up: check for reminders that fired while process was down
  └── /api/push/subscribe: upsert push_subscriptions by endpoint (unique key)

Database (Postgres 16 — existing container)
  ├── fluid_log [NEW] — encrypted catatan column
  ├── medication_log [NEW] — encrypted notes
  ├── push_subscriptions [NEW] — per-device, unique on endpoint
  └── reminder_schedule [EXTEND] — add dose, jenis_obat, foto_obat, konsentrasi_capd,
                                     follow_up_sent, last_notification_sent_at
```

### Recommended Project Structure (Phase 2 additions)

```
backend/src/
├── routes/
│   ├── fluid.routes.ts       [NEW] — /api/fluid
│   ├── medicationLog.routes.ts [NEW] — /api/medication-log
│   ├── reminders.routes.ts   [NEW] — /api/reminders
│   └── push.routes.ts        [NEW] — /api/push
├── controllers/
│   ├── fluid.controller.ts
│   ├── medicationLog.controller.ts
│   ├── reminders.controller.ts
│   └── push.controller.ts
├── services/
│   ├── fluid.service.ts      — balance calc, CAPD condition check, encryption
│   ├── medicationLog.service.ts — confirm/missed state transitions
│   ├── reminders.service.ts  — CRUD, therapy-type validation
│   ├── notification.service.ts — sendToAllDevices(userId, payload) fan-out
│   └── push.service.ts       — subscribe/unsubscribe, 410 cleanup
├── repositories/
│   ├── fluidLog.repository.ts
│   ├── medicationLog.repository.ts
│   ├── reminderSchedule.repository.ts
│   └── pushSubscription.repository.ts
├── jobs/
│   ├── reminderDispatch.job.ts   [NEW] — every minute, queries due reminders
│   ├── reminderFollowUp.job.ts   [NEW] — every minute, checks unconfirmed after 30min
│   └── scheduler.ts              [NEW] — registers both jobs at server boot
├── lib/
│   ├── encryption.ts         [NEW] — AES-256-GCM encrypt/decrypt helpers
│   └── webPushClient.ts      [NEW] — VAPID config, sendNotification wrapper
└── db/
    ├── migrations/
    │   └── 0005_phase2_tracking.sql [NEW]
    └── schema/
        ├── fluidLog.schema.ts       [NEW]
        ├── medicationLog.schema.ts  [NEW]
        └── pushSubscriptions.schema.ts [NEW]

frontend/
├── app/
│   ├── layout.tsx              [MODIFY] — add responsive shell (BottomNav + Sidebar)
│   ├── manifest.ts             [NEW] — PWA manifest via MetadataRoute.Manifest
│   ├── sw.ts                   [NEW] — service worker source (@serwist/turbopack)
│   ├── serwist/[path]/
│   │   └── route.ts            [NEW] — Serwist route handler for Turbopack
│   ├── dashboard/page.tsx      [MODIFY] — replace placeholder with Beranda cards
│   ├── catatan/
│   │   ├── page.tsx            [NEW] — sub-tab shell (Cairan | Obat)
│   │   ├── cairan/page.tsx     [NEW] — fluid log list
│   │   └── obat/page.tsx       [NEW] — medication log list
│   ├── pengingat/page.tsx      [NEW] — reminder list + create
│   ├── edukasi/page.tsx        [NEW] — placeholder
│   └── profil/page.tsx         [Phase 1 profile, add push settings]
├── components/
│   ├── shell/
│   │   ├── BottomNav.tsx       [NEW] — 5-tab mobile/tablet bottom nav
│   │   ├── Sidebar.tsx         [NEW] — desktop left sidebar
│   │   ├── AppShell.tsx        [NEW] — conditionally renders BottomNav vs Sidebar
│   │   ├── FAB.tsx             [NEW] — floating action button above bottom nav
│   │   └── TopBar.tsx          [NEW] — desktop top bar (page title + avatar)
│   ├── beranda/
│   │   ├── DeltaCairanCard.tsx [NEW]
│   │   ├── ObatCard.tsx        [NEW]
│   │   ├── PengingatBerikutnyaCard.tsx [NEW]
│   │   ├── AiPlaceholderCard.tsx [NEW]
│   │   └── CAPDEffluentBanner.tsx [NEW] — Alert Darurat, non-dismissable
│   ├── cairan/
│   │   └── CatatCairanForm.tsx [NEW] — fluid log form with CAPD conditional fields
│   └── push/
│       └── InstallPrompt.tsx   [NEW] — iOS Add-to-Home-Screen interstitial
├── lib/
│   ├── pushClient.ts           [NEW] — subscribe/unsubscribe, POST to /api/push
│   └── offlineQueue.ts         [NEW] — IndexedDB queue via idb for FLUID-05
└── next.config.ts              [MODIFY] — add withSerwist wrapper
```

### Pattern 1: Serwist + Turbopack PWA Setup

**What:** Next.js 16 uses Turbopack by default; `@serwist/turbopack` provides the native Turbopack integration for service worker generation and PWA support.
**When to use:** Always for this project. Do not use `@serwist/next` (webpack-based) with Turbopack.

```typescript
// next.config.ts  [CITED: serwist.pages.dev/docs/next/turbo]
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default withSerwist(nextConfig);
```

```typescript
// app/sw.ts — service worker source
import { defaultCache } from "@serwist/turbopack/worker";
import { Serwist } from "serwist";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Push notification handler
self.addEventListener("push", (event: PushEvent) => {
  const data = event.data?.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      data: { reminderId: data.reminderId },
      actions: [
        { action: "confirm", title: "✓ Sudah diminum" },
        { action: "dismiss", title: "Tutup" },
      ],
    })
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  if (event.action === "confirm") {
    event.waitUntil(
      fetch("/api/medication-log/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderId: event.notification.data.reminderId }),
        credentials: "include",
      })
    );
  }
});
```

```typescript
// app/layout.tsx — add SerwistProvider
import { SerwistProvider } from "@serwist/turbopack/react";
// ...
<SerwistProvider swUrl="/serwist/sw.js">{children}</SerwistProvider>
```

```typescript
// app/manifest.ts — native Next.js manifest  [CITED: nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest]
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KidneyBuddy",
    short_name: "KidneyBuddy",
    description: "Pendamping harian pasien gagal ginjal kronis",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fdf9f3",
    theme_color: "#2a9d8f",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

### Pattern 2: VAPID Push Subscription (Per-Device Fan-Out)

**What:** Backend stores one `push_subscriptions` row per device (keyed by `endpoint`). Sending notifications loops over all active rows for a `user_id`, independent of how many devices share that account.
**When to use:** Every reminder send, follow-up reminder, emergency alert. Never address push to a user_id without the fan-out loop.

```typescript
// lib/webPushClient.ts
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!, // Must be "mailto:email@domain.com" or "https://..." — Apple requires this
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export { webpush };
```

```typescript
// services/notification.service.ts — fan-out to all devices
import { webpush } from "../lib/webPushClient.js";
import { pushSubscriptionRepo } from "../repositories/pushSubscription.repository.js";

export async function sendToAllDevices(
  userId: string,
  payload: { title: string; body: string; reminderId?: string }
): Promise<void> {
  const subs = await pushSubscriptionRepo.findActiveByUser(userId);
  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(sub.subscriptionObject, JSON.stringify(payload))
    )
  );
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected") {
      const err = r.reason as any;
      if (err.statusCode === 410) {
        // Subscription expired — deactivate this device only
        await pushSubscriptionRepo.deactivate(subs[i].id);
      }
      // Other errors: log but don't throw — partial delivery is better than none
    }
  }
}
```

```typescript
// db/schema/pushSubscriptions.schema.ts
import { pgTable, uuid, text, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(), // unique — one row per device
  subscriptionObject: jsonb("subscription_object").notNull(), // full PushSubscription JSON
  deviceLabel: text("device_label"), // optional: "iPhone 15 Safari", user-set later
  aktif: boolean("aktif").notNull().default(true),
  lastConfirmedAt: timestamp("last_confirmed_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### Pattern 3: node-cron Backed by Postgres (Restart-Safe Reminders)

**What:** `node-cron` fires every minute. Each tick queries `reminder_schedule` for reminders due in the current minute window. State is in Postgres, not memory — a container restart doesn't lose the schedule.
**When to use:** All reminder dispatch (REMIND-02, -04, -05, -06). Never use `setTimeout` per-reminder or setInterval with in-memory lists.

```typescript
// jobs/scheduler.ts
import { schedule } from "node-cron";
import { dispatchDueReminders } from "./reminderDispatch.job.js";
import { sendFollowUpReminders } from "./reminderFollowUp.job.js";

export function startScheduler(): void {
  // Boot-time catch-up: fire immediately to catch anything missed during downtime
  dispatchDueReminders().catch(err => logger.error("boot catch-up failed", err));

  // Every minute: check for due reminders
  schedule("* * * * *", () => {
    dispatchDueReminders().catch(err => logger.error("reminder dispatch failed", err));
  });

  // Every minute: check for unconfirmed reminders 30+ minutes past due
  schedule("* * * * *", () => {
    sendFollowUpReminders().catch(err => logger.error("follow-up dispatch failed", err));
  });
}

// server.ts
import { startScheduler } from "./jobs/scheduler.js";
// ... after app.listen():
startScheduler();
```

```typescript
// jobs/reminderDispatch.job.ts
import { db } from "../lib/db.js";
import { reminderSchedule, medicationLog } from "../db/schema/index.js";
import { and, eq, sql } from "drizzle-orm";
import { sendToAllDevices } from "../services/notification.service.js";

export async function dispatchDueReminders(): Promise<void> {
  const now = new Date();
  const currentTimeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  const currentDay = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"][now.getDay()];

  // Find reminders due at this minute, active, not already sent this minute
  const dueReminders = await db.query.reminderSchedule.findMany({
    where: and(
      eq(reminderSchedule.aktif, true),
      eq(reminderSchedule.jamPengingat, currentTimeStr),
      sql`${reminderSchedule.hariAktif} @> ${JSON.stringify([currentDay])}::jsonb`,
      // Guard: last_notification_sent_at not in the last 90 seconds (overlap prevention)
      sql`(${reminderSchedule.lastNotificationSentAt} IS NULL OR
           ${reminderSchedule.lastNotificationSentAt} < NOW() - INTERVAL '90 seconds')`
    ),
  });

  for (const reminder of dueReminders) {
    // Create medication_log row with status 'tertunda'
    await db.insert(medicationLog).values({
      userId: reminder.userId,
      reminderId: reminder.id,
      namaObat: reminder.nama,
      dosis: reminder.dosis,
      jenisObat: reminder.jenisObat,
      status: "tertunda",
      waktuPengingat: new Date(),
    });

    await sendToAllDevices(reminder.userId, {
      title: `Pengingat: ${reminder.nama}`,
      body: reminder.dosis ? `Dosis: ${reminder.dosis}` : "Saatnya minum obat",
      reminderId: reminder.id,
    });

    // Mark as sent to prevent duplicate dispatch in the same tick
    await db.update(reminderSchedule)
      .set({ lastNotificationSentAt: new Date() })
      .where(eq(reminderSchedule.id, reminder.id));
  }
}
```

### Pattern 4: AES-256-GCM Application-Layer Encryption

**What:** Sensitive text columns (`fluid_log.catatan`, `medication_log` free-text fields) are encrypted in the Backend before INSERT and decrypted after SELECT, using Node.js built-in `crypto`. The encryption key never appears in any SQL query.
**When to use:** `fluid_log.catatan`, `medication_log.catatanWaktu` (free text), any column listed in NFR-02 (fluid_log, medication_log). NOT for indexed columns (UUIDs, enums, timestamps) — encryption breaks indexing.

```typescript
// lib/encryption.ts — [CITED: Node.js crypto docs, nodejs.org/api/crypto.html]
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex"); // 32 bytes = 64 hex chars

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12); // 96-bit nonce for GCM
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Store as: iv:authTag:ciphertext (all hex-encoded)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

// Usage in fluid.service.ts:
// const encryptedNote = entry.catatan ? encrypt(entry.catatan) : null;
// ... INSERT with encryptedNote
// ... SELECT returns encryptedNote → decrypt(encryptedNote)
```

**ENCRYPTION_KEY generation (run once, store in .env / Railway secrets):**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Pattern 5: iOS PWA Install Detection

**What:** Detect if the user is on iOS Safari and whether the PWA has been added to the Home Screen. Show an Add-to-Home-Screen interstitial before allowing push subscription setup.
**When to use:** Before calling `pushManager.subscribe()` on any iOS device.

```typescript
// lib/pwaDetection.ts — [CITED: developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers]
export const isIos = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
};

export const isInStandaloneMode = (): boolean => {
  if (typeof window === "undefined") return false;
  // navigator.standalone is true only when launched from Home Screen on iOS
  return (window.navigator as any).standalone === true;
};

// Usage in InstallPrompt.tsx:
// if (isIos() && !isInStandaloneMode()) → show Add-to-Home-Screen interstitial
// Never call Notification.requestPermission() unless !isIos() || isInStandaloneMode()
```

**Critical iOS rule:** `Notification.requestPermission()` on iOS must be called **directly inside a `click` event handler** — never inside a `useEffect`, `setTimeout`, Promise `.then()`, or after any `await`. Calling it asynchronously causes it to silently no-op with no error thrown.

```typescript
// Correct pattern — must be in onClick:
async function handleEnableNotifications() { // called by button onClick ONLY
  const permission = await Notification.requestPermission(); // ← directly in click handler
  if (permission !== "granted") return;
  const sub = await registration.pushManager.subscribe({ ... });
  await apiFetch("/api/push/subscribe", { method: "POST", body: JSON.stringify(sub) });
}
```

### Pattern 6: FluidLog Schema + Daily Balance Endpoint

```typescript
// db/schema/fluidLog.schema.ts
import { pgTable, uuid, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const fluidLog = pgTable("fluid_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  tanggal: text("tanggal").notNull(), // 'YYYY-MM-DD' — date as string for timezone safety
  waktu: text("waktu").notNull(),     // 'HH:mm' or full ISO if retroactive
  tipe: text("tipe").notNull(),       // 'masuk' | 'keluar'
  sumber: text("sumber"),             // 'minuman' | 'makanan' | 'capd' | 'lainnya' | null (keluar)
  konsentrasiCapd: text("konsentrasi_capd"), // '1.5%' | '2.5%' | '4.25%' | 'icodextrin_7.5%' | 'lainnya' | null
  volume: numeric("volume", { precision: 8, scale: 2 }).notNull(), // supports "1.75" decimals
  satuan: text("satuan").notNull().default("ml"), // 'ml' | 'kg'
  kondisiKeluar: text("kondisi_keluar"), // 'jernih' | 'keruh' | 'keruh_gumpalan' | 'berdarah' | null
  catatan: text("catatan"),            // ENCRYPTED before INSERT
  isLateEntry: boolean("is_late_entry").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

**Daily balance query (backend, not client):**
```typescript
// repositories/fluidLog.repository.ts
export async function getDailyBalance(userId: string, date: string) {
  const rows = await db.select({ tipe: fluidLog.tipe, volume: fluidLog.volume })
    .from(fluidLog)
    .where(and(eq(fluidLog.userId, userId), eq(fluidLog.tanggal, date)));

  const masuk = rows.filter(r => r.tipe === "masuk").reduce((s, r) => s + Number(r.volume), 0);
  const keluar = rows.filter(r => r.tipe === "keluar").reduce((s, r) => s + Number(r.volume), 0);
  return { masuk, keluar, delta: masuk - keluar, unit: "ml" };
}
```

### Pattern 7: Responsive Shell (AppShell Component)

**What:** `app/layout.tsx` wraps page content in `AppShell`, which conditionally renders `BottomNav` (mobile/tablet) or `Sidebar` (desktop) using Tailwind breakpoints. Auth pages `(auth)/` are excluded from the shell via route groups.

```typescript
// components/shell/AppShell.tsx
"use client";
export function AppShell({ children }: { children: React.ReactNode }) {
  // The shell is present but visibility is CSS-driven via Tailwind
  return (
    <div className="flex flex-col min-h-screen lg:flex-row">
      {/* Sidebar: hidden on mobile/tablet, visible on lg+ */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-auto pb-20 lg:pb-0">
        <TopBar className="hidden lg:flex" />  {/* desktop only */}
        <MobileHeader className="flex lg:hidden" />  {/* mobile/tablet */}
        <div className="flex-1 p-4 md:p-6 max-w-screen-xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Bottom nav: hidden on lg+; shown on mobile and tablet */}
      <nav className="fixed bottom-0 inset-x-0 lg:hidden z-40">
        {/* FAB floats above nav */}
        <FAB className="absolute -top-7 left-1/2 -translate-x-1/2" />
        <BottomNav />
      </nav>
    </div>
  );
}
```

**Note on route groups:** Auth pages (`(auth)/register`, `(auth)/login`, `(auth)/onboarding`) should NOT get the shell. Modify `app/layout.tsx` to apply `AppShell` conditionally, OR create an `(app)/layout.tsx` group that wraps only authenticated pages in the shell.

### Pattern 8: ReminderSchedule Extension (Migration)

Phase 1 created `reminder_schedule` with: id, userId, jenis, nama, jamPengingat, hariAktif, catatanWaktu, aktif, createdAt. Phase 2 adds:

```sql
-- 0005_phase2_tracking.sql (generated by drizzle-kit generate)
ALTER TABLE reminder_schedule
  ADD COLUMN dosis TEXT,
  ADD COLUMN jenis_obat TEXT, -- 'minum' | 'suntik' | null
  ADD COLUMN foto_obat TEXT,  -- file path, nullable
  ADD COLUMN konsentrasi_capd TEXT, -- for CAPD exchange reminders
  ADD COLUMN follow_up_sent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN last_notification_sent_at TIMESTAMP;

CREATE TABLE fluid_log ( ... );  -- see fluidLog.schema.ts above
CREATE TABLE medication_log ( ... );
CREATE TABLE push_subscriptions ( ... );
```

**Important:** Do NOT regenerate `reminder_schedule` from scratch. Use Drizzle's `ALTER TABLE` migration to extend the existing table, preserving any existing reminder rows from onboarding.

### Anti-Patterns to Avoid

- **In-memory cron state:** Never `setTimeout(sendReminder, delayMs)` per reminder. Container restarts (common on Railway free tier) drop all pending timers silently.
- **Per-user push subscription (overwriting):** A `UNIQUE(user_id)` constraint on push_subscriptions silently breaks caregiver multi-device. The unique key must be `endpoint` (per-device URL), not `user_id`.
- **Calling `Notification.requestPermission()` after async:** The browser rejects permission requests not directly triggered by a user gesture on iOS. No `await fetch(...)` between the click and the permission call.
- **Using @serwist/next with Turbopack:** Will cause build failures or require `--no-turbo`. Use `@serwist/turbopack` instead.
- **pgcrypto for health column encryption:** Key transits Postgres query logs. Use Node `crypto` instead.
- **Frontend computing fluid balance:** Server returns `delta` in API response. Client renders it. Never replicate the calculation client-side — it creates a dual-truth problem.
- **Encrypting indexed columns (userId, tipe, tanggal):** Encrypted columns cannot be queried efficiently. Only encrypt free-text "catatan" columns, never structural fields used in WHERE clauses.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service worker + PWA build integration | Custom webpack/Turbopack plugin | `@serwist/turbopack` | Precache manifest injection is complex; Serwist handles versioned hashes, runtime caching, and the Turbopack build hook correctly |
| VAPID push delivery | Custom HTTP calls to FCM/APNs | `web-push` library | VAPID signing, ECE encryption of push payload, 410-Gone handling are specified in W3C/RFC; the library implements all of them correctly |
| IndexedDB raw API | `indexedDB.open()`, onupgradeneeded, IDBTransaction | `idb` (Jake Archibald) | Raw IndexedDB API is callback-based and verbose; idb is a 2KB typed promise wrapper used by Google in production |
| AES-256-GCM from scratch | Any manual XOR or custom cipher | Node.js built-in `crypto` | Correct GCM with auth tag + random nonce is already in the Node.js standard library; no external dep needed |
| Push subscription table | Session-scoped storage or per-user overwrite | Dedicated `push_subscriptions` table, unique on endpoint | Only a proper one-to-many DB table survives restarts and correctly handles multiple devices per account |
| Cron-based reminder dispatch | In-memory `setInterval` per reminder | `node-cron` + Postgres query per tick | In-memory approach drops all reminders on container restart; Postgres-backed survives any number of restarts |

**Key insight:** The two biggest "looks simple but isn't" hand-roll traps in this phase are (1) push subscription storage (resist the per-user overwrite shortcut) and (2) in-memory reminder scheduling (resist the setInterval shortcut). Both produce no visible error on failure — reminders simply stop.

---

## Common Pitfalls

### Pitfall 1: @serwist/next Used Instead of @serwist/turbopack

**What goes wrong:** Next.js 16 defaults to Turbopack. `@serwist/next` uses webpack APIs for service worker injection. With Turbopack, either the build fails entirely or requires falling back to `next build --no-turbo` — meaning prod builds are slower than dev and the bundler config diverges.
**Why it happens:** STACK.md (written before Serwist released the dedicated Turbopack package) listed `@serwist/next`. The Turbopack package was released with Serwist 9.x.
**How to avoid:** Install `@serwist/turbopack serwist esbuild` (not `@serwist/next`). Use `withSerwist` from `@serwist/turbopack` in `next.config.ts`. Import from `@serwist/turbopack/worker` in `app/sw.ts`.
**Warning signs:** `next build` emits a warning about webpack config being applied in Turbopack mode. Or build succeeds but `/serwist/sw.js` 404s in the browser.

### Pitfall 2: iOS Push Never Works Because Permission Called After Async

**What goes wrong:** Permission request silently no-ops. No error is thrown. The user never sees the permission dialog. The subscription object is null. The subsequent `pushManager.subscribe()` throws a cryptic error.
**Why it happens:** iOS Safari enforces that `Notification.requestPermission()` must be called in a synchronous user-gesture stack frame. Any `await` before the call breaks the gesture linkage even if the `await` completed immediately.
**How to avoid:** The button's `onClick` handler MUST call `Notification.requestPermission()` as the first expression — before any `await`, before any `if` block, before any `fetch`. Restructure the code flow to ensure this.
**Warning signs:** Testing only on Android/desktop Chrome (where the constraint doesn't apply). Zero system permission prompts appearing on iPhone test device.

### Pitfall 3: reminder_schedule Extended Incorrectly (Recreated Instead of Migrated)

**What goes wrong:** Developer runs `drizzle-kit generate` after modifying `reminderSchedule.schema.ts` with new columns but without explicitly altering the existing table — gets a DROP + CREATE migration instead of ALTER. Existing reminder rows from onboarding are silently deleted.
**Why it happens:** Drizzle Kit generates ALTER TABLE for column additions, but if schema changes look like a "rename" or major restructure to the diffing algorithm, it may produce a destructive migration.
**How to avoid:** Review the generated SQL in `backend/src/db/migrations/` BEFORE running `drizzle-kit migrate`. Confirm it uses `ALTER TABLE reminder_schedule ADD COLUMN` not `DROP TABLE ... CREATE TABLE`. Never run generated migrations in production without reviewing the SQL file.
**Warning signs:** Migration file contains `DROP TABLE "reminder_schedule"`. Or Phase 2 launch shows no prior reminders in the scheduler.

### Pitfall 4: push_subscriptions Unique Constraint on user_id (Not endpoint)

**What goes wrong:** The second device to subscribe (caregiver) overwrites the first (patient). One of them stops receiving push notifications. No error is thrown — the notification sends to the surviving row, which may be the wrong device.
**Why it happens:** The natural mental model of "one user = one subscription" leads to `UNIQUE(user_id)` in the schema.
**How to avoid:** The unique constraint must be on `endpoint` (the device-specific URL returned by `PushManager.subscribe()`). On subscribe, do an upsert keyed by endpoint: `INSERT ... ON CONFLICT (endpoint) DO UPDATE SET subscription_object = EXCLUDED.subscription_object, aktif = true`.
**Warning signs:** `push_subscriptions` table has exactly one row per user even when two devices are logged in.

### Pitfall 5: iOS Subscription Silently Expires After ~1-2 Weeks

**What goes wrong:** CAPD patient installs app in week 1. By week 3, push reminders stop arriving on their iPhone with zero visible error on client or server.
**Why it happens:** Apple's iOS web push implementation silently invalidates subscriptions after inactivity periods (~1-2 weeks). Unlike Chrome, iOS does not reliably populate `expirationTime`.
**How to avoid:** On every app foreground (`visibilitychange` event), call `registration.pushManager.getSubscription()` and re-subscribe if null or changed. POST the fresh subscription to `/api/push/subscribe` (upsert by endpoint). Track `last_confirmed_at` per row in `push_subscriptions`; surface an in-app banner if >10 days stale: "Pengingat mungkin tidak aktif — buka pengaturan notifikasi."
**Warning signs:** No re-subscription logic on app open. `last_confirmed_at` never updates. iOS test device stops receiving push after a week.

### Pitfall 6: CAPD Effluent Warning Not Non-Dismissable

**What goes wrong:** Red warning appears but user can swipe away or click X. PRD and FLUID-03 require the banner to persist until user explicitly confirms with an action button.
**Why it happens:** Standard shadcn Alert component has a dismissible variant. Developers use it by default.
**How to avoid:** Use the Alert Darurat spec from `DESIGN_SYSTEM_KidneyBuddy_v3.md` exactly: background `#fdecee`, border-left `3px solid #d4183d`, NO X/close button. Only the "Saya mengerti, hubungi dokter segera" button dismisses it, which should also POST a confirmation to the backend (logging that the patient acknowledged).
**Warning signs:** Any close button (X icon) visible on the red banner. Banner disappears on page navigation without explicit user action.

---

## Code Examples

### Fluid Log API Response Shape

```typescript
// GET /api/fluid/daily-balance?date=2026-06-26
// Response:
{
  date: "2026-06-26",
  masuk: 1750, // ml
  keluar: 2100, // ml
  delta: -350,  // negative = more out than in (typical for CAPD target)
  entries: [
    { id: "...", waktu: "08:00", tipe: "masuk", sumber: "minuman", volume: 250, satuan: "ml" },
    { id: "...", waktu: "09:00", tipe: "keluar", sumber: null, volume: 700, satuan: "ml",
      kondisiKeluar: "jernih", konsentrasiCapd: "2.5%", hasAbnormalCondition: false }
  ]
}
```

### Push Subscribe Flow (Client → Backend)

```typescript
// lib/pushClient.ts
export async function subscribeAndRegister(accessToken: string): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    // Re-register on every call to refresh last_confirmed_at
    await authFetch("/api/push/subscribe", accessToken, {
      method: "POST",
      body: JSON.stringify(existing.toJSON()),
    });
    return;
  }
  // New subscription — permission must already be granted at this point
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  });
  await authFetch("/api/push/subscribe", accessToken, {
    method: "POST",
    body: JSON.stringify(sub.toJSON()),
  });
}
```

### CAPD Effluent Banner (Non-Dismissable)

```typescript
// components/beranda/CAPDEffluentBanner.tsx
"use client";
interface Props { onDismiss: () => void; }

export function CAPDEffluentBanner({ onDismiss }: Props) {
  return (
    <div className="w-full rounded-2xl px-3 py-3 flex items-start gap-3"
         style={{ background: "#fdecee", borderLeft: "3px solid #d4183d" }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
           style={{ background: "#fbd9dd" }}>
        <AlertTriangle size={16} style={{ color: "#d4183d" }} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold" style={{ color: "#d4183d", fontFamily: "Plus Jakarta Sans" }}>
          Kondisi Cairan Tidak Normal
        </p>
        <p className="text-xs mt-1" style={{ color: "#9c1530", fontFamily: "DM Sans" }}>
          Cairan keluar yang keruh atau berdarah bisa menjadi tanda infeksi. Segera hubungi dokter atau perawat CAPD Anda.
        </p>
        <button onClick={onDismiss}
                className="mt-2 text-xs px-3 py-1 rounded-full font-semibold"
                style={{ background: "#d4183d", color: "#fff", fontFamily: "DM Sans" }}>
          Saya mengerti, hubungi dokter segera
        </button>
      </div>
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@serwist/next` (webpack) | `@serwist/turbopack` (Turbopack-native) | Serwist 9.x (2024–2025) | Correct Turbopack integration; no build-mode divergence |
| `next-pwa` | `@serwist/turbopack` | 2023–2024 | Active maintenance, Next.js 15/16 compat |
| Per-user push subscription (one row per user) | Per-device push subscription (one row per endpoint) | Best practice from W3C push spec | Required for multi-device caregiver use case |
| In-memory cron (`setInterval`) | DB-persisted cron with Postgres query per tick | Documented pitfall for long-running Node apps | Reminders survive container restarts |
| pgcrypto in SQL queries | App-layer AES-256-GCM (Node crypto) | OWASP guidance, ongoing | Encryption key never transits query logs |
| `node-cron@3.x` | `node-cron@4.5.x` (TypeScript-native, zero deps) | 2025–2026 | ESM-first, typed, no dependencies |

**Deprecated / avoid:**
- `next-pwa` (`shadowwalker/next-pwa`): unmaintained, webpack-only, rough with App Router.
- `@ducanh2912/next-pwa`: a fork that itself recommends migrating to Serwist.
- `web-push@<3.6`: older VAPID API; use 3.6.x.
- Storing push subscriptions in `localStorage` or session: not survives across sessions; use DB.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@serwist/turbopack` works correctly with Next.js 16.2.x | Standard Stack, Pattern 1 | If incompatible, fall back to `@serwist/next` + `next build --no-turbo`; production builds slower but functional |
| A2 | node-cron@4.5.x `schedule()` import syntax unchanged from v3 cron string format | Pattern 3 | If API changed significantly, review node-cron v4 changelog; cron string `"* * * * *"` is standard RFC |
| A3 | Fluid balance thresholds (normal/caution/critical colors on delta card) are not specified in PRD | Architecture Patterns | Delta card color logic: Claude's discretion. Planner should derive from PRD context or mark as needs-review |
| A4 | VAPID keys from `npx web-push generate-vapid-keys` work for both Android and Apple push services | Pattern 2 | Confirmed by official web-push README; VAPID_SUBJECT as mailto: is Apple-required |
| A5 | iOS re-subscription on `visibilitychange` is sufficient to prevent silent expiry | Pitfall 5 | iOS subscription expiry behavior is not fully documented by Apple; testing on real device required |
| A6 | multer@2.2.x file upload for medication photos uses `memoryStorage` or `diskStorage` | Pattern 3 context | For MVP, `diskStorage` to a Docker volume path is correct; planner must choose storage path per CLAUDE.md constraint |

**If this table is empty:** All claims were verified or cited. It is not empty — user confirmation or real-device testing will be needed for A1, A5.

---

## Open Questions

1. **Fluid balance thresholds for color coding**
   - What we know: Delta card shows colored balance (D-04, teal=normal, amber=caution, red=critical)
   - What's unclear: Exact numeric thresholds are not in the PRD. For CAPD, a typical daily UF target is ~400–1000ml negative balance (more out than in), but varies per patient prescription. For HD/transplant patients, targets differ.
   - Recommendation: Planner should use conservative/generic thresholds as Claude's discretion (e.g., within ±200ml of 0 = neutral/grey, absolute delta >1500ml = amber, >2500ml = red) and document them clearly. These thresholds are for visual guidance only, not medical diagnosis.

2. **Where to store medication photos (multer)**
   - What we know: CLAUDE.md constraint is "local Docker volume (MVP)" for file storage. multer@2.2.x's `diskStorage` writes to a local path.
   - What's unclear: The exact volume mount path in docker-compose.yml for `backend` container is not established.
   - Recommendation: Planner adds a `volumes:` entry to the `backend` service in `docker-compose.yml` mounting to `/app/uploads`; multer `diskStorage` writes to `/app/uploads/medication-photos/`.

3. **Auth route group structure for shell exclusion**
   - What we know: `(auth)/` pages should not get the AppShell (no nav, no FAB).
   - What's unclear: Whether to apply AppShell in `app/layout.tsx` conditionally (with `usePathname()`) or to create a nested route group `(app)/layout.tsx` that includes AppShell.
   - Recommendation: Nested route group `(app)/layout.tsx` is cleaner (no conditional logic in root layout); planner should restructure routes into `(app)/` group for authenticated pages. This avoids `usePathname()` in the root layout which is a known pattern for flash-of-wrong-layout issues.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend + Frontend build | ✓ | ~20+ (WSL) | — |
| Docker + docker-compose | 3-container stack | Likely ✓ (WSL2) | Unknown | Run services manually in dev |
| npm | Package install | ✓ | Current | — |
| Real iOS device | NOTIF-03, iOS push testing | Unknown | — | iOS Simulator cannot test Push API — real device required |
| Real Android device | NOTIF-01/02 Android push path | Unknown | — | Chrome desktop DevTools can simulate some push |
| VAPID keys (env vars) | NOTIF-01/02 push delivery | Not yet generated | — | Run `npx web-push generate-vapid-keys` once |
| ENCRYPTION_KEY (env var) | FLUID encryption | Not yet generated | — | Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

**Missing dependencies with no fallback:**
- Real iOS device for NOTIF-03 acceptance testing — iOS Simulator does not support Push Manager. Phase 2 success criterion 3 explicitly requires "verified on a real iPhone." This is a human/equipment dependency the team must plan for.

**Missing dependencies with fallback:**
- VAPID keys and ENCRYPTION_KEY: generate locally, store in `.env` and Railway secrets.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `--test` (no extra install needed) |
| Config file | none — test runner invoked via `node --import tsx --test src/test/*.test.ts` |
| Quick run command | `npm test` (backend only, as in Phase 1) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FLUID-01 | fluidLog.service creates entry with correct fields | unit | `npm test -- --test-name-pattern "fluidLog"` | ❌ Wave 0 |
| FLUID-02 | getDailyBalance returns correct masuk/keluar/delta | unit | `npm test -- --test-name-pattern "balance"` | ❌ Wave 0 |
| FLUID-03 | createEntry returns hasAbnormalCondition=true for 'keruh' | unit | `npm test -- --test-name-pattern "capd_condition"` | ❌ Wave 0 |
| REMIND-02/08 | sendToAllDevices fans out to N subscriptions | unit (mock web-push) | `npm test -- --test-name-pattern "fan.?out"` | ❌ Wave 0 |
| NOTIF-02 | push_subscriptions.upsert creates separate row per endpoint | unit | `npm test -- --test-name-pattern "push_sub"` | ❌ Wave 0 |
| Encryption | encrypt then decrypt returns original string | unit | `npm test -- --test-name-pattern "encrypt"` | ❌ Wave 0 |
| RESPONSIVE-04 | Layout correct at 375/768/1024/1280px | manual | Browser testing matrix | Manual only |
| NOTIF-03 | iOS shows Add-to-Home-Screen interstitial | manual | Real iPhone test | Manual only |
| FLUID-05 | Offline entry stored in IndexedDB | manual/e2e | Browser DevTools offline simulation | Manual only |

### Sampling Rate
- **Per task commit:** `npm test` (backend unit tests)
- **Per wave merge:** Full `npm test` + manual browser check at 375px/768px/1024px
- **Phase gate:** Full suite green + 6 success criteria met + real iPhone push test

### Wave 0 Gaps
- [ ] `backend/src/test/fluid.service.test.ts` — covers FLUID-01, FLUID-02, FLUID-03
- [ ] `backend/src/test/notification.fanout.test.ts` — covers REMIND-02, REMIND-08 (mock web-push)
- [ ] `backend/src/test/encryption.test.ts` — covers encrypt/decrypt round-trip
- [ ] `backend/src/test/pushSubscription.test.ts` — covers NOTIF-02 upsert-by-endpoint

---

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1` (from .planning/config.json).

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (inherited) | JWT + refresh cookie from Phase 1; ALL Phase 2 routes use `authenticate` middleware |
| V3 Session Management | yes (inherited) | httpOnly cookie refresh tokens from Phase 1 |
| V4 Access Control | yes | Every `/api/fluid`, `/api/medication-log`, `/api/reminders`, `/api/push` endpoint requires auth — no anonymous access |
| V5 Input Validation | yes | Zod schemas validate all request bodies server-side; numeric volume non-negative; enum values for tipe/sumber/kondisiKeluar |
| V6 Cryptography | yes | AES-256-GCM via Node crypto for fluid_log.catatan + medication_log sensitive fields (NFR-02) |
| V9 Data Protection | yes | Sensitive health columns encrypted before INSERT; ENCRYPTION_KEY in env var not in git |

### Known Threat Patterns for This Phase's Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized fluid log access (read another user's health data) | Information Disclosure | `WHERE user_id = req.user.id` on all queries; never expose other users' rows |
| Push subscription hijacking (register another user's device) | Tampering | POST /api/push/subscribe requires authentication; subscription stored under authenticated user_id only |
| File upload abuse (medication photo) | Tampering/DoS | multer fileSize limit 10MB; MIME type filter `['image/jpeg', 'image/png']`; no PDF for photos |
| VAPID private key exposure | Information Disclosure | Store as env var; never log; never include in API response |
| Encryption key exposure via logs | Information Disclosure | ENCRYPTION_KEY must not appear in pino logs; audit `logger.info(req.body)` patterns that might log plaintext |
| Replay attack on notification confirm | Tampering | `reminderId` in notification action should be validated server-side: check it belongs to the authenticated user |

### Security Checklist for Phase 2

- [ ] `authenticate` middleware applied to ALL new routes (`/api/fluid`, `/api/medication-log`, `/api/reminders`, `/api/push`)
- [ ] Fluid log entries filtered by `userId = req.user.id` (never return all users' data)
- [ ] `catatan` column encrypted before INSERT, decrypted after SELECT (never logged in plaintext)
- [ ] ENCRYPTION_KEY in env vars, 32 bytes random, never committed to git
- [ ] VAPID keys in env vars, never in source code
- [ ] multer configured with fileSize limit (10MB) and MIME type filter for medication photos
- [ ] CORS origin still locked to Vercel domain + localhost (not `*`)
- [ ] helmet middleware added to `app.ts` before route registration

---

## Sources

### Primary (HIGH confidence)
- `serwist.pages.dev/docs/next/turbo` — Turbopack integration guide, fetched 2026-06-26: `@serwist/turbopack` package, `withSerwist` wrapper, `SerwistProvider`, `sw.ts` import from `@serwist/turbopack/worker`
- `nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest` — Native manifest.ts API, MetadataRoute.Manifest type
- `developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers` — Apple-specific VAPID requirements (subject must be mailto: or HTTPS URL; permission must be in user-gesture stack)
- `nodejs.org/api/crypto.html` — Node.js built-in `crypto.createCipheriv` / `createDecipheriv` for AES-256-GCM
- npm registry (`npm view` executed 2026-06-26): web-push@3.6.7, node-cron@4.5.0, multer@2.2.0, @serwist/turbopack@9.5.11, serwist@9.5.11, esbuild@0.28.1, helmet@8.2.0, idb@8.0.3
- `.planning/research/PITFALLS.md` — iOS push gating, subscription expiry, cron restart risk, at-rest encryption gap, multi-device subscription model (project-specific, HIGH confidence)
- `.planning/research/STACK.md` — web-push, node-cron, multer, serwist version recommendations (project-specific, HIGH confidence)
- `.planning/research/ARCHITECTURE.md` — fan-out pattern, push_subscriptions entity, layered architecture (project-specific, HIGH confidence)
- `DESIGN_SYSTEM_KidneyBuddy_v3.md` — Alert Darurat spec (#fdecee bg, border-left 3px #d4183d, no dismiss button), BottomNav spec, FAB gradient
- `PRD.md` §8.2 — FluidLog entity: all columns, business constraints, CAPD-specific fields
- `PRD.md` §8.3 — MedicationLog entity: columns, status transitions (tertunda → dikonfirmasi/terlewat)
- `PRD.md` §8.4 — ReminderSchedule entity: full column set for Phase 2 extension

### Secondary (MEDIUM confidence)
- `brainhub.eu/library/pwa-on-ios` — iOS Add-to-Home-Screen mandatory before push; `navigator.standalone` detection
- `webscraft.org/blog/pwa-pushspovischennya-na-ios-u-2026-scho-realno-pratsyuye` — subscription silent expiry 1-2 weeks on iOS; `pushsubscriptionchange` unreliable
- `github.com/web-push-libs/web-push` — web-push library usage examples, VAPID setup, 410 handling
- `web-push-libs/web-push/issues/163` — confirms application-layer responsibility for multi-device fan-out (library sends to one subscription per call)

### Tertiary (LOW confidence / [ASSUMED])
- All packages tagged [ASSUMED] per package legitimacy protocol (slopcheck unavailable)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm view; @serwist/turbopack finding verified against official Serwist docs
- Architecture: HIGH — fan-out pattern, per-device subscription model, cron persistence strategy all verified against multiple sources
- iOS push behavior: MEDIUM — cross-verified against 3+ sources, but Apple's actual implementation has undocumented behavior; real-device testing required
- Fluid balance thresholds: LOW — PRD does not specify numeric thresholds; recommended as Claude's discretion

**Research date:** 2026-06-26
**Valid until:** 2026-08-26 (60 days — Serwist and iOS push API are fast-moving; re-verify @serwist/turbopack version and iOS push behavior if implementing after this date)
