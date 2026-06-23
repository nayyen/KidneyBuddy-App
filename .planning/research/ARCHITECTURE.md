# Architecture Research

**Domain:** CKD patient companion PWA — 3-container mandatory microservices (Next.js / Express.js / PostgreSQL)
**Researched:** 2026-06-24
**Confidence:** HIGH (component boundaries, Express patterns, web-push fanout) / MEDIUM (in-process scheduler reliability, Groq batch-call throughput under free tier)

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│  FRONTEND CONTAINER (Next.js, deployed Vercel)                        │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────┐ ┌──────────────┐ │
│  │ Pages/Views │ │ Service      │ │ Push           │ │ Client-side  │ │
│  │ (UI only)   │ │ Worker (SW)  │ │ Subscription   │ │ form state / │ │
│  │             │ │ (cache, push │ │ Mgmt (subscribe│ │ optimistic   │ │
│  │             │ │ display)     │ │ to Backend API)│ │ UI, NO rules │ │
│  └──────┬──────┘ └──────┬───────┘ └───────┬────────┘ └──────┬───────┘ │
│         └────────────────────┬─────────────────────────────┘         │
│                    fetch() — REST/JSON only                          │
└─────────────────────────────┼─────────────────────────────────────────┘
                               │  NEXT_PUBLIC_API_URL (HTTPS)
┌──────────────────────────────▼──────────────────────────────────────┐
│  BACKEND CONTAINER (Express.js, deployed Railway/Render)            │
│  ┌────────────┐ ┌────────────────┐ ┌────────────────┐ ┌───────────┐│
│  │ Routes     │→│ Controllers    │→│ Services        │→│ Repos /   ││
│  │ (REST API) │ │ (req/res only) │ │ (business logic,│ │ Models    ││
│  │            │ │                │ │ validation, AI  │ │ (pg query)││
│  │            │ │                │ │ orchestration)  │ │           ││
│  └────────────┘ └────────────────┘ └───────┬────────┘ └─────┬─────┘│
│  ┌────────────────────────────────┐        │                │      │
│  │ In-process Scheduler           │────────┘                │      │
│  │ (node-cron: 20:00 daily,       │                          │      │
│  │  21:00 daily, Sun 19:00)       │                          │      │
│  └─────────────────────────────────┘                         │      │
│  ┌────────────────────────────────┐                          │      │
│  │ Web Push sender (web-push lib) │←── triggered by services │      │
│  └────────────────────────────────┘                          │      │
└──────────────────┬───────────────────────────┬───────────────┼──────┘
                    │ pg connection string      │ HTTPS (Groq) │
┌───────────────────▼──────────────┐  ┌─────────▼──────┐       │
│ DATABASE CONTAINER (PostgreSQL)  │  │ Groq API        │       │
│ - all 8 entities + push_subs     │  │ (Llama 3.3 70B) │       │
│ - only Backend connects          │  │ external, paid- │       │
│                                   │  │ free tier       │       │
└───────────────────────────────────┘  └─────────────────┘       │
                    ▲ direct SQL reads                            │
                    └────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Frontend pages/views | Render UI, collect input, display server-computed results | Next.js App Router, React Server/Client Components, fetch to Backend |
| Service worker | Receive `push` events, render OS notification, cache static assets/offline shell | `public/sw.js`, `Notification.requestPermission()`, `PushManager.subscribe()` |
| Push subscription mgmt | Capture `PushSubscription` object per device, POST to Backend | Client-side only; no business rule about *when* to notify lives here |
| Backend routes | Map HTTP verb+path → controller, apply auth/rate-limit middleware | Express `Router()` per resource |
| Backend controllers | Parse/validate `req`, call service, shape `res` | Thin — no DB calls, no business rules |
| Backend services | All business logic: validation rules, anomaly thresholds, AI orchestration, reminder trigger logic | Plain classes/functions, one service module per domain entity |
| Repository/data layer | SQL queries (via `pg` or Knex/Prisma), no business logic | One repo module per entity, parameterized queries only |
| In-process scheduler | Fire cron-style jobs inside the Backend container at fixed wall-clock times | `node-cron` registered at server boot, guarded by overlap lock |
| Web Push sender | Fan out one notification to *all* registered subscriptions for a `user_id` | `web-push` npm lib, loop over `push_subscriptions` rows |
| AI orchestration | Build prompt from tracking data, call Groq, parse/validate response, persist disclaimer-wrapped output | Single `aiService` module, all 5 LLM use-cases route through it |

