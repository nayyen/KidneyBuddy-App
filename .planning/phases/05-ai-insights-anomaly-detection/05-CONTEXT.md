# Phase 5: AI Insights & Anomaly Detection - Context

**Gathered:** 2026-07-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Patients receive AI-generated daily summaries, weekly trend insights, lab analysis, and lifestyle suggestions in calm, non-diagnostic Bahasa Indonesia with a server-enforced medical disclaimer, and are reliably alerted to clinically meaningful anomalies via a deterministic rule engine that fires alerts and an LLM that generates only the Bahasa Indonesia explanation (never the yes/no anomaly decision or the severity/confidence value). High-severity anomalies (CAPD abnormal effluent, >2 missed therapy schedules/day) trigger a non-dismissable in-app emergency modal on both patient and caregiver devices, reusing the existing CAPD-effluent-acknowledge pattern. All AI output is cached per user+date/trigger rather than regenerated on every view, and the daily/weekly/anomaly cron batches are throttled to stay under Groq's free-tier rate limits.

</domain>

<decisions>
## Implementation Decisions

### Anomaly Rules & Severity (ANOMALY-01, ANOMALY-02, PRD FR-SYS-001, AnomalyAlert entity §8.8)

- **D-01:** "Pola asupan cairan menyimpang signifikan" is evaluated against the **patient's own 7-day rolling average** — not a population baseline, not a doctor-set limit (no such field exists in the schema, and adding one would be new scope). Personal baseline only.
- **D-02:** Severity is **fixed by anomaly type, not dynamically scored**: CAPD abnormal effluent (keruh/keruh dengan gumpalan putih/berdarah) and >2 missed therapy schedules in one day are **always `tinggi`** (per PRD FR-PS-011b, which names these two explicitly as always-emergency). The other two categories — ≥30% fluid-output decline over 3 consecutive days, and deviated fluid-intake pattern — are always `normal` severity (alert card only, no emergency modal). Do not build a dynamic per-case severity scorer; the four-category → two-tier mapping is fixed.
- **D-03:** Confidence score on `AnomalyAlert` is computed **entirely by the deterministic rule engine** (e.g., how far a value exceeds its threshold — 35% decline vs. a 30% threshold scores higher than a 31% decline). The LLM is never asked to judge whether an anomaly is real or how confident to be — it only receives the rule engine's output (type + severity + underlying numbers) and writes the Bahasa Indonesia explanation. This is a hard boundary, not a suggestion — it's what ROADMAP Phase 5 means by "deterministic rule engine with LLM-generated explanation only."
- **D-04:** Rules that require historical data (3-day decline check, 7-day baseline for intake deviation) are **skipped silently** until the patient has enough history (3 days / 7 days respectively) — no false positives from partial data. CAPD-abnormal-effluent and missed-schedule-count rules have no history requirement and are active from day one.

### Emergency Notification UX (FR-PS-011b, DESIGN_SYSTEM "Alert Darurat")

- **D-05:** The non-dismissable requirement is implemented as a **full-screen blocking modal** (red, `#d4183d`, matches DESIGN_SYSTEM "Alert Darurat" spec) that appears over whatever page the user is on. Single "Saya mengerti" button to acknowledge; no tap-outside-to-close, no back-button dismissal. Reuses the same acknowledge pattern already built for CAPD effluent in `fluid.controller.ts`.
- **D-06:** Push notifications for high-severity anomalies are **not differentiated at the OS/browser level** (Web Push API has no reliable cross-browser custom sound/vibration control) — differentiation happens entirely in the in-app modal. Push just carries the alert text and opens the app.
- **D-07:** If a high-severity alert's status is still `aktif` (not yet acknowledged), the blocking modal **re-appears every time the app is opened** in a new session — prevents an alert from being silently lost if the user force-closes the app before acknowledging.
- **D-08:** Caregiver devices get the **same full-screen blocking modal** as the patient, not a lighter-weight version — consistent with Phase 4's CAREGIVER-01 "identical dashboard" principle. Fan out via the existing `sendToAllDevices` pattern in `notification.service.ts`.
- **D-09:** Normal-severity alerts and already-acknowledged alerts surface as **alert cards on Beranda** (for currently-active/unread ones) plus a **dedicated alert history page** where all alerts (including acknowledged ones) remain visible so the user can give "relevan"/"tidak relevan" feedback (ANOMALY-04) at any time, not only in the moment the alert first appeared.

