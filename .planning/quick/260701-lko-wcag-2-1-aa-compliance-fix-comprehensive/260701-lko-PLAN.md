---
type: quick
plan: 260701-lko
autonomous: true
files_modified:
  - frontend/app/globals.css
  - frontend/components/beranda/DeltaCairanCard.tsx
  - frontend/components/catatan/FluidLogItem.tsx
  - frontend/components/catatan/FluidLogList.tsx
  - frontend/components/cairan/CatatCairanForm.tsx
  - frontend/components/cairan/FluidEditSheet.tsx
  - frontend/components/lab/LabEditSheet.tsx
  - frontend/components/aktivitas/ActivityList.tsx
  - frontend/app/(app)/laporan/page.tsx
  - frontend/components/laporan/LaporanPreviewContent.tsx
  - frontend/components/laporan/sections/RingkasanCairan.tsx
  - frontend/components/laporan/sections/KepatuhanObat.tsx
  - frontend/components/laporan/sections/KondisiCAPD.tsx

must_haves:
  truths:
    - "Minimum rendered font size across all screens is 14px (text-xs maps to 14px)"
    - "Body/paragraph text renders at 18px"
    - "No content text uses colors lighter than #3d6b66 on light/cream/gradient backgrounds"
    - "Fluid balance values in beranda DeltaCairanCard render at 36px"
    - "Form containers have minimum 24px (px-6) horizontal padding — inputs do not touch screen edges"
    - "Laporan section headers render at ≥20px, table data at ≥16px"
    - "Print CSS uses 12pt body, 16pt h1, 12pt h2, 10pt th/td — not the previous 11pt/13pt/9pt"
  artifacts:
    - path: "frontend/app/globals.css"
      provides: "Global font-size token overrides in @theme inline block; 18px html/body base; updated @media print typography"
    - path: "frontend/components/beranda/DeltaCairanCard.tsx"
      provides: "Beranda fluid balance card with spec-correct font sizes"
    - path: "frontend/components/catatan/FluidLogItem.tsx"
      provides: "Fluid log row with 16px time, 15px badges, 18px description/volume"
    - path: "frontend/components/aktivitas/ActivityList.tsx"
      provides: "Activity list with 18px date separator, 16px catatan textarea, dark foreground colors"
    - path: "frontend/components/laporan/LaporanPreviewContent.tsx"
      provides: "Laporan preview with 20px headers, 16px info text, dark secondary colors"
    - path: "frontend/components/laporan/sections/RingkasanCairan.tsx"
      provides: "Report section with dark table header text, 16px labels"
  key_links:
    - from: "frontend/app/globals.css"
      to: "all components using text-xs/text-sm/text-base/text-lg Tailwind classes"
      via: "--text-* CSS custom properties in @theme inline block"
      pattern: "--text-xs|--text-sm|--text-base"
---

<objective>
WCAG 2.1 AA compliance overhaul: raise all font sizes to meet minimum readability standards for
CKD patients (40+ age group) and ensure sufficient color contrast on all surfaces.

Purpose: Kidney disease patients are primary app users. Small text and light-colored labels on
cream/gradient backgrounds create real accessibility barriers. This is not cosmetic — it directly
affects medication safety and adherence tracking usability.

Output:
- Global font-size tokens (text-xs=14px through text-4xl=36px) propagated via globals.css
- 18px html/body base
- All hardcoded small inline font sizes in beranda, fluid log, activity, and report components upgraded
- Forms padded to px-6 minimum
- Report print CSS using print-safe sizes
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@frontend/app/globals.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Global CSS — font-size token system + body base + print scale</name>
  <files>frontend/app/globals.css</files>
  <action>
Edit `frontend/app/globals.css` with three changes:

**1. Update @theme inline block — add full font-size token set.**
In the existing `@theme inline { }` block (after the existing `--text-xs` and `--text-sm` lines),
replace those two lines and add the complete scale:

```
--text-xs:   14px;
--text-sm:   16px;
--text-base: 18px;
--text-lg:   20px;
--text-xl:   22px;
--text-2xl:  26px;
--text-3xl:  30px;
--text-4xl:  36px;
```

The `@theme inline` block already exists — do NOT add a second one. Insert these token lines
inside the existing block, replacing the two existing `--text-xs` and `--text-sm` lines.

**2. Update base styles — html font-size 16px → 18px.**
Change:
  `html { font-size: 16px; ... }`
To:
  `html { font-size: 18px; ... }`

