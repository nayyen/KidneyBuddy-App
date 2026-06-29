---
phase: 4
slug: caregiver-dashboard-doctor-reports
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-29
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js native test runner (`node:test`) with `tsx` |
| **Config file** | none — inline `--test` flag in `package.json` scripts |
| **Quick run command** | `cd backend && node --import tsx --test src/test/report.service.test.ts` |
| **Full suite command** | `cd backend && node --import tsx --test src/test/*.test.ts` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && node --import tsx --test src/test/report.service.test.ts`
- **After every plan wave:** Run `cd backend && node --import tsx --test src/test/*.test.ts`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-W0-01 | W0 | 0 | CAREGIVER-02 | — | N/A | unit | `node --import tsx --test src/test/reminders.controller.test.ts` | ❌ W0 | ⬜ pending |
| 04-W0-02 | W0 | 0 | REPORT-01 | — | N/A | unit | `node --import tsx --test src/test/report.service.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-01 | 01 | 1 | CAREGIVER-02 | — | `updated_at` set on reminder update | unit | `node --import tsx --test src/test/reminders.service.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | CAREGIVER-02 | — | Push sent fire-and-forget after reminder update | unit | `node --import tsx --test src/test/reminders.controller.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | REPORT-01 | — | `generateReport` returns correct fluid summary | unit | `node --import tsx --test src/test/report.service.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | REPORT-01 | — | Medication adherence % calculated correctly | unit | `node --import tsx --test src/test/report.service.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-03 | 02 | 1 | REPORT-01 | — | CAPD condition frequency counts correct | unit | `node --import tsx --test src/test/report.service.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-04 | 02 | 1 | REPORT-01 | — | Date range > 90 days returns 400 | unit | `node --import tsx --test src/test/report.service.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-05 | 02 | 1 | REPORT-01 | — | WIB-correct date range for medication_log | unit | `node --import tsx --test src/test/report.service.test.ts` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | REPORT-02 | — | Doctor note renders in print preview | manual | browser print preview | manual-only | ⬜ pending |
| 04-03-02 | 03 | 2 | REPORT-02 | — | Print output hides AppShell elements | manual | browser print preview | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/report.service.test.ts` — covers REPORT-01 (fluid summary, adherence %, CAPD frequency, date > 90 days → 400, WIB timezone boundary)
- [ ] `backend/src/test/reminders.controller.test.ts` — covers CAREGIVER-02 (`updated_at` mutation + push fire-and-forget)

*Existing test infrastructure (`node:test` + `tsx`) is already in place — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Doctor note renders in print preview | REPORT-02 | Requires browser print dialog interaction | Open report preview page with `?note=Test+note`, trigger browser print (Ctrl+P), verify note appears in output |
| Print output hides AppShell nav | REPORT-02 | Requires browser print rendering | Open report preview, trigger print, verify sidebar/header hidden via `@media print` CSS |
| Caregiver sees patient data in real time (≤30s) | CAREGIVER-01, CAREGIVER-02 | Requires two browser sessions | Open patient session + caregiver session simultaneously; update a reminder in patient session; verify caregiver dashboard refreshes within 30s |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
