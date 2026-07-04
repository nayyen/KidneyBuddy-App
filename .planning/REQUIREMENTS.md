# Requirements: KidneyBuddy

**Defined:** 2026-06-24
**Core Value:** Pasien tidak pernah melewatkan dosis obat, sesi exchange CAPD, atau jadwal HD tanpa sadar — reliabilitas reminder dan pencatatan harian adalah hal yang harus berfungsi sempurna.

## v1 Requirements

Seluruh scope MVP dari `PRD.md` section 4.1. Setiap requirement memetakan ke satu atau lebih FR-ID di PRD untuk traceability penuh. Validated against domain research in `.planning/research/FEATURES.md` — scope confirmed well-calibrated (table stakes match international CKD/PD apps; caregiver dashboard and CAPD peritonitis early-warning are literature-confirmed differentiators, not scope padding).

### Authentication & Account (AUTH)

- [ ] **AUTH-01**: User can register with full name, email, password, phone number, and birth date
- [ ] **AUTH-02**: User can log in and stays logged in across browser refresh
- [ ] **AUTH-03**: User can log out from any page
- [ ] **AUTH-04**: Account locks for 15 minutes after 5 failed login attempts within 10 minutes
- [ ] **AUTH-05**: Caregiver can log in with the same account credentials as the patient, independently from a separate device
- [ ] **AUTH-06**: User can reset their password via an emailed reset link if they forget it (gap identified during Phase 1 discuss-phase — missing from initial requirements pass, added 2026-06-25)

### Onboarding & Therapy Profile (ONBOARD)

- [ ] **ONBOARD-01**: New user completes interactive onboarding (register → select therapy method → set first reminder) in under 5 minutes
- [ ] **ONBOARD-02**: User selects active therapy method (CAPD/HD/Transplantasi) with a plain-language "Apa ini?" explanation available inline
- [ ] **ONBOARD-03**: User can skip setting the first reminder during onboarding; dashboard shows a banner reminding them to configure it later
- [ ] **ONBOARD-04**: User can resume onboarding from the last completed step if they close the app before finishing
- [ ] **ONBOARD-05**: User can change active therapy method anytime from profile settings with explicit confirmation; change is recorded in therapy history and UI/features adjust automatically
- [ ] **ONBOARD-06**: User can replay the onboarding tutorial from Settings after initial completion

### Fluid Tracking (FLUID)

- [x] **FLUID-01**: User can log a fluid entry with type (masuk/keluar), source (minuman/makanan/cairan CAPD/lainnya — CAPD option only for CAPD patients), CAPD concentration if applicable, decimal volume, and unit (ml/kg)
- [x] **FLUID-02**: System automatically calculates and displays the daily fluid in/out delta on the dashboard, updated on every new entry
- [x] **FLUID-03**: CAPD patient can record outgoing fluid condition (jernih/keruh/keruh dengan gumpalan putih/berdarah) and sees an immediate red warning banner that cannot be dismissed without active interaction if abnormal
- [x] **FLUID-04**: User can log a fluid entry retroactively with a past date/time, flagged as a late entry, still included in anomaly analysis
- [x] **FLUID-05**: If connection drops while saving an entry, it's stored locally and synced automatically once connection returns

### Medication & Therapy Reminders (REMIND)

- [ ] **REMIND-01**: User can create a medication reminder with name, dose, type (minum/suntik), free-text timing note, active days + time, and optional photo
- [x] **REMIND-02**: User receives a push notification at the scheduled reminder time showing medication name and photo if available
- [ ] **REMIND-03**: User can confirm a medication dose was taken directly from the notification; confirmation is logged
- [ ] **REMIND-04**: If a medication reminder isn't confirmed within 30 minutes, system sends one follow-up reminder
- [ ] **REMIND-05**: CAPD patient can set exchange reminders with time and fluid concentration
- [ ] **REMIND-06**: HD patient can set dialysis schedule reminders with day(s) of week and time
- [ ] **REMIND-07**: Changing active therapy method preserves existing medication reminders and only auto-adjusts therapy-specific (CAPD/HD) reminders
- [ ] **REMIND-08**: Caregiver logged in on a separate device receives the same therapy/medication reminders independently, if notifications are enabled on that device

