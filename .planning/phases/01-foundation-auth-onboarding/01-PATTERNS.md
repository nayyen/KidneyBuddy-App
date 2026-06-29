# Phase 1: Foundation, Auth & Onboarding - Pattern Map

**Mapped:** 2026-06-25
**Files analyzed:** 24 (estimated new files implied by CONTEXT.md/REQUIREMENTS.md AUTH-01..06, ONBOARD-01..06)
**Analogs found:** 0 exact codebase analogs / 24 — this is a true greenfield phase. No prior application code exists. All "analogs" below are visual/structural references from `KidneyBuddy_Design/` (explicitly reference-only, not to be ported) plus the design tokens doc, per CONTEXT.md's `code_context` section.

## Important Caveat for the Planner

This codebase has **zero existing application code** (no `frontend/`, `backend/`, or `app/` directories yet — only `.planning/`, `.claude/`, and the reference-only `KidneyBuddy_Design/` Vite export). There is no Next.js project, no Express project, no database schema, no auth middleware anywhere in this repo today.

Consequently:
- **Backend files** (auth controllers, services, middleware, Drizzle schema, rate-limit store) have **no analog at all** — neither in this repo nor in `KidneyBuddy_Design/` (which is frontend-only, Vite, no backend). Build these from `.planning/research/STACK.md` conventions (Express 5, Drizzle ORM, Argon2id, JWT access + refresh, Postgres-backed rate-limit table) — there is nothing to copy structurally, only stack documentation to follow.
- **Frontend files** (registration/login/onboarding pages, shadcn primitives) have a **visual/structural reference only** in `KidneyBuddy_Design/src/app/` — this is a Vite + React export, NOT Next.js, and CONTEXT.md explicitly instructs: re-implement, do not port directly. Treat excerpts below as "build it to look/feel like this," not "copy this file."
- The shadcn/ui primitives in `KidneyBuddy_Design/src/app/components/ui/*` are themselves generated boilerplate (not custom app code) — they map almost 1:1 to what `npx shadcn@latest add <component>` will regenerate natively for Next.js. Treat these as confirmation of which shadcn components to add, and confirmation of class-naming/CVA conventions, not as files to copy.

## File Classification