## Recommended Project Structure

```
backend/
├── src/
│   ├── routes/                 # one file per resource, REST verbs only
│   │   ├── auth.routes.js
│   │   ├── fluidLog.routes.js
│   │   ├── medicationLog.routes.js
│   │   ├── reminderSchedule.routes.js
│   │   ├── labResult.routes.js
│   │   ├── communityPost.routes.js
│   │   ├── doctorVisitReport.routes.js
│   │   ├── anomalyAlert.routes.js
│   │   ├── activityLog.routes.js
│   │   └── pushSubscription.routes.js
│   ├── controllers/             # thin: req parsing + res shaping only
│   │   └── [same names as routes]
│   ├── services/                # ALL business logic lives here
│   │   ├── auth.service.js              # registration, login, lockout (NFR-03)
│   │   ├── fluidLog.service.js          # FR-PS-001/002/003 calc + CAPD condition check
│   │   ├── medicationLog.service.js     # confirm/missed status transitions
│   │   ├── reminderSchedule.service.js  # CRUD + therapy-type validation
│   │   ├── notification.service.js      # builds payload, calls pushSender for fan-out
│   │   ├── anomalyDetection.service.js  # FR-SYS-001 rule-based engine (pure functions)
│   │   ├── aiOrchestration.service.js   # all 5 Groq use-cases, prompt templates, disclaimer wrap
│   │   ├── labResult.service.js
│   │   ├── doctorVisitReport.service.js
│   │   ├── communityPost.service.js
│   │   └── activityLog.service.js       # FR-PS-017/018 overdue framing
│   ├── repositories/             # SQL only, no rules
│   │   └── [one per entity, matches services]
│   ├── jobs/                     # scheduled job definitions (thin wrappers)
│   │   ├── dailySummary.job.js          # 20:00 → calls aiOrchestration + notification
│   │   ├── anomalyBatchCheck.job.js      # 21:00 → calls anomalyDetection.service
│   │   ├── weeklyTrendInsight.job.js     # Sun 19:00 → calls aiOrchestration
│   │   └── scheduler.js                  # registers all node-cron jobs at boot
│   ├── middleware/
│   │   ├── auth.middleware.js     # session/JWT verification
│   │   ├── rateLimiter.js         # login lockout (NFR-03)
│   │   ├── upload.middleware.js   # multer config for lab files (10MB, pdf/jpg/png)
│   │   └── errorHandler.js
│   ├── lib/
│   │   ├── groqClient.js          # single Groq SDK instance
│   │   ├── webPushClient.js       # VAPID config, sendNotification wrapper
│   │   └── db.js                  # pg Pool instance
│   ├── config/
│   │   └── therapyRules.js        # which fields/reminders apply per therapy type
│   └── app.js / server.js
├── Dockerfile
└── package.json

frontend/
├── app/ (or src/app for App Router)
│   ├── (auth)/...
│   ├── dashboard/
│   ├── tracking/
│   ├── pengingat/
│   ├── lab/
│   ├── komunitas/
│   ├── edukasi/
│   └── profil/
├── public/
│   ├── sw.js                     # service worker: push event handler, cache shell
│   └── manifest.json             # PWA manifest
├── lib/
│   ├── api.js                    # fetch wrapper to NEXT_PUBLIC_API_URL, NO logic
│   └── pushClient.js             # subscribe/unsubscribe helpers, posts subscription to Backend
├── Dockerfile
└── package.json

docker-compose.yml
```

### Structure Rationale