### AI Content Placement & Triggers (AI-01..AI-04)

- **D-10:** Daily AI summary (AI-01) replaces `AiPlaceholderCard.tsx` on Beranda in place. It auto-generates at 20:00 WIB or shows a "Buat ringkasan" / "Buat ulang" button for manual (re)generation per AI-01's "atau dipicu manual."
- **D-11:** Weekly trend insight (AI-02) and lab analysis (AI-03) surface on the **Lab page**, near the existing `LabTrendChart` (Phase 3) — both are lab/tracking-data-driven and belong next to that data, not on a new standalone AI page.
- **D-12:** Lifestyle/food suggestions (AI-04) surface on the **Edukasi page**, per the requirement text itself ("shown on Education page or dashboard").
- **D-13:** No new centralized "AI Insight" page — all four AI surfaces live inside their most relevant existing page/card slot.
- **D-14:** Saving a manual lab result (AI-03 trigger) is **non-blocking**: the save completes and returns immediately; the AI analysis appears asynchronously in its own card/section once Groq responds (loading state, not a blocking spinner over the whole save flow). Lab save must not depend on Groq's availability.
- **D-15:** The "Anomali Terdeteksi" section in the doctor report (`frontend/components/laporan/sections/Anomali.tsx`, Phase 4 placeholder D-09) is now wired to real data — query `anomaly_alerts` for the user within the report's date range, same aggregation pattern as the other `report.repository.ts` sections.
- **D-16:** All AI outputs (daily summary, weekly insight, lab analysis, lifestyle suggestion) are **persisted/cached** — daily summary keyed per user+date, weekly insight per user+week, lab analysis per `lab_result_id`. Reopening the page reuses the cached result instead of re-calling Groq; a new DB table (or set of tables) is needed for this. Regeneration only happens on manual trigger or the next scheduled batch.

### Groq Orchestration & Safety (STACK.md Groq section, STATE.md blockers)

- **D-17:** The three daily/weekly cron batches (summary 20:00, anomaly rule check 21:00, weekly insight Sunday 19:00) each process users in a **sequential loop with a delay between Groq calls** (e.g., ~2s) inside the existing `node-cron` job — no concurrency, no Redis/queue. Simple and stays under the ~30 RPM free-tier ceiling; the anomaly rule evaluation itself is NOT a Groq call (rules run first, cheaply, for every user; only alerts that fired get an LLM explanation call).
- **D-18:** If a Groq call fails/times out for one user mid-batch, **skip that user and continue the loop**, logging the error — matches the existing `Promise.allSettled`-style fault isolation already used in `notification.service.ts`'s `fanOut`. That user simply has no summary/insight for that cycle and can manually retrigger later.
- **D-19:** The medical disclaimer (AI-05) is enforced by the **backend always appending a fixed disclaimer string** to the stored/returned AI output, regardless of what the LLM produced — the system prompt also instructs the LLM to include one, but the backend append is the actual enforcement mechanism, not a suggestion to the model.
- **D-20:** For high-severity anomaly explanations specifically, the backend runs **output validation against a forbidden-phrase list** (e.g., no "tidak perlu khawatir", "aman", or other false-reassurance phrasing) before storing/showing the LLM's explanation. If validation fails, fall back to a **pre-written static Bahasa Indonesia template** per anomaly type rather than showing an unsafe LLM output. This is on top of a strict system prompt instructing calm-but-serious tone + concrete next step.

### Claude's Discretion

