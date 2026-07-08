---
phase: quick-260708-ayj
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/components/lab/LabResultList.tsx
  - frontend/public/icons/icon-192.png
  - frontend/public/icons/icon-512.png
  - frontend/public/icons/icon-512-maskable.png
  - frontend/public/icons/badge-72.png
  - frontend/app/apple-icon.png
  - frontend/app/icon.png
  - frontend/public/manifest.json
autonomous: true
requirements: [QUICK-260708-AYJ]

must_haves:
  truths:
    - "Opening a lab file in production points the browser at the deployed API origin, not localhost:4000"
    - "PWA install icon, apple home-screen icon, and push notification icon/badge show the droplets brand mark, not a solid teal square"
  artifacts:
    - path: "frontend/components/lab/LabResultList.tsx"
      provides: "Lab file open using API_BASE"
      contains: "${API_BASE}/api/lab/file/"
    - path: "frontend/public/icons/icon-192.png"
      provides: "Branded 192px PWA icon"
    - path: "frontend/public/icons/icon-512-maskable.png"
      provides: "Branded maskable 512px icon"
    - path: "frontend/public/icons/badge-72.png"
      provides: "Branded transparent notification badge"
    - path: "frontend/app/apple-icon.png"
      provides: "iOS home-screen icon (Next.js file convention)"
  key_links:
    - from: "frontend/components/lab/LabResultList.tsx openFile"
      to: "NEXT_PUBLIC_API_URL"
      via: "API_BASE template literal"
      pattern: "\\$\\{API_BASE\\}/api/lab/file/"
---

<objective>
Fix the hardcoded `localhost:4000` lab-file URL so production opens files from the deployed API, and replace placeholder solid-teal PWA/push icons with the droplets brand mark. Frontend-only; deploys to Vercel on push to main (orchestrator handles the push).

Purpose: Lab file links are broken for every production user (unreachable localhost). Placeholder icons make the installed PWA and push notifications look unbranded.
Output: One-line source fix + regenerated icon PNGs + Next.js icon conventions, ready to commit.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@frontend/components/lab/LabResultList.tsx
@frontend/app/manifest.ts
@frontend/app/sw.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix hardcoded localhost lab-file URL</name>
  <files>frontend/components/lab/LabResultList.tsx</files>
  <action>In the `openFile` callback (~line 72), replace the hardcoded origin `http://localhost:4000` with the existing `API_BASE` constant (defined line 35 as `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"`). The line must become `const fileUrl = \`${API_BASE}/api/lab/file/${fileId}?token=${encodeURIComponent(accessToken)}\`;`. This is the only hardcoded occurrence (grep verified). Do NOT change API_BASE itself or any other line.</action>
  <verify>
    <automated>cd frontend && grep -n 'localhost:4000/api/lab/file' components/lab/LabResultList.tsx | grep -q . && echo FAIL || echo PASS; grep -q '\${API_BASE}/api/lab/file/' components/lab/LabResultList.tsx && echo URLOK</automated>
  </verify>
  <done>openFile builds the file URL from `${API_BASE}`; no `localhost:4000/api/lab/file` literal remains in the file.</done>
</task>

<task type="auto">
  <name>Task 2: Generate droplets brand icons and Next.js icon conventions</name>
  <files>frontend/public/icons/icon-192.png, frontend/public/icons/icon-512.png, frontend/public/icons/icon-512-maskable.png, frontend/public/icons/badge-72.png, frontend/app/apple-icon.png, frontend/app/icon.png</files>
  <action>Write a temporary one-off Node script in the scratchpad dir and run it from within `frontend/` (so `require("sharp")` resolves against frontend/node_modules — sharp is already installed). The script composes an SVG per output using the lucide "droplets" paths (paths: `M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z` and `M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97`) with `fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"` on the lucide 24x24 viewBox, then renders each PNG via `sharp(Buffer.from(svg)).png().toFile(...)`. Center the droplet group by wrapping the two paths in a `<g transform="translate(tx,ty) scale(s)">` computed so the 24-unit glyph fills the target fraction of the canvas.
    Outputs:
    - icon-192.png (192x192) & icon-512.png (512x512): full teal `#2a9d8f` background rect, white `#ffffff` strokes, droplet group ~58% of canvas, centered.
    - icon-512-maskable.png (512x512): same but droplet group ~45% of canvas (maskable safe zone; outer 10% may be cropped).
    - badge-72.png (72x72): white strokes on TRANSPARENT background (no bg rect; Android renders badge as alpha mask), droplet group ~60%.
    - frontend/app/apple-icon.png (180x180): same design as icon-192 (teal bg, white strokes) — Next.js file convention auto-emits the apple-touch-icon link so iOS home screen shows the logo.
    - frontend/app/icon.png (192x192): same design as icon-192 — Next.js file convention for favicon/browser tab (no app/icon or favicon convention currently exists, verified).
    Stroke width should scale with canvas so lines stay visible at 72px (e.g. render at the target size, not by upscaling a 24px raster). Delete the temporary script after running — do NOT commit it. Manifest (`app/manifest.ts`) and SW (`app/sw.ts` lines 139-140) already reference these exact paths, so no code changes are needed there.</action>
  <verify>
    <automated>cd frontend && node -e "const s=require('sharp');const fs=['public/icons/icon-192.png','public/icons/icon-512.png','public/icons/icon-512-maskable.png','public/icons/badge-72.png','app/apple-icon.png','app/icon.png'];Promise.all(fs.map(f=>s(f).metadata().then(m=>console.log(f,m.width+'x'+m.height,'alpha='+m.hasAlpha)))).then(()=>console.log('ALL_OK')).catch(e=>{console.error(e);process.exit(1)})"</automated>
  </verify>
  <done>All six PNGs exist at correct dimensions (192, 512, 512, 72, 180, 192); badge-72.png reports hasAlpha=true (transparent bg); the temporary generator script is not left in the repo tree.</done>
</task>

<task type="auto">
  <name>Task 3: Remove stale manifest.json and verify build</name>
  <files>frontend/public/manifest.json</files>
  <action>Delete `frontend/public/manifest.json` — it is a stale duplicate (old start_url "/", 2-icon list); the live manifest is served via `app/manifest.ts` at `/manifest.webmanifest`, and grep confirmed zero code references to the string "manifest.json" in frontend source. Then run a typecheck to confirm the Task 1 edit compiles.</action>
  <verify>
    <automated>cd frontend && test ! -f public/manifest.json && echo DELETED && npx tsc --noEmit && echo TSC_OK</automated>
  </verify>
  <done>public/manifest.json no longer exists; `npx tsc --noEmit` passes with no errors.</done>
</task>

</tasks>

<verification>
- `grep` shows no `localhost:4000/api/lab/file` literal; openFile uses `${API_BASE}`.
- All six icon PNGs render at correct dimensions; badge is transparent.
- `npx tsc --noEmit` passes.
- Only the intended files are staged (NEVER `git add -A` — repo has unrelated dirty files).
</verification>

<success_criteria>
- Lab file open uses the deployed API origin in production.
- Installed PWA icon, iOS home-screen icon, favicon, and push notification icon/badge show the droplets brand mark.
- Stale manifest.json removed; typecheck clean.
</success_criteria>

<output>
Create `.planning/quick/260708-ayj-fix-lab-file-link-localhost-icon-pwa-pus/260708-ayj-SUMMARY.md` when done.
</output>