Also add `line-height: 1.6;` to the `body { }` block (after `font-family`).

**3. Update @media print typography.**
Inside `@media print { }`, change the typography scale block:
- `body { font-size: 11pt; line-height: 1.4; }` → `body { font-size: 12pt; line-height: 1.4; }`
- `h1 { font-size: 18pt; }` → `h1 { font-size: 16pt; }`
- `h2 { font-size: 13pt; }` → `h2 { font-size: 12pt; }`
- `th, td { font-size: 9pt; }` → `th, td { font-size: 10pt; }`

Do NOT remove anything else from globals.css. Only change the four values listed above plus the
@theme inline token block.
  </action>
  <verify>
    <automated>grep -n "font-size: 18px" "/mnt/c/Users/ASUS/Documents/NAYLA_KULIAH/SEM 4/PSI/ProjectAkhir/KidneyBuddy_App/frontend/app/globals.css" | grep -q "html" && echo "PASS: html 18px found" || echo "FAIL: html 18px not found"</automated>
    <automated>grep -c "\-\-text-base: 18px" "/mnt/c/Users/ASUS/Documents/NAYLA_KULIAH/SEM 4/PSI/ProjectAkhir/KidneyBuddy_App/frontend/app/globals.css" | grep -q "^1$" && echo "PASS: --text-base 18px" || echo "FAIL: --text-base 18px missing"</automated>
  </verify>
  <done>
globals.css has html/body at 18px base; @theme inline contains all 8 font-size tokens
(xs=14px through 4xl=36px); @media print typography is 12pt/16pt/12pt/10pt.
  </done>
</task>

<task type="auto">
  <name>Task 2: Beranda + fluid log components — inline font-size and color fixes</name>
  <files>
    frontend/components/beranda/DeltaCairanCard.tsx,
    frontend/components/catatan/FluidLogItem.tsx,
    frontend/components/catatan/FluidLogList.tsx
  </files>
  <action>
**DeltaCairanCard.tsx** (`frontend/components/beranda/DeltaCairanCard.tsx`):

All text is on a teal gradient background — all uses of dark teal colors are correct; upgrade sizes only.

- Card title ("Keseimbangan Cairan Hari Ini"): `fontSize: 14` → `fontSize: 18`, add `fontWeight: 700`
- "Keseimbangan" label inside ring: `fontSize: 16` → `fontSize: 18`, color stays `#1a2e2c`, add `fontWeight: 600`
- Balance value (delta number): `fontSize: 20` → `fontSize: 36`, add `fontWeight: 700`
- "ml" unit: `fontSize: 16` → `fontSize: 18`, color stays `#1a2e2c`, add `fontWeight: 500`
- "Masuk: X · Keluar: X" subline: `fontSize: 14` → `fontSize: 18`, color stays `#1a2e2c`, add `fontWeight: 500`
- Loading / error text: `fontSize: 14` → `fontSize: 16`, error retry button: `fontSize: 13` → `fontSize: 16`

Also fix the "Coba Lagi" retry button which currently uses Tailwind class `text-xs` —
change to `text-sm` (= 16px with new scale) or use inline `fontSize: 16`.

**FluidLogItem.tsx** (`frontend/components/catatan/FluidLogItem.tsx`):

- Time label (HH:mm): `fontSize: 14` → `fontSize: 16`, add `fontWeight: 600`
- Type badge ("Masuk"/"Keluar"): `fontSize: 14` → `fontSize: 15`, add `fontWeight: 700`
  Color values are already WCAG-compliant (`#0d4a44` on teal bg, `#7a4c00` on amber bg) — keep as is
- Source text (sumber): `fontSize: 14` → `fontSize: 18`
- "Terlambat" badge: `fontSize: 12` → `fontSize: 14`, color `#3d6b66` on `#f3ede5` is acceptable — keep
- Catatan (note under source): `fontSize: 14` → `fontSize: 18`
- Volume number: `fontSize: 14` → `fontSize: 18`, add `fontWeight: 600`
- Volume satuan (ml/kg): `fontSize: 14` → `fontSize: 18`

**FluidLogList.tsx** (`frontend/components/catatan/FluidLogList.tsx`):

- Date header ("Rabu, 1 Juli 2026"): `fontSize: 13` → `fontSize: 18`, add `fontWeight: 700`,
  color `#3d6b66` → `#1a2e2c`