- Exact DB schema for AI output caching (table names, columns) — planner decides, following existing Drizzle schema conventions (`snake_case` table, `camelCase` in TS).
- Exact delay duration between sequential Groq calls in batch jobs — planner tunes based on Groq's documented free-tier RPM at implementation time (STACK.md says re-verify).
- Exact wording of the forbidden-phrase list and static fallback templates per anomaly type — planner drafts, review for tone before shipping.
- Whether the alert history page is a new bottom-tab destination or reachable from Beranda/Profil — planner decides based on nav real estate (5 tabs already fixed since Phase 2 D-01); likely a sub-page reachable from an alert card's "Lihat semua" link, not a new tab.
- Exact "Buat ulang ringkasan" button placement/copy on the daily summary card.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` — AI-01..AI-05, ANOMALY-01..ANOMALY-04 (exact v1 requirements this phase satisfies)
- `.planning/ROADMAP.md` — Phase 5 section: goal, success criteria (5 items), requirement list
- `PRD.md` §5.1 rows FR-SYS-001 (rule-based anomaly), FR-SYS-002 (daily summary), FR-SYS-004 (weekly trend insight), FR-SYS-005 (lab analysis), FR-SYS-006 (lifestyle suggestions), FR-PS-011b (emergency notification spec)
- `PRD.md` §8.8 "Data Entity 8: AI Anomaly Alert" — exact AnomalyAlert attributes (Timestamp Deteksi, Tipe Pasien, Tipe Anomali, Severity normal/tinggi, Deskripsi Bahasa Indonesia, Confidence Score, Status aktif/dibaca/ditindaklanjuti, Feedback Pengguna relevan/tidak relevan)
- `PRD.md` line 369 (workflow table) — exact anomaly-triggered notification copy example

### Visual & design system
- `DESIGN_SYSTEM_KidneyBuddy_v3.md` lines 207-223 — "Alert Darurat" (red #d4183d, border-left 3px, non-dismissable) and "Alert AI / Info" (teal gradient) component specs — use these exact specs, do not invent new alert styling

### Phase 2 artifacts (push/notification infrastructure)
- `backend/src/services/notification.service.ts` — `fanOut`/`sendToAllDevices(userId, payload)`; reuse for both regular anomaly push and emergency-modal-triggering push
- `backend/src/lib/webPushClient.ts` — VAPID push dispatch
- `backend/src/jobs/scheduler.ts` — existing node-cron registration pattern; Phase 5 adds 3 new jobs here (daily summary 20:00, anomaly batch 21:00, weekly insight Sunday 19:00) following the same boot-catchup + `schedule()` pattern as `reminderDispatch.job.ts`

### Phase 3/4 artifacts (data sources + report integration)
- `frontend/components/lab/LabTrendChart.tsx` — where AI-02/AI-03 output surfaces alongside
- `backend/src/db/schema/labResult.schema.ts` — lab data source for AI-03/AI-02
- `.planning/phases/04-caregiver-dashboard-doctor-reports/04-CONTEXT.md` D-09 — placeholder contract this phase fulfills for the report's Anomali section
- `backend/src/repositories/report.repository.ts` — aggregation query pattern to follow for anomaly-in-report query
- `frontend/components/laporan/sections/Anomali.tsx` — placeholder component this phase replaces with real data
- `frontend/components/beranda/AiPlaceholderCard.tsx` — placeholder component this phase replaces with the real daily summary card
- `backend/src/controllers/fluid.controller.ts` — existing CAPD-effluent-acknowledge endpoint; emergency modal acknowledge flow follows this same pattern

### Technical constraints
- `CLAUDE.md` Supporting Libraries — `groq-sdk@1.3.x`, OpenAI-SDK-compatible interface, `model: "llama-3.3-70b-versatile"`, called from Backend Container only
- `CLAUDE.md` Groq rate limits note (llama-3.3-70b-versatile free tier: 30 RPM / 1,000 RPD / 12,000 TPM / 100,000 TPD) — re-verify current limits at implementation time
- `CLAUDE.md` "What NOT to Use" — no Redis/BullMQ for job queuing (3-container constraint); use `node-cron` sequential loop
- `.planning/STATE.md` Blockers/Concerns (Phase 5 entries) — Groq rate-limit staggering requirement, backend-enforced disclaimer requirement (both directly resolved by D-17..D-20 above)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/services/notification.service.ts` — `fanOut(subs, send, deactivateFn)` and `sendToAllDevices(userId, payload)`: reuse directly for anomaly push (both normal and emergency) and daily-summary-ready push
- `backend/src/jobs/scheduler.ts` + `reminderDispatch.job.ts` — cron job registration pattern (boot catch-up + `schedule("* * * * *", ...)`); Phase 5's 3 new jobs follow this same shape but with different cron expressions (20:00 daily, 21:00 daily, Sunday 19:00)
- `frontend/components/beranda/CAPDEffluentBanner.tsx` — existing non-dismissable-until-acknowledged banner pattern; the new full-screen emergency modal (D-05) is a more forceful variant of this same interaction model
- `backend/src/controllers/fluid.controller.ts` (acknowledge endpoint, line ~75) — pattern for "user must actively acknowledge" persistence; anomaly alert acknowledge follows the same shape
- `frontend/components/lab/LabTrendChart.tsx` — integration point for AI-02/AI-03 output
- `frontend/components/beranda/AiPlaceholderCard.tsx` — exact component being replaced for AI-01
- `frontend/components/laporan/sections/Anomali.tsx` — exact component being wired to real data for D-15
- `backend/src/repositories/report.repository.ts` — WIB-correct date-range aggregation pattern to replicate for anomaly report query

