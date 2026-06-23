# Pitfalls Research

**Domain:** Health-adjacent PWA tracking app with AI-generated medical-adjacent content, web push notifications (iOS Safari), mandatory microservices split, time-critical reminders — built by a student team in 13 weeks
**Researched:** 2026-06-24
**Confidence:** MEDIUM-HIGH (web push/iOS, microservices, and notification reliability claims verified against multiple current sources; Groq rate-limit numbers verified against official docs; PostgreSQL encryption verified against official docs; AI medical-disclaimer decay trend is from a single recent study and should be treated as directional, not exact)

## Critical Pitfalls

### Pitfall 1: iOS push notifications silently don't work for most users because the PWA wasn't installed via "Add to Home Screen" first

**What goes wrong:**
The team builds and tests web push primarily on desktop Chrome / Android, where push works in a normal browser tab. On iOS Safari, `PushManager`/`Notification.requestPermission()` is **only available to a PWA actually added to the Home Screen** — an open Safari tab, or even Safari in "Open in app" mode, does not expose the Push API at all. Since this project's core value is "never miss a reminder," and a large share of Indonesian patients/caregivers are likely on iPhones, this is not a minor edge case — it can silently disable the core feature for a large fraction of users who simply visit the site instead of installing it.

**Why it happens:**
The Express/Next.js implementation pattern (register service worker → request permission → subscribe) "just works" on Android/desktop, so the team ships it, tests on their own (often Android) devices, and never discovers the iOS-only gate until a real iPhone user reports "I never get reminders." `Notification.requestPermission()` on iOS Safari also silently no-ops if not called directly inside a user-gesture click handler (not inside a promise chain, async callback, or on page load) — another way the permission prompt simply never appears with no error thrown.

**How to avoid:**
- Treat "Add to Home Screen" as a required onboarding step for iOS users, not an optional nicety — detect iOS Safari (`navigator.standalone === false` + UA sniffing) and show an explicit "Install this app to receive reminders" interstitial with screenshots of the Share → Add to Home Screen flow before allowing the user to configure reminders.
- Request notification permission directly inside the `onClick` handler of a real button — never after an `await`, inside a `then()`, or on a timer.
- Build a server-side "reachability" indicator: track per-user whether push subscription exists and is fresh; if an iOS user has zero valid subscription after onboarding, surface an in-app banner (not just push) warning that reminders won't arrive until installed.

**Warning signs:**
- Any iOS test device shows "notifications enabled" in app state but no system permission prompt ever appeared.
- QA only performed on Android/desktop Chrome — no real iPhone in the test matrix.
- Push subscription table has zero or stale rows for users flagged as iOS in user-agent logs.

**Phase to address:** Core Tracking & Reminder phase (Milestone 3, ~Wk7) — this must be validated end-to-end on a real iPhone before reminder reliability is declared "done," not discovered during Go-Live (Wk13).

---

### Pitfall 2: iOS push subscriptions silently expire/die after 1-2 weeks of inactivity, and the app has no way to detect or recover from this

**What goes wrong:**
Even after successful installation and subscription, iOS Safari push subscriptions are known to go stale or be silently invalidated after roughly 1-2 weeks, especially if the user doesn't open the installed PWA periodically. Unlike other browsers, iOS does not reliably populate `expirationTime` on the subscription object, so there's no proactive signal the backend can use to know a subscription is about to die. The result for this app: a CAPD patient who installed the app in week 1 may stop receiving exchange reminders by week 3 with zero visible error on either client or server — exactly the failure mode the 99% uptime NFR and "core value" promise this is supposed to prevent.

**Why it happens:**
Web push on iOS is new (iOS 16.4+, March 2023) and Apple's implementation diverges from the W3C spec in undocumented ways. Teams build against the spec (`pushsubscriptionchange` event, `expirationTime`) and assume parity with Chrome/Firefox, not realizing Apple's behavior is materially less reliable and not self-reporting.

**How to avoid:**
- On every app foreground/open, re-validate the push subscription (`pushManager.getSubscription()`) and re-subscribe if missing/changed; sync the fresh subscription to backend immediately.
- Server-side: track `last_subscription_confirmed_at` per device; if a device hasn't confirmed in >10 days, trigger an in-app (not push, since push may be broken) banner next time the user opens the app: "Pengingat mungkin tidak aktif — buka pengaturan notifikasi."
- Never rely on push as the sole channel for anything safety-critical — pair every reminder with an in-app dashboard state (e.g., "Jadwal Hari Ini" card) so a user who opens the app manually still sees overdue items even if push silently failed.
- Log push delivery attempts and failures server-side (not just "sent," but delivery receipt/error from the push service) so unreliable subscriptions can be detected in aggregate, not just anecdotally.

**Warning signs:**
- No telemetry distinguishing "push sent" from "push delivered" — if the team can't answer "what % of push notifications actually reached a device last week," this gap is already present.
- Users (especially iOS) report reminders "just stopped" after initially working.

**Phase to address:** Core Tracking & Reminder phase (Wk7) for the re-subscription/refresh logic; AI & Community phase or Go-Live hardening (Wk10-13) for delivery telemetry/dashboarding, since this requires data volume to be visible.

