---
phase: quick-260707-aas
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/src/utils/cookies.ts
  - backend/src/controllers/auth.controller.ts
  - backend/src/app.ts
autonomous: true
requirements: [DEPLOY-PROD-CROSS-DOMAIN]
must_haves:
  truths:
    - "In production the refresh-token cookie is sent cross-site from vercel.app to railway.app (sameSite none + secure)"
    - "In dev the refresh-token cookie behavior is unchanged (sameSite strict, non-secure, localhost)"
    - "Logout clears the same cookie it set (option shapes match so the browser removes it)"
    - "In production CORS allows the origin from FRONTEND_URL env, falling back to the hardcoded vercel.app URL if unset"
  artifacts:
    - path: backend/src/utils/cookies.ts
      provides: "Single source of truth for refresh-token cookie options"
      contains: "sameSite"
    - path: backend/src/controllers/auth.controller.ts
      provides: "register/login set + logout clear via shared cookie options"
    - path: backend/src/app.ts
      provides: "CORS origin derived from FRONTEND_URL in production"
  key_links:
    - from: backend/src/controllers/auth.controller.ts
      to: backend/src/utils/cookies.ts
      via: "import shared cookie options"
      pattern: "cookies"
---

<objective>
Prepare the backend for cross-domain production deployment (Vercel frontend + Railway backend) so authentication works over the internet, not just localhost.

Two changes:
1. Refresh-token cookie must use `sameSite: "none"` in production (so the cross-site cookie vercel.app -> railway.app is actually sent by the browser) while keeping `sameSite: "strict"` in dev. All three cookie call sites (register set, login set, logout clear) must use one shared, consistent options object.
2. CORS `origin` in production must read `FRONTEND_URL` from env, falling back to the existing hardcoded `https://kidneybuddy.vercel.app` when `FRONTEND_URL` is empty.

Purpose: Without `sameSite: "none"` the refresh cookie is silently dropped across domains, breaking token refresh and effectively logging users out. Reading `FRONTEND_URL` makes the deployment portable without code edits.

Output: New `backend/src/utils/cookies.ts` helper, refactored `auth.controller.ts`, and updated CORS in `app.ts`.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@backend/src/controllers/auth.controller.ts
@backend/src/app.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create shared refresh-cookie options helper and apply to all three call sites</name>
  <files>backend/src/utils/cookies.ts, backend/src/controllers/auth.controller.ts</files>
  <action>
Create `backend/src/utils/cookies.ts` exporting a single source of truth for the refresh-token cookie options. Define a boolean `isProduction = process.env.NODE_ENV === "production"`. Export `refreshCookieOptions` (used by `res.cookie`) with fields: `httpOnly: true`, `secure: isProduction`, `sameSite: isProduction ? "none" : "strict"`, `path: "/api/auth"`, `maxAge: 30 * 24 * 60 * 60 * 1000` (30 days). Also export `clearRefreshCookieOptions` containing the SAME fields EXCEPT `maxAge` — `res.clearCookie` only matches on name/path/sameSite/secure/httpOnly, so these must stay identical to the set options or the browser will not remove the cookie. Prefer deriving `clearRefreshCookieOptions` from `refreshCookieOptions` (e.g. omit `maxAge`) to keep them provably consistent. Type the `sameSite` value so TypeScript accepts it as an Express `CookieOptions` field (import `type CookieOptions` from "express" and annotate the exports) — a bare string literal will otherwise widen to `string` and fail the build.

Rationale for `sameSite: "none"` in production: a cross-site cookie (vercel.app front end calling railway.app backend) is only transmitted when `SameSite=None; Secure`. `secure` is already `true` in production (satisfying the None+Secure browser requirement), so this is consistent. Dev keeps `strict` + non-secure because localhost front and back share origin semantics.

Then edit `backend/src/controllers/auth.controller.ts`:
- Import the options: `import { refreshCookieOptions, clearRefreshCookieOptions } from "../utils/cookies.js";` (note the `.js` extension — this project uses ESM/NodeNext import specifiers).
- In `register` (currently lines ~13-19) replace the inline options object in `res.cookie("refreshToken", result.refreshToken, {...})` with `res.cookie("refreshToken", result.refreshToken, refreshCookieOptions)`.
- In `login` (currently lines ~60-66) do the same, using `refreshCookieOptions`.
- In `logout` (currently lines ~119-124) replace the inline options in `res.clearCookie("refreshToken", {...})` with `res.clearCookie("refreshToken", clearRefreshCookieOptions)`.
Do not leave any inline `sameSite: "strict"` refresh-token cookie literals behind — all three sites must route through the helper.
  </action>
  <verify>
    <automated>cd backend && grep -rn "sameSite" src/controllers/auth.controller.ts | grep -c "strict\|none" | grep -qx 0 && echo "OK: no inline sameSite literals remain in controller"</automated>
  </verify>
  <done>backend/src/utils/cookies.ts exists exporting refreshCookieOptions (sameSite none in prod, strict in dev) and clearRefreshCookieOptions (same shape minus maxAge); register, login, and logout all use the shared options; no inline refresh-cookie sameSite literals remain in the controller.</done>
</task>

<task type="auto">
  <name>Task 2: Read CORS origin from FRONTEND_URL in production with hardcoded fallback</name>
  <files>backend/src/app.ts</files>
  <action>
In `backend/src/app.ts`, update the `cors({...})` config (currently around lines 34-41). Replace the production branch of `origin` so that in production it uses `process.env.FRONTEND_URL` when set, falling back to `"https://kidneybuddy.vercel.app"` when it is empty/undefined. Keep the dev branch as `["http://localhost:3000"]` and keep `credentials: true` unchanged.

Concretely: compute `origin: process.env.NODE_ENV === "production" ? [process.env.FRONTEND_URL || "https://kidneybuddy.vercel.app"] : ["http://localhost:3000"]`. Using `||` (not `??`) so an empty-string `FRONTEND_URL` also triggers the fallback. `FRONTEND_URL` already exists in docker-compose.yml and .env (used by email.service.ts for links), so reusing it is consistent — do not introduce a new env var name.
  </action>
  <verify>
    <automated>cd backend && grep -q "FRONTEND_URL" src/app.ts && grep -q "kidneybuddy.vercel.app" src/app.ts && echo "OK: CORS reads FRONTEND_URL with hardcoded fallback"</automated>
  </verify>
  <done>CORS origin in production resolves from FRONTEND_URL with a fallback to https://kidneybuddy.vercel.app; dev origin and credentials: true are unchanged.</done>
</task>

</tasks>

<verification>
Run the backend TypeScript build to confirm both edits compile with correct CookieOptions typing and ESM import specifiers:
`cd backend && npm run build`
Expect a clean `tsc` exit (no type errors on the new helper or its imports).
</verification>

<success_criteria>
- backend/src/utils/cookies.ts is the single source for refresh-token cookie options.
- Production: refresh cookie is sameSite "none" + secure (cross-site delivery works); dev: sameSite "strict", unchanged.
- register/login set and logout clear the cookie via the shared options (matching shapes).
- Production CORS origin comes from FRONTEND_URL with the vercel.app hardcoded fallback; credentials: true retained.
- `npm run build` in backend passes with no type errors.
</success_criteria>

<output>
Create `.planning/quick/260707-aas-siapkan-backend-untuk-deployment-produks/260707-aas-SUMMARY.md` when done.
</output>
