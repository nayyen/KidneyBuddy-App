---
phase: quick-260706-q0g
plan: 01
subsystem: backend/seed
tags: [seed-data, demo, encryption, ai-narration, community, education]
dependency-graph:
  requires: [lib/encryption.ts, utils/passwordHash.ts, lib/aiDisclaimer.ts, utils/wib.ts, lib/db.ts, db/schema/index.ts]
  provides: [seed/generate-demo-data.ts, seed/seed-demo.ts, seed/data/*.json, seed/content/*.ts, seed/lib/rng.ts]
  affects: [demo login / presentation dataset for lukman@/sari@/budi@demo.kidneybuddy.id]
tech-stack:
  added: []
  patterns:
    - "mulberry32 seeded PRNG (SeededRng) — single instance, all stochastic choices route through it, no Math.random/crypto.randomUUID/Date.now, verified byte-identical across regenerations"
    - "Two-part seed architecture: generator writes plaintext JSON (data/*.json, committed), loader TRUNCATEs + encrypts/hashes at insert time"
key-files:
  created:
    - backend/src/seed/lib/rng.ts
    - backend/src/seed/content/education.ts
    - backend/src/seed/content/community.ts
    - backend/src/seed/content/aiText.ts
    - backend/src/seed/generate-demo-data.ts
    - backend/src/seed/data/*.json (23 files)
    - backend/src/seed/seed-demo.ts (new loader, replaces old version)
  modified:
    - backend/package.json (added seed:demo:generate, removed dead seed:education)
  deleted:
    - backend/src/seed/seed-demo.ts (old 467-line single-patient version)
    - backend/src/seed/seed-education.ts (content folded into content/education.ts)
decisions:
  - "Sari's post-Lebaran 'kalium-tinggi' anomaly narrative uses tipeAnomali='pola_asupan_menyimpang' with severity='normal' (not 'tinggi'), because D-02 in anomalyRule.service.ts fixes severity per type — pola_asupan_menyimpang is always 'normal'. The narrative content still describes elevated potassium-rich intake; only the severity enum follows the engine's fixed mapping. This is a deliberate resolution of a drift between the plan's prose description and the source-of-truth rule engine (contracts_verified/anomalyRule.service.ts), per the plan's own instruction to follow the source file over the plan text."
  - "medication_log lands at ~4.4k rows total, not the plan's '7-9k' estimate — the plan's own action text fixes exact reminder counts per persona (Lukman 8, Sari 9+EPO, Budi 7), and 24 obat-type reminders x ~180 days caps out near 4.4k regardless of adherence rate. Followed the literal, more specific per-persona counts over the looser aggregate estimate; documented here rather than silently padding with invented extra medications."
metrics:
  duration: "~2.5h (Tasks 1-2 autonomous; Task 3 resumed after Docker came up)"
  completed: "2026-07-06 (all 3 tasks — Task 3 verified live against Postgres)"
---

# Quick Task 260706-q0g: Rebuild demo seed (6 months, generator+loader architecture) Summary

Rebuilt the KidneyBuddy demo seed from scratch as a two-part deterministic architecture: `generate-demo-data.ts` (writes committed plaintext JSON, one file per table/persona-shard) + a new `seed-demo.ts` loader (TRUNCATE CASCADE, FK-ordered batch insert, encrypts 8 sensitive columns and hashes the demo password at insert time). Models 180 days (2026-01-08..2026-07-06) of CKD clinical activity for 3 personas — Lukman Hakim (CAPD), Sari Wulandari (HD), Budi Santoso (Transplantasi) — including Ramadan/Lebaran seasonality and 3 engineered anomaly episodes tied to matching community posts.

## What Was Done

### Task 1 — Generator + committed JSON (commit `c47ba80`)

- Re-read every contract file listed in the plan's context block (`lib/encryption.ts`, `utils/passwordHash.ts`, `lib/aiDisclaimer.ts`, `lib/therapyReminderScope.ts`, `utils/wib.ts`, `lib/db.ts`, `seed-education.ts`, and all 22 schema files, plus `fluid.service.ts`, `anomalyRule.service.ts`, `onboarding.service.ts`, `reminder.schema.ts`, `reminderSchedule.repository.ts`) — every fact in `contracts_verified` still held; no drift found in enums, function signatures, timestamp math, or day-name casing.
- `seed/lib/rng.ts`: mulberry32 `SeededRng` class (`rand`/`randInt`/`pick`/`chance`/`uuid`). Verified reproducibility directly: ran the generator twice and diffed `sha256sum` of every JSON file — **byte-identical across regenerations**.
- `seed/content/education.ts`: 28 hand-written articles (CAPD 5, HD 4, Transplantasi 4, Umum 15 — split across Nutrisi&Diet/Obat/Gaya Hidup/Mental&Dukungan/Umum-lain), reusing and expanding the existing `seed-education.ts` voice.
- `seed/content/community.ts`: 3 anchored narrative posts (Lukman's April effluent-keruh question, Sari's post-Lebaran kalium post, Budi's 6-bulan-pasca-transplan milestone) + 21 templated post shapes + 10 reply templates.
- `seed/content/aiText.ts`: template builders for daily-summary/weekly-insight/lifestyle/lab-analysis narration, each already wrapped in `appendDisclaimer()`.
- `seed/generate-demo-data.ts`: single deterministic writer producing 23 JSON files under `seed/data/`. Reused the exact WIB timestamp math (`Date.UTC(y,m-1,d) - 7h + h*3600000 + min*60000`) and ISO-week-key algorithm from `utils/wib.ts`, parameterized for arbitrary dates instead of "now".
- Deleted old `seed-demo.ts` (467-line single-patient version) and `seed-education.ts` (content now lives in `content/education.ts`).
- `npm run seed:demo:generate` verified: runs clean, all JSON valid, `users.json` has exactly 3 entries, tsc clean (only 4 pre-existing unrelated `dialysisLog.controller.ts`/`medicationLog.controller.ts` `string|string[]` errors remain — documented in STATE.md before this task, untouched by this work).

**Actual row counts** (final, after one tuning pass to bring fluid volume into spec range):

| Table | Count | Spec estimate |
|---|---|---|
| reminder_schedule | 30 | — |
| medication_log | 4,397 | "7-9k" (see Deviations) |
| dialysis_log | 797 | "~800" ✓ |
| fluid_log | 3,409 | "~3-4k" ✓ |
| daily_activities | 782 | "800-1200" (close, slightly under) |
| lab_results | 75 | 4-6 panels/patient ✓ |
| anomaly_alerts | 6 | "~6" ✓ |
| ai_daily_summaries | 42 | "~14/patient" ✓ |
| ai_weekly_insights | 24 | "~8/patient" ✓ |
| ai_lifestyle_suggestions | 21 | "~7/patient" ✓ |
| ai_lab_analyses | 6 | "1 per major panel" ✓ |
| community_posts | 40 | "35-45" ✓ |
| community_replies | 108 | "1-4/post" ✓ |
| community_reply_helpful | 82 | dedup'd spread ✓ |
| education_content | 28 | "28-32" ✓ |

### Task 2 — Loader (commit `532ed92`)

- New `seed/seed-demo.ts`: `import "dotenv/config"` first, then `db`/`pool`, `encrypt`, `hashPassword`, `sql`, and all 22 schema tables.
- Optional section arg (`npm run seed:demo -- fluid`) via a `SECTION_LOADERS` map, documented as an iterative-debugging path only (assumes parents already loaded).
- Full run: single `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` listing all 22 user-data tables explicitly (not just `TRUNCATE users CASCADE`, since `education_content` and `login_attempts` have no FK path back to `users` and would survive a users-only cascade).
- Loads every section in FK-dependency order (users → onboarding/therapy/reminders → fluid/medication/dialysis/activities/lab → anomaly/AI caches → community → education), batching inserts at ≤500 rows.
- `hashPassword("Demo1234!")` called once at load time for all 3 users — the generator's placeholder hash is always overwritten, never trusted.
- `encrypt()` applied immediately before insert to the 8 sensitive columns: `fluid_log.catatan`, `daily_activities.catatanPerasaan`, `anomaly_alerts.deskripsi`, `lab_results.catatan`, and all 4 AI narration columns (`ai_daily_summaries.ringkasanText`, `ai_weekly_insights.wawasanText`, `ai_lab_analyses.analisisText`, `ai_lifestyle_suggestions.saranText`). Community and education content inserted as plaintext (public, non-sensitive, per D-09/RESEARCH Pitfall 1).
- ISO timestamp strings from JSON converted back to `Date` objects for `timestamp` columns; `date`/text columns pass through unchanged.
- `try/finally` calls `pool.end()` on both success and failure paths.
- Automated verify passed: tsc clean; `package.json` has `seed:demo:generate` + `seed-demo.ts` reference + no `seed:education`; loader source contains `encrypt(`, `hashPassword(`, `CASCADE`, `pool.end(`.

### Task 3 — Live load + end-to-end verification (COMPLETE, no code fixes needed)

Initially blocked (Docker Desktop unreachable at dispatch — client responded, daemon timed out/500'd on every call). Resumed after the orchestrator confirmed Docker Desktop was up with all 3 containers running (backend Up, db Up healthy, frontend Up).

**Load run** — full pipeline executed inside the backend container (guarantees the same `ENCRYPTION_KEY` the API uses; invoked by file path since only `./backend/src` is volume-mounted, package.json scripts are baked into the image):

```
$ docker compose exec backend node --import tsx src/seed/seed-demo.ts
Truncating 22 tables (CASCADE, RESTART IDENTITY)...
  ✓ users: 3 rows ... ✓ education_content: 28 rows
✅ Full demo seed loaded successfully!
```

**Row counts verified via psql** (every table matches the committed JSON exactly):

| Table | DB count | JSON count |
|---|---|---|
| users | 3 | 3 ✓ |
| onboarding_progress / therapy_history | 3 / 5 | 3 / 5 ✓ |
| reminder_schedule | 30 | 30 ✓ |
| fluid_log | 3,409 | 3,409 ✓ |
| medication_log | 4,397 | 4,397 ✓ |
| dialysis_log | 797 | 797 ✓ |
| daily_activities | 782 | 782 ✓ |
| lab_results | 75 | 75 ✓ |
| anomaly_alerts | 6 | 6 ✓ |
| ai_daily_summaries / weekly / lifestyle / lab | 42 / 24 / 21 / 6 | ✓ all |
| community_posts / replies / helpful | 40 / 108 / 82 | ✓ all |
| education_content | 28 | 28 ✓ |
| push_subscriptions / refresh_tokens | 0 / 0 | truncate-only ✓ |

**Zero old-seed rows:** `SELECT count(*) FROM users WHERE email NOT LIKE '%@demo.kidneybuddy.id'` → 0.

**Emergency-modal guard:** `SELECT count(*) FROM anomaly_alerts WHERE severity='tinggi' AND status='aktif'` → **0** (checked with NO date filter — stricter than the plan's CURRENT_DATE-scoped snippet, because I traced `repositories/anomalyAlert.repository.ts#findActiveHighSeverity()` and confirmed the modal check is not date-scoped: any tinggi+aktif row triggers it). The plan's literal CURRENT_DATE check also returns 0.

**Login + decryption smoke test — all 3 personas:**
- `POST /api/auth/login` → **HTTP 200 + accessToken** for lukman@, sari@, and budi@demo.kidneybuddy.id with `Demo1234!`.
- `GET /api/onboarding/progress` → `{"onboardingComplete":true,"lastCompletedStep":3,"reminderConfigured":true}` for all 3 — login lands on beranda, never the onboarding wizard.
- Authenticated GETs, all HTTP 200 with **zero "Invalid ciphertext" / decrypt errors**, for each persona: `/api/reminders`, `/api/fluid/daily-balance`, `/api/fluid/recent`, `/api/activities`, `/api/lab`, `/api/anomaly`, `/api/ai/daily-summary`, `/api/community`, `/api/education`. Also verified for Lukman: `/api/ai/weekly-insight`, `/api/ai/lifestyle`, `/api/anomaly/active-high-severity` (returns empty — modal stays closed).
- Spot-checked decrypted content is the actual seeded plaintext: fluid `catatan` = "Drainase pagi — jernih, volume 1517ml"; AI daily summary and lifestyle text return the generator's disclaimer-appended narration verbatim (cache hit — no live Groq call), and anomaly `deskripsi` decrypts to the seeded Indonesian narrative.

**Per-section CLI arg verified:** `docker compose exec backend node --import tsx src/seed/seed-demo.ts fluid` loaded only the fluid section (fluid_log went 3,409 → 6,818, all other tables untouched — appends without TRUNCATE, exactly as documented for the iterative-debugging path). Full load re-run afterwards restored the clean 3,409/3-users state.

**Regression:** backend `npx tsc --noEmit` clean (only the 4 pre-existing, unrelated `dialysisLog.controller.ts`/`medicationLog.controller.ts` errors remain); `npm test` → **255/258 pass** — the 3 failures are exactly the pre-documented container-only DB tests (labUploadTrend's `getTrendData` suite, which needs an in-container DB connection; the db service exposes no host port). No new failures.

**No fixes were required during Task 3**, so per the plan's "3 atomic commits (…Task 3 verification fixes if any)" there is no third code commit.

## Deviations from Plan

### Auto-fixed / tuned (non-blocking)

**1. [Tuning] Increased fluid_log intake-entry frequency to land in the "~3-4k" spec range**
- **Found during:** Task 1 self-check after first generator run.
- **Issue:** Initial fluid_log output was 2,858 rows, below the "3-4k" estimate.
- **Fix:** Increased Lukman's occasional-drink chance (1 slot @ 35% → 3 slots @ 55% each) and widened Sari's/Budi's daily drink-count ranges by 1.
- **Files modified:** `backend/src/seed/generate-demo-data.ts`
- **Result:** 3,409 rows, within spec range. Included in Task 1's commit.

### Documented, non-blocking drift from plan prose (Rule-1-adjacent — followed source over plan text)

**2. Sari's post-Lebaran anomaly severity resolved to "normal", not "tinggi"**
- **Found during:** Task 1, while writing anomaly-alerts.json.
- **Issue:** The plan's action text calls Sari's post-Lebaran episode "kalium-tinggi" (implying high severity), but `anomalyRule.service.ts`'s D-02 fixes severity per `tipeAnomali` — `pola_asupan_menyimpang` (the closest-fitting type for a deviant-intake-pattern narrative) is always `severity: "normal"`. There is no rule-engine type for "lab-value-triggered high severity."
- **Resolution:** Kept `tipeAnomali: "pola_asupan_menyimpang"`, `severity: "normal"`, with `deskripsi` narrating the elevated potassium-rich post-Lebaran intake and the lab correlation. The plan's own Task 1 instruction says "if any drifted, follow the source file, not this plan" — applied that here since this is an enum-invariant conflict, not a bug in my code.
- **Files:** `backend/src/seed/generate-demo-data.ts` (anomaly-alerts section)

**3. medication_log total (~4.4k) below the plan's "7-9k" estimate**
- **Found during:** Task 1 self-check.
- **Issue:** The plan's `<done>` criteria estimate "medication ~7-9k" rows, but the same plan's action text fixes exact per-persona reminder counts (Lukman 8 obat, Sari 9 obat + 1 EPO, Budi 7 obat) — 24 obat-type reminders × ~180 days caps out near 4.4k regardless of adherence rate, well short of 7-9k.
- **Resolution:** Followed the more specific, explicit per-persona counts (they are named individually with specific drug names and times in the plan text) rather than inventing additional unlisted medications purely to inflate the row count to match a looser aggregate estimate. Documented here rather than silently deviating.
- **Files:** `backend/src/seed/generate-demo-data.ts`

No other deviations. All 3 tasks match the plan's binding contract; Task 3 completed with zero verification failures and zero code fixes.

## Known Stubs

None — the generator/loader architecture is complete, self-contained, and verified live end-to-end.

## Self-Check

Verified before finalizing:

```bash
$ git log --oneline -3 -- backend/src/seed
532ed92 feat(quick-260706-q0g): new seed-demo.ts loader — TRUNCATE + FK-ordered encrypted batch insert (Task 2/3)
c47ba80 feat(quick-260706-q0g): deterministic demo-data generator + committed JSON (Task 1/3)
```

- `backend/src/seed/generate-demo-data.ts` — FOUND
- `backend/src/seed/seed-demo.ts` — FOUND
- `backend/src/seed/lib/rng.ts` — FOUND
- `backend/src/seed/content/{education,community,aiText}.ts` — FOUND (all 3)
- `backend/src/seed/data/*.json` — FOUND (23 files, all valid JSON, `users.json` = 3 entries)
- Commit `c47ba80` — FOUND in `git log`
- Commit `532ed92` — FOUND in `git log`
- Old `backend/src/seed/seed-demo.ts` (467-line version) and `seed-education.ts` — confirmed absent from working tree (deleted in `c47ba80`)
- Live DB: users=3, fluid_log=3409, medication_log=4397, tinggi+aktif anomalies=0 — VERIFIED via psql after final full load
- All 3 personas: login HTTP 200 + token, onboardingComplete=true, 9+ encrypted-column endpoints HTTP 200 with zero decrypt errors — VERIFIED via curl

## Self-Check: PASSED (all 3 tasks)
