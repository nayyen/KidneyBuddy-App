# Feature Research

**Domain:** Chronic kidney disease (CAPD/HD/transplant) patient companion app — tracking, reminders, AI insight, caregiver involvement, peer community
**Researched:** 2026-06-24
**Confidence:** MEDIUM-HIGH (table stakes and pitfalls are well-evidenced by systematic reviews and clinical literature; some UX specifics for Indonesian older-adult users are MEDIUM/LOW confidence due to limited domain-specific Indonesian sources)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in any CKD/dialysis self-management app. Missing these = product feels incomplete relative to the ~21 PD apps and broader CKD app market reviewed in literature.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Fluid intake/output logging (volume, source) | Core daily task for all three patient types; present in nearly every reviewed CKD/PD app | LOW | PRD's FR-PS-001/002 matches standard pattern (manual volume + source entry, auto-delta). Confidence: HIGH (multiple systematic reviews confirm this is baseline) |
| Medication reminder with confirmation | The single most common feature across CKD apps; directly tied to the literature's #1 cited self-management need | LOW-MEDIUM | PRD's FR-PS-004/005 matches. Note: best-in-class apps (Medisafe) escalate to caregiver only *on missed dose*, not simultaneous push to both devices always-on — see Differentiators/Pitfalls below |
| Therapy schedule reminders (HD days/times, CAPD exchange times) | Specific to dialysis modality; table stakes for any app claiming to serve HD/CAPD patients | LOW-MEDIUM | PRD's FR-PS-006 covers this; matches "Mizu CKD Companion" and "Kidney Guide" pattern (rated best apps in 2024 systematic review of 21 PD apps, MDPI/PMC) |
| Lab result storage (upload or manual entry) | Patients in chronic care routinely want a personal record independent of hospital EMR access | LOW-MEDIUM | PRD's FR-PS-007/008 matches common pattern. Confidence: HIGH |
| Lab trend visualization with reference ranges | Systematic review of patient-facing health visualizations found ~40-47% of effective designs include reference ranges + longitudinal trend + contextual text — this is the proven "good practice," not a nice-to-have | MEDIUM | PRD's FR-PS-009 is correctly scoped. Add traffic-light (red/yellow/green) coloring against reference range — confirmed as most common and most effective convention in patient-facing lab visualization research |
| Therapy-method-aware UI (CAPD vs HD vs transplant show different fields) | Patients only want to see fields relevant to their modality; an app showing irrelevant CAPD concentration fields to an HD patient feels broken | LOW-MEDIUM | PRD's FR-SYS-003 / conditional form fields (FR-PS-001/003/006) — correctly scoped as table stakes, not a differentiator |
| Basic onboarding/tutorial for first-time setup | Standard expectation; absence causes immediate confusion, especially for an older or first-time digital-health user base | LOW-MEDIUM | PRD's FR-PS-014 (target <5 min) is reasonable but tight — see Pitfalls |
| Symptom/condition logging tied to modality (e.g., dialysate appearance for CAPD) | Present in higher-rated PD apps reviewed; this is the digital equivalent of what patients are already taught to do manually (visually inspect effluent) | LOW-MEDIUM | PRD's FR-PS-003 (cairan keluar: jernih/keruh/berdarah) matches real clinical practice — patients are already trained by nurses to do exactly this visual check today, so digitizing it is high-value low-risk |
| Doctor-visit data export/summary | Common ask in caregiver/patient interviews underlying CKD app design research — patients want something to "show the doctor" | LOW-MEDIUM | PRD's FR-PS-016 matches a well-documented unmet need (data tracking-as-archive for clinical evaluation) |
| Educational content filtered by condition/modality | Baseline expectation; almost universal across CKD apps reviewed (kidney function calculators + disease-related content was the *most common* content category in the 21-app PD review) | LOW | PRD's FR-PS-012 matches |

### Differentiators (Competitive Advantage)

