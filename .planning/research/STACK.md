# Stack Research: KidneyBuddy

**Domain:** Healthcare companion PWA (CKD patient tracking) — Next.js + Express.js + PostgreSQL microservices, 3-container Docker Compose, Vercel + Railway/Render hosting
**Researched:** 2026-06-24
**Confidence:** HIGH (core framework choices verified via npm registry + official docs); MEDIUM (architecture-pattern recommendations verified via multiple current sources); LOW flagged explicitly where training data only

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.x (App Router) | Frontend container — UI, PWA shell, service worker host | Current stable LTS (released Oct 21 2025, now on 16.2.x as of June 2026). App Router is the only actively-developed router — Pages Router receives no new features. Native `manifest.ts` / `manifest.json` support in App Router since late 2024 means **no PWA plugin is strictly required** for the manifest; you only need a library for service-worker generation. Turbopack is now the default bundler for both dev and build, cutting iteration time meaningfully for a 27-page app. Deploys to Vercel with zero config (it's Vercel's own framework). |
| Express.js | 5.2.x | Backend container — REST API, business logic, auth, AI orchestration | Express 5 is the current stable major (no longer "5.0 unstable" — it has superseded 4.x as the default `npm install express` target). Built-in automatic forwarding of async errors to error middleware removes the biggest pain point of Express 4 (no more wrapping every controller in try/catch or `express-async-handler`). Requires Node ≥18. **Caution:** breaking changes from v4 (see "Version Compatibility" below) — write code against v5 semantics from day one, don't copy v4 tutorials verbatim. |
| PostgreSQL | 16 (per PRD's docker-compose skeleton) | Database container | Already mandated by PRD section 4.4 (`postgres:16` image). PG 16 has mature `jsonb`, `pgcrypto`, and partial-index support, all of which this schema needs (JSON array fields, soft deletes, encrypted columns). No reason to deviate from the PRD-pinned version. |
| Drizzle ORM | 0.45.x (+ drizzle-kit 0.31.x) | Query layer / schema / migrations for Express → Postgres | See dedicated rationale below — recommended over Prisma for this project specifically. |
| Node.js | 20 LTS or 22 LTS | Runtime for both Next.js and Express containers | Next.js 16 requires Node ≥20. Express 5 requires Node ≥18. Standardize both containers on Node 20 LTS (Active LTS through 2026) for one Dockerfile base image pattern (`node:20-alpine`) across frontend and backend. |

### Supporting Libraries — Frontend (Next.js container)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@serwist/next` | 9.5.x | Service worker generation/build integration for PWA | Use this, not `next-pwa` (see "What NOT to Use"). Handles precaching + injects `public/sw.js` at build time, compatible with Next.js 16 App Router and Turbopack. |
| Native `app/manifest.ts` | built into Next.js | Web app manifest (installability) | Next.js generates `manifest.json` from a typed `MetadataRoute.Manifest` object — no separate manifest library needed. Define `name`, `short_name`, `display: "standalone"`, `icons` (include at least one `purpose: "maskable"` 512×512 icon for Android adaptive icons), `theme_color` matching DESIGN_SYSTEM teal (#2a9d8f), `background_color` matching cream (#fdf9f3). |
| `shadcn/ui` (CLI, not a runtime dependency) | latest (4.11.x CLI) | Component primitives matching the Figma Make reference | The design reference (`KidneyBuddy_Design/`) is shadcn/ui-based. Re-generate the same primitives natively in Next.js via the shadcn CLI rather than copying Vite-exported component code — gets you Next.js-correct (App Router, RSC-aware) versions of the same components. |
| `tailwindcss` | 4.x | Styling, matches design tokens in `theme.css` | Tailwind v4's CSS-first config (`@theme` in CSS, no `tailwind.config.js` needed) maps cleanly onto a CSS-variable-driven design system like KidneyBuddy's (teal/amber/cream tokens). |
| `recharts` | 3.x | Lab result trend charts | Most common React charting library for dashboard line/trend charts; works well with shadcn's `chart` component wrapper, which the project likely wants for lab parameter trend visualization. |
| `zod` | 4.x | Form + API response validation on the frontend | Mirror the same validation schemas used server-side (see backend section) to fail fast in forms before hitting the network — critical for a 50+ age user base where clear inline validation matters more than server round-trips. |
| `react-hook-form` | latest 7.x | Form state management | Standard pairing with zod (`@hookform/resolvers/zod`) for the many data-entry forms (fluid log, medication log, lab manual entry). |

### Supporting Libraries — Backend (Express container)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `drizzle-orm` + `drizzle-kit` | 0.45.x / 0.31.x | Schema definition, queries, migrations | Core data layer — see rationale below. |
| `pg` (node-postgres) | 8.22.x | Underlying Postgres driver Drizzle sits on | Required peer dependency for `drizzle-orm/node-postgres`. Use connection pooling (`pg.Pool`) — do not open a fresh client per request. |
| `argon2` (`argon2` npm package, native binding) | latest | Password hashing | OWASP's current first recommendation (Argon2id) over bcrypt for new applications in 2025/2026 — memory-hard, resists GPU/ASIC cracking better than bcrypt at equivalent cost. Use `argon2id` variant, params ≈ memory 19–64 MiB, iterations 2–3, parallelism 1. **If team unfamiliar with native-binding installs in Docker:** `bcrypt` (6.x) at cost factor 12+ remains acceptable per OWASP and has a longer Node.js track record — acceptable fallback, not the ideal choice. |
| `jsonwebtoken` | 9.0.x | JWT signing/verification for API auth | See Auth section — JWT access tokens + DB-tracked refresh tokens, not plain sessions. |
| `express-rate-limit` | 8.5.x | Brute-force lockout (NFR-03: 5 fails/10min → 15min lockout) | Use a custom store (Postgres-backed, not in-memory) keyed by `email` or `user_id`, since the lockout requirement is account-scoped, not just IP-scoped — in-memory store also won't survive container restarts/multiple backend replicas. |
| `helmet` | 8.2.x | Standard HTTP security headers | Sets `Strict-Transport-Security`, disables `X-Powered-By`, sane CSP defaults — baseline hardening expected for any health-data API. |
| `cors` | 2.8.x | Allow Frontend container's origin to call Backend container | Configure to allow only the deployed Vercel domain (+ `localhost:3000` in dev) — do not use a wildcard `*` origin given health data sensitivity. |
| `multer` | 2.2.x | Multipart file upload handling (lab PDFs/images, medication photos) | Configure `limits: { fileSize: 10 * 1024 * 1024 }` (10MB per PRD 8.5) and a `fileFilter` checking MIME type against `['application/pdf', 'image/jpeg', 'image/png']`. MIME/extension checks are not foolproof against a determined attacker but stop the overwhelming majority of accidental/casual misuse — pair with server-side magic-byte sniffing (e.g. `file-type` package) if stronger guarantees are wanted later. |
| `web-push` | 3.6.x | VAPID-based web push sending from backend | The standard, de facto Node.js implementation of the Web Push protocol — see dedicated Web Push section below. |
| `groq-sdk` | 1.3.x | Official Groq Node.js client | OpenAI-API-compatible SDK; see Groq section below. |
| `node-cron` | latest | In-process scheduler for due-reminder checks | See rationale in Architecture section — chosen over BullMQ/Agenda specifically because adding Redis or MongoDB would violate the "exactly 3 containers" constraint. |
| `zod` | 4.x | Request body / query param validation | Validate all 8 entities' create/update payloads server-side — never trust client-side zod validation alone for a health-data API. |
| `dotenv` | latest | Environment variable loading (`GROQ_API_KEY`, `DATABASE_URL`, VAPID keys) | Standard `.env` loading for local dev; in Docker Compose / Railway, env vars are injected directly so `dotenv` mainly matters for local `npm run dev`. |
| `winston` or `pino` | latest | Structured logging | `pino` is faster and lower-overhead (important since Express handles AI calls with multi-second Groq latency); use for audit-style logging of auth events and AI/anomaly triggers — useful for NFR-04 uptime monitoring correlation. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `drizzle-kit studio` | Visual DB browser during development | Use instead of pgAdmin for quick schema/data inspection — ships with Drizzle, zero extra container. |
| Docker Compose (`docker-compose.yml`, already specified in PRD 4.4) | Local 3-container orchestration | Use exactly the PRD-given skeleton; add a 4th *transient* `volumes:` entry only for Postgres data — do not add a 4th persistent *service* (e.g. Redis), since the architecture mandate is strictly 3 containers. |
| k6 | Load testing for NFR-01 (100 concurrent users, dashboard ≤3s for 95% of requests) | PRD already specifies k6 by name — script a scenario hitting the dashboard aggregate endpoint with 100 virtual users before go-live milestone. |
| Uptime Kuma | Uptime monitoring for NFR-04 (≥99%/month) | PRD already specifies this — self-hosted is possible but given Railway/Render hosting, the hosted free tier of Uptime Kuma-compatible services (or Better Stack/UptimeRobot free tier) is simpler than running a 4th container just for monitoring. |

## Installation

```bash
# Frontend container (Next.js)
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
npm install @serwist/next zod react-hook-form @hookform/resolvers recharts
npx shadcn@latest init

# Backend container (Express)
mkdir backend && cd backend
npm init -y
npm install express@5 drizzle-orm pg argon2 jsonwebtoken express-rate-limit \
  helmet cors multer web-push groq-sdk node-cron zod dotenv pino
npm install -D drizzle-kit nodemon typescript @types/express @types/node \
  @types/pg @types/jsonwebtoken @types/multer @types/cors

# VAPID key generation (run once, store in env vars / secrets, not in git)
npx web-push generate-vapid-keys
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Drizzle ORM | Prisma 7 | Prisma 7 (late 2025) removed its Rust query engine — cold starts dropped from ~1500ms to ~115ms and bundle size from 14MB to 1.6MB, closing most of the historical gap with Drizzle. If the team values Prisma's auto-generated migrations, gentler learning curve for SQL beginners, and built-in Prisma Studio over raw SQL-like query control, Prisma 7 is now a legitimate choice for an Express backend (cold start no longer matters for a long-running container, only for serverless). Choose Prisma if the team is less comfortable writing SQL-shaped queries. |
| Drizzle ORM | Raw `pg` queries, no ORM | Only viable for a very small number of endpoints; with 8 entities, soft deletes, and JSON array columns, hand-writing SQL for every query reintroduces injection risk and loses type safety. Not recommended here. |
| Express 5 | Express 4.x (LTS) | If the team finds an Express-5-specific bug or an unmaintained middleware that only supports v4 callback-style error handling, falling back to 4.x (still maintained, very mature ecosystem) is safe — but start on 5 since the project is greenfield. |
| `node-cron` (in-process scheduler) | BullMQ (Redis-backed) or Agenda (MongoDB-backed) | If reminder volume grows enough that a single Express instance polling Postgres every minute becomes a bottleneck, or if the team later scales to multiple backend replicas (duplicate-firing risk), introduce BullMQ + Redis. This means adding a 4th container, so only do this if the "exactly 3 containers" constraint is renegotiated with the instructor — out of scope for MVP. |
| `argon2` for password hashing | `bcrypt` | If Docker build issues arise from `argon2`'s native binding (it needs node-gyp / build tools in the Alpine image), `bcrypt` is an acceptable, well-trodden fallback — just use `node:20` (not `-alpine`) or add `python3 make g++` to the Alpine Dockerfile build stage. |
| JWT (access + refresh, DB-tracked) | `express-session` + `connect-pg-simple` (server-side sessions in Postgres) | If the team prefers a simpler mental model (no token refresh logic, automatic revocation via DB delete) and is not worried about the slight overhead of a DB lookup per request, server-side sessions stored in Postgres via `connect-pg-simple` are a perfectly valid alternative — especially since the backend already owns a Postgres connection. This avoids JWT's revocation complexity entirely. See Auth section for full discussion — this is a close call, not a clear-cut win for JWT. |
| `web-push` library | Firebase Cloud Messaging (FCM) for web push | Some teams route web push through FCM for analytics/delivery-receipt tooling. Not recommended here — adds a third-party dependency (Google project, API keys) for no functional gain over standards-based VAPID, and the PRD explicitly specifies "Web Push API + Service Worker," i.e., the open standard, not a vendor SDK. |
| Local Docker volume for file uploads | Railway Buckets (S3-compatible) / Cloudflare R2 / AWS S3 | See File Storage section — local volume is the pragmatic MVP choice, but flagged for migration once persistent-volume limits on Railway/Render's free/hobby tiers are hit, or before any horizontal backend scaling. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `next-pwa` (the original `shadowwalker/next-pwa` package) | Unmaintained relative to the ecosystem's move to Serwist; built on an older Workbox integration pattern that has rough edges with App Router and Turbopack (the new Next.js 16 default bundler). The community and even `next-pwa`'s own fork (`@ducanh2912/next-pwa`) point toward migrating to Serwist. | `@serwist/next` |
| Pages Router (`pages/`) for new code | No active feature development; Next.js's own docs and PWA guide are written against App Router. Mixing Pages Router in for "simplicity" only creates two competing data-fetching/layout mental models in a 27-page app. | App Router (`app/`) exclusively |
| Storing JWTs (access OR refresh) in `localStorage` | Vulnerable to XSS exfiltration — a single injected script (e.g., from a community-post XSS hole, which is a real risk surface in this app's Quora-style community feature) can read `localStorage` and steal tokens for every device. | `httpOnly`, `Secure`, `SameSite=Strict` cookies for refresh tokens; short-lived access tokens can be held in memory (not localStorage) on the client |
| In-memory rate-limit store (`express-rate-limit`'s default `MemoryStore`) for the login lockout (NFR-03) | Resets on every container restart (Railway free tier containers restart often) and doesn't share state across multiple backend replicas if the project ever scales horizontally — meaning a restart conveniently un-locks a brute-forced account. | A Postgres-backed custom store (a `login_attempts` table keyed by user/email, checked manually in the auth controller) — simplest path here since Postgres is already the single source of truth and no Redis container exists |
| `pgcrypto`'s `pgp_sym_encrypt`/`pgp_sym_decrypt` as the *only* layer of "at-rest encryption" for health columns | The decryption key has to be passed in the SQL query itself (`PGP_SYM_DECRYPT(column, 'key')`), meaning the key transits through query logs, `pg_stat_statements`, and is briefly in-memory on the DB server during decrypt — a weaker boundary than encrypting in the application layer before the data ever reaches Postgres. | Application-level AES-256-GCM encryption (Node's built-in `crypto` module) on `fluid_log`, `medication_log`, and `lab_result` sensitive columns *before* the INSERT, decrypting only in the Express layer after SELECT — keeps the encryption key entirely out of the database's reach |
| Polling `setInterval` in the request-handling process for reminder checks without persistence | If reminders are scheduled purely as in-memory `setTimeout`/`setInterval` calls (not backed by reading `ReminderSchedule` rows from Postgres on each tick), every backend container restart silently drops all pending reminders — catastrophic for a "core value = reminder reliability" product. | `node-cron` job that runs every minute and **queries Postgres** for due reminders (`jam_pengingat <= now() AND hari_aktif @> current_day`), not an in-memory schedule list |
| Storing uploaded lab files (PDF/JPG/PNG) inside the same Postgres database as `bytea` blobs | Bloats the database, slows backups, and the PRD already models `LabResult.File Path` as a path string, implying filesystem/object storage, not DB blob storage. | Local Docker volume (MVP) or object storage (post-MVP) — see File Storage section |

## Stack Patterns by Variant

**If the instructor/grading rubric is strict about "exactly 3 containers, no more, no less":**
- Do NOT add Redis (for BullMQ) or any 4th service container, even for legitimate technical upside (e.g., better job queue reliability).
- Use `node-cron` for scheduled reminders and a Postgres table for rate-limit/lockout tracking — both fit inside the existing 3 containers.
- Use local Docker volumes for file storage, not a 4th "storage" container — even though this has real production downsides (see File Storage section), it satisfies the architecture constraint and is acceptable for an MVP/academic deployment.

**If the team later relaxes the 3-container constraint (post-MVP, v2):**
- Introduce Redis + BullMQ for reminder scheduling (survives restarts more gracefully at scale, supports delayed/retry jobs natively).
- Migrate file storage to Railway Buckets (native S3-compatible, $0.015/GB-month) or Cloudflare R2 (zero egress fees) — both are drop-in replacements for local volume given `multer`'s storage engine is swappable (`multer-s3` or similar).

**If targeting iOS users heavily (per PRD's "Add to Home Screen" requirement):**
- Treat web push delivery to iOS as best-effort, not guaranteed — iOS requires the PWA to be added to the home screen before push works at all, subscriptions can silently expire/disappear, and there's a documented 7-day cap on script-writable storage plus ~50MB Cache API quota that can cause the service worker's cached state to be evicted.
- For anomaly alerts marked "severity tinggi" (high severity, PRD 8.8) that must not be missed, do not rely on push notification delivery alone — also surface the alert prominently in-app on next open (already implied by the "AnomalyAlert.Status: aktif" field) as a fallback channel, since iOS push delivery cannot be guaranteed.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `express@5.2.x` | `node@>=18` (use `node@20-LTS` to match Next.js requirement) | Express 5 removes `app.del()`, makes `req.query` read-only, changes wildcard route syntax (`/*splat` not `/*`) — do not copy Express 4 tutorial code verbatim. |
| `next@16.2.x` | `node@>=20`, React 19.2 (bundled via canary channel) | Next.js 16 raised the minimum Node version to 20 — confirm Railway/Render and the Dockerfile base image use `node:20-alpine` or newer, not `node:18`. |
| `drizzle-orm@0.45.x` | `drizzle-kit@0.31.x`, `pg@8.22.x` | Keep `drizzle-orm` and `drizzle-kit` versions paired from the same release cycle — mismatched minor versions have historically caused migration-generation drift. |
| `@serwist/next@9.5.x` | `next@>=15` (works with 16) | Configure `swSrc: 'app/sw.ts'`, `swDest: 'public/sw.js'` in `next.config.ts`; verify Turbopack (Next 16's default) doesn't conflict with Serwist's webpack-based precache injection — if it does, fall back to `next build --no-turbo` for the production build step only (dev server can stay on Turbopack). |
| `web-push@3.6.x` | Any Node ≥16 | No special version coupling; VAPID keys generated once via CLI are stable indefinitely (store as `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` env vars, inject into both `webpush.setVapidDetails()` server-side and the frontend's `pushManager.subscribe({ applicationServerKey: ... })` call). |
| `groq-sdk@1.3.x` | OpenAI SDK-compatible interface | Groq's SDK mirrors the OpenAI Node SDK's `chat.completions.create()` shape — if the team has any OpenAI-SDK familiarity, the API surface transfers directly; just point `baseURL` at Groq's endpoint and use `model: "llama-3.3-70b-versatile"`. |

## Sources

- npm registry (`npm view <pkg> version`, executed 2026-06-24) — HIGH confidence, ground-truth current published versions for: next, express, prisma, drizzle-orm, drizzle-kit, web-push, groq-sdk, multer, bcrypt, jsonwebtoken, express-rate-limit, helmet, zod, @serwist/next, pg, express-session, connect-pg-simple, cors, nodemon, shadcn, tailwindcss, recharts
- [Next.js — Guides: PWAs](https://nextjs.org/docs/app/guides/progressive-web-apps) — official docs, HIGH confidence
- [Next.js — Metadata Files: manifest.json](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest) — official docs, HIGH confidence
- [Next.js 16 blog post](https://nextjs.org/blog/next-16) and [Upgrading to v16 guide](https://nextjs.org/docs/app/guides/upgrading/version-16) — official, HIGH confidence (Oct 21 2025 release date, Node ≥20 requirement, Turbopack default)
- [Serwist — Getting started for Next.js](https://serwist.pages.dev/docs/next/getting-started) — official docs, HIGH confidence
- [Express — Migrating to Express 5](https://expressjs.com/en/guide/migrating-5.html) — official docs, HIGH confidence
- [Groq — Rate Limits docs](https://console.groq.com/docs/rate-limits) — official docs, fetched directly 2026-06-24, HIGH confidence (llama-3.3-70b-versatile free tier: 30 RPM / 1,000 RPD / 12,000 TPM / 100,000 TPD)
- [Prisma — Prisma ORM vs Drizzle](https://www.prisma.io/docs/orm/more/comparisons/prisma-and-drizzle) — official comparison, MEDIUM-HIGH confidence (vendor-authored but technically detailed; cross-checked against independent benchmarks)
- [Drizzle ORM — PostgreSQL column types](https://orm.drizzle.team/docs/column-types/pg) — official docs, HIGH confidence (jsonb + `.$type<T>()` typed array support)
- [PostgreSQL 18 docs — pgcrypto](https://www.postgresql.org/docs/current/pgcrypto.html) and [Encryption Options](https://www.postgresql.org/docs/current/encryption-options.html) — official docs, HIGH confidence
- [web-push npm package](https://www.npmjs.com/package/web-push) / [web-push-libs/web-push GitHub](https://github.com/web-push-libs/web-push) — official repo, HIGH confidence
- [Railway Docs — Volumes](https://docs.railway.com/reference/volumes) and [Storage Buckets](https://docs.railway.com/storage-buckets) — official docs, HIGH confidence (1TB volume cap on Pro tier, native S3-compatible Buckets at $0.015/GB-month)
- [Render Docs — Persistent Disks](https://render.com/docs/disks) — official docs, MEDIUM confidence (referenced via search, not directly fetched)
- Multiple independent sources (MagicBell, Brainhub, webscraft.org) on iOS PWA push limitations, cross-verified across 3+ sources — MEDIUM confidence (consistent findings: Add-to-Home-Screen mandatory, subscriptions can silently expire, ~50MB Cache API quota, 7-day script-writable storage cap)
- OWASP-aligned sources (guptadeepak.com, toolsana.com, multiple 2025/2026 password-hashing comparison articles) cross-verified for Argon2id vs bcrypt recommendation — MEDIUM confidence (consistent across independent sources, not fetched from owasp.org directly in this session)
- Betterstack/AppSignal/judoscale sources on node-cron vs Agenda vs BullMQ — MEDIUM confidence (consistent across sources; architectural conclusion — avoid 4th container — is this researcher's reasoning applied to the project's specific 3-container constraint, not a sourced claim)
- PRD.md (project source of truth, sections 4.3–4.5, 8.1–8.8, 9.1–9.5) — primary source for all constraints (3-container mandate, Postgres 16 pin, 10MB file limit, lockout policy, encryption requirement)

---
*Stack research for: KidneyBuddy (CKD patient companion PWA)*
*Researched: 2026-06-24*