- **services/ is the single home for business logic** — this directly satisfies the PRD's "frontend has no business logic" constraint (4.3) and prevents logic leaking into controllers. Every FR-SYS-* and FR-PS-* rule maps to exactly one service function, which keeps unit testing tractable per the Milestone 3/4 acceptance criteria.
- **anomalyDetection.service.js is separate from aiOrchestration.service.js** — rule-based thresholds (deterministic, testable with fixed fixtures) must not be entangled with LLM calls (non-deterministic, requires mocking Groq). FR-SYS-001 explicitly says "rule-based + LLM" as two distinct passes — keep them as two callable units that anomalyDetection.service composes (rule engine runs first and is authoritative for severity; LLM only generates the human-readable explanation, never the threshold decision itself).
- **jobs/ is thin** — cron files only call into services; this keeps the *scheduling mechanism* swappable (today: node-cron in-process; future: external scheduler) without touching business logic.
- **repositories/ separate from services/** — Express service-layer convention (HIGH confidence, multiple 2025/2026 sources agree); makes services unit-testable without a live Postgres connection by mocking the repo.
- **One push_subscriptions table/repo, not folded into User** — a user can have N devices (patient phone + caregiver phone, same account), so subscriptions are a one-to-many child entity even though it is not in the PRD's 8 named entities — it must be added as entity #9 (`PushSubscription`) during schema design.
- **config/therapyRules.js centralizes therapy-type conditional logic** (FR-SYS-003: CAPD vs HD vs Transplantasi field/feature visibility) so it isn't duplicated across fluidLog, reminderSchedule, and dashboard-aggregation services.

## Architectural Patterns

### Pattern 1: Layered Service Architecture (Route → Controller → Service → Repository)

**What:** Each HTTP request flows through four thin layers; only the service layer contains conditionals/rules.
**When to use:** Every backend endpoint in this project — there is no exception, since the PRD constraint is binary ("frontend has no business logic" implies backend has *all* of it, consistently).
**Trade-offs:** More files/boilerplate than a quick Express app, but it is what makes the Milestone 3/4 PRD acceptance criterion ("lulus unit test") achievable — services are pure functions/classes that take data in, return decisions out, independent of HTTP or SQL.

**Example:**
```javascript
// controllers/fluidLog.controller.js — thin, no logic
async function createFluidLog(req, res, next) {
  try {
    const result = await fluidLogService.createEntry(req.user.id, req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

// services/fluidLog.service.js — all logic here
async function createEntry(userId, payload) {
  validateFluidEntry(payload); // throws ValidationError
  const entry = await fluidLogRepo.insert(userId, payload);
  if (payload.type === 'keluar' && isAbnormalCondition(payload.condition)) {
    await anomalyDetectionService.raiseImmediateAlert(userId, 'capd_fluid_abnormal', entry);
  }
  await anomalyDetectionService.runOnWrite(userId); // FR-SYS-001 on-write trigger
  return computeDailyBalance(userId, entry.date);
}
```

### Pattern 2: Rule Engine + LLM Explanation Split (for Anomaly Detection)

**What:** A pure, deterministic rule engine evaluates thresholds and decides severity; only if a rule fires (or on the daily batch sweep) does the system call Groq to phrase a calm, non-alarming Bahasa Indonesia explanation. The LLM never decides *whether* something is an anomaly — it only explains a decision already made.
**When to use:** FR-SYS-001 specifically, and any place "rule-based + LLM" is mentioned together.
**Trade-offs:** Slightly more code than "ask the LLM to detect anomalies," but: (1) deterministic = testable without mocking Groq for the core safety logic, which directly matters for a health-adjacent app; (2) avoids burning Groq free-tier RPM/RPD budget on every single tracking write — the LLM is only invoked when a rule already fired, not on every entry.

**Example:**
```javascript
// services/anomalyDetection.service.js
const RULES = [
  fluidOutputDecline30PercentOver3Days,
  capdAbnormalCondition,
  moreThanTwoMissedSchedulesPerDay,
  fluidIntakeDeviationFromBaseline,
];

async function evaluate(userId, triggerType) { // triggerType: 'on_write' | 'batch_21h'
  const context = await buildEvaluationContext(userId); // last 3-30 days, therapy type
  const fired = RULES
    .map(rule => rule(context))
    .filter(result => result.triggered);

  for (const result of fired) {
    const explanation = await aiOrchestration.explainAnomaly(result, context); // Groq call, Bahasa Indonesia, calming tone, disclaimer
    await anomalyAlertRepo.create(userId, { ...result, explanation, triggerType });
    if (result.severity === 'tinggi') {
      await notificationService.sendEmergencyAlert(userId, result); // FR-PS-011b
    }
  }
  return fired;
}
```

### Pattern 3: Fan-out Push Notification per User (not per session)

**What:** Notifications are addressed to a `user_id`, and the notification service loads *all* active `push_subscriptions` rows for that user_id and calls `webpush.sendNotification()` once per row, independently. Patient and caregiver share the same account/credentials (per PRD constraint — "caregiver pakai kredensial akun yang sama"), so both are simply additional rows in `push_subscriptions` keyed by the same `user_id`, distinguished by `device_label`/`endpoint`.
**When to use:** Every reminder, daily summary ready, and emergency alert (FR-CG-001, FR-PS-011b).
**Trade-offs:** Must handle partial failure (one device's subscription expired/410 Gone) without failing the whole batch — failed sends should soft-delete that one subscription row, not block delivery to other devices.

**Example:**
```javascript
// services/notification.service.js
async function sendToAllDevices(userId, payload) {
  const subs = await pushSubscriptionRepo.findActiveByUser(userId);
  const results = await Promise.allSettled(
    subs.map(sub => webpush.sendNotification(sub.subscriptionObject, JSON.stringify(payload)))
  );
  results.forEach((r, i) => {
    if (r.status === 'rejected' && r.reason.statusCode === 410) {
      pushSubscriptionRepo.deactivate(subs[i].id); // expired subscription, clean up
    }
  });
}
```

## Data Flow

### Request Flow (standard CRUD, e.g. fluid log entry)

```
Patient fills form (Frontend, client component)
    ↓ fetch POST /api/fluid-logs
[Route] → [Controller: parse req.body] → [Service: validate + compute] → [Repo: INSERT]
    ↓                                          ↓                              ↓
Response JSON ← [Controller: shape res] ← [Service: also calls anomalyDetection.evaluate('on_write')]
    ↓
Frontend updates dashboard balance display (no calculation client-side — backend already computed it)
```

### Notification Trigger Flow (reminder, anomaly emergency, or AI-ready alert)

```
[Scheduler: node-cron tick OR Service: rule fired]
    ↓
[notificationService.sendToAllDevices(userId, payload)]
    ↓
[pushSubscriptionRepo.findActiveByUser(userId)] → returns N rows (patient device, caregiver device, ...)
    ↓ (parallel, Promise.allSettled)
[web-push lib] → Push Service (FCM/Mozilla/Apple Web Push) → OS-level push
    ↓                                                              ↓
Patient's Service Worker `push` event              Caregiver's Service Worker `push` event
    ↓                                                              ↓
showNotification() on patient's device              showNotification() on caregiver's device
(independent — no coordination between devices, exactly per FR-CG-001)
```

### Daily AI Summary Flow (FR-SYS-002, 20:00) and Weekly Trend (FR-SYS-004, Sun 19:00)

```
[node-cron job inside Backend container fires at 20:00 local time]
    ↓
[dailySummary.job.js] → loops over all active users (batched, not all-at-once)
    ↓ for each user:
[aiOrchestration.service.buildDailySummary(userId)]
    ↓
  1. Gather: FluidLog(today), MedicationLog(today), ActivityLog(today), therapy type
  2. Build Bahasa Indonesia prompt with disclaimer instruction baked into system prompt
  3. Call Groq (Llama 3.3 70B) — single request per user
  4. Persist result (new table/column: daily_summary, keyed by user_id + date)
  5. notificationService.sendToAllDevices(userId, {type: 'summary_ready'})
    ↓
Frontend fetches GET /api/summaries/today on next page load — does NOT push the full narrative via web-push payload (push payload size limits; push is just a "tap to view" ping)
```

**Critical scaling note (MEDIUM confidence):** Groq's free tier for Llama 3.3 70B is constrained to roughly 30 requests/minute and on the order of 1,000 requests/day (verified via GroqDocs rate-limit page, June 2026 reporting). With NFR-01's ≤100 concurrent users as the target ceiling, a naive "fire all 100 users' daily summary at exactly 20:00:00" will not exceed 1,000/day but *will* exceed 30/minute if done in a tight loop. The `dailySummary.job.js` and `weeklyTrendInsight.job.js` must throttle/stagger calls (e.g., process users in batches with a delay, or queue in-memory and drain at ~1 request every 2-3 seconds) rather than `Promise.all()` across all users. This is a real constraint to flag for the AI phase, not a theoretical one.

### Weekly Trend Insight Flow (FR-SYS-004)

Same shape as daily summary but: (1) runs Sunday 19:00 via a second node-cron registration, (2) queries 7-30 days of FluidLog/LabResult/MedicationLog instead of just today, (3) can also be triggered ad-hoc "when new lab data saved and trend detected" — this ad-hoc path reuses the exact same `aiOrchestration.service.buildWeeklyTrend(userId)` function, called from `labResult.service.js` after a manual lab save, not duplicated logic.

### Key Data Flows

1. **Tracking write → on-write anomaly check → emergency push (synchronous, same request):** A FluidLog or MedicationLog write must run the rule-based anomaly check (FR-SYS-001 "setiap kali entri tracking baru disimpan") before the HTTP response returns, because FR-PS-011b's emergency alert needs to be near-real-time for CAPD cloudy/bloody fluid detection. This should NOT wait for the Groq LLM call if it can be avoided — the rule engine fires the emergency push immediately, and the LLM-generated explanation can be attached to the already-created `AnomalyAlert` row asynchronously (fire-and-forget, update the row after) so the patient sees the warning banner instantly and the fuller AI explanation fills in moments later.
2. **Daily 21:00 batch anomaly sweep (independent of on-write):** A second, separate cron-triggered pass re-evaluates all users' last-3-day windows even if no new entry was written that day (catches "pattern emerging over days" cases the per-write trigger would miss, e.g. a 3-day decline trend that only becomes visible on day 3 even if day 3 itself had no new entry). Both triggers call the *same* `anomalyDetection.service.evaluate()` function with a different `triggerType` argument — no duplicated rule logic.
3. **Multi-device notification independence:** One `user_id` → many `push_subscriptions` rows → fan-out is per-row, never per-session. This is the only architecturally correct way to satisfy "caregiver gets independent notifications on their own device while sharing the same account" without inventing a separate caregiver-account concept (which is explicitly Out of Scope).

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Course MVP (~tens of test users, ≤100 concurrent per NFR-01) | In-process node-cron inside the single Backend container is sufficient. No queue, no Redis, no second worker container — this matches the mandatory 3-container constraint exactly. |
| If active users grow past ~200-300 | Groq free-tier RPD (≈1,000/day) becomes the real ceiling before infra does — the daily summary alone consumes 1 request/user/day; weekly trend adds more on Sundays. Staggering/batching (see above) delays this, but eventually requires either Groq paid tier or a smarter "only summarize users who tracked something today" filter (skip-summary for inactive users is acceptable and matches the spirit of FR-SYS-002's trigger condition). |
| If Backend needs horizontal scaling (multiple instances) | node-cron has no built-in distributed lock — running 2+ Backend replicas would fire the 20:00 job twice. At that point a `distributed: true`-style guard or moving the cron trigger to `pg_cron` (writes a `jobs_due` marker row, Backend polls) becomes necessary. This is explicitly out of scope for the course project (single Backend container) but worth flagging in PITFALLS for whoever deploys beyond Railway's single free instance. |

### Scaling Priorities

1. **First bottleneck: Groq RPM/RPD ceiling**, not container resources — directly relevant to the AI phase (Milestone 4), must be designed for from the start (throttled batch job, not naive loop).
2. **Second bottleneck: in-process scheduler reliability across container restarts** — Railway/Render free tiers can restart/sleep containers; node-cron jobs scheduled in-memory are lost on restart and only re-register at next boot. If a 20:00 job is missed because the container restarted at 19:58, there is no automatic catch-up. Acceptable for MVP (document as known limitation), but should be flagged so a "missed job catch-up check on boot" can be considered if time allows.

## Anti-Patterns

### Anti-Pattern 1: Validation or threshold logic in the Frontend

**What people do:** Implement the "30% fluid decline over 3 days" or CAPD-abnormal-condition check as a client-side computation on the dashboard for instant feedback, then "also" check it on the backend for the AnomalyAlert record.
**Why it's wrong:** Directly violates the PRD's explicit microservices boundary ("Frontend tidak pernah... menyimpan business logic") and creates two sources of truth that can disagree (e.g., different rounding, different day-boundary handling, caregiver's device showing a different state than patient's because each computed it independently from possibly-stale fetched data).
**Do this instead:** Backend computes and returns the *result* (e.g., `dailyBalance: 0.3`, `hasAbnormalCondition: true`) in the API response. Frontend only renders what it receives. The only thing client-side JS should "compute" is ephemeral UI state (form field validity for required-field hints), never domain rules.

### Anti-Pattern 2: Calling Groq synchronously inside the on-write request path for every tracking entry

**What people do:** Wire the LLM call directly into the same request handler that saves a FluidLog entry, so "AI checks every entry as it's written."
**Why it's wrong:** (1) Burns Groq's tight 30 RPM free-tier budget on every single tracking write across all users — a handful of concurrent patients logging fluid intake would exhaust the per-minute quota and start failing; (2) adds Groq's network latency (even though Groq is fast, it's still an external call) to the critical path of a simple data-entry save, risking the NFR-01 ≤3s dashboard load indirectly if summary/anomaly endpoints share the same latency budget; (3) couples a deterministic safety check (peritonitis-indicating cloudy fluid) to an external third-party API's uptime — if Groq is down, emergency alerts must still fire.
**Do this instead:** Rule-based engine runs synchronously on every write (it's pure local computation, no external call, see Pattern 2). The LLM is only invoked (a) to add a human-readable explanation after a rule already fired, processed async/fire-and-forget, or (b) on the scheduled batch jobs (20:00, 21:00, Sun 19:00) where call volume is naturally bounded to ~1 per active user per scheduled run.

### Anti-Pattern 3: Treating "caregiver" as session-scoped instead of subscription-scoped

**What people do:** Try to detect "is this a caregiver session" via a role flag on the JWT/session and special-case notification delivery based on session role.
**Why it's wrong:** The PRD is explicit that caregiver and patient share one account/credentials (no separate caregiver account in MVP) — there is no reliable way to distinguish "this login is the caregiver" from "this login is the patient" at the account level. Trying to infer it leads to fragile logic.
**Do this instead:** Don't try to distinguish patient vs caregiver identity at all in the backend. Treat every logged-in device as just another `push_subscriptions` row tied to the shared `user_id`. Notification fan-out doesn't need to know or care which device belongs to "the patient" vs "the caregiver" — it sends to all of them identically, which is exactly what FR-CG-001/FR-CG-002 ask for ("dashboard yang identik dengan tampilan pasien").

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Groq API (Llama 3.3 70B) | Backend-only HTTPS calls via official Groq SDK or plain `fetch`, single `groqClient.js` wrapper | Free tier ≈30 RPM / ≈1,000 RPD (MEDIUM confidence, verify against console.groq.com/docs/rate-limits at implementation time since limits are known to change). All 5 AI use-cases (FR-SYS-002, 001 explanation, 004, 005, 006) should share one client instance and one disclaimer-injection wrapper so the "bukan pengganti saran medis profesional" text can never be accidentally omitted. |
| Web Push (VAPID) | `web-push` npm package in Backend; public/private VAPID keys generated once, public key exposed to Frontend via `NEXT_PUBLIC_VAPID_PUBLIC_KEY` env var | No business logic in Frontend even here — Frontend's only job is calling `PushManager.subscribe()` with the public key and POSTing the resulting subscription object to Backend. iOS requires Add to Home Screen first (PWA installed) before push permission can even be requested — this is a platform constraint, not something the architecture can route around. |
| File storage (lab uploads, medication photos) | Backend receives multipart upload (multer), persists to disk volume or object storage, stores file path in DB row | PRD doesn't mandate S3-equivalent; for course-scope, a Docker volume mounted to the Backend container (or Railway's persistent volume) is acceptable. If deploying to a platform without persistent disk (e.g., ephemeral containers), this becomes a real gap — flag for PITFALLS. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend ↔ Backend | REST/JSON over HTTPS, `NEXT_PUBLIC_API_URL` | Zero exceptions — Frontend never imports a DB driver, never holds a Groq key, never computes a business rule. Auth token (JWT or session cookie) passed on every request. |
| Backend services ↔ Backend repositories | Direct function calls, in-process | Repositories return plain data (rows/objects), never throw HTTP-shaped errors — services translate domain errors into the shape controllers expect. |
| Backend ↔ Database | `pg` connection pool, parameterized queries only | Only the Backend container has `DATABASE_URL`; this is structurally enforced by docker-compose (database has no exposed port to Frontend network in production). |
| Backend jobs/ ↔ Backend services | Direct function calls, same process | Cron files are not a separate "worker" — they execute inside the same Node.js process/container as the HTTP server, satisfying the "no separate worker container" constraint while still achieving scheduled execution. |

## Sources

- [Layered Architecture in Node.js (Medium)](https://medium.com/@ankitpartap24/layered-architecture-in-node-js-5ef94e846ec4) — service/controller/repository separation, MEDIUM confidence (community source, but matches multiple independent 2025/2026 articles)
- [Exploring Design Patterns for Express.js Projects (DEV Community)](https://dev.to/ehtisamhaq/exploring-design-patterns-for-expressjs-projects-mvc-modular-and-more-37lf) — controller-thin / service-thick convention
- [How to Structure Express.js Applications for Scale (OneUptime)](https://oneuptime.com/blog/post/2026-01-26-expressjs-structure-scale/view) — current (2026) structuring guidance
- [node-cron — npm](https://www.npmjs.com/package/node-cron) — in-process scheduling capabilities and limitations
- [Job Scheduling in Node.js with Node-cron (Better Stack)](https://betterstack.com/community/guides/scaling-nodejs/node-cron-scheduled-tasks/) — overlap prevention, in-memory persistence caveat (jobs lost on restart), HIGH confidence
- [pg_cron GitHub (citusdata)](https://github.com/citusdata/pg_cron) — alternative DB-native scheduling, considered and rejected for MVP scope (adds complexity not needed at this scale, in-process node-cron sufficient)
- [web-push — npm](https://www.npmjs.com/package/web-push) — per-subscription send model, confirms no built-in multi-device fanout (must loop per subscription in app code), HIGH confidence
- [Handling multiple subscribers at a time — web-push GitHub Issue #163](https://github.com/web-push-libs/web-push/issues/163) — confirms application-layer responsibility for multi-device fanout
- [Groq Rate Limits — official GroqDocs](https://console.groq.com/docs/rate-limits) — authoritative source for free-tier RPM/RPD/TPM, MUST be re-verified at implementation time as these limits change frequently
- [Groq Free Tier Limits 2026: 30 RPM, 6K TPM, 14.4K Req/Day (TokenMix)](https://tokenmix.ai/blog/groq-free-tier-limits-2026) — third-party confirmation of approximate free-tier ranges, MEDIUM confidence (figures vary slightly across sources, treat as order-of-magnitude not exact)
- PRD.md sections 4.3-4.5 (architecture/docker-compose), 5 (FR-PS/CG/SYS), 6 (workflows), 8 (data entities) — primary source for all domain-specific constraints cited above

---
*Architecture research for: KidneyBuddy CKD patient companion PWA (3-container mandatory microservices)*
*Researched: 2026-06-24*
