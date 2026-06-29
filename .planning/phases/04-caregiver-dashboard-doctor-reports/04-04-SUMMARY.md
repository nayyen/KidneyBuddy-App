# Wave 2 — Report Frontend (REPORT-02) Summary

**Phase:** 04-caregiver-dashboard-doctor-reports
**Plan:** 04-04
**Wave:** 2
**Status:** ✅ COMPLETE

## Tasks Completed

### Task 1: LaporanDateRangeSelector component
- ✅ `frontend/components/laporan/LaporanDateRangeSelector.tsx` — date range picker with 3 presets (7/30/90 days) + "Pilih Tanggal" custom toggle
- ✅ Built-in validation: end >= start, max 90-day range, max date = today
- ✅ Reports effective date range via `onChange(dari, sampai)` callback

### Task 2: `/laporan` generation screen
- ✅ `frontend/app/(app)/laporan/page.tsx` — report generation page with:
  - Date range selector via `LaporanDateRangeSelector`
  - Optional doctor note textarea (max 500 chars, char counter with color coding)
  - "Buat Laporan" button (disabled until valid date range selected, disabled style with `opacity-40`)
  - Navigates to `/laporan/preview?dari=X&sampai=Y&catatan=Z` on submit

### Task 3: 4 section components
- ✅ `frontend/components/laporan/sections/RingkasanCairan.tsx` — fluid summary (total in/out/balance grid), empty state with `Droplets` icon. Uses `laporan-section-card` class.
- ✅ `frontend/components/laporan/sections/KepatuhanObat.tsx` — medication adherence (percentage, progress bar, summary text). Uses `.adherence-metric-number` class for 20pt print targeting. Empty state with `Pill` icon.
- ✅ `frontend/components/laporan/sections/KondisiCAPD.tsx` — CAPD condition frequency (4 types: jernih/keruh/keruh_gumpalan/berdarah). Berdarah turns `#d4183d` when count > 0. Renders only for CAPD users.
- ✅ `frontend/components/laporan/sections/Anomali.tsx` — anomaly placeholder (Phase 4 D-09), shows static message with `AlertTriangle` icon. Ready for Phase 5 AI integration.

### Task 4: LaporanPreviewContent assembler
- ✅ `frontend/components/laporan/LaporanPreviewContent.tsx` — assembles full report:
  - Header block (Nama, Metode Terapi, Periode, Dibuat in `id-ID` locale)
  - Separator between header and content
  - Optional doctor note box (only when non-empty)
  - All 4 sections rendered in order (section 3 only for CAPD)
  - Uses `laporan-preview-content` class for print CSS targeting

### Task 5: `/laporan/preview` preview screen
- ✅ `frontend/app/(app)/laporan/preview/page.tsx` — print preview page:
  - Reads search params (`dari`, `sampai`, `catatan`)
  - Fetches `GET /api/report` via `authFetch`
  - "Cetak / Simpan PDF" button calls `window.print()`
  - Error state with "Muat Ulang Laporan" retry button
  - Loading state with "Memuat data laporan..." text
  - Auth guard redirects to `/login` if unauthenticated
  - **Suspense boundary fix**: Wrapped `useSearchParams()` component in `<Suspense>` to resolve Next.js prerendering error

### Task 6: Print CSS (`@media print`) — last remaining code task
- ✅ Added `@media print` block to `frontend/app/globals.css`:
  - `@page { size: A4 portrait; margin: 20mm 15mm }`
  - `[data-print-hidden="true"]` and `.no-print` display:none
  - Reset html/body/main backgrounds to white
  - `.laporan-section-card`: page-break-inside:avoid, 3px teal left border, 12pt padding
  - `.adherence-metric-number`: 20pt font size
  - Typography scale: body 11pt, h1 18pt, h2 13pt
  - Table styles: full width, 0.5pt #cccccc bottom borders
  - Color overrides for better print contrast
- ✅ Added `data-print-hidden="true"` data attribute to 4 shell components:
  - `Sidebar.tsx` — `<aside data-print-hidden="true">`
  - `TopBar.tsx` — `<header data-print-hidden="true">`
  - `MobileHeader.tsx` — `<header data-print-hidden="true">`
  - `AppShell.tsx` — `<nav data-print-hidden="true">` wrapping BottomNav+FAB

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| `LaporanDateRangeSelector.tsx` — date range with presets + validation | ✅ |
| `/laporan` page — generation screen with note + button | ✅ |
| RingkasanCairan, KepatuhanObat, KondisiCAPD, Anomali section components | ✅ |
| `LaporanPreviewContent.tsx` — report assembler | ✅ |
| `/laporan/preview` page — preview + print button | ✅ |
| `@media print` CSS in globals.css | ✅ |
| `data-print-hidden` on shell components | ✅ |
| Frontend build passes (Suspense boundary fix applied) | ✅ |

## Files Created

- `frontend/components/laporan/LaporanDateRangeSelector.tsx`
- `frontend/components/laporan/LaporanPreviewContent.tsx`
- `frontend/components/laporan/sections/RingkasanCairan.tsx`
- `frontend/components/laporan/sections/KepatuhanObat.tsx`
- `frontend/components/laporan/sections/KondisiCAPD.tsx`
- `frontend/components/laporan/sections/Anomali.tsx`
- `frontend/app/(app)/laporan/page.tsx`
- `frontend/app/(app)/laporan/preview/page.tsx`

## Files Modified

- `frontend/app/globals.css` — added `@media print` block
- `frontend/components/shell/Sidebar.tsx` — added `data-print-hidden`
- `frontend/components/shell/TopBar.tsx` — added `data-print-hidden`
- `frontend/components/shell/MobileHeader.tsx` — added `data-print-hidden`
- `frontend/components/shell/AppShell.tsx` — added `data-print-hidden` to bottom nav wrapper

## Build Verification

- `npx next build` — ✅ Compiled successfully, all pages (including `/laporan` and `/laporan/preview`) prerendered as static or dynamic as expected

## Next Steps

Phase 4 code complete. Update STATE.md, create VERIFICATION.md, and commit all changes.
