# Phase 1: Foundation, Auth & Onboarding - Context

**Gathered:** 2026-06-25
**Status:** Ready for planning

<domain>
## Phase Boundary

New users (patients and caregivers sharing one account) can register, log in securely with account lockout protection, reset a forgotten password, and complete an interactive onboarding that selects their active therapy method (CAPD/HD/Transplantasi) and configures at least one first reminder — establishing the identity and modality foundation every later phase depends on. Includes changing therapy method later from profile settings and replaying the onboarding tutorial from Settings.

</domain>

<decisions>
## Implementation Decisions

### Scope correction (found during this discussion)
- **D-01:** Added `AUTH-06` to `.planning/REQUIREMENTS.md` and Phase 1 in `.planning/ROADMAP.md` — password reset via emailed link. This was missing from the initial requirements pass; without it, users who forget their password are permanently locked out (only soft-delete exists, no account recovery path). Already committed.

### "Apa ini?" therapy method explanation
- **D-02:** Presented as an inline expand — the therapy card grows downward to reveal the explanation in place. No modal/popover layer.
- **D-03:** Content is 1-2 short sentences per therapy method (e.g., "CAPD adalah cuci darah mandiri di rumah pakai cairan khusus, dilakukan 3-5x sehari."). Not structured bullet points — keeps onboarding inside the <5 minute target (Design Consideration 3).
- **D-04:** Includes the per-therapy illustration from the design system inside the expanded explanation (CAPD=teal, HD=amber, Transplantasi=purple, per `DESIGN_SYSTEM_KidneyBuddy_v3.md`).
- **D-05:** Tone is reassuring/calm, not purely clinical (e.g., "Banyak pasien CAPD menjalani ini dengan nyaman setelah terbiasa") — consistent with Design Consideration 4's calm-tone principle, applied here even though that consideration was originally written for AI alerts.

### Onboarding flow structure
- **D-06:** Onboarding is a step wizard with a visible progress indicator (1/3, 2/3, 3/3) across full-page steps — not a single continuous scroll. Chosen specifically for 50+ users to always know how many steps remain.
- **D-07:** A "Kembali" (back) button is available at every step so users can correct an earlier choice (e.g., wrong therapy method) without restarting onboarding from scratch.
- **D-08:** The final success state ("KidneyBuddy siap mendampingi kamu!") is a short 1-2 second animation that auto-redirects to the dashboard — no manual "Lanjut" button required.
- **D-09:** The first-reminder step (FR-PS-014 step 5) requires only ONE reminder type to be filled in to proceed (e.g., just medication, or just CAPD exchange) — not all relevant types. Additional reminders can be added later from the Pengingat page. This matches the PRD's "minimal satu pengingat" wording literally.

### Account lockout UX & tone
- **D-10:** During the 15-minute lockout, the user sees a live countdown timer ("Coba lagi dalam 14:32"), not a generic "try again later" message — removes ambiguity about how long to wait.
- **D-11:** Lockout messaging tone is reassuring/calm (e.g., "Demi keamanan akunmu, coba lagi dalam 15 menit ya"), not a standard stern security warning — consistent with the app's overall calm, non-panic voice (Design Consideration 4), extended here to security messaging.
- **D-12:** No additional email/push security notification on lockout for MVP. A plain message on the login page is sufficient; a security-alert email channel is deferred (not blocking for the 13-week academic timeline).

