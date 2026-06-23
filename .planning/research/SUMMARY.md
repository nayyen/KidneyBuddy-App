# Project Research Summary

**Project:** KidneyBuddy
**Domain:** Healthcare companion PWA — chronic kidney disease (CAPD/HD/transplant) patient and caregiver self-management app, Indonesia
**Researched:** 2026-06-24
**Confidence:** MEDIUM-HIGH

## Executive Summary

KidneyBuddy is a healthcare-adjacent Progressive Web App for CKD patients (CAPD, HD, and transplant modalities) and their caregivers, built under a mandatory 3-container microservices constraint (Next.js frontend / Express.js backend / PostgreSQL database) within a 13-week academic timeline. Experts building this category of product converge on a well-established feature set — fluid/medication tracking, modality-aware reminders, lab trend visualization, and educational content — but the literature is explicit that **no reviewed CKD/PD app in the category includes caregiver involvement**, making KidneyBuddy's shared-account caregiver dashboard and immediate peritonitis early-warning (cloudy/bloody CAPD effluent → instant alert) genuine, evidence-backed differentiators rather than scope padding. The recommended stack — Next.js 16 (App Router) + Express 5 + PostgreSQL 16 + Drizzle ORM, with Serwist for the service worker, Argon2id for password hashing, and Groq/Llama 3.3 70B for the five AI use-cases — is current, well-documented, and fits cleanly inside the 3-container constraint without smuggling in a 4th service (Redis, queues) for scheduling or rate-limiting.

The recommended approach is a strict layered backend (Route → Controller → Service → Repository) where **all business logic, validation, and AI orchestration live in the Express service layer**, with a clean separation between deterministic rule-based anomaly detection (which alone decides severity) and LLM-generated explanation text (which never overrides a safety decision). This split directly defuses the project's two most dangerous failure modes: alarm fatigue from miscalibrated AI severity judgments, and Groq's tight free-tier rate limits (~30 RPM / ~1,000 RPD) being exhausted by naive synchronous AI calls on every tracking write.

The dominant risks are not algorithmic but operational and platform-specific: iOS Safari's restrictive Push API (gated behind "Add to Home Screen," silently expiring subscriptions, click-handler-only permission requests) threatens to silently disable the app's core reminder-reliability value proposition for a large share of users; in-process `node-cron` reminders vanish on every container restart unless reminder-due state is persisted in Postgres with boot-time catch-up logic; and a rushed implementation of the mandatory microservices split risks becoming "a monolith wearing three Dockerfiles," with Next.js API routes quietly bypassing the Express backend. Mitigating these requires designing for them from the Core Tracking phase onward (Wk7), not patching them in at Go-Live.

## Key Findings

### Recommended Stack

The stack is fixed at the framework level by the PRD (Next.js / Express / PostgreSQL, 3 containers) but research confirms current best-practice versions and supporting choices within that mandate. Drizzle ORM is recommended over Prisma for tighter SQL-level control given the app's 8+ entities with JSON arrays and soft deletes (Prisma 7's narrowed performance gap makes it a legitimate fallback if the team prefers gentler SQL abstraction). Scheduling and rate-limiting must be solved without adding a 4th container: `node-cron` backed by Postgres-persisted due-state, and a Postgres-backed (not in-memory) login-lockout store.

**Core technologies:**
- Next.js 16.2.x (App Router) — frontend/PWA shell; native `manifest.ts` removes need for a manifest plugin; Turbopack is now default bundler
- Express 5.2.x — backend API/business logic; built-in async error forwarding removes the v4 try/catch boilerplate pain point
- PostgreSQL 16 + Drizzle ORM 0.45.x — database and query layer; PRD-pinned version, mature jsonb/pgcrypto support for the schema's needs
- `@serwist/next` (not `next-pwa`) — service worker generation compatible with App Router + Turbopack
- `argon2` (Argon2id) for password hashing — OWASP's current first recommendation over bcrypt
- `web-push` (VAPID) + `groq-sdk` (Llama 3.3 70B) — push notifications and the 5 AI use-cases, both backend-only integrations

### Expected Features

The PRD's existing MoSCoW scoping is validated by the literature as well-calibrated — neither over- nor under-scoped relative to mature competitor categories.

**Must have (table stakes):**
- Fluid intake/output logging with auto-delta calculation, modality-aware fields (CAPD/HD/transplant)
- Medication reminders with confirmation; CAPD exchange / HD schedule reminders
- Lab result storage (upload + manual entry) with trend chart and reference-range coloring
- Onboarding tutorial (<5 min), education content filtered by modality, doctor-visit report export