### Established Patterns
- **Layered backend**: Route → Controller (thin) → Service (Zod + business logic) → Repository (SQL only) — Phase 5 adds `/api/ai` and `/api/anomaly` (or similar) following this pattern
- **Fault-isolated fan-out**: `Promise.allSettled` over per-item try/catch so one failure doesn't block others — reuse this shape for both push fan-out and the sequential Groq batch loop (D-18)
- **WIB timezone**: all date/cron comparisons use the `Date.now() + 7*3600*1000` WIB offset pattern established in Phase 2/4
- **Drizzle schema pattern**: `pgTable("snake_case", { camelCase: type("snake_case")... })` — new tables for anomaly_alerts and AI output caching follow this

### Integration Points
- `backend/src/jobs/scheduler.ts` — mount 3 new cron jobs (dailySummary.job.ts, anomalyDetection.job.ts, weeklyInsight.job.ts, or similar naming)
- `backend/src/app.ts` — mount new `/api/ai` and `/api/anomaly` routes
- `backend/src/db/schema/index.ts` — export new `anomalyAlerts` table + AI output cache table(s)
- `frontend/app/(app)/beranda/page.tsx` — swap `AiPlaceholderCard` for real daily summary card + alert card slot
- `frontend/app/(app)/lab/` (or wherever Lab page lives from Phase 3) — add weekly insight + lab analysis sections
- `frontend/app/(app)/edukasi/` — add lifestyle suggestion section
- `frontend/components/laporan/sections/Anomali.tsx` — wire to real `anomaly_alerts` query
- New alert history page (route TBD by planner, likely `/notifikasi` or `/alert`) for ANOMALY-04 feedback UI

</code_context>

<specifics>
## Specific Ideas

- Emergency modal button copy: "Saya mengerti" (consistent with existing CAPD effluent pattern's "Saya mengerti, hubungi dokter segera" style).
- Daily summary manual regenerate button copy: "Buat ringkasan" (first time) / "Buat ulang ringkasan" (regenerate).
- Anomaly types (fixed, from PRD FR-SYS-001 / §8.8): penurunan volume cairan keluar (≥30%/3 hari) → normal; kondisi cairan abnormal CAPD → tinggi; jadwal terapi terlewat berulang (>2/hari) → tinggi; pola asupan cairan menyimpang → normal.
- Forbidden-phrase safety net (D-20) is a genuinely new mechanism not present anywhere else in the codebase yet — flag for research/planning as a novel piece, not a copy of an existing pattern.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 5 scope. (Dynamic per-case severity scoring, LLM-judged confidence, and doctor-set fluid limits were considered and explicitly rejected in favor of simpler/locked-in-PRD approaches — see D-01..D-03 — not deferred to a future phase, just not chosen.)

</deferred>

---

*Phase: 5-ai-insights-anomaly-detection*
*Context gathered: 2026-07-03*
