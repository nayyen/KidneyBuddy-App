# Plan 03-03 SUMMARY: Frontend Activity UI

**Status**: ✅ COMPLETE
**Phase**: 3 (Activity Logging & Lab Results)
**Plan**: 03-03 — Frontend components for activity tracking
**Date**: 2026-06-28

## Deliverables

### Files Created

| File | Purpose |
|------|---------|
| `components/aktivitas/KegiatanModuleInline.tsx` | Beranda card: 3 visual states (no activity / active / past end time) |
| `components/aktivitas/MulaiKegiatanSheet.tsx` | Bottom sheet wrapper for starting an activity |
| `components/aktivitas/MulaiKegiatanForm.tsx` | Form: namaKegiatan (max 100), estimasiSelesai (HH:mm), POST /api/activities |
| `components/aktivitas/FeelingsRatingSheet.tsx` | Post-completion sheet: 4 feelings in 2×2 grid + optional catatan + "Lewati" |
| `components/aktivitas/ActivityList.tsx` | Today's activities list for Catatan → Aktivitas tab |

### Files Modified

| File | Change |
|------|--------|
| `components/shell/AppShell.tsx` | Added state + event listeners for `activity:start` / `activity:complete` + rendered sheets |
| `components/shell/Sidebar.tsx` | Added "Mulai Kegiatan" amber-outlined button |
| `app/(app)/beranda/page.tsx` | Added `KegiatanModuleInline` at top + `activity:saved` listener |
| `app/(app)/catatan/page.tsx` | Enabled Aktivitas tab + rendered `ActivityList` |

## Custom Event Protocol

| Event | Payload | Effect |
|-------|---------|--------|
| `activity:start` | — | Opens `MulaiKegiatanSheet` |
| `activity:complete` | `{ id, namaKegiatan }` | Opens `FeelingsRatingSheet` |
| `activity:saved` | — | Refreshes all activity cards |

## States Covered

- **KegiatanModuleInline**: No activity (teal Play prompt) / Active within time (green clock) / Past end time (amber alert with duration)
- **ActivityList**: Activities grouped by status with Selesaikan button / Empty state: "Belum ada aktivitas hari ini"
- **FeelingsRatingSheet**: 4 options with emoji + colors / Optional catatan with char counter / Lewati button