**Should have (competitive differentiators):**
- Caregiver-inclusive dashboard with independent per-device notifications — addresses a literature-confirmed, category-wide gap (no reviewed CKD/ESRD app has this)
- CAPD effluent condition tracking with immediate peritonitis early-warning alert — clinically grounded, no precedent found in reviewed apps
- AI-generated daily/weekly narrative summaries and lifestyle suggestions in Bahasa Indonesia — genuine innovation, not found in any reviewed app
- Quora-style peer community with light moderation (no medical verification needed)

**Defer (v2+):**
- Caregiver notification escalation logic (notify only on missed events, not every routine event) — add after real usage data shows fatigue
- Open-ended AI chatbot — already correctly excluded; structured single-purpose AI functions are safer to guardrail
- Wearable/device integration, native mobile apps, separate caregiver accounts — all out of scope per PRD and correctly so

### Architecture Approach

The system is a strict 3-container split (Next.js frontend, Express backend, Postgres database) where the backend is internally organized as a layered modular monolith: Routes → Controllers (thin) → Services (all business logic, validation, AI orchestration) → Repositories (SQL only). The frontend has zero business logic — it renders what the backend computes and never touches the database or Groq directly. A `PushSubscription` entity (one-to-many per user, keyed by device endpoint, not user_id) must be added beyond the PRD's 8 named entities to correctly support multi-device caregiver notifications.

**Major components:**
1. **Backend service layer** — owns all validation, anomaly rule thresholds, AI prompt orchestration, and reminder-trigger logic; the only layer with conditionals
2. **Anomaly detection (rule engine + LLM split)** — deterministic rules decide severity/triggering authoritatively; Groq is only invoked to generate human-readable explanation text, never to override a safety decision
3. **In-process scheduler (`node-cron`) backed by Postgres** — queries due reminders from `ReminderSchedule` rows on every tick rather than holding in-memory timers, with boot-time catch-up for missed windows
4. **Notification fan-out service** — addresses `user_id`, loops over all active `push_subscriptions` rows independently (patient + caregiver devices), handles partial failure (410 Gone → deactivate that row only)

### Critical Pitfalls

1. **iOS push silently doesn't work** unless the PWA is added to Home Screen first, and permission must be requested inside a direct click handler — avoid by gating reminder setup behind an explicit "Install this app" interstitial and testing on a real iPhone before Milestone 3 sign-off.
2. **iOS push subscriptions silently expire** after 1-2 weeks with no error signal — avoid by re-validating subscriptions on every app open, tracking `last_subscription_confirmed_at`, and never relying on push as the sole channel (always pair with an in-app dashboard fallback).
3. **In-process cron silently stops firing on deploy/restart** — avoid by persisting reminder-due state in Postgres (not memory), adding boot-time catch-up logic, and a heartbeat/dead-man's-switch via the already-planned Uptime Kuma monitoring.
4. **AI-generated summaries drift into diagnostic/alarming language** despite a disclaimer — avoid by enforcing forbidden-phrase system prompts, backend-appended (not LLM-trusted) disclaimer text, and manual review of AI output against deliberately extreme test inputs before Milestone 4 sign-off.
5. **Groq free-tier rate limits (~30 RPM / ~1,000 RPD) get exhausted under realistic load**, not just demo accounts — avoid by staggering the daily batch summary job, queueing AI calls instead of calling synchronously inline, and load-testing AI call volume in Milestone 4, not waiting for the Go-Live k6 test.

## Implications for Roadmap