### Claude's Discretion
- **Caregiver role declaration at registration** — this gray area was raised but the user chose not to discuss it in depth. The `Pengguna` data entity has a `Role` field (Pasien/Caregiver/Content Manager) but the PRD's caregiver model is credential-sharing (one account, one row), not a separate caregiver registration flow. Default behavior for Phase 1: the registration form does NOT ask "are you the patient or a caregiver" — every account is created with `Role = Pasien` by default, since onboarding (therapy method selection) is framed as "your" therapy. A second person logging in with the same credentials from another device (the caregiver) does not change this field; they simply see the same account/dashboard. This is a sensible default consistent with PROJECT.md's "trusted family member, shared account" assumption — flag for revisit if real user testing surfaces a need to distinguish caregiver-initiated registration (e.g., a caregiver setting up the account on behalf of a non-tech-literate patient).
- **Session/token expiry duration** — not discussed; use a standard secure default (e.g., short-lived access token + longer-lived refresh token, ~30 days persistent login) per `.planning/research/STACK.md`'s auth recommendation. Not a vision-level decision the user needed to weigh in on.
- **Password reset token expiry and exact email copy** — implementation detail, follow standard practice (time-limited single-use token, e.g., 1 hour validity).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `PRD.md` — source of truth for all functional requirements; §5.1 (FR-PS-014, FR-PS-015) and §6.1 (Onboarding workflow with decision points/edge cases) cover this phase directly. §8.1 (Pengguna data entity) defines the User schema including the Role field discussed above.
- `.planning/REQUIREMENTS.md` — AUTH-01..06, ONBOARD-01..06 (the exact v1 requirements this phase must satisfy; AUTH-06 added during this discussion).
- `.planning/ROADMAP.md` — Phase 1 section: goal, success criteria, requirement list (mode: mvp).

### Visual & design system
- `DESIGN_SYSTEM_KidneyBuddy_v3.md` — verified-accurate extraction of the Figma Make export's `theme.css`. Defines color tokens (teal #2a9d8f / amber #ef9f27 / cream #fdf9f3), typography (Plus Jakarta Sans headings, DM Sans body), component specs (buttons, inputs, cards, badges), and per-therapy illustration colors referenced in D-04.
- `KidneyBuddy_Design/` — Figma Make Vite export. Reference ONLY for visual/structural patterns (the Onboarding screen is one of the 5 screens already designed there) — do NOT port this code directly; this phase rebuilds it fresh in Next.js.

### Technical research (this phase's risk areas)
- `.planning/research/STACK.md` — recommends Argon2id for password hashing, JWT (short-lived access + DB-tracked refresh) or session+connect-pg-simple for auth, Drizzle ORM for the schema.
- `.planning/research/PITFALLS.md` — flags microservices-boundary collapse as a risk to guard against starting in this very first phase (define the REST contract here, before feature pressure mounts).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No real application code exists yet — this is a greenfield first phase. `KidneyBuddy_Design/src/app/components/ui/*` (shadcn/ui primitives: button, input, dialog, etc.) can inform structural/prop patterns for the equivalent Next.js shadcn setup, but must be re-implemented, not copied (Vite → Next.js incompatibility).
- `KidneyBuddy_Design/src/app/App.tsx` includes an already-designed Onboarding screen (per `DESIGN_SYSTEM_KidneyBuddy_v3.md`'s note that 5 of 27 screens exist in the Figma export) — useful as a visual reference for layout when building the wizard steps (D-06).

### Established Patterns
- None yet in this codebase. The design system (colors, typography, spacing, border-radius, component specs) is the only "established pattern" to follow, since it was extracted from real, already-shipped Figma Make code.

### Integration Points
- N/A — this phase establishes the integration points (3-container REST boundary, auth endpoints) that all later phases will build on.

</code_context>

<specifics>
## Specific Ideas

- Lockout countdown timer copy example given during discussion: "Coba lagi dalam 14:32" / "Demi keamanan akunmu, coba lagi dalam 15 menit ya" (D-10, D-11) — use as tone reference for the actual microcopy, not necessarily verbatim final text.
- Therapy explanation copy example given during discussion: "CAPD adalah cuci darah mandiri di rumah pakai cairan khusus, dilakukan 3-5x sehari." / "Banyak pasien CAPD menjalani ini dengan nyaman setelah terbiasa." (D-03, D-05) — tone/length reference.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 1 scope. The one open question (caregiver role declaration at registration) was resolved as Claude's Discretion above rather than deferred to another phase, since it's a Phase 1 implementation detail, not a new capability.

</deferred>

---

*Phase: 1-foundation-auth-onboarding*
*Context gathered: 2026-06-25*
