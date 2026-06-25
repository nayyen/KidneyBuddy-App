# Walking Skeleton — KidneyBuddy

**Phase:** 1
**Generated:** 2026-06-25

## Capability Proven End-to-End

A new user can submit the registration form in the Next.js frontend, which calls the Express backend over REST (`NEXT_PUBLIC_API_URL`), which hashes the password with Argon2id and writes a real row to the PostgreSQL `users` table via Drizzle; the user is then redirected to a placeholder dashboard that reads their name back from the backend — exercising all three containers (Next.js → Express → Postgres) in a single round trip, with the frontend holding zero business logic and never touching the database directly.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Frontend framework | Next.js 16.2.x (App Router, TypeScript, Turbopack) | Mandated by PRD 3-container constraint; App Router is the only actively-developed router; deploys to Vercel zero-config (STACK.md). Pages Router forbidden. |
| Backend framework | Express 5.2.x (TypeScript, Node 20 LTS) | Mandated by PRD; Express 5 built-in async error forwarding removes try/catch boilerplate. Write against v5 semantics (req.query read-only, `/*splat` wildcard syntax) — do NOT copy v4 tutorials (STACK.md Version Compatibility). |
| Data layer | PostgreSQL 16 + Drizzle ORM 0.45.x / drizzle-kit 0.31.x + `pg` 8.22.x (pg.Pool) | PRD-pinned `postgres:16`; Drizzle chosen over Prisma for SQL-level control with 8+ entities, jsonb arrays, soft deletes (STACK.md). Connection pooling via `pg.Pool`, never a fresh client per request. |
| Auth | Argon2id (`argon2` pkg, argon2id variant, memory 19-64 MiB, iterations 2-3, parallelism 1) + JWT short-lived access token (in-memory on client) + DB-tracked refresh token in httpOnly/Secure/SameSite=Strict cookie (~30 day persistent login) | OWASP first recommendation; refresh token in cookie not localStorage (XSS resistance, STACK.md "What NOT to Use"). Access token never in localStorage. |
| Rate-limit / lockout store | Postgres-backed `login_attempts` table checked manually in auth controller — NOT express-rate-limit MemoryStore | MemoryStore resets on container restart, silently un-locking brute-forced accounts (STACK.md, PITFALLS.md security mistakes). Lockout is account-scoped (email/user_id), not IP-scoped. |
| Directory layout | `backend/src/{routes,controllers,services,repositories,middleware,db/schema,lib,utils,config}` + `frontend/app/{(auth),onboarding,dashboard}` with `frontend/lib/{api,validators,hooks}` | Layered modular monolith inside the Backend container (Route→Controller→Service→Repository); only the service layer holds business logic (ARCHITECTURE.md). Resists the "monolith wearing three Dockerfiles" pitfall (PITFALLS.md Pitfall 6). |
| Container boundary | 3 services in `docker-compose.yml`: `frontend` (Dockerfile), `backend` (Dockerfile), `db` (postgres:16 image + named volume). REST/JSON over HTTPS via `NEXT_PUBLIC_API_URL` only. DB port NOT exposed to frontend network. | Non-negotiable university requirement. Frontend NEVER imports a DB driver, holds a Groq key, or runs a Next.js API route that touches the DB/Groq (PITFALLS.md Pitfall 6, "Looks Done But Isn't"). |
| Styling | Tailwind CSS 4.x (CSS-first `@theme`) + shadcn/ui primitives (regenerated natively via CLI, NOT ported from KidneyBuddy_Design Vite export) + design tokens from `DESIGN_SYSTEM_KidneyBuddy_v3.md` | Tailwind v4 CSS-variable config maps onto teal/amber/cream tokens. shadcn primitives regenerated for App Router/RSC, not copied from the Vite export. |
| Deployment target | Local full-stack run via `docker-compose up` (documented); production target Vercel (frontend) + Railway/Render (backend+db) deferred to a later hardening phase | MVP skeleton proves the stack locally end-to-end; public deploy is not required for Phase 1 sign-off. |

## Stack Touched in Phase 1

- [x] Project scaffold — Next.js 16 frontend + Express 5 backend + Tailwind 4 + shadcn + Drizzle + lint (Plan 01)
- [x] Routing — `/register`, `/login` frontend routes; `POST /api/auth/register`, `POST /api/auth/login` backend routes (Plans 01-02)
- [x] Database — real write (INSERT user on register) AND real read (SELECT user on login/dashboard) via Drizzle (Plan 01 skeleton, expanded in 02)
- [x] UI — registration form (interactive, react-hook-form + zod) POSTing to the backend and rendering the response (Plan 01)
- [x] Deployment — `docker-compose up` brings all 3 containers up and the full register→dashboard path works locally (Plan 01)

## Out of Scope (Deferred to Later Slices)

> Explicit list to prevent later phases re-litigating Phase 1's minimalism.

- Fluid/medication/activity logging, daily delta calculation, CAPD effluent alert — Phase 2
- PWA installability, service worker, web push / VAPID subscriptions, iOS Add-to-Home-Screen gate — Phase 2
- node-cron scheduler, reminder delivery — Phase 2
- Responsive multi-layout system (mobile bottom-nav / tablet 2-col / desktop sidebar) — Phase 2 (Phase 1 screens are mobile-first single-column only)
- Column-level at-rest encryption for fluid_log/medication_log/lab_result — Phase 2 (no sensitive tracking columns exist yet in Phase 1; password is hashed not encrypted)
- Lab results, trend charts, file upload (multer) — Phase 3
- Caregiver dashboard real-time sync, doctor reports — Phase 4
- AI summaries, anomaly detection, Groq integration — Phase 5
- Community, education content — Phase 6
- Public cloud deployment (Vercel + Railway/Render), Uptime Kuma, k6 load test — later hardening
- Jenis Kelamin (gender) and consent-record auditing beyond a registration boolean — minimal in Phase 1 (registration captures the 5 required fields + birth date; gender is optional/deferred)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: Fluid & medication tracking + reminders + PWA/push + responsive shell (highest-risk phase)
- Phase 3: Activity logging + lab results & trend charts
- Phase 4: Caregiver dashboard + doctor reports
- Phase 5: AI insights + anomaly detection (Groq)
- Phase 6: Community + education
