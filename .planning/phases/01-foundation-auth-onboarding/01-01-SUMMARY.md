# Plan 01-01 SUMMARY — Walking Skeleton

**Phase:** 01-foundation-auth-onboarding
**Plan ID:** 01-01
**Wave:** 1
**Status:** ✅ Complete — awaiting human checkpoint

## What Was Built

### 3-Container Docker Stack
- **docker-compose.yml** — three services (frontend, backend, db) on a shared backend-network; db uses `postgres:16` with named volume `pgdata`; frontend on `:3000`, backend on `:4000`
- **backend/Dockerfile** — Express 5.2.1 + TypeScript + Node 20 Alpine with argon2 native build support
- **frontend/Dockerfile** — Next.js 16 + Node 20 Alpine, standalone output
- **.env.example** — documents all required environment variables

### Backend (Express 5 + Drizzle + PostgreSQL)
- **Layered architecture**: Route → Controller → Service → Repository
- **Drizzle schema**: `users` table with uuid PK, namaLengkap, email (unique), passwordHash (argon2id), nomorTelepon, tanggalLahir, role (default 'Pasien'), riwayatTerapi (jsonb), soft delete
- **Auth routes**: `POST /api/auth/register`, `GET /api/auth/profile?email=`
- **Password hashing**: Argon2id with 19 MiB memory, 2 iterations, 1 parallelism
- **Error handling**: Centralized AppError class with structured JSON responses
- **Database connection**: Singleton `pg.Pool` + Drizzle `db` instance

### Frontend (Next.js 16 App Router + Tailwind 4 + shadcn)
- **Design tokens**: All DESIGN_SYSTEM_KidneyBuddy_v3.md colors in globals.css (cream bg `#fdf9f3`, teal primary `#2a9d8f`, dark text `#1a2e2c`, etc.)
- **Typography**: Plus Jakarta Sans (headings) + DM Sans (body) via next/font
- **Registration page**: Fully interactive form with react-hook-form + zod validation in Bahasa Indonesia
- **Dashboard page**: Reads user name from backend via API fetch
- **API client**: `lib/api.ts` — thin fetch wrapper, no business logic
- **Container boundary**: No `app/api/*` routes in frontend; all data flows through REST

## Test Results
- `npm test` → 4/4 tests pass
  - passwordHash should return argon2id hash ✅
  - passwordHash should verify correct / reject wrong ✅
  - auth.service register hash test ✅
  - auth.service wrong password test ✅

## Files Created (29 files)
```
.gitignore
.env.example
docker-compose.yml
backend/Dockerfile
backend/.dockerignore
backend/package.json
backend/tsconfig.json
backend/drizzle.config.ts
backend/src/server.ts
backend/src/app.ts
backend/src/lib/db.ts
backend/src/db/schema/users.schema.ts
backend/src/db/schema/index.ts
backend/src/utils/passwordHash.ts
backend/src/routes/auth.routes.ts
backend/src/controllers/auth.controller.ts
backend/src/services/auth.service.ts
backend/src/repositories/user.repository.ts
backend/src/middleware/errorHandler.ts
backend/src/test/auth.skeleton.test.ts
frontend/Dockerfile
frontend/.dockerignore
frontend/package.json
frontend/tsconfig.json
frontend/postcss.config.mjs
frontend/next.config.ts
frontend/app/globals.css
frontend/app/fonts.css
frontend/app/layout.tsx
frontend/app/(auth)/register/page.tsx
frontend/app/dashboard/page.tsx
frontend/lib/api.ts
frontend/lib/validators/auth.schema.ts
```