---

### Pitfall 3: A single in-process cron job (node-cron / setInterval) is used for medication, CAPD exchange, and HD reminders, and silently stops firing on deploy, crash, or restart

**What goes wrong:**
The natural Express.js implementation is `node-cron` running inside the same process as the API server. Any deploy, crash, OOM kill, or platform restart (which happens routinely on Railway/Render free/hobby tiers) wipes all in-memory scheduled jobs. There is no built-in retry, no missed-job detection, and no alerting — a reminder that should have fired at 8:00 AM for a CAPD exchange simply never fires, with nothing in any log to say so, because cron "has no concept of success, only execution." For a medication/dialysis reminder system whose entire value proposition is "never miss a dose," this is the single highest-impact failure mode in the whole system.

**Why it happens:**
node-cron is the path of least resistance for "send a notification at a scheduled time" inside a Node/Express app, and it works perfectly in local dev and demos. The failure mode only appears under real deploy cycles (which a 13-week sprint will have many of) and is invisible without dedicated monitoring — nothing crashes, nothing errors, a notification simply doesn't happen.

**How to avoid:**
- Persist scheduled reminder "due" state in PostgreSQL (already the source of truth for `ReminderSchedule`), not in process memory — on every cron tick, query "which reminders are due in this window and not yet marked sent," rather than relying on long-lived in-memory timers per reminder.
- On backend boot, immediately run a catch-up check for any reminder that should have fired while the process was down, rather than waiting silently for the next tick.
- Add a dead-man's-switch / heartbeat: a lightweight external monitor (even a simple `Uptime Kuma` push-style check, already planned for NFR-04) that the cron job pings every run; alert if no ping in N minutes — this turns a silent failure into a visible one.
- Consider running the scheduler as its own lightweight, independent loop (still inside the single Backend container per the architecture constraint) rather than coupled to web request handling, so a slow API request can't block the tick.

**Warning signs:**
- No log line exists that says "checked for due reminders at <time>, found N" — if reminder firing isn't observable in logs/metrics, failures are undetectable by definition.
- Reminder reliability has only been tested by leaving the dev server running uninterrupted — never tested across a deploy/restart.

**Phase to address:** Core Tracking & Reminder phase (Wk7) — this is the literal definition of milestone 3's acceptance criterion ("sistem pengingat berfungsi end-to-end"); the catch-up/persistence logic must be built then, not patched in later.

---

### Pitfall 4: AI-generated "ringkasan harian" / anomaly text drifts into diagnostic or alarming language despite a disclaimer being present

**What goes wrong:**
A disclaimer at the top or bottom of an AI response does not control what the LLM says in the body of the response. Independent research on generative AI in health contexts found medical safety disclaimer rates falling sharply over time as models become more "confident," and models will readily produce device-like clinical assertions ("nilai kreatinin Anda menunjukkan gagal ginjal stadium 4") even when explicitly instructed not to diagnose — especially under prompt variations, edge-case lab values, or when patients phrase their own data input in alarming ways. For this app specifically, design consideration 7.4 demands "bahasa yang menenangkan, tidak menimbulkan kepanikan" — a single LLM output that reads as a diagnosis or causes panic is a design-consideration violation each time it happens, not a one-off bug, because it stems from a missing guardrail, not a typo.

**Why it happens:**
Teams often treat "add a disclaimer" as a checkbox satisfied by static text rendered around the AI output, rather than as a constraint that must be enforced on the model's actual generated content via system prompt design, output validation, and testing against edge cases (very abnormal lab values, missing data, contradictory trends).

**How to avoid:**
- Write a strict system prompt for every one of the 5 Groq-backed functions (FR-SYS-001/002/004/005/006) that explicitly forbids diagnostic language, names forbidden phrases ("Anda menderita...", "ini menunjukkan penyakit...", "stadium..."), and mandates calm framing + a concrete next step + the disclaimer as part of the structured output, not just appended by the frontend.
- Treat the disclaimer as a backend-enforced suffix/structure (e.g., a fixed Indonesian disclaimer string the backend appends after the LLM call, never trusting the LLM to include it itself), so it can never be dropped regardless of model behavior.
- Build a test set of edge-case inputs (extremely abnormal lab values, all-overdue medication days, severe CAPD fluid anomalies) and manually review the AI's literal output text against a checklist (no diagnosis, calming tone, concrete next step, disclaimer present) before Milestone 4 sign-off — this is explicitly required by Design Consideration 7.4's mandate for review "oleh minimal 1 orang dengan pengalaman merawat pasien gagal ginjal."
- Cap output length and use structured prompting (ask for sections: ringkasan, observasi, saran, disclaimer) rather than free-form narrative, to make panic-inducing phrasing easier to catch in review and reduce hallucination surface area.

**Warning signs:**
- AI output has only been tested with "normal-looking" sample data — never with intentionally extreme/abnormal inputs.
- Disclaimer text lives only in the frontend template, not enforced/validated server-side.
- No one with caregiving/clinical experience has reviewed actual AI output strings before this milestone.