| New/Modified File (typical Next.js/Express layout) | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/src/routes/auth.routes.ts` | route | request-response | none | no analog — greenfield |
| `backend/src/controllers/auth.controller.ts` | controller | request-response | none | no analog — greenfield |
| `backend/src/services/auth.service.ts` | service | CRUD | none | no analog — greenfield |
| `backend/src/middleware/authenticate.ts` (JWT verify) | middleware | request-response | none | no analog — greenfield |
| `backend/src/middleware/rateLimitLogin.ts` (Postgres-backed lockout, AUTH-04) | middleware | request-response | none | no analog — greenfield |
| `backend/src/db/schema/users.schema.ts` (Drizzle) | model | CRUD | none | no analog — greenfield |
| `backend/src/db/schema/loginAttempts.schema.ts` (Drizzle, AUTH-04 lockout tracking) | model | CRUD | none | no analog — greenfield |
| `backend/src/db/schema/passwordResetTokens.schema.ts` (AUTH-06) | model | CRUD | none | no analog — greenfield |
| `backend/src/db/schema/onboardingProgress.schema.ts` (ONBOARD-04 resume) | model | CRUD | none | no analog — greenfield |
| `backend/src/db/schema/therapyHistory.schema.ts` (ONBOARD-05 change history) | model | CRUD | none | no analog — greenfield |
| `backend/src/services/email.service.ts` (AUTH-06 reset link) | service | event-driven | none | no analog — greenfield |
| `backend/src/utils/passwordHash.ts` (Argon2id) | utility | transform | none | no analog — greenfield |
| `backend/src/utils/jwt.ts` (access + refresh sign/verify) | utility | transform | none | no analog — greenfield |
| `frontend/app/(auth)/register/page.tsx` | component | request-response | `KidneyBuddy_Design/src/app/components/ui/input.tsx`, `label.tsx`, `button.tsx` (primitives only) | visual-ref only |
| `frontend/app/(auth)/login/page.tsx` | component | request-response | same shadcn primitives | visual-ref only |
| `frontend/app/(auth)/login/_components/LockoutCountdown.tsx` (D-10 live timer) | component | event-driven (client interval) | none in design export | no analog — greenfield (new interaction not in Figma export) |
| `frontend/app/(auth)/forgot-password/page.tsx` (AUTH-06) | component | request-response | same shadcn primitives | visual-ref only |
| `frontend/app/(auth)/reset-password/[token]/page.tsx` (AUTH-06) | component | request-response | same shadcn primitives | visual-ref only |
| `frontend/app/onboarding/page.tsx` (wizard shell, D-06 step indicator) | component | request-response | `KidneyBuddy_Design/src/app/App.tsx` lines 590-702 (`Onboarding` function) | strong visual analog |
| `frontend/app/onboarding/_components/TherapySelectStep.tsx` (ONBOARD-02, D-02..D-05) | component | request-response | `KidneyBuddy_Design/src/app/App.tsx` lines 593-682 (therapy card list/selection) + `ui/accordion.tsx` (inline-expand pattern for D-02) | strong visual + structural analog |
| `frontend/app/onboarding/_components/FirstReminderStep.tsx` (ONBOARD-01/03, D-09) | component | request-response | none in design export (reminder UI not among the 5 built screens) | no analog — greenfield |
| `frontend/app/onboarding/_components/OnboardingSuccess.tsx` (D-08 auto-redirect animation) | component | event-driven | none in design export | no analog — greenfield |
| `frontend/app/onboarding/_components/StepProgress.tsx` (D-06 1/3 2/3 3/3 indicator) | component | request-response | `KidneyBuddy_Design/src/app/components/ui/progress.tsx` | role-match (generic shadcn Progress, adapt to discrete-step indicator) |
| `frontend/lib/validators/auth.schema.ts` (zod, AUTH-01) | utility | transform | none | no analog — greenfield (follow STACK.md zod + react-hook-form pairing) |
| `frontend/lib/hooks/useAuth.ts` (session/token state) | hook | request-response | none | no analog — greenfield |

## Pattern Assignments

### Backend files — no analog, follow STACK.md conventions

**Source:** `.planning/research/STACK.md`

There is no existing Express app, Drizzle schema, or middleware in this repo. Do not search further for backend analogs — none exist. Concrete conventions to follow (extracted from STACK.md, not from code):

- **Password hashing:** `argon2` package, `argon2id` variant, memory 19-64 MiB, iterations 2-3, parallelism 1.
- **Auth tokens:** JWT short-lived access token (held in client memory, never `localStorage`) + DB-tracked refresh token in `httpOnly`, `Secure`, `SameSite=Strict` cookie. ~30 day persistent login per CONTEXT.md Claude's Discretion.
- **Lockout (AUTH-04):** Postgres-backed `login_attempts` table keyed by `user_id`/`email`, checked manually in the auth controller — explicitly NOT `express-rate-limit`'s in-memory `MemoryStore` (resets on container restart, defeats the 15-min lockout). 5 fails / 10 min window -> 15 min lock, matches D-10/D-11 UX (live countdown, calm tone).
- **Validation:** `zod` schemas shared in spirit between frontend (`react-hook-form` + `@hookform/resolvers/zod`) and backend (never trust client validation alone for health data).
- **Password reset (AUTH-06):** time-limited (~1 hour), single-use token stored in a dedicated table, emailed link, per CONTEXT.md Claude's Discretion.

### `frontend/app/onboarding/page.tsx` (component, request-response)

**Analog:** `KidneyBuddy_Design/src/app/App.tsx` (`Onboarding` function, lines 590-702) — visual/structural reference only, do not port (Vite -> Next.js incompatible; this is a single flat screen in the export, but CONTEXT.md D-06 requires it become a 3-step wizard with progress indicator).

**Reference structure** (lines 620-643, top decorative header + scrollable body):
```tsx
<div className="flex flex-col h-full" style={{ background: CREAM }}>
  <div className="px-5 pt-14 pb-8 rounded-b-[40px]"
       style={{ background: `linear-gradient(160deg, ${TEAL} 0%, #1e8578 100%)` }}>
    {/* icon badge + H1 + subtitle, centered, white text */}
  </div>
  <div className="flex-1 overflow-y-auto px-5 pt-6 pb-10 space-y-3">
    {/* step content */}
  </div>
</div>
```
Use this gradient-header + scrollable-body shell as the per-step layout; add a `StepProgress` indicator (1/3, 2/3, 3/3 per D-06) between header and body, and a "Kembali" back button per D-07 (not present in the reference, since the export has no multi-step wizard).

**CTA button pattern** (lines 683-694) — disabled state until a selection is made:
```tsx
<button
  onClick={onDone}
  disabled={!selected}
  className="w-full mt-2 py-4 rounded-3xl text-white font-bold text-base transition-all duration-200 shadow-lg"
  style={{ background: selected ? `linear-gradient(135deg, ${TEAL}, #1e8578)` : "#d0d0d0" }}