- Entry count footer ("3 catatan"): `fontSize: 13` → `fontSize: 16`, color `#3d6b66` stays acceptable
- Empty state heading: `fontSize: 14` → `fontSize: 18`, add `fontWeight: 700`
- Empty state subtext: `fontSize: 14` → `fontSize: 16`
- Error text: `fontSize: 14` → `fontSize: 16`
- Error retry button: `fontSize: 14` → `fontSize: 16`
  </action>
  <verify>
    <automated>grep -n "fontSize: 36" "/mnt/c/Users/ASUS/Documents/NAYLA_KULIAH/SEM 4/PSI/ProjectAkhir/KidneyBuddy_App/frontend/components/beranda/DeltaCairanCard.tsx" | grep -q "36" && echo "PASS: balance value 36px" || echo "FAIL: balance value not 36px"</automated>
    <automated>cd "/mnt/c/Users/ASUS/Documents/NAYLA_KULIAH/SEM 4/PSI/ProjectAkhir/KidneyBuddy_App/frontend" && npx tsc --noEmit --skipLibCheck 2>&1 | tail -5</automated>
  </verify>
  <done>
DeltaCairanCard shows balance value at 36px, "Keseimbangan" label at 18px, subline at 18px.
FluidLogItem shows time at 16px bold, source/catatan/volume at 18px.
FluidLogList date header at 18px bold dark (#1a2e2c).
TypeScript compiles without new errors.
  </done>
</task>

<task type="auto">
  <name>Task 3: Forms padding + ActivityList dark text + Laporan typography</name>
  <files>
    frontend/components/cairan/CatatCairanForm.tsx,
    frontend/components/cairan/FluidEditSheet.tsx,
    frontend/components/lab/LabEditSheet.tsx,
    frontend/components/aktivitas/ActivityList.tsx,
    frontend/app/(app)/laporan/page.tsx,
    frontend/components/laporan/LaporanPreviewContent.tsx,
    frontend/components/laporan/sections/RingkasanCairan.tsx,
    frontend/components/laporan/sections/KepatuhanObat.tsx,
    frontend/components/laporan/sections/KondisiCAPD.tsx
  </files>
  <action>
**CatatCairanForm.tsx** — form padding + input sizes:
- The `&lt;form&gt;` root element: add `px-6` to its className (`"space-y-4 sm:space-y-5 px-6"`)
- All `&lt;input&gt;` and `&lt;select&gt;` elements with `text-sm` in className: change to `text-base`
  (this includes volume input, date/time inputs, sumber select, kondisi select)
- Error message `&lt;p&gt;` elements with `text-xs text-destructive`: change `text-xs` → `text-sm`
  (error text should be 16px, not 14px)

**FluidEditSheet.tsx** — sheet content padding + input sizes:
- Find the `&lt;SheetContent&gt;` element and add `className="rounded-t-2xl px-6"` (add `px-6` to existing `rounded-t-2xl` class)
- All `&lt;input&gt;`, `&lt;select&gt;`, `&lt;textarea&gt;` elements with `text-sm` in className: change to `text-base`

**LabEditSheet.tsx** — sheet content padding + input sizes:
- `&lt;SheetContent side="bottom" className="rounded-t-2xl"&gt;` → add `px-6`:
  `className="rounded-t-2xl px-6"`
- All `&lt;input&gt;` and `&lt;textarea&gt;` elements: `text-sm` → `text-base`
- `SheetDescription` text is `text-sm` by default via shadcn — acceptable
- Error `&lt;p&gt;` with `text-xs`: change to `text-sm`
- Upload notice `&lt;p className="text-xs text-muted-foreground italic"&gt;`: `text-xs` → `text-sm`

**ActivityList.tsx** — date separator + catatan textarea + small text:
- Date separator `&lt;p className="text-xs font-sans font-semibold text-muted-foreground ..."&gt;`:
  Change to `className="text-base font-sans font-semibold text-[#1a2e2c] uppercase tracking-wider mb-1.5 px-1"`
  (text-xs → text-base, text-muted-foreground → text-[#1a2e2c])
- Edit catatan textarea `className="... font-sans text-xs rounded-lg ..."`:
  Change `text-xs` → `text-sm` (= 16px)
- Loading `&lt;p className="font-sans text-sm"&gt;`: stays text-sm (= 16px) — acceptable
- Activity name label in edit mode `className="font-sans text-[13px]"` on Tanggal/Estimasi labels:
  Change `text-[13px]` → `text-base` and change `text-muted-foreground` → `text-[#2d5a55]`
- PERASAAN_COLOR for "biasa": currently `"#7a8c8a"` — change to `"#2d5a55"` so the
  "biasa" button text has sufficient contrast on its light background when selected
- Empty state heading `fontSize: 14` → `fontSize: 18`, fontWeight 400 → 700
- Empty state subtext `fontSize: 13` → `fontSize: 16`
- Note card wrapper around catatan textarea: add `p-4` if not present

**laporan/page.tsx** — heading and form text sizes:
- Page heading `&lt;h1 className="text-sm font-bold text-[#1a2e2c]"&gt;`: `text-sm` → `text-xl`
- Subtitle paragraph `text-xs font-medium text-[#3d6b66]`: `text-xs` → `text-base`
- Doctor note label `text-xs font-medium text-[#1a2e2c]`: `text-xs` → `text-base`
- Doctor note textarea class includes `text-xs` and `md:text-sm`: replace both with `text-base`
  (the full textarea className is long — find the `text-xs` portion only and replace it)
- Character counter span `text-[13px]`: → `text-base`
- Loading state paragraph `text-xs font-medium`: `text-xs` → `text-base`

**LaporanPreviewContent.tsx** — report header block:
- Report title `&lt;h1 className="text-sm font-bold text-[#1a2e2c]"&gt;`: `text-sm` → `text-xl`
- Info block `&lt;div className="space-y-1 text-xs font-medium text-[#7a8c8a]"&gt;`:
  `text-xs` → `text-base`, `text-[#7a8c8a]` → `text-[#2d5a55]`
- Doctor note section label `text-[10px] font-bold text-[#1a2e2c]`: `text-[10px]` → `text-base`
- Doctor note content `text-xs font-medium text-[#1a2e2c]`: `text-xs` → `text-base`

**RingkasanCairan.tsx** — section typography:
- Section header `&lt;h2 className="text-sm font-bold text-[#1a2e2c]"&gt;`: `text-sm` → `text-xl`
- Empty state paragraph `text-sm font-bold text-[#1a2e2c]`: stays text-sm (= 16px) — acceptable
- Empty state subtext `text-xs font-medium text-[#7a8c8a]`: `text-xs` → `text-sm`, `text-[#7a8c8a]` → `text-[#2d5a55]`
- Summary card labels (`text-[10px] font-medium text-[#7a8c8a]` — "Total Masuk", "Total Keluar", "Selisih"):
  `text-[10px]` → `text-base`, `text-[#7a8c8a]` → `text-[#2d5a55]`
- Summary card values `text-sm font-bold text-[#1a2e2c]`: `text-sm` → `text-base` (= 16px) — acceptable
- "Rincian Harian" section label `text-[10px] font-bold text-[#7a8c8a]`:
  `text-[10px]` → `text-sm`, `text-[#7a8c8a]` → `text-[#2d5a55]`
- Table: class `text-xs` on the `&lt;table&gt;` element → change to `text-sm`
- Table header `th` elements with `text-[#7a8c8a]`: → `text-[#1a2e2c]`
- Balance selisih cell `text-[#7a8c8a]` (zero-balance): → `text-[#3d6b66]`

**KepatuhanObat.tsx** — section typography:
- Section header `&lt;h2 className="text-sm font-bold text-[#1a2e2c]"&gt;`: `text-sm` → `text-xl`
- Empty state subtext `text-xs font-medium text-[#7a8c8a]`: `text-xs` → `text-sm`, `text-[#7a8c8a]` → `text-[#2d5a55]`
- Adherence pct label `text-xs font-medium text-[#7a8c8a] mt-1` ("dosis terkonfirmasi"):
  `text-xs` → `text-sm`, `text-[#7a8c8a]` → `text-[#2d5a55]`
- Summary text `text-xs font-medium text-[#7a8c8a] text-center`:
  `text-xs` → `text-sm`, `text-[#7a8c8a]` → `text-[#2d5a55]`

**KondisiCAPD.tsx** — section header only:
- `&lt;h2 className="text-sm font-bold text-[#1a2e2c]"&gt;`: `text-sm` → `text-xl`
  (rest of the component can be inspected but main issue is the header size)

After all changes, run a grep audit:
```bash
grep -rn "text-\[10px\]\|text-\[#7a8c8a\]\|text-\[#7a8c8a\]" \
  frontend/components/laporan/ frontend/app/\(app\)/laporan/
```
Fix any remaining `text-[10px]` or `text-[#7a8c8a]` instances found in these files.
  </action>
  <verify>
    <automated>cd "/mnt/c/Users/ASUS/Documents/NAYLA_KULIAH/SEM 4/PSI/ProjectAkhir/KidneyBuddy_App/frontend" && npx tsc --noEmit --skipLibCheck 2>&1 | tail -10</automated>
    <automated>grep -rn "text-\[10px\]" "/mnt/c/Users/ASUS/Documents/NAYLA_KULIAH/SEM 4/PSI/ProjectAkhir/KidneyBuddy_App/frontend/components/laporan/" 2>/dev/null && echo "FAIL: text-[10px] still present in laporan" || echo "PASS: no text-[10px] in laporan components"</automated>
    <automated>grep -rn "text-\[#7a8c8a\]" "/mnt/c/Users/ASUS/Documents/NAYLA_KULIAH/SEM 4/PSI/ProjectAkhir/KidneyBuddy_App/frontend/components/laporan/" 2>/dev/null && echo "FAIL: inaccessible color #7a8c8a still present" || echo "PASS: no #7a8c8a in laporan components"</automated>
  </verify>
  <done>
Forms have px-6 horizontal padding — no inputs touch screen edges.
All form inputs use text-base (18px) for entered values.
ActivityList date separator shows at 18px bold dark (#1a2e2c).
Laporan section headers (h2) render at text-xl (22px).
Summary labels and table headers use #1a2e2c or #2d5a55 — no #7a8c8a instances remain.
Report print-preview typography passes WCAG AA minimum contrast requirements.
TypeScript compiles without new errors.
  </done>
</task>

</tasks>

<verification>
After all three tasks, run the following audit to confirm no remaining WCAG violations:

```bash
# 1. Confirm no remaining text-[10px] anywhere in frontend components
grep -rn "text-\[10px\]" \
  "/mnt/c/Users/ASUS/Documents/NAYLA_KULIAH/SEM 4/PSI/ProjectAkhir/KidneyBuddy_App/frontend/components/" \
  "/mnt/c/Users/ASUS/Documents/NAYLA_KULIAH/SEM 4/PSI/ProjectAkhir/KidneyBuddy_App/frontend/app/" \
  2>/dev/null | grep -v "node_modules" | grep -v ".next"

# 2. Confirm no remaining inaccessible muted gray on important text
grep -rn "text-\[#7a8c8a\]" \
  "/mnt/c/Users/ASUS/Documents/NAYLA_KULIAH/SEM 4/PSI/ProjectAkhir/KidneyBuddy_App/frontend/components/" \
  2>/dev/null | grep -v "node_modules"

# 3. Confirm the 18px root token is set
grep "font-size: 18px" \
  "/mnt/c/Users/ASUS/Documents/NAYLA_KULIAH/SEM 4/PSI/ProjectAkhir/KidneyBuddy_App/frontend/app/globals.css"

# 4. TypeScript compile check
cd "/mnt/c/Users/ASUS/Documents/NAYLA_KULIAH/SEM 4/PSI/ProjectAkhir/KidneyBuddy_App/frontend" && \
  npx tsc --noEmit --skipLibCheck 2>&1 | tail -5
```

Expected outcomes:
- No `text-[10px]` instances (was used for labels in laporan sections — fully replaced)
- No `text-[#7a8c8a]` instances in components (inaccessible ~3.3:1 contrast on cream)
- `font-size: 18px` found in globals.css html rule
- TypeScript: 0 new errors introduced
</verification>

<success_criteria>
- html base font-size = 18px; Tailwind tokens xs=14px, sm=16px, base=18px, lg=20px, xl=22px, 2xl=26px, 3xl=30px, 4xl=36px
- DeltaCairanCard balance value renders at 36px bold
- All form inputs (CatatCairan, FluidEdit, LabEdit) use text-base (18px)
- All form containers have px-6 (24px) minimum horizontal padding
- ActivityList date group headers are 18px bold #1a2e2c
- Laporan section h2 headers are text-xl (22px)
- No text-[10px] or text-[#7a8c8a] in laporan components
- Print CSS: 12pt body, 16pt h1, 12pt h2, 10pt table cells
- No new TypeScript errors
</success_criteria>

<output>
Create `.planning/quick/260701-lko-wcag-2-1-aa-compliance-fix-comprehensive/260701-lko-SUMMARY.md` when done.
</output>