**Phase to address:** AI & Community Features phase (Wk10) — explicitly named in Milestone 4's acceptance criterion ("output AI dapat dibaca pengguna non-medis tanpa kebingungan") and Design Consideration 7.4. Should not be deferred to Go-Live polish.

---

### Pitfall 5: AI anomaly detection (rule-based + LLM) generates either too many false positives (alert fatigue) or misses real high-severity events (false negatives), and there's no feedback loop to know which is happening

**What goes wrong:**
FR-SYS-001 combines deterministic rules (≥30% fluid drop over 3 days, cloudy/bloody CAPD fluid, >2 missed schedules/day) with LLM judgment for severity/explanation. Two failure modes compound: (1) rule thresholds calibrated from guesswork rather than clinical literature either fire on every minor data fluctuation (training patients to ignore/dismiss the "can't be dismissed without interaction" emergency alert — actively dangerous for a UX pattern designed to demand attention), or (2) the LLM is asked to assess "severity" on data it has no real clinical grounding for, producing inconsistent severity classification across similar inputs (same anomaly type rated "tinggi" one day and "normal" the next), undermining trust precisely when the alert matters most (e.g., peritonitis indicators in CAPD fluid).

**Why it happens:**
Anomaly thresholds in domain-specific health contexts are typically a guess unless grounded in the clinical literature already partially summarized in `.planning/PROJECT.md` (e.g., 31.9% peritonitis rate at RS Kariadi). LLMs are non-deterministic at the margins of a decision boundary — asking an LLM "is this severity high or normal" without a deterministic rule backstop for the literal danger signals (cloudy/bloody fluid is unambiguous and rule-based, not LLM-judged) produces flaky severity for borderline cases.

**How to avoid:**
- For the unambiguous danger signals explicitly named in the FR (CAPD fluid keruh/berdarah, >2 missed schedules/day), keep severity determination 100% rule-based/deterministic — never let the LLM override or soften these into "normal." Reserve LLM involvement for explanation text generation and softer trend judgment (FR-SYS-004 weekly trend insight), not for the binary "is this an emergency" decision.
- Implement the `Feedback Pengguna` field (already in the Data Requirements as `AI Anomaly Alert.Feedback Pengguna`) from day one of the anomaly feature, not as a v2 add-on — without it there's no way to measure false-positive rate at all, and the PRD's own success metric depends on this data existing.
- Pilot rule thresholds against the milestone 4 acceptance criterion explicitly ("minimal 3 skenario anomali terdeteksi dengan benar dalam pengujian manual") using deliberately constructed test cases for each rule, not just live data — confirm both true positives AND that mild/borderline cases don't trip the "cannot dismiss" emergency UI.
- Log every anomaly alert with the raw input data that triggered it, so post-hoc review (e.g., during user testing in Wk13) can audit whether alerts matched reality.

**Warning signs:**
- The "cannot dismiss without interaction" emergency alert pattern has fired more than once or twice in normal QA testing — if it's tripping on routine data, real users will face alert fatigue.
- Feedback field exists in the schema but no UI path actually lets a user mark an alert relevant/not relevant.
- Severity classification for the same literal anomaly scenario varies between two test runs of the LLM call.

**Phase to address:** AI & Community Features phase (Wk10), but the rule thresholds and feedback UI should be locked down with the Core Tracking phase (Wk7) data model so the feedback loop has data to work with by the time AI ships.

---

### Pitfall 6: The mandatory 3-container microservices split gets built as "a monolith wearing three Dockerfiles" — REST calls between Frontend and Backend become a thin proxy layer that adds latency and bugs without any real separation of concerns

**What goes wrong:**
Under deadline pressure, a student team forced into an architecture they didn't choose typically satisfies the letter of the requirement (3 containers, 3 Dockerfiles, one docker-compose.yml, REST only) while collapsing all actual logic into one of the layers — usually the Backend doing too much, or the Frontend silently reaching for shortcuts (Next.js API routes that bypass the Express backend, defeating "Frontend never accesses DB directly" in spirit if not in literal violation). The result is needless network hops (every dashboard load now requires Frontend → Backend → DB round trips that a monolith wouldn't need), duplicated validation logic between layers, and harder local debugging — all the costs of microservices with none of the benefits (independent scaling, independent deploys, fault isolation), since for an MVP at ≤100 concurrent users none of those benefits are needed anyway. Industry data backs this concern directly: less than 5% of applications meaningfully benefit from microservices, and teams under deadline pressure who adopt them anyway hit "distributed complexity exceeding their readiness" — service discovery, monitoring, and cross-service debugging skills the team likely hasn't built yet.

**Why it happens:**
The architecture is a non-negotiable instructor requirement (per `.planning/PROJECT.md` Constraints), not a technical choice — so the team's incentive is to satisfy the grading checklist (3 Dockerfiles, REST-only) as cheaply as possible rather than to actually design clean service boundaries, since there is no scaling/business reason driving the split.