Features that go beyond table stakes. Not required for "doesn't feel broken," but where this product can credibly outperform the apps surveyed in the literature.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Caregiver-inclusive dashboard with independent device notifications | A 2019 systematic review of CKD/ESRD apps explicitly found **no app in their review had any caregiver/family involvement** — this is a documented, named gap in the entire app category, not a guess | MEDIUM | PRD's FR-CG-001/002 directly addresses a literature-confirmed gap. This is genuinely differentiating, not just a feature for feature's sake. Confidence: HIGH (explicit finding from PMC6753688 review) |
| Peritonitis early-warning via effluent condition + rule-based alert | Clinical literature confirms cloudy/bloody effluent is the single most predictive lay-observable sign of peritonitis (diagnostic criterion requires 2 of 3: abdominal pain, cloudy effluent, WBC>100). No mainstream consumer PD app was found in research that turns this clinical fact into a structured, alerting data field — most apps just log volumes | MEDIUM | PRD's FR-PS-003 + FR-SYS-001 (immediate red-banner alert on keruh/berdarah) is well-grounded clinically and is a genuine product differentiator versus the international PD app landscape, which the 2024 systematic review found mostly limited to volume logging + generic content |
| AI-generated daily narrative summary (holistic, Bahasa Indonesia, plain language) | No reviewed app combines multi-source daily data (fluid + meds + activity) into one LLM narrative; most apps show raw logs/charts only | MEDIUM-HIGH | PRD's FR-PS-010/FR-SYS-002. This is a genuine differentiator. Main risk is LLM cost/latency and conservative tone management — see Pitfalls |
| AI proactive weekly trend insight (lab + fluid + adherence pattern) | Goes beyond simple trend charts to a generated, specific, actionable insight ("kreatinin naik 3 minggu") — this pattern is recommended in lab-visualization research ("overlay intervention markers," "show trajectory, not isolated numbers") but rarely implemented as automated insight in consumer-facing CKD apps | HIGH | PRD's FR-SYS-004 — ambitious but aligned with what visualization research says actually helps comprehension. Needs careful threshold-tuning to avoid alarm fatigue (see Pitfalls) |
| Quora-style community with peer-marked "helpful" replies | Peer support literature confirms peer-to-peer support measurably reduces isolation and improves self-care in chronic illness, and that *moderation* (not necessarily medical verification) is what builds trust and curbs misinformation | MEDIUM | PRD's FR-PS-013 is well-grounded as long as light moderation/reporting exists even without "medical verification" (PRD already excludes verification by design, which matches the literature's distinction between moderation and verification) |
| Positive-framing for "overdue" activities (no negative/urgent language) | Not found explicitly in any reviewed app — this is a genuine UX innovation specific to this product's empathetic positioning ("Masih aktif · X lebih" instead of "Terlambat") | LOW | PRD's FR-PS-017/018. Low complexity, high emotional-design payoff; aligns with general health-app guidance to avoid panic-inducing language, which is echoed in older-adult mHealth design research too |
| AI personalized food/lifestyle suggestions tied to live lab values | Some kidney diet apps (KidneyDiet, KidneyPal) exist standalone for potassium/phosphorus/sodium tracking, but none found that combine this with the patient's *own* live fluid/med/lab data inside the same daily-tracking app | MEDIUM-HIGH | PRD's FR-PS-010d/FR-SYS-006 — credible differentiator if execution stays campaign-appropriate (disclaimer, no diagnosis) |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Always-on simultaneous caregiver notification (every reminder, every device, no escalation logic) | Feels "more caring" and matches literal PRD wording (FR-CG-001) | Real-world precedent (Medisafe's "MedFriend") shows the effective pattern is **escalation-only**: caregiver is notified *only when the patient misses/ignores* a reminder, not on every single occurrence. Notifying caregivers of every routine event causes caregiver notification fatigue and undermines patient autonomy/dignity (a known concern in caregiver-app literature) | Already partially out of scope per PROJECT.md ("akun terpisah" excluded), but recommend: keep simultaneous delivery for schedule visibility, but make anomaly/emergency alerts the only thing that must reach caregiver unmissed — routine confirmations can be lower-urgency for caregiver view |
| High-frequency / low-threshold anomaly alerts ("anything unusual" detection) | Feels like better safety / more AI value | Alarm fatigue is extremely well-documented: 80-99% of clinical alarms are false/insignificant, and even *non-clinical* false alerts (e.g., smartwatch AF false positives) are linked to measurably *worse* patient-reported well-being and self-management confidence. An anxious CKD population is especially vulnerable to this harm | Use conservative/high thresholds for anything that triggers an un-dismissable emergency notification (matches PRD's own intent — only severity tinggi triggers FR-PS-011b). Resist scope creep toward "detect everything" — fewer, higher-confidence alerts beat more, noisier ones |
| Full medical verification of community content | Feels safer for a health product | Creates a moderation bottleneck requiring clinical staff the team doesn't have, and falsely implies medical authority over peer content — PRD already correctly excludes this | Light community moderation (report/flag, admin archive) — already implicit in PRD's CommunityPost "Status (aktif/diarsipkan)" field; don't add medical review without dedicated clinical reviewer role |
| Real-time/continuous tracking via wearables or connected scales | Looks modern, reduces manual entry friction | Already explicitly out of scope per PRD/PROJECT.md and correctly so — device integration adds certification, Bluetooth/API complexity, and a maintenance burden disproportionate to a 13-week academic MVP | Manual entry only for v1, as already decided. Revisit only after manual-tracking habit/retention is validated |
| Gamification/streaks/rewards for adherence | Common pattern in fitness/habit apps, looks engaging | PRD already excludes this — correctly, since gamifying a chronic, serious medical regimen risks trivializing it and can backfire emotionally for patients managing a lifelong illness, especially the "overdue is OK" emotional framing the PRD already insists on | Already excluded. Keep the existing positive-but-non-gamified framing pattern (FR-PS-018) instead |
| AI chatbot for open-ended medical Q&A | Feels like "more AI value," patients may request it | Open-ended LLM chat without strict guardrails in a sensitive medical context for an older, possibly literacy-limited population risks unbounded hallucination/diagnosis-like responses — already correctly deferred to v2 in PRD | Keep structured, single-purpose AI functions (summary, anomaly, lab analysis, lifestyle tips) as scoped — these are easier to constrain with disclaimers and templated tone than open chat |
| Long, comprehensive registration form before first value (collecting all demographic/medical history upfront) | Feels thorough, "do it right the first time" | Onboarding research shows apps requiring full account creation + profile completion before any value is experienced increase abandonment; healthtech can tolerate slightly longer flows (5-10 min) but should defer non-essential fields | PRD's onboarding (registrasi → pilih metode terapi → atur pengingat pertama, <5 min) is already appropriately minimal — protect this scope from feature creep (e.g., don't add medical history forms before first reminder is set) |

## Feature Dependencies

```
[Therapy method selection (onboarding)]
    └──requires──> [Conditional UI per modality] (FR-SYS-003)
                       ├──enables──> [CAPD-specific fluid fields] (FR-PS-001/003)
                       ├──enables──> [CAPD exchange reminders] (FR-PS-006)
                       └──enables──> [HD schedule reminders] (FR-PS-006)

[Fluid logging] (FR-PS-001)
    └──requires──> [Daily delta calculation] (FR-PS-002)
                       └──feeds──> [AI daily summary] (FR-SYS-002)
                       └──feeds──> [Rule-based anomaly detection] (FR-SYS-001)

[CAPD effluent condition field] (FR-PS-003)
    └──requires──> [Fluid logging] (FR-PS-001)
    └──enables──> [Peritonitis early-warning alert] (FR-SYS-001, FR-PS-011b)

[Medication reminder + confirmation] (FR-PS-004/005)
    └──feeds──> [Adherence data] (MedicationLog)
                       └──feeds──> [AI daily summary] (FR-SYS-002)
                       └──feeds──> [Doctor-visit report] (FR-PS-016)

[Lab manual entry] (FR-PS-008)
    └──requires──> [Lab storage entity] (LabResult)
                       └──enables──> [Lab trend chart] (FR-PS-009)
                       └──enables──> [AI lab analysis] (FR-SYS-005)
                       └──enables──> [Weekly trend insight] (FR-SYS-004) — also needs fluid+adherence data

[7+ days of tracking history] ──requires──> [AI weekly trend insight] (FR-SYS-004)
[3+ days tracking + 1 lab result] ──requires──> [AI personalized lifestyle suggestion] (FR-SYS-006/FR-PS-010d)

[Caregiver same-account login] ──requires──> [User auth + role] (Pengguna entity)
    └──enables──> [Caregiver dashboard] (FR-CG-002)
    └──enables──> [Caregiver independent notification] (FR-CG-001)

[Emergency/anomaly alert UI pattern] (FR-PS-011b) ──conflicts with──> [routine reminder notification UI]
    (must be visually/aurally distinct — cannot share styling or dismiss behavior with routine reminders, or the emergency signal gets diluted and ignored, per alarm-fatigue research)
```

### Dependency Notes

- **Therapy method selection requires earliest placement:** Almost every other tracking/reminder feature (conditional fields, schedule types) depends on knowing the patient's modality first. This must be in the very first phase/milestone, matching the PRD's own onboarding-first sequencing.
- **Peritonitis alert enhances (not duplicates) rule-based anomaly detection:** The immediate single-entry trigger (cairan keruh/berdarah → instant red banner) is a *separate, simpler* rule than the multi-day pattern detection (FR-SYS-001's "penurunan volume ≥30% selama 3 hari"). Keep these as two distinct rule types in implementation — the immediate one needs zero historical data and should never be blocked waiting on AI/LLM latency.
- **AI weekly/lifestyle insights require minimum data thresholds:** PRD already specifies these correctly (3-30 days). This is good practice — generating an AI insight from 1 day of data risks false-pattern narratives that erode trust faster than having no insight at all.
- **Emergency alert UI conflicts with routine reminder UI by design:** This is intentional, not a bug — alarm fatigue research is unambiguous that visually/aurally identical alert tiers cause the important ones to be ignored. The PRD's explicit differentiation (color, sound, non-dismissable) for FR-PS-011b is correctly scoped and should not be diluted during implementation for the sake of design consistency.

## MVP Definition

### Launch With (v1)

The PRD's full MVP scope is validated against the literature as appropriately sized — not over-scoped relative to what mature competitor categories (CKD apps, medication adherence apps, peer support platforms) already treat as standard, and the caregiver + peritonitis-alert combination is a genuine, evidence-backed differentiator rather than scope padding.

- [x] Fluid tracking (in/out, source, CAPD-specific fields) — table stakes, foundational data source for AI/alerts
- [x] Medication reminders with confirmation — table stakes, core to the stated Core Value (reliability of reminders)
- [x] CAPD exchange / HD schedule reminders — table stakes for modality-specific use
- [x] CAPD effluent condition tracking + immediate peritonitis alert — differentiator, clinically well-grounded, low complexity relative to its safety value
- [x] Lab upload + manual entry + trend chart — table stakes
- [x] AI daily summary, weekly insight, lab analysis, lifestyle suggestion — differentiator, but keep thresholds conservative per Pitfalls
- [x] Rule-based + LLM anomaly detection with tiered alert UI — differentiator, must rigorously separate emergency-tier from routine-tier UI/behavior
- [x] Caregiver dashboard + independent notifications — differentiator, fills a literature-confirmed gap in the category
- [x] Quora-style community (post/reply/helpful-mark) — table stakes for a "community" claim, keep light moderation hooks even without medical verification
- [x] Education content filtered by modality — table stakes
- [x] Onboarding tutorial (<5 min) — table stakes, but treat the 5-minute target as a hard usability-test gate, not just a number to hit on paper
- [x] Doctor-visit report export — table stakes (addresses confirmed "show the doctor" need)
- [x] Therapy method switching with history — table stakes for a multi-modality product

### Add After Validation (v1.x)

- [ ] Caregiver escalation logic (notify caregiver primarily on missed/ignored reminders rather than every single routine event) — add once real usage data shows whether always-on caregiver notification causes caregiver fatigue or drop-off (trigger: caregiver engagement/retention metrics declining, or caregiver feedback of "too many notifications")
- [ ] "Replay tutorial" discoverability improvements / contextual micro-tutorials beyond initial onboarding — add once user testing reveals which specific screens older users get stuck on post-onboarding (trigger: support requests or qualitative feedback after go-live user testing, per PRD's own milestone 5 plan)
- [ ] Refinement of anomaly thresholds based on real feedback_flag data (relevan/tidak relevan) — add once enough alerts have been generated and rated to retune confidence thresholds (trigger: sufficient alert volume, e.g., post-Milestone 4)

### Future Consideration (v2+)

- [ ] AI chatbot for open-ended education Q&A — already correctly deferred per PRD; defer until structured AI functions (summary/anomaly/lab/lifestyle) are proven reliable and well-received, since open chat is harder to guardrail
- [ ] Wearable/device integration (smart scales, BP monitors) — defer until manual-entry retention is validated; integration adds disproportionate complexity for an academic MVP timeline
- [ ] Native mobile apps — defer; PWA is explicitly sufficient per PRD constraints and current web push support
- [ ] Multi-patient-per-account / separate caregiver accounts with independent credentials — defer; current single-shared-account model is simpler and matches the "trusted family member" assumption already documented in PRD

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Fluid tracking + delta calculation | HIGH | LOW | P1 |
| Medication reminders + confirmation | HIGH | LOW | P1 |
| CAPD/HD schedule reminders | HIGH | LOW | P1 |
| CAPD effluent condition + immediate alert | HIGH | LOW | P1 |
| Lab upload + manual entry | HIGH | LOW | P1 |
| Lab trend chart with reference range | MEDIUM-HIGH | MEDIUM | P1 |
| Onboarding tutorial (<5 min) | HIGH | MEDIUM | P1 |
| Rule-based anomaly detection (multi-day patterns) | HIGH | MEDIUM | P1 |
| Emergency alert UI (distinct tier) | HIGH | LOW-MEDIUM | P1 |
| Caregiver dashboard + notifications | HIGH | MEDIUM | P1 |
| AI daily summary (LLM) | MEDIUM-HIGH | MEDIUM-HIGH | P1 |
| AI weekly trend insight (LLM) | MEDIUM | HIGH | P2 (consider sequencing after daily summary is stable) |
| AI lab analysis (LLM) | MEDIUM | MEDIUM | P2 |
| AI lifestyle suggestion (LLM) | MEDIUM | MEDIUM-HIGH | P2 |
| Community (post/reply/helpful) | MEDIUM | MEDIUM | P2 |
| Education content library | MEDIUM | LOW-MEDIUM | P2 |
| Doctor-visit report export | MEDIUM-HIGH | LOW-MEDIUM | P1 |
| Therapy method switching | MEDIUM | LOW | P1 |
| Activity logging + positive-overdue framing | MEDIUM | LOW | P2 |

**Priority key:**
- P1: Must have for launch (matches PRD's "High/Must" MoSCoW items)
- P2: Should have, add when possible (matches PRD's "Medium/Should" MoSCoW items — note PRD already separates these correctly via its own MoSCoW column)

This matrix is a cross-check, not a contradiction, of the PRD's existing MoSCoW prioritization — the PRD's own High/Medium split (FR priority column) already tracks closely with the research-derived priority here, which is a good signal that the existing scoping is well-calibrated, not arbitrary.

## Competitor Feature Analysis

| Feature | International PD apps (21-app review, 2024) | Medisafe (med adherence leader) | CKD apps generally (2019 review) | Our Approach |
|---------|---------------------------------------------|----------------------------------|-----------------------------------|--------------|
| Fluid/dialysate volume logging | Common (most apps include this) | N/A | Common | Match standard, add CAPD-specific concentration/effluent fields |
| Effluent condition as structured alert-triggering field | Not found as a structured alerting feature in reviewed apps — typically just visual inspection taught by clinic, not digitized | N/A | N/A | Differentiator: digitize the clinic-taught visual check into an alerting field |
| Medication reminders | Present in some apps | Core feature, very mature | Most common feature category | Match, but consider Medisafe's escalation-only caregiver notification pattern post-launch |
| Caregiver/family involvement | Not assessed in PD review | Yes — "MedFriend" escalation pattern | Explicitly absent — "no app had family/caregiver involvement" | Differentiator: address documented category-wide gap |
| Education content | Most common content type | N/A | Common | Match standard, localize fully to Bahasa Indonesia |
| Peer community | Some apps ("interactions among patients, peers, HCPs") | No | Not emphasized | Match with light moderation, Quora-style structure |
| AI-generated narrative summaries | Not found in any reviewed PD app | No | No | Differentiator: no direct precedent found, genuine innovation in this category |
| Lab trend visualization | Some apps | N/A | Some apps | Match standard, add reference-range coloring per visualization research |

## Sources

- [Mobile Apps for Patients with Peritoneal Dialysis: Systematic App Search and Evaluation (PMC, 2024)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11011774/) — MEDIUM confidence (full text inaccessible due to access wall; findings drawn from search-result summary, recommend independent verification before citing specific app names in roadmap docs)
- [Mobile Apps for the Care Management of Chronic Kidney and End-Stage Renal Diseases: Systematic Search in App Stores and Evaluation (PMC, 2019)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6753688/) — HIGH confidence for the "no caregiver involvement found" finding (corroborated across multiple search result excerpts)
- [Effectiveness of Mobile Apps in Improving Medication Adherence Among CKD Patients: Systematic Review (JMIR, 2025)](https://www.jmir.org/2025/1/e53144) — MEDIUM confidence
- [A Mobile App to Support Self-management of Chronic Kidney Disease: Development Study (ScienceDirect/PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8717130/) — MEDIUM confidence
- [Peritoneal dialysis-related peritonitis: challenges and solutions (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6001843/) — HIGH confidence, clinical diagnostic criteria
- [Cloudy Effluent Has High Predictive Value in Peritoneal Dialysis-Associated Peritonitis (Physician's Weekly)](https://www.physiciansweekly.com/cloudy-effluent-has-high-predictive-value-in-peritoneal-dialysis-associated-peritonitis/) — HIGH confidence, corroborates clinical basis of PRD's FR-PS-003
- [Peritoneal Dialysis–Associated Peritonitis (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6625612/) — HIGH confidence
- [Design Guidelines of Mobile Apps for Older Adults: Systematic Review and Thematic Analysis (JMIR mHealth and uHealth, 2023)](https://mhealth.jmir.org/2023/1/e43186) — HIGH confidence, full text reviewed directly
- [Human-Centered Design of Mobile Health Apps for Older Adults: Systematic Review (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8800094/) — MEDIUM confidence
- [Medisafe Pill & Med Reminder — App Features](https://medisafeapp.com/features/) and [How You Can Help Friends and Family Manage their Meds](https://medisafeapp.com/how-you-can-help-friends-and-family-manage-their-meds/) — MEDIUM confidence, vendor-published but consistent with multiple independent app-review sources
- [A Systematic Review of Patient-Facing Visualizations of Personal Health Data (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6785326/) — HIGH confidence, directly informs lab trend chart recommendations
- [Alert Fatigue in Healthcare: Causes and Solutions (ClinicianCore, 2026)](https://cliniciancore.com/blog-articles/alert-fatigue-in-healthcare/) — MEDIUM confidence (industry blog, but cites widely-replicated 80-99% false-alarm statistic)
- [False Atrial Fibrillation Alerts from Smartwatches are Associated with Decreased Perceived Physical Well-being (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10358285/) — HIGH confidence, peer-reviewed, directly supports anti-feature guidance on alert threshold conservatism
- [Peer support in chronic health conditions (ResearchGate)](https://www.researchgate.net/publication/381890705_Peer_support_in_chronic_health_conditions) and [Design, Delivery, Maintenance, and Outcomes of Peer-to-Peer Online Support Groups (JMIR/PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7210497/) — MEDIUM confidence
- [Telemedicine Adoption for Managing Chronic and Rare Diseases in Indonesia (JMIR, 2026)](https://www.jmir.org/2026/1/e83462) and [Experiencing Telemedicine: Elderly Patients' Telehealth Interactions in Remote Indonesian Communities](https://journals.ai-mrc.com/jdhimt/article/view/413) — MEDIUM confidence, Indonesia-specific but telemedicine-focused rather than tracking-app-focused (extrapolated to onboarding/trust implications)
- [Mobile App Onboarding Metrics: Framework for Activation, Retention & Revenue (Digia)](https://www.digia.tech/post/mobile-app-onboarding-metrics/) and [The Ultimate Mobile App Onboarding Guide (VWO, 2026)](https://vwo.com/blog/mobile-app-onboarding-guide/) — MEDIUM confidence, industry sources, used only to validate the PRD's own <5 minute onboarding target as reasonable for a regulated/health product category
- PRD.md (KidneyBuddy v0.12) and .planning/PROJECT.md — primary scope documents cross-referenced throughout

---
*Feature research for: Chronic kidney disease (CAPD/HD/transplant) patient companion PWA, Indonesia*
*Researched: 2026-06-24*
