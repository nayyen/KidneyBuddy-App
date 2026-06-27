# Roadmap: KidneyBuddy

## Overview

KidneyBuddy ships as six vertical-MVP phases, each delivering a complete, demoable, end-to-end slice (UI + backend + DB) rather than a horizontal technical layer. The sequence follows the dependency order confirmed by research: identity and therapy-method selection must exist before any tracking feature can render correctly; fluid/medication tracking and reminders — the system's core value and highest-pitfall-density work (iOS push, PWA installability, VAPID push subscriptions, cron persistence, encryption, multi-device caregiver subscriptions) — come immediately after, before feature pressure mounts, and ship with the full push/PWA stack built in rather than deferred, since REMIND-02/REMIND-08 and the NOTIF requirements are two halves of the same web-push delivery mechanism; activity logging and lab results extend the tracking surface once the reminder infrastructure is proven; the caregiver dashboard and doctor reports layer on top of stable tracking data; AI insights and anomaly detection are deliberately built after real tracking data volume and the rule-based safety layer exist, concentrating the Groq rate-limit and AI-safety risks into one phase where they can be tested deliberately; and community and education content close out the build as additive, non-dependent capabilities. This sequencing maps cleanly onto the academic 13-week cadence — Phase 1 lands near the Wk4 design milestone, Phases 2-3 culminate around the Wk7 core-tracking-and-reminder milestone, Phases 4-5 culminate around the Wk10 AI-and-community milestone, and Phase 6 plus final hardening lead into Wk13 go-live.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation, Auth & Onboarding** - Patients and caregivers can register, log in securely, and complete therapy-method-aware onboarding in under 5 minutes
- [ ] **Phase 2: Fluid & Medication Tracking with Reminders** - Patients install KidneyBuddy as a working PWA and never miss logging fluid or taking medication without a reliable, multi-device, modality-aware push reminder catching them, on a UI shell that's fully responsive across mobile/tablet/desktop
- [ ] **Phase 3: Activity Logging & Lab Results** - Patients can log daily activities with positive framing and track lab results with trend visualization over time
- [ ] **Phase 4: Caregiver Dashboard & Doctor Reports** - Caregivers see an identical real-time view of patient data, and patients can export a doctor-ready visit report
- [ ] **Phase 5: AI Insights & Anomaly Detection** - Patients receive calm, disclaimer-safe AI narrative summaries and trend insights, and are reliably warned of clinically meaningful anomalies without alert fatigue
- [ ] **Phase 6: Community & Education** - Patients can browse modality-filtered education content and participate in a peer community

## Phase Details

### Phase 1: Foundation, Auth & Onboarding

**Goal**: New users (patients and caregivers sharing an account) can register, securely authenticate, and complete an interactive onboarding that selects their active therapy method — establishing the identity and modality foundation every later feature depends on
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, ONBOARD-01, ONBOARD-02, ONBOARD-03, ONBOARD-04, ONBOARD-05, ONBOARD-06
**Success Criteria** (what must be TRUE):

  1. User can register with full name, email, password, phone number, and birth date, then log in and stay logged in across a browser refresh
  2. Account locks for 15 minutes after 5 failed login attempts within 10 minutes, enforced server-side
  3. User who forgets their password can request a reset link via email and set a new password
  4. New user completes onboarding (register → select therapy method with an inline "Apa ini?" explanation → set or skip first reminder) in under 5 minutes, and can resume from the last completed step if they close the app early
  5. User can change active therapy method anytime from profile settings with explicit confirmation, with the change recorded in therapy history
  6. User can replay the onboarding tutorial from Settings after initial completion

**Plans**: 5 plans (Walking Skeleton — produces 01-SKELETON.md)Plans:
**Wave 1**

