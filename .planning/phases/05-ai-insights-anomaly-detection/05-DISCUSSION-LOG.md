# Phase 5: AI Insights & Anomaly Detection - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-03
**Phase:** 5-ai-insights-anomaly-detection
**Areas discussed:** Anomaly rules & severity, Emergency notification UX, AI content placement & triggers, Groq orchestration & safety

---

## Anomaly Rules & Severity

| Option | Description | Selected |
|--------|-------------|----------|
| Personal 7-day baseline | Compare today's fluid intake vs. patient's own 7-day rolling average | ✓ |
| Doctor-set fluid limit | Requires new "batas cairan" field, out of current scope | |
| Combination | Baseline + absolute deviation fallback | |

**User's choice:** Personal 7-day baseline only (recommended option).

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed by type: CAPD abnormal + >2 missed schedules = always tinggi; rest = normal | Matches PRD FR-PS-011b's explicit always-emergency list | ✓ |
| Dynamic per-case scoring via confidence | More flexible but no historical data to calibrate thresholds yet | |

**User's choice:** Fixed mapping (recommended option).

| Option | Description | Selected |
|--------|-------------|----------|
| Rule engine computes confidence deterministically | LLM only writes explanation, never judges anomaly validity | ✓ |
| LLM judges confidence from raw data | Violates ROADMAP's "deterministic rule engine" principle | |

**User's choice:** Rule-engine-only confidence (recommended option).

| Option | Description | Selected |
|--------|-------------|----------|
| Skip rules needing history until enough data exists | No false positives from incomplete data | ✓ |
| Evaluate with partial data anyway | Risk of misleading early alerts | |

**User's choice:** Skip until sufficient history (recommended option).

**Notes:** User confirmed no further questions in this area; moved on after 4 questions.

---

## Emergency Notification UX

| Option | Description | Selected |
|--------|-------------|----------|
| Full-screen blocking modal | Reuses CAPD-effluent-acknowledge pattern; no dismiss without button tap | ✓ |
| Sticky top banner | Less forceful, allows interaction with content behind it | |

**User's choice:** Full-screen blocking modal (recommended option).

| Option | Description | Selected |
|--------|-------------|----------|
| No OS-level differentiation, rely on in-app modal | Web Push API has no reliable cross-browser sound/vibrate control | ✓ |
| Try vibrate pattern via Notification API | Not universally supported, uncertain gain | |

**User's choice:** In-app-only differentiation (recommended option).

| Option | Description | Selected |
|--------|-------------|----------|
| Modal re-appears every app open while still `aktif` | Prevents alert loss on force-close | ✓ |
| Modal shows only once | Risk of critical alert being missed entirely | |

**User's choice:** Re-appear until acknowledged (recommended option).

| Option | Description | Selected |
|--------|-------------|----------|
| Caregiver gets same full-screen modal | Consistent with Phase 4 CAREGIVER-01 "identical dashboard" | ✓ |
| Caregiver gets lighter alert only | Deviates from identical-dashboard principle | |

**User's choice:** Same modal for caregiver (recommended option).

| Option | Description | Selected |
|--------|-------------|----------|
| Alert card on Beranda + dedicated history page | Feedback (relevan/tidak relevan) available anytime, not lost on dismiss | ✓ |
| Beranda only, no history page | Feedback opportunity lost after dismiss | |

**User's choice:** Beranda card + history page (recommended option).

**Notes:** User confirmed no further questions after 5 questions across 2 turns; moved on.

---

## AI Content Placement & Triggers

| Option | Description | Selected |
|--------|-------------|----------|
| Replace AiPlaceholderCard on Beranda + manual regenerate button | Fulfills Phase 2's prepared slot; AI-01 explicitly allows manual trigger | ✓ |
| New dedicated AI page | More organized but deviates from prepared placeholder slot | |

**User's choice:** Replace placeholder card + manual button (recommended option).

| Option | Description | Selected |
|--------|-------------|----------|
| Trend/lab insight on Lab page; lifestyle on Edukasi page | Matches data locality and requirement wording | ✓ |
| Centralized "AI Insight" page for all 4 outputs | Requires new nav entry, deviates from existing placement decisions | |

**User's choice:** Distributed placement (recommended option).

| Option | Description | Selected |
|--------|-------------|----------|
| Async — lab save completes immediately, analysis appears after | Lab save doesn't depend on Groq availability | ✓ |
| Blocking — user waits for Groq before save completes | Poor UX risk if Groq is slow/down | |

**User's choice:** Async (recommended option).

| Option | Description | Selected |
|--------|-------------|----------|
| Wire Anomali.tsx report section to real anomaly_alerts query | Fulfills Phase 4 D-09's explicit promise | ✓ |
| Leave placeholder, defer to another phase | Technical debt already promised for Phase 5 | |

**User's choice:** Wire to real data (recommended option).

| Option | Description | Selected |
|--------|-------------|----------|
| Cache all AI outputs per user+date/trigger | Avoids re-calling Groq on every page view, preserves history | ✓ |
| Regenerate on every view | Wastes quota, no history | |

**User's choice:** Cache/persist (recommended option).

**Notes:** User confirmed no further questions after 5 questions across 2 turns; moved on.

---

## Groq Orchestration & Safety

| Option | Description | Selected |
|--------|-------------|----------|
| Sequential queue with delay between calls inside cron job | Simple, no Redis, stays under free-tier RPM | ✓ |
| Limited concurrency (e.g., 5 parallel) | Faster but riskier for burst rate-limit violations |

**User's choice:** Sequential with delay (recommended option).

| Option | Description | Selected |
|--------|-------------|----------|
| Skip failed user, continue batch, log error | Matches existing fanOut fault-isolation pattern | ✓ |
| Retry with backoff | Adds complexity, risk of retry storms | |

**User's choice:** Skip and continue (recommended option).

| Option | Description | Selected |
|--------|-------------|----------|
| Backend always appends disclaimer string regardless of LLM output | Actual enforcement, not just a prompt suggestion | ✓ |
| Rely on system prompt only | Risky — STATE.md blocker explicitly warns against this | |

**User's choice:** Backend-appended disclaimer (recommended option).

| Option | Description | Selected |
|--------|-------------|----------|
| Strict system prompt + forbidden-phrase validation with static fallback | Safety net beyond prompt compliance for high-severity anomalies | ✓ |
| System prompt only | No safety net if LLM output slips |

**User's choice:** Prompt + validation + fallback (recommended option).

**Notes:** This was the final area; user confirmed ready to write context after this.

---

## Claude's Discretion

- Exact DB schema/table names for AI output caching
- Exact delay duration between sequential Groq calls (tune against verified current rate limits)
- Exact forbidden-phrase list wording and static fallback template text per anomaly type
- Alert history page navigation entry point (sub-page vs. new tab — leaning sub-page given 5 tabs already fixed)
- Exact "Buat ulang ringkasan" button placement/copy

## Deferred Ideas

None — all considered alternatives (dynamic severity scoring, LLM-judged confidence, doctor-set fluid limits) were explicitly rejected in favor of the simpler/PRD-locked approach, not deferred to a future phase.