>
  Lanjutkan
</button>
```
Reuse this disabled/enabled gradient-vs-gray pattern for "Lanjutkan" buttons at each wizard step, and for the ONE-reminder-required gate in `FirstReminderStep.tsx` (D-09: only one reminder type needs to be filled to enable "Lanjutkan").

### `frontend/app/onboarding/_components/TherapySelectStep.tsx` (component, request-response)

**Analog:** `KidneyBuddy_Design/src/app/App.tsx` lines 593-682 (therapy array + selectable card list) + `KidneyBuddy_Design/src/app/components/ui/accordion.tsx` (lines 1-67) for the inline-expand "Apa ini?" pattern (D-02).

**Therapy data shape reference** (lines 593-618):
```tsx
const therapies = [
  { id: "capd", name: "CAPD", full: "Continuous Ambulatory Peritoneal Dialysis",
    icon: "🫀", desc: "Dialisis peritoneal mandiri di rumah, 4x exchange per hari", color: TEAL },
  { id: "hemo", name: "Hemodialisis", full: "HD — Cuci Darah",
    icon: "🩸", desc: "Kunjungan rutin ke pusat dialisis, biasanya 3x per minggu", color: "#e74c7c" },
  { id: "transplant", name: "Transplantasi", full: "Pasca Cangkok Ginjal",
    icon: "💚", desc: "Pemantauan pascatransplantasi dan manajemen obat imunosupresan", color: AMBER },
];
```
Note: per `DESIGN_SYSTEM_KidneyBuddy_v3.md` (line 70-71), the canonical therapy identity colors are CAPD teal `#2a9d8f`, Hemodialisis amber `#ef9f27` (NOT the `#e74c7c` pink seen in this older export draft), Transplantasi purple per CONTEXT.md D-04 — use the design-system doc's colors, not the App.tsx draft's, where they conflict.

**Selectable card pattern** (lines 644-681) — selected-state border/background swap, checkmark circle:
```tsx
<button
  onClick={() => setSelected(t.id)}
  className="w-full rounded-3xl p-5 text-left transition-all duration-200 shadow-sm"
  style={{
    background: selected === t.id ? `${t.color}12` : "white",
    border: `2px solid ${selected === t.id ? t.color : "#f0f0f0"}`,
  }}
>
  {/* icon chip, name, full name in t.color, description, checkmark circle */}
</button>
```
Adapt this card shell for D-02's inline expand: on tap, instead of (or in addition to) selecting, the card grows downward to reveal the 1-2 sentence explanation (D-03) plus the per-therapy illustration (D-04). Use `accordion.tsx`'s `data-[state=open]:animate-accordion-down` / `data-[state=closed]:animate-accordion-up` CSS-driven expand/collapse mechanism (lines 56-63) as the animation primitive — Radix `Accordion` is the right Next.js component to wrap each therapy card in, rather than hand-rolling height animation.

### shadcn/ui primitives — confirm-only references

**Source:** `KidneyBuddy_Design/src/app/components/ui/{button,input,card,label,form,progress,accordion}.tsx`

These confirm which shadcn components to `npx shadcn@latest add` natively in the Next.js project (per STACK.md) and their CVA variant/size conventions:
- `button.tsx` (lines 7-35): variants `default|destructive|outline|secondary|ghost|link`, sizes `default|sm|lg|icon` — reuse this variant naming for all auth/onboarding CTAs.
- `input.tsx` (lines 5-19): single `Input` wrapping native `<input>` with `aria-invalid` destructive-ring styling baked in — pairs directly with `react-hook-form` + zod error states.
- `form.tsx` (lines 1-169): full `react-hook-form` + Radix `Label` wiring (`FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` reading `error.message`) — this is the exact pattern to use for registration/login/forgot-password forms per STACK.md's react-hook-form + zod resolver recommendation. `FormMessage` (lines 139-157) shows the convention: render `error.message` if present, else children, else null.
- `progress.tsx` (lines 8-29): Radix `Progress` with `transform: translateX(-${100-value}%)` fill — base for `StepProgress.tsx`, though D-06 needs discrete step dots/fractions (1/3, 2/3, 3/3) rather than a continuous bar; treat this as the underlying primitive only.
- `accordion.tsx`: see TherapySelectStep above.