- [ ] 01-01-PLAN.md — Walking Skeleton: 3-container Docker scaffold (Next.js + Express + Postgres) + end-to-end register slice with Argon2id

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 01-02-PLAN.md — Auth slice: persistent login (JWT access + refresh cookie), logout, server-side account lockout w/ live countdown, multi-device login (AUTH-02..05)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 01-03-PLAN.md — Password reset via single-use, time-limited emailed link (AUTH-06)
- [ ] 01-04-PLAN.md — Onboarding wizard: therapy select + inline "Apa ini?", set/skip first reminder, resume-on-reopen (ONBOARD-01..04)

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 01-05-PLAN.md — Profile: confirmation-gated therapy-method change with history + replay onboarding tutorial (ONBOARD-05, ONBOARD-06)

### Phase 2: Fluid & Medication Tracking with Reminders

**Goal**: Patients across all therapy types (CAPD/HD/transplant) can log fluid and medication intake with automatic daily balance calculation, install KidneyBuddy as a real PWA, and receive reliable push reminders — delivered via per-device VAPID push subscriptions, with iOS gated correctly behind an Add-to-Home-Screen prompt — that survive backend restarts; caregivers on separate devices get independent, correctly-scoped push notifications via their own subscription — this is the system's core value and highest-risk phase (iOS push gating, PWA installability, multi-device subscription model, cron persistence, at-rest encryption), and the full push/PWA stack ships here rather than being deferred, since reminder delivery is not real until the subscription plumbing it depends on exists. This is also where the main UI shell is first built, so it must establish the full responsive layout system (distinct mobile/tablet/desktop layouts, not just scaling) that every later phase's screens will reuse.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: FLUID-01, FLUID-02, FLUID-03, FLUID-04, FLUID-05, REMIND-01, REMIND-02, REMIND-03, REMIND-04, REMIND-05, REMIND-06, REMIND-07, REMIND-08, NOTIF-01, NOTIF-02, NOTIF-03, RESPONSIVE-01, RESPONSIVE-02, RESPONSIVE-03, RESPONSIVE-04
**Success Criteria** (what must be TRUE):

  1. User can log a fluid entry (type, source, CAPD concentration if applicable, decimal volume, unit) and immediately sees the recalculated daily in/out delta on the dashboard
  2. CAPD patient who logs abnormal outgoing fluid condition (keruh/berdarah) sees an immediate, non-dismissable red warning banner
  3. User can install KidneyBuddy to the home screen as a PWA and grant browser notification permission, with each logged-in device registering its own independent push subscription; on iOS, the app prompts Add to Home Screen before attempting to enable notifications, verified on a real iPhone
  4. User can create a medication reminder (name, dose, type, timing, active days, optional photo) and receives a real push notification at the scheduled time with a follow-up if unconfirmed after 30 minutes
  5. CAPD exchange and HD schedule reminders fire correctly per modality, survive a backend restart without silently dropping, and continue to apply correctly after a therapy-method change
  6. A caregiver logged in on a separate device with the same account credentials registers their own push subscription and receives the same reminders independently, verified with two physical devices
  7. At 375-767px the app shows a single-column layout with 5-tab bottom navigation and a centered FAB; at 768-1023px it shows a 2-column dashboard/list layout with bottom navigation unchanged; at 1024px+ the primary navigation moves to a left sidebar (bottom nav gone), content becomes multi-column with max-width 1280px, and the FAB becomes a regular primary button — verified on Chrome mobile, Safari iOS, Chrome desktop, and Firefox desktop at exactly 375px/768px/1024px/1280px

**Plans**: TBD
**UI hint**: yes

### Phase 3: Activity Logging & Lab Results

**Goal**: Patients can record how they feel after daily activities with positive (non-overdue) framing, and track lab results — uploaded or manually entered — with trend visualization over a chosen date range
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: ACTIVITY-01, ACTIVITY-02, ACTIVITY-03, LAB-01, LAB-02, LAB-03, LAB-04
**Success Criteria** (what must be TRUE):

  1. User can start a daily activity with name and estimated end time, see its real-time status (Berlangsung/Selesai/Masih aktif), and get a positively-framed amber notification ("Masih aktif · [durasi] lebih") rather than an overdue alarm once past the estimated end time
  2. After marking an activity complete, user is prompted to rate how they felt with an optional note
  3. User can upload a lab result file (PDF/JPG/PNG, max 10MB) with exam date, or manually enter lab parameters as an alternative
  4. User can view a trend chart of a selected lab parameter over a chosen date range, built from manually entered data
  5. Lab results can be archived but never permanently deleted

