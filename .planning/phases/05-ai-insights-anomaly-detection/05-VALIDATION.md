---
phase: 05
slug: ai-insights-anomaly-detection
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-03
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in test runner (`node --import tsx --test`) — confirmed via `backend/package.json`'s `"test"` script and existing `src/test/*.test.ts` files |
| **Config file** | none — plain `node:test` + `node:assert/strict`, no separate config |
| **Quick run command** | `cd backend && node --import tsx --test src/test/<file>.test.ts` |
| **Full suite command** | `cd backend && npm test` |
| **Estimated runtime** | ~10-20 seconds |

---

## Sampling Rate

- **After every task commit:** Run the single new/changed test file
- **After every plan wave:** Run `cd backend && npm test` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD-01 | TBD | 0 | ANOMALY-01 | — | Rule engine fires/skips correctly for all 4 anomaly types + D-04 silent-skip on insufficient history | unit | `node --import tsx --test src/test/anomalyRule.service.test.ts` | ❌ W0 | ⬜ pending |
| TBD-02 | TBD | 0 | ANOMALY-03 | — | High-severity rule always maps to `tinggi` (D-02 fixed mapping, not dynamically scored) | unit | `node --import tsx --test src/test/anomalyRule.service.test.ts` | ❌ W0 | ⬜ pending |
| TBD-03 | TBD | 0 | ANOMALY-02 | T-05-IDOR | Alert card fields populate from rule output; endpoint filters by `req.user!.id` | unit | `node --import tsx --test src/test/anomaly.controller.test.ts` | ❌ W0 | ⬜ pending |
| TBD-04 | TBD | 0 | ANOMALY-04 | T-05-IDOR | Feedback PATCH persists `relevan`/`tidak_relevan`, scoped to owning user | unit/integration | `node --import tsx --test src/test/anomaly.controller.test.ts` | ❌ W0 | ⬜ pending |
| TBD-05 | TBD | 0 | AI-05 | — | Disclaimer is always appended regardless of LLM output content (D-19) | unit | `node --import tsx --test src/test/aiDisclaimer.test.ts` | ❌ W0 | ⬜ pending |
| TBD-06 | TBD | 0 | ANOMALY-02 | T-05-PROMPT-INJ | Forbidden-phrase detection triggers static fallback; fallback matches per-type template; safe text passes through unchanged (D-20) | unit | `node --import tsx --test src/test/forbiddenPhrases.test.ts` | ❌ W0 | ⬜ pending |
| TBD-07 | TBD | 0 | AI-01/AI-02 | — | Batch loop continues after one user's Groq call throws (D-18 fault isolation) | unit | `node --import tsx --test src/test/dailySummary.job.test.ts` | ❌ W0 | ⬜ pending |

*Full task-to-test mapping to be finalized by the planner once PLAN.md task IDs exist — this table seeds from RESEARCH.md's Phase Requirements → Test Map.*

---

## Wave 0 Requirements

- [ ] `backend/src/test/anomalyRule.service.test.ts` — covers ANOMALY-01, ANOMALY-03 (D-01..D-04 rule logic, table-driven for all 4 anomaly types)
- [ ] `backend/src/test/forbiddenPhrases.test.ts` — covers D-20 (the genuinely novel mechanism — highest-value new test in this phase)
- [ ] `backend/src/test/aiDisclaimer.test.ts` — covers AI-05/D-19
- [ ] `backend/src/test/anomaly.controller.test.ts` — covers ANOMALY-02, ANOMALY-04, following the injected-fake pattern already used in `report.service.test.ts`
- [ ] `backend/src/test/dailySummary.job.test.ts` (or similar) — covers D-17/D-18 fault isolation with an injected fake Groq client (never call the real Groq API in tests — would consume free-tier quota and be non-deterministic)
- [ ] Framework install: none — `node --import tsx --test` already configured, no new dependency needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full-screen emergency modal appears non-dismissable on both patient and caregiver devices and re-appears on next app open while `status: aktif` | ANOMALY-02, FR-PS-011b | Cross-device push delivery + UI blocking behavior not exercisable by `node:test` | Trigger a `tinggi`-severity anomaly (e.g., seed abnormal CAPD effluent), open app on patient + caregiver device, confirm modal blocks navigation and re-appears after force-close/reopen until acknowledged |
| Daily summary / weekly insight / lab analysis actually render calm, non-diagnostic Bahasa Indonesia prose with disclaimer visible in UI | AI-01, AI-02, AI-03, AI-05 | LLM output quality/tone is not unit-testable | Manually trigger each job (or wait for cron), inspect rendered card copy in the browser for tone and disclaimer visibility |
| Groq free-tier rate limit is not exceeded under realistic batch size | D-17 | Requires live Groq calls against real/seeded user volume | Run the 3 batch jobs against a seeded dataset sized to realistic user count, confirm no 429s in logs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