### Lab Results (LAB)

- [ ] **LAB-01**: User can upload a lab result file (PDF/JPG/PNG, max 10MB) with exam date
- [ ] **LAB-02**: User can manually enter lab parameters (name, value, unit, date) as an alternative or supplement to file upload
- [ ] **LAB-03**: User can view a trend chart of a selected lab parameter over a chosen date range, built from manually entered data
- [ ] **LAB-04**: Lab results cannot be permanently deleted, only archived

### AI Insights (AI)

- [x] **AI-01**: System generates a daily AI summary (Bahasa Indonesia, Groq Llama 3.3 70B) at 20:00 or on manual trigger, narrating fluid balance, CAPD condition, medication adherence, and activity for that day, with a medical disclaimer
- [x] **AI-02**: System generates a weekly proactive trend insight every Sunday 19:00 (or when a significant trend is detected from new lab data) from 7–30 days of data, with concrete Bahasa Indonesia suggestions
- [x] **AI-03**: System analyzes manually entered lab values against general CKD reference ranges and explains out-of-range results in plain Bahasa Indonesia without diagnosing, triggered when a manual lab result is saved
- [x] **AI-04**: System generates personalized food/lifestyle suggestions from tracking data (≥3 days), latest lab result, and active therapy method, shown on Education page or dashboard
- [x] **AI-05**: Every AI-generated output includes a disclaimer that it does not replace professional medical advice, enforced server-side (not left to the model alone)

### Anomaly Detection & Alerts (ANOMALY)

- [x] **ANOMALY-01**: System runs rule-based anomaly checks on every new tracking entry and as a daily 21:00 batch — covering ≥30% fluid-output decline over 3 consecutive days, abnormal CAPD fluid condition, >2 missed therapy schedules in one day, and significantly deviated fluid intake patterns
- [x] **ANOMALY-02**: User sees an anomaly alert card with a plain Bahasa Indonesia explanation of what was detected, why it matters, and a concrete next step, without a diagnosis, when confidence is above threshold
- [x] **ANOMALY-03**: High-severity anomalies trigger a visually/aurally distinct emergency notification that cannot be dismissed without active interaction, for all patient types
- [x] **ANOMALY-04**: User can mark a read anomaly alert as "relevan" or "tidak relevan" as feedback

### Activity Logging (ACTIVITY)

- [ ] **ACTIVITY-01**: User can start logging a daily activity with name and estimated end time from the dashboard, showing real-time status (Berlangsung/Selesai/Masih aktif)
- [ ] **ACTIVITY-02**: User receives a reminder a few minutes before estimated end time, and an informative (non-alarm) notification every 10 minutes (customizable) after end time has passed, framed positively ("Masih aktif · [durasi] lebih", amber) rather than as "overdue"
- [ ] **ACTIVITY-03**: After marking an activity complete, user is prompted to rate how they felt (Nyaman/Biasa/Lelah/Berat) with an optional short note

### Doctor Visit Reports (REPORT)

- [ ] **REPORT-01**: User can generate a doctor-visit report for a selected date range, summarizing fluid in/out, medication adherence, CAPD condition frequency, and detected anomalies
- [ ] **REPORT-02**: User can add an optional note to a generated report before showing it to the doctor; underlying data cannot be edited

### Caregiver (CAREGIVER)

- [ ] **CAREGIVER-01**: Caregiver sees a dashboard identical to the patient's, including daily tracking data, latest AI summary, and anomaly alerts
- [ ] **CAREGIVER-02**: When either patient or caregiver updates a reminder schedule while both are logged in, the change applies in real time on both devices, with a notification on the device that didn't make the change

### Community (COMMUNITY)

