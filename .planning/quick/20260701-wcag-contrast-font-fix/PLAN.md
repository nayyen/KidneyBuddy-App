---
slug: wcag-contrast-font-fix
status: complete
date: 2026-07-01
---

# WCAG 2.1 AA Contrast & Font Size Fix

Fix failing contrast ratios and minimum font sizes across all screens.

## Changes Made

### FIX 1 — globals.css
- html { font-size: 16px } explicit base
- --color-muted-foreground: #7a8c8a → #3d6b66 (~5.6:1 on cream ✓)
- --text-xs: 0.8125rem (13px), --text-sm: 0.9375rem (15px) via @theme override

### FIX 2 — Badge Text Colors (WCAG AA)
- FluidLogItem: "Masuk" badge text → #0d4a44, "Keluar" badge text → #7a4c00
- PengingatBerikutnyaCard, MedicationLogItem, ObatCard: teal badge text → #0d4a44
- ActivityList status badge: #2a9d8f → #0d4a44 on teal bg

### FIX 3 — Ring Chart (DeltaCairanCard)
- "Keseimbangan" and "ml" labels: rgba(255,255,255,0.8) → #1a2e2c, 16px
- Masuk/Keluar subline: #7a8c8a → #1a2e2c, 14px
- No-data delta color: #7a8c8a → #3d6b66

### FIX 4 — Global #7a8c8a → #3d6b66 replacement
All inline style `color: "#7a8c8a"` and Tailwind `text-[#7a8c8a]` instances replaced
with `#3d6b66` across: aktivitas, beranda, catatan, lab, pengingat, push, laporan pages.

### FIX 5 — Font sizes
- Inline fontSize: 8/9/10/11 → 13 minimum across all components
- Inline fontSize: 12 → 14 for badge/label text
- text-[10px], text-[11px] → text-[13px]

## Contrast Verification
- #1a2e2c on #fdf9f3: ~14:1 ✓
- #3d6b66 on #fdf9f3: ~5.6:1 ✓ (>4.5:1 AA)
- #0d4a44 on #f0faf9: ~7.5:1 ✓
- #7a4c00 on #fdf3e3: ~6.2:1 ✓