Based on combined research, suggested phase structure (aligned with the PRD's existing milestone language but reframed by dependency order and risk):

### Phase 1: Foundation & Auth
**Rationale:** Therapy-method selection and user auth/role gate almost every other feature (conditional UI, schedule types, caregiver subscriptions) — must exist before any tracking or reminder feature can be built correctly.
**Delivers:** 3-container scaffold (docker-compose, Dockerfiles), database schema (8 PRD entities + the missing 9th `PushSubscription` entity), auth (Argon2id, JWT/session, Postgres-backed lockout per NFR-03), onboarding flow with modality selection.
**Addresses:** Therapy-method-aware UI (table stakes), onboarding tutorial (<5 min).
**Avoids:** Microservices-boundary collapse — define the REST contract here, before feature pressure mounts.

### Phase 2: Core Tracking & Reminders
**Rationale:** This is where the highest-density, highest-risk pitfalls live (iOS push, cron persistence, multi-device caregiver subscriptions, encryption) — research strongly recommends building these correctly the first time rather than retrofitting.
**Delivers:** Fluid/medication/activity logging with daily delta calculation, CAPD effluent condition field with immediate peritonitis alert, modality-aware reminder schedules, Postgres-persisted `node-cron` scheduler with boot-time catch-up, per-device push subscription model, column-level encryption (pgcrypto or app-layer) for `fluid_log`/`medication_log`/`lab_result`.
**Uses:** Layered service architecture, fan-out notification pattern, `web-push`/VAPID.
**Avoids:** Pitfalls 1, 2, 3, 7, 9 (iOS push gating/expiry, cron persistence, at-rest encryption gap, caregiver multi-device subscription model) — all flagged as "must be correct before Milestone 3 sign-off."

### Phase 3: Lab Tracking & Caregiver Dashboard
**Rationale:** Depends on Phase 2's data model (FluidLog, MedicationLog) being stable; caregiver dashboard is a literature-confirmed differentiator that should ship once the underlying tracking data exists to display.
**Delivers:** Lab upload + manual entry, trend chart with reference-range coloring, doctor-visit report export, caregiver dashboard with independent notifications (tested with two physical devices on one account).
**Addresses:** Lab trend visualization (table stakes), caregiver-inclusive dashboard (differentiator).
**Avoids:** Pitfall 9 (caregiver multi-device push) — explicit two-device test required before sign-off.

### Phase 4: AI & Community Features
**Rationale:** Requires the rule-based anomaly engine and tracking data volume (3-30 day thresholds) from earlier phases to be meaningful; isolating AI last also isolates the Groq rate-limit risk to a phase where it can be load-tested deliberately.
**Delivers:** Rule-based + LLM anomaly detection (rule engine authoritative, LLM explanation-only), AI daily summary / weekly trend / lab analysis / lifestyle suggestion (all routed through one `aiOrchestration.service.js` with enforced disclaimer), anomaly feedback loop UI, Quora-style community with light moderation.
**Implements:** Rule Engine + LLM Explanation Split pattern; staggered/queued Groq calls.
**Avoids:** Pitfalls 4, 5, 8 (AI diagnostic drift, anomaly false positive/negative, Groq rate-limit exhaustion) — load-test AI call volume here, not at Go-Live.

### Phase 5: Hardening & Go-Live
**Rationale:** Cross-cutting verification (security audit, load test, real-device QA) only makes sense once all features exist; matches PRD's own Go-Live milestone.
**Delivers:** k6 load test against NFR-01 (100 concurrent, ≤3s dashboard), security audit covering at-rest encryption and consent records, Uptime Kuma monitoring live, full real-iPhone push QA pass, "Looks Done But Isn't" checklist verification.
**Addresses:** NFR-01 through NFR-05 verification.

### Phase Ordering Rationale

- Auth/onboarding must precede tracking because therapy-method selection gates nearly all conditional UI and reminder logic (FEATURES.md dependency graph).
- Core tracking/reminders precede lab/caregiver/AI because anomaly detection, daily summaries, and caregiver alerts all consume tracking data as their input — building consumers before producers would require throwaway fixtures.
- AI is deliberately last among feature phases (not first) so the rule-based safety layer and real tracking data volume exist before LLM orchestration is layered on top — this also concentrates Groq rate-limit risk into one phase where it can be load-tested early rather than discovered at Go-Live.
- Security/encryption work is pulled into Phase 2 (not deferred to Go-Live) per Pitfall 7 — retrofitting column-level encryption after data exists requires a riskier migration under deadline pressure.

### Research Flags

Phases likely needing deeper research during planning (`--research-phase`):
- **Phase 2 (Core Tracking & Reminders):** iOS push behavior and cron persistence patterns are platform-specific and evolving (Apple's spec divergence is undocumented and changes between iOS versions) — verify against current Apple documentation at implementation time.
- **Phase 4 (AI & Community):** Groq rate limits change frequently and must be re-verified against `console.groq.com/docs/rate-limits` at implementation time, not trusted from this research snapshot alone; anomaly threshold calibration needs grounding in the clinical literature already partially cited in PROJECT.md.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation & Auth):** Layered Express architecture, Argon2id, JWT/session patterns are extremely well-documented with HIGH-confidence official sources.
- **Phase 3 (Lab Tracking & Caregiver Dashboard):** CRUD + trend visualization + fan-out notification pattern already fully specified in ARCHITECTURE.md with working code examples.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core framework versions verified directly against npm registry and official docs (Next.js, Express, Drizzle, Serwist); some supporting recommendations (Argon2id vs bcrypt, node-cron vs BullMQ) are MEDIUM, cross-verified across multiple independent sources but not single authoritative docs |
| Features | MEDIUM-HIGH | Table stakes and the caregiver-gap finding are HIGH confidence (corroborated systematic reviews, PMC); some Indonesia-specific UX nuance is MEDIUM/LOW due to sparse domain-specific local sources |
| Architecture | HIGH (component boundaries) / MEDIUM (scheduler reliability, Groq batch throughput) | Layered architecture and push fan-out patterns confirmed by multiple 2025/2026 sources; in-process scheduler reliability under restart and exact Groq throughput figures are MEDIUM, order-of-magnitude not exact |
| Pitfalls | MEDIUM-HIGH | iOS push and microservices-collapse risks verified against multiple current sources including Apple's own developer forums; AI disclaimer-decay trend is from a single recent study and should be treated as directional |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Groq free-tier exact limits:** Figures vary slightly across third-party sources (30 RPM/1,000 RPD vs 14.4K Req/Day cited elsewhere) — re-verify against `console.groq.com/docs/rate-limits` directly at the start of Phase 4 before committing to a batching strategy.
- **iOS Safari push behavior:** Apple's implementation is known to diverge from spec in undocumented ways and changes between iOS releases — budget explicit real-device QA time in Phase 2 rather than trusting any single source as final.
- **Anomaly rule thresholds:** Currently guesswork-level (e.g., "30% fluid decline over 3 days") unless grounded in the clinical literature referenced in PROJECT.md (e.g., RS Kariadi peritonitis rate) — needs clinical-advisor review before Phase 4 sign-off, not just engineering judgment.
- **Encryption approach for sensitive columns:** Choice between pgcrypto (key transits through SQL) vs app-layer AES-256-GCM is a deliberate trade-off that needs an explicit team decision documented in Phase 2, not deferred by default to "disk encryption is enough."

## Sources

### Primary (HIGH confidence)
- [Next.js — Guides: PWAs](https://nextjs.org/docs/app/guides/progressive-web-apps), [Next.js 16 blog post](https://nextjs.org/blog/next-16) — official docs
- [Express — Migrating to Express 5](https://expressjs.com/en/guide/migrating-5.html) — official docs
- [Serwist — Getting started for Next.js](https://serwist.pages.dev/docs/next/getting-started) — official docs
- [Drizzle ORM — PostgreSQL column types](https://orm.drizzle.team/docs/column-types/pg) — official docs
- [PostgreSQL 18 docs — pgcrypto / Encryption Options](https://www.postgresql.org/docs/current/encryption-options.html) — official docs
- [Groq — Rate Limits docs](https://console.groq.com/docs/rate-limits) — official, fetched directly 2026-06-24
- [Mobile Apps for the Care Management of Chronic Kidney and End-Stage Renal Diseases (PMC, 2019)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6753688/) — source of the caregiver-gap finding
- [Peritoneal dialysis-related peritonitis: challenges and solutions (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6001843/) — clinical diagnostic criteria for the effluent-alert feature
- [Apple Developer Documentation: Sending web push notifications](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers) — official VAPID requirements
- npm registry version checks (executed 2026-06-24) for all core stack packages

### Secondary (MEDIUM confidence)
- [PWA on iOS - Current Status & Limitations (Brainhub)](https://brainhub.eu/library/pwa-on-ios), [MagicBell PWA iOS guide](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — iOS push behavior, cross-verified
- [A Systematic Review of Patient-Facing Visualizations of Personal Health Data (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6785326/) — lab trend chart guidance
- [The Microservices Backlash (DEV Community)](https://dev.to/aryanmehrotra/the-microservices-backlash-over-engineering-or-misunderstood-architecture-51bm) — <5% of apps benefit from microservices, deadline-pressure risk
- [Job Scheduling in Node.js with Node-cron (Better Stack)](https://betterstack.com/community/guides/scaling-nodejs/node-cron-scheduled-tasks/) — cron in-memory persistence caveat
- [A longitudinal analysis of declining medical safety messaging in generative AI models (npj Digital Medicine)](https://www.nature.com/articles/s41746-025-01943-1) — AI disclaimer decay trend

### Tertiary (LOW confidence)
- Groq free-tier figures from third-party blogs (TokenMix, Grizzly Peak Software) — figures vary across sources, treat as order-of-magnitude only
- Indonesia-specific telemedicine adoption sources — extrapolated for onboarding/trust implications, not tracking-app-specific

---
*Research completed: 2026-06-24*
*Ready for roadmap: yes*