## Shared Patterns

### Design tokens (colors, typography, spacing, radius)
**Source:** `DESIGN_SYSTEM_KidneyBuddy_v3.md`
**Apply to:** All frontend files in this phase (auth pages, onboarding wizard, shared layout)

- Background: cream `#FDF9F3` (line 10) — never pure white or blue background.
- Primary teal `#2a9d8f`, dark teal (gradient) `#1e8578`, light teal bg `#f0faf9` (lines 23-25).
- Amber accent `#ef9f27` (line 30, confirm exact hex in file body) — used for Hemodialisis therapy identity.
- Therapy identity colors (lines 68-71): CAPD teal `#2a9d8f`/bg `#f0faf9`/text `#1a2e2c`; Hemodialisis amber `#ef9f27`/bg `#fdf3e3`/text `#7a4c0a`; Transplantasi purple (see file body for exact hex, used per D-04).
- Typography (lines 108-133): Headings = "Plus Jakarta Sans" weight 700/800; Body = "DM Sans" weight 400/500. Never mix; never fall back to system sans-serif. H1/hero name 22-24px Plus Jakarta Sans 800; section title 13-14px PJS 700; body 10-12px DM Sans 400.
- Border radius and spacing scales: see lines 137-156 of the design system doc for exact spacing/radius tokens (cards 14-16px radius per line 202).
- No pure black (`#000000`) anywhere (line 15) — darkest text uses dark teal.

### Auth/security UX tone (D-10, D-11, D-12)
**Source:** CONTEXT.md decisions D-10/D-11/D-12 (no code analog — new UX pattern)
**Apply to:** `login/page.tsx`, `LockoutCountdown.tsx`, password reset flow

- Lockout state shows a live `mm:ss` countdown ("Coba lagi dalam 14:32"), reassuring/calm copy ("Demi keamanan akunmu, coba lagi dalam 15 menit ya"), not a stern security warning. No separate security-alert email/push on lockout for MVP — message lives only on the login page.

### Form validation pattern
**Source:** `KidneyBuddy_Design/src/app/components/ui/form.tsx` (structural reference) + STACK.md (zod + react-hook-form pairing)
**Apply to:** registration, login, forgot-password, reset-password forms

Use `react-hook-form` + `@hookform/resolvers/zod` + the `Form`/`FormField`/`FormItem`/`FormControl`/`FormMessage` composition shown in `form.tsx` lines 19-168, regenerated natively via shadcn CLI for Next.js (App Router/RSC-aware), not copied from the Vite export verbatim.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| All `backend/**` files | controller/service/model/middleware/utility | request-response / CRUD / event-driven | No backend code exists anywhere in the repo (KidneyBuddy_Design is frontend-only). Follow `.planning/research/STACK.md` conventions, not code analogs. |
| `LockoutCountdown.tsx` | component | event-driven | D-10's live countdown timer is a new interaction not present among the 5 pre-built Figma Make screens. |
| `FirstReminderStep.tsx` | component | request-response | Reminder-setting UI is not among the 5 already-designed screens in `KidneyBuddy_Design/`; build fresh per ONBOARD-01/03/D-09 using existing input/button primitives only. |
| `OnboardingSuccess.tsx` | component | event-driven | D-08's auto-redirecting success animation has no equivalent in the export (`onDone` callback exists but fires immediately on button click, not as a timed animation). |
| `forgot-password/page.tsx`, `reset-password/[token]/page.tsx` | component | request-response | AUTH-06 was added during Phase 1 discussion (gap-fix) — no corresponding screen was ever designed in the Figma Make export. Build using the same Input/Button/Form primitives as login/register. |

## Metadata

**Analog search scope:** Entire repository root (`.git`, `.claude`, `.planning`, `KidneyBuddy_Design`) — confirmed no `frontend/`, `backend/`, `src/` (outside `KidneyBuddy_Design`), or any other application code directory exists yet.
**Files scanned:** `KidneyBuddy_Design/src/app/App.tsx` (810 lines, Onboarding function read in full), `KidneyBuddy_Design/src/app/components/ui/{button,input,card,label,form,progress,accordion}.tsx`, `DESIGN_SYSTEM_KidneyBuddy_v3.md` (grep'd for color/typography/spacing sections), `.planning/research/STACK.md` (auth/backend conventions), `.planning/REQUIREMENTS.md` (AUTH-01..06, ONBOARD-01..06 definitions).
**Pattern extraction date:** 2026-06-25