- [ ] **COMMUNITY-01**: User can create a post with title, content, category (pertanyaan/berbagi pengalaman/informasi), and relevant therapy method tag
- [ ] **COMMUNITY-02**: User can reply to a post and mark a reply as "membantu" (helpful)
- [ ] **COMMUNITY-03**: User can archive their own post; posts are never hard-deleted

### Education (EDU)

- [x] **EDU-01**: User can browse and filter education content (articles, exercise guides, food/lifestyle info) by active therapy method

### Notifications & PWA (NOTIF)

- [x] **NOTIF-01**: User can install KidneyBuddy to home screen as a PWA and grant browser notification permission to receive push reminders
- [ ] **NOTIF-02**: Each device a user (patient or caregiver) logs in on registers its own push subscription, so reminders deliver independently per device on the same account
- [x] **NOTIF-03**: On iOS, the app prompts the user to Add to Home Screen before enabling notifications, since push requires this

### Responsive Layout (RESPONSIVE)

Per `PRD.md` section 7.2 (Design Consideration 2 — Platform Requirement): mobile-first but fully responsive with distinct layouts per breakpoint, not just scaling.

- [x] **RESPONSIVE-01**: On mobile (375–767px), app renders single-column layout with 5-tab bottom navigation, centered FAB ("Catat Cairan"), and a compact header
- [x] **RESPONSIVE-02**: On tablet (768–1023px), app renders a 2-column layout for dashboard and list views (e.g., metric cards side by side), with bottom navigation unchanged from mobile
- [x] **RESPONSIVE-03**: On desktop (1024px and above), primary navigation moves to a left sidebar (replacing bottom navigation entirely), main content uses a multi-column layout with max-width 1280px, header becomes a top bar with persistent Lab/Laporan/Profil shortcuts, and the FAB becomes a regular primary button fixed in the sidebar or bottom-right corner
- [x] **RESPONSIVE-04**: Layout correctness is verified via browser testing on Chrome mobile, Safari iOS, Chrome desktop, and Firefox desktop at exactly the 375px, 768px, 1024px, and 1280px breakpoints

## v2 Requirements

Deferred to future release per `.planning/research/FEATURES.md` "Add After Validation" and "Future Consideration" findings — tracked but not in current roadmap.

### Caregiver Refinement

- **CAREGIVER-V2-01**: Escalate caregiver notifications primarily on missed/ignored reminders rather than every routine event (add once usage data shows caregiver notification fatigue)

### Onboarding Refinement

- **ONBOARD-V2-01**: Contextual micro-tutorials beyond initial onboarding for specific screens where users get stuck (add after go-live user testing surfaces specific friction points)

### AI Refinement

- **AI-V2-01**: Anomaly threshold retuning based on accumulated `feedback_flag` (relevan/tidak relevan) data volume
- **AI-V2-02**: Open-ended AI chatbot for education Q&A (defer until structured AI functions are proven reliable)

## Out of Scope

Explicitly excluded per `PRD.md` section 4.1 and `.planning/PROJECT.md`. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Integrasi rekam medis RS/BPJS | Butuh kerja sama institusional di luar kendali tim, bukan prioritas MVP |
| Aplikasi mobile native (iOS/Android) | v1 hanya web responsif (PWA) |
| Sinkronisasi otomatis alat ukur medis (timbangan, tensimeter) | Semua input manual oleh pengguna per asumsi PRD |
| Telemedicine / konsultasi dokter online | Di luar scope produk ini |
| Machine learning model adaptif | v1 hanya rule-based + LLM inference (Groq), bukan model yang dilatih ulang |
| Verifikasi medis konten komunitas | Komunitas adalah platform berbagi, bukan sumber medis terverifikasi |
| Multi-pasien dalam satu akun | v1: satu akun = satu pasien |
| Gamifikasi / reward system | Berisiko trivialisasi kondisi medis kronis serius; bertentangan dengan framing positif non-gamified yang sudah ada (ACTIVITY-02) |
| Video / live streaming di komunitas | Cukup teks model Quora |
| Chatbot AI edukasi terbuka | Risiko hallucination tanpa guardrail untuk populasi awam/lansia; ditunda ke v2 (lihat AI-V2-02) |
| Caregiver akun terpisah dengan kredensial sendiri | Model akun bersama (trusted family member) sudah cukup untuk v1, sesuai asumsi PRD |
| Wearable/connected device integration | Menambah kompleksitas sertifikasi & maintenance yang tidak proporsional untuk MVP akademik 13 minggu |

