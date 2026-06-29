---
phase: 3
slug: activity-logging-lab-results
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-28
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) + ts-node test scripts (backend) |
| **Config file** | `frontend/vitest.config.ts` / `backend/src/test/` |
| **Quick run command** | `cd frontend && npm run type-check` |
| **Full suite command** | `cd frontend && npm run build && cd ../backend && npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm run type-check`
- **After every plan wave:** Run `cd frontend && npm run build && cd ../backend && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | ACTIVITY-01 | — | N/A | build | `cd backend && npm run build` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | ACTIVITY-03 | — | catatan_perasaan encrypted with AES-256-GCM | build | `cd backend && npm run build` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | ACTIVITY-01 | — | N/A (drizzle-kit push) | build | `cd backend && npx drizzle-kit push` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | ACTIVITY-02 | — | Cron uses reminderSent flag to prevent double-fire | build | `cd backend && npm run build` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | ACTIVITY-02 | — | WIB offset applied: Date.now() + 7*3600*1000 | build | `cd backend && npm run build` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | ACTIVITY-01 | — | N/A | build | `cd frontend && npm run type-check` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | ACTIVITY-02 | — | Amber banner shows "Masih aktif · [durasi] lebih", never "Terlambat" | build | `cd frontend && npm run type-check` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 2 | LAB-02 | — | N/A | build | `cd backend && npm run build` | ❌ W0 | ⬜ pending |
| 03-04-02 | 04 | 2 | LAB-04 | — | Archive is soft-delete only; no hard-delete route | build | `cd backend && npm run build` | ❌ W0 | ⬜ pending |
| 03-04-03 | 04 | 2 | LAB-02 | — | N/A (drizzle-kit push) | build | `cd backend && npx drizzle-kit push` | ❌ W0 | ⬜ pending |
| 03-05-01 | 05 | 3 | LAB-01 | — | File type/size validated server-side; MIME check + multer fileFilter | build | `cd backend && npm run build` | ❌ W0 | ⬜ pending |
| 03-05-02 | 05 | 3 | LAB-03 | — | JSONB trend query uses sql tag, not fluent API | build | `cd backend && npm run build` | ❌ W0 | ⬜ pending |
| 03-06-01 | 06 | 4 | LAB-01 | — | N/A | build | `cd frontend && npm run type-check` | ❌ W0 | ⬜ pending |
| 03-06-02 | 06 | 4 | LAB-03 | — | N/A | build | `cd frontend && npm run type-check` | ❌ W0 | ⬜ pending |
| 03-06-03 | 06 | 4 | LAB-04 | — | Archive UI hides entry from active list | build | `cd frontend && npm run type-check` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/db/schema.ts` — `daily_activities` and `lab_results` table schemas added
- [ ] `backend/src/routes/activities.ts` — stub routes for ACTIVITY-01/02/03
- [ ] `backend/src/routes/labs.ts` — stub routes for LAB-01/02/03/04
- [ ] `frontend/app/(app)/catatan/page.tsx` — Aktivitas and Lab sub-tabs enabled (currently disabled)

*Existing test infrastructure (backend debug scripts) covers smoke-testing; no new test framework installation required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Push notification fires N minutes before activity end time | ACTIVITY-02 | Requires real push subscription + wait for cron tick | Start activity, wait near estimated end time, verify amber push notification arrives |
| "Masih aktif" amber banner shows real-time duration | ACTIVITY-02 | Requires running UI with real-time polling | Start activity, let it pass estimated end time, verify banner updates every ~60s |
| Lab file upload accepts PDF/JPG/PNG ≤10MB, rejects others | LAB-01 | File picker + network requires browser interaction | Upload each type; try 11MB file; verify error messages |
| Trend chart updates on parameter dropdown change | LAB-03 | Visual rendering requires browser | Enter 3+ manual lab entries, select parameter, verify chart renders correct trend |
| Lab archive hides entry from default list | LAB-04 | UI state requires browser | Archive a lab result; verify it disappears from active list; navigate to arsip to confirm it appears there |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