**How to avoid:**
- Treat the Backend Express container internally as a well-structured modular monolith (clear route/controller/service/repository layering) — the "microservices-ness" only needs to be true at the container boundary (Frontend/Backend/DB physically separate, REST-only), not necessarily multiplied further inside the Backend into more sub-services. Resist any urge to further split Backend into more containers "for credit" — the requirement is a 3-container minimum, not a maximum to exceed.
- Define the REST API contract (routes, request/response shapes) once, early, in Wk4-7 (Design + Core Tracking phases) and treat it as a real interface boundary — Frontend code should never assume backend internals (e.g., DB column names), and Backend should never assume Frontend rendering details. This is what makes the separation real rather than cosmetic.
- Explicitly forbid Next.js API routes that talk to the database or Groq directly — that would violate "Backend handles all business logic and AI calls" even though it's tempting and easy in Next.js. Audit this specifically before Milestone 3 sign-off.
- Don't add inter-service queues, service discovery, or other microservices machinery the project doesn't need — match complexity to actual production needs (≤100 concurrent users, single backend instance is fine).

**Warning signs:**
- Any `app/api/*` route in the Next.js Frontend container imports a database client or calls Groq directly.
- The same validation logic (e.g., "volume cannot be negative") is implemented separately and inconsistently in both Frontend and Backend.
- Local dev setup requires more than `docker-compose up` to get a working environment — if onboarding a new team member to run the stack takes more than reading the README, the container boundaries have leaked complexity.

**Phase to address:** Design & Mockup phase (Wk4) for defining the REST contract; Core Tracking & Reminder phase (Wk7) for first real enforcement check — this is the natural milestone to audit whether the boundary held under real feature pressure.

---

### Pitfall 7: At-rest encryption (NFR-02) is treated as "the hosting provider's disk is encrypted, so we're done" — sensitive health columns are stored in plaintext inside the database itself