## Traceability

Each v1 requirement maps to exactly one phase in `.planning/ROADMAP.md`.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| ONBOARD-01 | Phase 1 | Pending |
| ONBOARD-02 | Phase 1 | Pending |
| ONBOARD-03 | Phase 1 | Pending |
| ONBOARD-04 | Phase 1 | Pending |
| ONBOARD-05 | Phase 1 | Pending |
| ONBOARD-06 | Phase 1 | Pending |
| FLUID-01 | Phase 2 | Complete |
| FLUID-02 | Phase 2 | Complete |
| FLUID-03 | Phase 2 | Complete |
| FLUID-04 | Phase 2 | Complete |
| FLUID-05 | Phase 2 | Complete |
| REMIND-01 | Phase 2 | Pending |
| REMIND-02 | Phase 2 | Complete |
| REMIND-03 | Phase 2 | Pending |
| REMIND-04 | Phase 2 | Pending |
| REMIND-05 | Phase 2 | Pending |
| REMIND-06 | Phase 2 | Pending |
| REMIND-07 | Phase 2 | Pending |
| REMIND-08 | Phase 2 | Pending |
| NOTIF-01 | Phase 2 | Complete |
| NOTIF-02 | Phase 2 | Pending |
| NOTIF-03 | Phase 2 | Complete |
| RESPONSIVE-01 | Phase 2 | Complete |
| RESPONSIVE-02 | Phase 2 | Complete |
| RESPONSIVE-03 | Phase 2 | Complete |
| RESPONSIVE-04 | Phase 2 | Complete |
| ACTIVITY-01 | Phase 3 | Pending |
| ACTIVITY-02 | Phase 3 | Pending |
| ACTIVITY-03 | Phase 3 | Pending |
| LAB-01 | Phase 3 | Pending |
| LAB-02 | Phase 3 | Pending |
| LAB-03 | Phase 3 | Pending |
| LAB-04 | Phase 3 | Pending |
| CAREGIVER-01 | Phase 4 | Pending |
| CAREGIVER-02 | Phase 4 | Pending |
| REPORT-01 | Phase 4 | Pending |
| REPORT-02 | Phase 4 | Pending |
| AI-01 | Phase 5 | Complete |
| AI-02 | Phase 5 | Complete |
| AI-03 | Phase 5 | Complete |
| AI-04 | Phase 5 | Complete |
| AI-05 | Phase 5 | Complete |
| ANOMALY-01 | Phase 5 | Complete |
| ANOMALY-02 | Phase 5 | Complete |
| ANOMALY-03 | Phase 5 | Complete |
| ANOMALY-04 | Phase 5 | Complete |
| COMMUNITY-01 | Phase 6 | Pending |
| COMMUNITY-02 | Phase 6 | Pending |
| COMMUNITY-03 | Phase 6 | Pending |
| EDU-01 | Phase 6 | Complete |

**Coverage:**

- v1 requirements: 56 total
- Mapped to phases: 56
- Unmapped: 0

---
*Requirements defined: 2026-06-24*
*Last updated: 2026-06-25 after adding AUTH-06 (password reset via email link — gap surfaced during Phase 1 discuss-phase, no auth system should ship without it) mapped to Phase 1; RESPONSIVE-01..04 (mobile/tablet/desktop distinct-layout requirement from PRD.md section 7.2, missed in initial definition) mapped to Phase 2, where the main UI shell is first built; all 56 v1 requirements remain mapped across 6 phases*