**Plans**: TBD

### Phase 4: Caregiver Dashboard & Doctor Reports

**Goal**: Caregivers see a dashboard identical to the patient's with real-time updates, and patients can generate a doctor-ready visit report summarizing their tracking data for a selected date range
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: CAREGIVER-01, CAREGIVER-02, REPORT-01, REPORT-02
**Success Criteria** (what must be TRUE):

  1. Caregiver sees a dashboard identical to the patient's, including daily tracking data, latest AI summary placeholder, and anomaly alerts
  2. When either patient or caregiver updates a reminder schedule while both are logged in, the change applies in real time on both devices, with a notification on the device that didn't make the change
  3. User can generate a doctor-visit report for a selected date range summarizing fluid in/out, medication adherence, CAPD condition frequency, and detected anomalies
  4. User can add an optional note to a generated report before showing it to the doctor, without being able to edit the underlying data

**Plans**: TBD

### Phase 5: AI Insights & Anomaly Detection

**Goal**: Patients receive AI-generated daily summaries, weekly trend insights, lab analysis, and lifestyle suggestions in calm, non-diagnostic Bahasa Indonesia with an enforced medical disclaimer, and are reliably alerted to clinically meaningful anomalies via a deterministic rule engine with LLM-generated explanation only — built last so real tracking data volume and the rule-based safety layer exist first, and so the Groq rate-limit risk is isolated and load-tested deliberately
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, ANOMALY-01, ANOMALY-02, ANOMALY-03, ANOMALY-04
**Success Criteria** (what must be TRUE):

  1. User receives a daily AI summary at 20:00 (or on manual trigger) narrating fluid balance, CAPD condition, medication adherence, and activity for that day, always including a server-enforced medical disclaimer
  2. User receives a weekly proactive trend insight every Sunday 19:00 (or on significant new lab data) with concrete Bahasa Indonesia suggestions drawn from 7-30 days of data
  3. Saving a manual lab result triggers a plain-language explanation of out-of-range values without a diagnosis, and the Education/dashboard surfaces personalized food/lifestyle suggestions once ≥3 days of tracking data exist
  4. Every new tracking entry and the daily 21:00 batch run rule-based anomaly checks (fluid-output decline, abnormal CAPD condition, missed schedules, fluid intake deviation), and a fired high-severity anomaly triggers a non-dismissable emergency notification
  5. User sees an anomaly alert card with a plain-language explanation and concrete next step, and can mark a read alert as "relevan" or "tidak relevan"

**Plans**: TBD

### Phase 6: Community & Education

**Goal**: Patients can browse modality-filtered education content and participate in a Quora-style peer community
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: COMMUNITY-01, COMMUNITY-02, COMMUNITY-03, EDU-01
**Success Criteria** (what must be TRUE):

  1. User can browse and filter education content (articles, exercise guides, food/lifestyle info) by their active therapy method
  2. User can create a community post (title, content, category, therapy tag), reply to a post, and mark a reply as "membantu"
  3. User can archive their own community post; posts are never hard-deleted

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation, Auth & Onboarding | 0/5 | Planned | - |
| 2. Fluid & Medication Tracking with Reminders | 6/7 | In Progress|  |
| 3. Activity Logging & Lab Results | 0/TBD | Not started | - |
| 4. Caregiver Dashboard & Doctor Reports | 0/TBD | Not started | - |
| 5. AI Insights & Anomaly Detection | 0/TBD | Not started | - |
| 6. Community & Education | 0/TBD | Not started | - |