**What goes wrong:**
NFR-02 explicitly names `fluid_log`, `medication_log`, and `lab_result` as requiring at-rest encryption. Full-disk/volume encryption (which most managed Postgres providers, including Railway/Render's underlying infra, provide by default) protects against physical disk theft but does **not** protect data from anyone with database-level access (a compromised DB credential, an internal team member with the connection string, a misconfigured backup, or a SQL injection that gets read access) — once the filesystem is mounted, Postgres serves the data unencrypted to any authenticated query. A security audit (already named as the verification method for NFR-02) that checks "is volume encryption enabled" while the actual sensitive columns sit in plaintext will pass token compliance but fail the actual intent of protecting sensitive health data.

**Why it happens:**
"Encryption at rest" sounds satisfied once a managed Postgres host's marketing page says "data is encrypted at rest," and teams don't distinguish infrastructure-level encryption (which they get for free, no code changes) from application/column-level encryption (which requires actual implementation effort: `pgcrypto`, encrypted column types, or app-layer encrypt/decrypt before/after DB calls).

**How to avoid:**
- Confirm with Railway/Render documentation that volume-level encryption is in fact enabled by default (don't assume) — this satisfies the "disk theft" threat model and is a legitimate baseline, but explicitly document it as the floor, not the ceiling.
- For the three named entities, add column-level encryption (e.g., `pgcrypto`'s `pgp_sym_encrypt`/`pgp_sym_decrypt` for free-text/sensitive fields, or app-layer AES-256 encryption in the Backend before INSERT, decrypting after SELECT) for the most sensitive free-text fields at minimum (lab file paths/notes, medication notes) — full column encryption of every numeric field may be unnecessary overhead for an MVP, but the team should make a deliberate, documented choice rather than defaulting to "disk encryption is enough."
- Be aware of the pgcrypto tradeoff: the decryption key must live somewhere the Backend can access it (env var/secrets manager), and decrypted data briefly exists in the Backend process memory — this is an acceptable, normal tradeoff for an MVP, but should be a conscious choice, documented in the security audit writeup, not an oversight.
- Make sure backups (if any are configured on Railway/Render) inherit the same encryption guarantees — a common gap is encrypting the live DB but not the backup snapshots.

**Warning signs:**
- The "security audit" mentioned in NFR-02's verification step consists only of confirming HTTPS/TLS is active — no one checked what happens if someone runs a raw SQL query against the `lab_result` table.
- No code path in the Backend ever calls an encrypt/decrypt function — if `pgcrypto` or equivalent never appears in the codebase, only the hosting provider's default applies.

**Phase to address:** Core Tracking & Reminder phase (Wk7), when the FluidLog/MedicationLog/LabResult tables are first built — encryption approach is far cheaper to bake in at schema design time than retrofit after data exists. Final verification belongs in Go-Live security audit (Wk13).

---

### Pitfall 8: Groq's free-tier rate limits (request-per-day cap) are not load-tested against the actual NFR-01 target (100 concurrent users) until Go-Live, when it's too late to redesign

**What goes wrong:**
Groq's free tier caps out around 1,000 requests/day and ~30 requests/minute for typical models (verified against official Groq docs as of 2026). This project calls Groq for 5 distinct functions — daily summary (every user, every day, ~8pm batch), weekly trend insight (every user, weekly batch), lab analysis (on lab save), anomaly detection's LLM component (on every tracking save, potentially), and lifestyle suggestions (on-demand). At even 100 concurrent/active users, a single 8pm daily-summary batch alone could consume 100 requests in a tight window — fine for RPM, but combined with anomaly-detection calls firing on every tracking entry throughout the day, the 1,000/day ceiling can be exhausted well before "100 concurrent users" is reached, especially since NFR-05 explicitly requires 10x scale headroom. If this is only discovered during the Wk13 load test (NFR-01's stated verification method via k6), there's no time left to add a paid tier, request batching, or fallback/queueing logic.

**Why it happens:**
Groq's free tier is attractive specifically because it's free and fast, so the AI integration is built and demoed successfully with a handful of test accounts — the rate ceiling is invisible until either real concurrent load or a long-running batch job (the 8pm daily summary for many users at once) is tested, which often only happens right before Go-Live's mandated k6 load test.

**How to avoid:**
- Stagger the 8pm daily-summary batch job across a time window (e.g., spread over 20-30 minutes with jitter per user) rather than firing all at once, both to respect Groq's RPM and to smooth backend load generally.
- Add a request queue (even a simple in-Postgres job queue table, given the existing stack) for AI calls rather than calling Groq synchronously inline with user-facing requests — this allows throttling, retry-with-backoff on rate-limit errors, and prevents one slow/rate-limited Groq call from blocking a dashboard page load (directly protects NFR-01's 3-second target too).
- Explicitly test the daily-summary batch job and anomaly-detection-on-every-save pattern against Groq's documented rate limits using realistic user counts (start this in Milestone 4, not Milestone 5) — if the free tier can't sustain it, decide early whether to apply for Groq's Developer tier (10x limits) or reduce call frequency (e.g., only run anomaly LLM-assist when rule-based check flags something, not on every single save).
- Cache/reuse AI outputs where reasonable (e.g., don't regenerate the daily summary if requested twice in the same day with no new data).

**Warning signs:**
- AI features have only been tested with 1-5 test accounts, never simulating the 100-concurrent-user target from NFR-01.
- Anomaly detection's LLM component is called synchronously on every single tracking entry save, with no batching/throttling.
- No retry/backoff logic exists for a 429 (rate limit) response from Groq — a rate-limited call currently either crashes the request or silently fails with no AI output and no user-facing explanation.

**Phase to address:** AI & Community Features phase (Wk10) — load characteristics must be understood before Milestone 4 sign-off ("AI ringkasan harian dan AI anomaly detection berfungsi"), with final confirmation against the full k6 load test (NFR-01) at Go-Live (Wk13).

---

### Pitfall 9: Caregiver "independent notifications per device, same account" is harder than it sounds and silently breaks multi-device push

**What goes wrong:**
FR-CG-001/PRD explicitly requires that a caregiver logged into the *same account* as the patient, but on a *different device*, receives reminders independently. This requires the push subscription model to be keyed per-device (browser/PWA install), not per-user — a common but wrong implementation stores one push subscription per `user_id`, which means the second device to subscribe silently overwrites the first device's subscription, and now either the patient or the caregiver (whichever logged in/subscribed most recently) simply stops getting push notifications with no error.

**Why it happens:**
"One account, push notifications" intuitively maps to a one-to-one user-to-subscription relationship in a quick implementation, and this works fine in single-device testing — the bug only appears once two real devices are both logged into the same account simultaneously, which is exactly the caregiver use case and easy to under-test.

**How to avoid:**
- Model push subscriptions as a one-to-many relationship from `user_id` (a `PushSubscription` table keyed by subscription endpoint, not overwriting on new subscribe) — every device that has ever granted permission gets its own row, and reminders fan out to all active, non-expired subscriptions for that account.
- Explicitly test the caregiver workflow (FR-CG-001, the dedicated workflow 6.5) with two real physical devices logged into one account before Milestone 3 sign-off — this is a multi-device scenario that's easy to skip when most dev/QA happens on one machine at a time.
- Provide a "Perangkat Terhubung" (connected devices) view in profile settings so patients/caregivers can see which devices are subscribed and remove stale ones — this also helps users self-diagnose the iOS subscription-expiry issue from Pitfall 2.

**Warning signs:**
- The push subscription table/schema has a unique constraint on `user_id` alone (rather than on `user_id` + device/endpoint).
- The caregiver workflow has only been tested by one person manually switching accounts on one device, not two devices simultaneously logged into the same account.

**Phase to address:** Core Tracking & Reminder phase (Wk7) — this is data-model-level and must be correct before reminder infrastructure is considered "done" per Milestone 3's own acceptance criterion.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Calling Groq synchronously inline in the request/response cycle instead of via a queue | Faster to build, fewer moving parts | Blocks page loads on slow/rate-limited AI calls, breaks NFR-01's 3s target, no retry on 429 | Only acceptable for early prototyping (Wk7-8); must move to async/queued before Milestone 4 sign-off |
| Storing push subscriptions per-user instead of per-device | Simpler schema, faster v1 | Silently breaks caregiver multi-device notifications (Pitfall 9) | Never acceptable — caregiver dual-device is an explicit Must-Have FR |
| Skipping column-level encryption and relying only on host-provided disk encryption | No extra implementation time | Fails the actual intent of NFR-02 for any DB-credential-level compromise | Acceptable only if explicitly documented as a known gap with a remediation plan; never acceptable to present as "NFR-02 done" without disclosure |
| Hardcoding anomaly rule thresholds without citing any clinical source | Fast to ship Milestone 4 | Either alert fatigue or missed real peritonitis/non-adherence signals — undermines core value | Acceptable as a documented placeholder during Wk8-9 development, but must be reviewed against literature/clinical advisor before Milestone 4 sign-off |
| Testing push notifications only on Android/desktop | Faster QA cycles | iOS reminders silently don't work for a large user segment (Pitfall 1) | Never acceptable — must test on real iPhone before Milestone 3 sign-off |
| Letting Next.js API routes call the database or Groq directly "just this once" for convenience | Saves a network hop during a crunch | Erodes the Frontend/Backend boundary the entire grading requirement depends on | Never acceptable given this is an explicit, non-negotiable instructor requirement |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|-------------------|
| Groq API | Treating free-tier RPM/RPD limits as "enough because demos worked" | Load-test against NFR-01's 100-concurrent target explicitly; add request queueing + backoff on 429s; consider Developer tier if free tier can't sustain Milestone 4 testing |
| Web Push (iOS Safari) | Assuming Push API works in any browser tab like Android/Chrome | Gate all push UX behind "is this an installed Home Screen PWA" detection; request permission only inside a direct click handler |
| Web Push (VAPID) | Forgetting Apple requires the VAPID `subject` to be a `mailto:` or full HTTPS URL (stricter than spec minimum) | Set VAPID subject explicitly to a real contact email or URL, test against Apple's push service specifically, not just a generic web-push library default |
| Railway/Render free/hobby tiers | Assuming the backend process never restarts; relying on in-memory cron state | Persist all reminder-due state in PostgreSQL; add boot-time catch-up logic; monitor uptime with the already-planned Uptime Kuma for NFR-04 |
| PostgreSQL hosted (Railway/Render) | Assuming "managed Postgres = encrypted at rest" satisfies NFR-02 without checking what level of encryption is actually documented by the provider | Verify the specific provider's encryption documentation; add column-level encryption for the three named sensitive entities regardless |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous Groq calls blocking dashboard render | Dashboard load occasionally spikes well past 3s when AI summary is being generated inline | Move AI generation to async job, dashboard renders tracking data immediately and AI summary loads in separately / shows a loading state | Breaks NFR-01 (≤3s for 95% of requests) as soon as more than a handful of users hit the 8pm batch window simultaneously |
| All reminder cron logic inside one un-monitored in-process timer | Reminders stop firing after any deploy/restart with no alert | Persist schedule state in DB, add heartbeat monitoring, boot-time catch-up | Breaks the moment a deploy happens during a scheduled reminder window — likely multiple times across a 13-week build cycle |
| Single Backend container instance handling both web requests and the AI/cron workload | Backend becomes unresponsive during long-running anomaly-detection batch checks (FR-SYS-001's 21:00 daily batch) | Queue heavy/batch AI work separately from request-handling code path within the same container; don't block the Express event loop with long synchronous work | Breaks first under the 21:00 daily batch check combined with concurrent users, well before the 10x scale target in NFR-05 |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Treating "TLS is on" as covering NFR-02 entirely, ignoring at-rest encryption of the named sensitive tables | Sensitive health data (lab results, medication logs) readable in plaintext by anyone with DB access | Implement column-level encryption (pgcrypto or app-layer) for fluid_log/medication_log/lab_result per Pitfall 7 |
| Informed consent treated as a one-time checkbox at registration with no record of what was consented to / when | Cannot prove compliance with the "no storing medical data without explicit consent" constraint if challenged | Store consent version, timestamp, and exact text agreed to as its own auditable record, not just a boolean flag |
| Brute-force lockout (NFR-03) implemented only client-side or easily bypassed by clearing local storage / using a new IP | Account lockout is trivially circumvented, exposing health data to credential-stuffing | Enforce lockout server-side keyed to account (not IP/client state alone), verified by the automated brute-force test NFR-03 already mandates |
| Foto obat / lab file uploads stored with predictable/public URLs | Sensitive photos (medication, lab documents) accessible to anyone with the URL even without authentication | Store uploads behind authenticated Backend-proxied access, never serve directly from a public static bucket without an auth check |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Emergency alert (FR-PS-011b) fires too often due to loose rule thresholds | Patients learn to ignore or dismiss-by-force the "can't dismiss without interaction" pattern, defeating its purpose for the rare real emergency | Calibrate thresholds conservatively, test against Milestone 4's "3 correct scenarios" criterion, and track false-positive rate via the Feedback field from day one |
| AI summary uses clinical jargon without lay explanation despite Design Consideration 7.1's explicit requirement | Older or non-medical users (the explicit 50+ persona) can't act on the summary, defeating the app's core accessibility goal | Enforce parenthetical lay explanations for medical terms in the system prompt itself, and verify via the 7.1-mandated usability test with non-medical users before go-live |
| iOS users get no in-app indication that push notifications require Add to Home Screen first | Silent reminder failure for a large user segment with no recourse (Pitfall 1) | Explicit installable-PWA onboarding gate + persistent in-app banner if no valid push subscription exists |
| "Kegiatan lebih lama dari rencana" framing (FR-PS-018) is implemented with amber color and positive copy on the surface, but underlying notification cadence still reads as nagging (every 10 min) | Defeats the explicit intent of this FR (non-alarming, positive framing) if the *frequency* still feels like an overdue-alarm pattern even when the *copy* is positive | Treat notification frequency/tone as part of the same design requirement as copy/color — test the full notification experience, not just the static screen text, with real users before go-live |

## "Looks Done But Isn't" Checklist

- [ ] **Push notifications:** Often missing real-device iOS testing — verify on an actual iPhone with the PWA added to Home Screen, not just simulator/desktop Chrome with push DevTools.
- [ ] **At-rest encryption (NFR-02):** Often missing column-level protection for `fluid_log`/`medication_log`/`lab_result` — verify the encryption is implemented in code (pgcrypto/app-layer), not just assumed from "managed Postgres."
- [ ] **Cron-based reminders:** Often missing crash/restart recovery — verify reminders still fire correctly after deliberately restarting the backend container mid-day.
- [ ] **AI disclaimer (Design Consideration 7.4):** Often missing enforcement on edge-case/abnormal inputs — verify by testing with deliberately extreme lab values and overdue-everything scenarios, not just "happy path" sample data.
- [ ] **Caregiver independent notifications (FR-CG-001):** Often missing true multi-device support — verify with two physical devices logged into one account simultaneously, not sequential single-device testing.
- [ ] **Microservices boundary (REST API only):** Often "satisfied" on paper while Next.js API routes quietly touch the DB or Groq directly — verify by auditing every file under the Frontend's `app/api/` (or equivalent) directory for DB/Groq client imports.
- [ ] **Groq rate limits:** Often untested above a handful of demo accounts — verify the daily-summary batch job and anomaly-detection call volume against Groq's documented free-tier RPD/RPM before Milestone 4 sign-off.
- [ ] **Anomaly Feedback loop (AI Anomaly Alert.Feedback Pengguna):** Often present in the schema but with no UI ever wired to set it — verify a real user-facing control exists to mark an alert relevant/not relevant.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|-----------------|
| iOS push silently broken for installed users | MEDIUM | Add in-app fallback banner showing overdue items even when push fails; communicate the Add to Home Screen requirement retroactively via an in-app announcement; cannot recover already-missed historical reminders, but can prevent further misses |
| Cron-based reminders found to have missed a window after a deploy | LOW-MEDIUM | Add boot-time catch-up logic to detect and immediately fire any reminder that should have triggered during downtime; backfill a "missed reminder" log entry so the user sees what was missed rather than nothing |
| Microservices boundary discovered to have leaked (Next.js touching DB directly) | MEDIUM-HIGH | Refactor offending routes to proxy through the Express Backend before the next milestone review; this is a grading-relevant fix, prioritize over feature work if discovered |
| Groq free tier exhausted mid-development | LOW | Apply for Groq Developer tier (10x limits) or add request queueing/throttling; in the worst case, reduce AI call frequency (e.g., anomaly LLM-assist only on rule-flagged events, not every save) |
| At-rest encryption gap discovered late (e.g., during Go-Live security audit) | MEDIUM | Add column-level encryption to the three named tables; requires a migration to encrypt existing data in place — budget time for this in Wk12-13 if not done earlier, since data migration under deadline is riskier than building it in from the start |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|---------------|
| iOS push requires Home Screen install first | Core Tracking & Reminder (Wk7) | Real iPhone test: install via Add to Home Screen, confirm permission prompt and notification delivery end-to-end |
| iOS push subscriptions expire silently | Core Tracking & Reminder (Wk7); telemetry hardening at Go-Live (Wk13) | Re-subscription logic fires on every app open; `last_subscription_confirmed_at` tracked and surfaced if stale |
| In-process cron silently stops on restart | Core Tracking & Reminder (Wk7) | Deliberately restart backend mid-day during QA; confirm reminders still fire and missed ones are caught up |
| AI output drifts into diagnostic/alarming language | AI & Community Features (Wk10) | Manual review of AI output against edge-case test set by someone with caregiving experience, per Design Consideration 7.4 |
| Anomaly detection false positives/negatives untracked | AI & Community Features (Wk10), data model locked in Core Tracking (Wk7) | Feedback field wired to real UI; Milestone 4's "3 correct scenarios" test explicitly exercised against rule thresholds |
| Microservices boundary collapses into a disguised monolith | Design & Mockup (Wk4) for contract definition; Core Tracking (Wk7) for first audit | Code review confirms no Frontend route touches DB/Groq directly; REST contract documented and followed |
| At-rest encryption is disk-only, not column-level | Core Tracking & Reminder (Wk7) | Security audit (Go-Live, Wk13) explicitly checks column-level encryption presence for fluid_log/medication_log/lab_result, not just TLS/disk |
| Groq free-tier limits exceeded under realistic load | AI & Community Features (Wk10) | Load test AI call volume against documented Groq RPD/RPM before Milestone 4 sign-off; full k6 load test at Go-Live (Wk13) per NFR-01 |
| Caregiver multi-device push silently breaks | Core Tracking & Reminder (Wk7) | Manual test with two physical devices logged into the same account simultaneously |

## Sources

- [PWA on iOS - Current Status & Limitations for Users [2025]](https://brainhub.eu/library/pwa-on-ios) — iOS Push API gated behind Home Screen install
- [PWA iOS Limitations and Safari Support [2026]](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — Notification.requestPermission() click-handler restriction
- [Apple Developer Documentation: Sending web push notifications in web apps and browsers](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers) — official VAPID subject requirement
- [PWA Push Notifications on iOS in 2026: What Really Works](https://webscraft.org/blog/pwa-pushspovischennya-na-ios-u-2026-scho-realno-pratsyuye?lang=en) — subscription expiry behavior on iOS
- [Apple Developer Forums: When do web push notification subscriptions expire on iOS?](https://developer.apple.com/forums/thread/727372) — missing expirationTime, pushsubscriptionchange behavior
- [Apple Developer Forums: PWA push notifications on iOS](https://developer.apple.com/forums/thread/732594) — subscription cancellation if Service Worker doesn't display notification
- [A longitudinal analysis of declining medical safety messaging in generative AI models | npj Digital Medicine](https://www.nature.com/articles/s41746-025-01943-1) — disclaimer rate decline 2022-2025
- [Can Medical AI Lie? Large Study Maps How LLMs Handle Health Misinformation | Mount Sinai](https://www.mountsinai.org/about/newsroom/2026/can-medical-ai-lie-large-study-maps-how-llms-handle-health-misinformation) — LLM behavior under health misinformation scenarios
- [Boosting Your Anomaly Detection With LLMs | Towards Data Science](https://towardsdatascience.com/boosting-your-anomaly-detection-with-llms/) — false positive challenges in anomaly detection
- [The Microservices Backlash: Over-Engineering or Misunderstood Architecture? - DEV Community](https://dev.to/aryanmehrotra/the-microservices-backlash-over-engineering-or-misunderstood-architecture-51bm) — <5% of apps benefit from microservices
- [Monolithic vs microservices architecture: When to choose each approach](https://getdx.com/blog/monolithic-vs-microservices/) — modular monolith guidance, deadline pressure risks
- [Scheduling tasks in Node.js using node-cron - LogRocket Blog](https://blog.logrocket.com/task-scheduling-or-cron-jobs-in-node-using-node-cron/) — node-cron single-process limitation
- [Kubernetes CronJobs silently fail more than you think - DEV Community](https://dev.to/krissv/kubernetes-cronjobs-silently-fail-more-than-you-think-2nb9) — silent cron failure patterns
- [Cron Job Monitoring Best Practices - QuietPulse Blog](https://quietpulse.xyz/blog/cron-job-monitoring-best-practices) — cron has no concept of success, monitoring needs
- [Groq API Free Tier Limits in 2026: What You Actually Get - Grizzly Peak Software](https://www.grizzlypeaksoftware.com/articles/p/groq-api-free-tier-limits-in-2026-what-you-actually-get-uwysd6mb) — free tier RPM/RPD figures
- [Rate Limits - GroqDocs](https://console.groq.com/docs/rate-limits) — official rate limit documentation
- [Groq Free Tier Limits 2026: 30 RPM, 6K TPM, 14.4K Req/Day - TokenMix Blog](https://tokenmix.ai/blog/groq-free-tier-limits-2026) — corroborating free tier figures
- [Is Groq Free Tier Good for AI Agents? Rate Limits vs. Speed Trade-offs Explained | BSWEN](https://docs.bswen.com/blog/2026-03-23-groq-free-tier-agentic-workflows/) — production viability concerns at scale
- [Railway vs Render 2026: Pricing & Speed Tested](https://thesoftwarescout.com/railway-vs-render-2026-best-platform-for-deploying-apps/) — free/hobby tier sleep and restart behavior
- [Cron Jobs | Railway Docs](https://docs.railway.com/cron-jobs) — Railway cron minimum interval, external scheduling requirement
- [PostgreSQL: Documentation: 18: 18.8. Encryption Options](https://www.postgresql.org/docs/current/encryption-options.html) — official encryption options reference
- [How to Encrypt PostgreSQL Data at Rest](https://oneuptime.com/blog/post/2026-01-21-postgresql-data-at-rest-encryption/view) — column-level vs full-disk encryption tradeoffs
- [Data Encryption in Postgres: A Guidebook | Crunchy Data Blog](https://www.crunchydata.com/blog/data-encryption-in-postgres-a-guidebook) — layered encryption approach guidance
- Project source: `PRD.md` (KidneyBuddy v0.12) sections 4.2, 4.3-4.5, 5.1-5.3, 7, 8, 9, 10
- Project source: `.planning/PROJECT.md` (KidneyBuddy project context, constraints, key decisions)

---
*Pitfalls research for: Health-adjacent PWA tracking app (CKD patient companion) with AI medical-adjacent content, iOS web push, mandatory microservices, time-critical reminders*
*Researched: 2026-06-24*
