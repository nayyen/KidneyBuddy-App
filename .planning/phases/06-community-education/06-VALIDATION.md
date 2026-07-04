---
phase: 06
slug: community-education
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-04
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js native test runner (`node:test` + `node:assert`) — no Jest/Vitest/Mocha installed |
| **Config file** | none — invoked directly via `npm test` script: `node --import tsx --test src/test/*.test.ts` |
| **Quick run command** | `cd backend && node --import tsx --test src/test/communityPost.service.test.ts` |
| **Full suite command** | `cd backend && npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --import tsx --test src/test/<touched-file>.test.ts`
- **After every plan wave:** Run `cd backend && npm test` (full suite — verifies no regression in Phases 1-5's existing tests)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | COMMUNITY-01 | T-06-01 | Zod validation rejects missing title/content/category/therapy-tag | unit | `node --import tsx --test src/test/communityPost.service.test.ts` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | COMMUNITY-03 | T-06-02 | Own-post-only archive (IDOR-safe); no hard-delete path exists | unit | `node --import tsx --test src/test/communityPost.service.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | COMMUNITY-02 | T-06-03 | Reply create + "membantu" toggle enforced one-per-user via unique constraint | unit | `node --import tsx --test src/test/communityReply.service.test.ts` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 1 | EDU-01 | — | Filter query returns only rows matching requested therapy method | unit | `node --import tsx --test src/test/educationContent.service.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/communityPost.service.test.ts` — covers COMMUNITY-01, COMMUNITY-03 (in-memory store pattern per `labResult.service.test.ts`)
- [ ] `backend/src/test/communityReply.service.test.ts` — covers COMMUNITY-02, including toggle-twice-returns-to-unmarked test case
- [ ] `backend/src/test/educationContent.service.test.ts` — covers EDU-01 filter behavior
- [ ] No framework install needed — `node:test` is built into Node.js 20, already in use

---

## Manual-Only Verifications

*None — all phase behaviors have automated verification via the service-layer test files above.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
