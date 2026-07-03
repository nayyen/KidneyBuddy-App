# Plan 03-02 SUMMARY: Activity End Reminder Cron

**Status**: ✅ COMPLETE
**Phase**: 3 (Activity Logging & Lab Results)
**Plan**: 03-02 — Cron job for activity end reminders
**Date**: 2026-06-28

## Deliverables

### Files Created

| File | Purpose |
|------|---------|
| `src/jobs/activityEndReminder.job.ts` | Cron job — finds activities past `estimasiSelesai`, sends positively-framed push "Masih Aktif · X menit lebih" |
| `src/test/activityEndReminder.job.test.ts` | 4 TDD tests: triggers push, skips within-time, skips reminded, multiple activities |

### Files Modified

| File | Change |
|------|--------|
| `src/jobs/scheduler.ts` | Added import + boot catch-up + every-minute cron for `dispatchActivityEndReminders` |

## Test Results

```
# tests 4
# pass 4
# fail 0
```

- ✅ Activity past `estimasiSelesai` triggers push with duration "lebih"
- ✅ Activity within `estimasiSelesai` does NOT trigger push
- ✅ Already-reminded activity does NOT trigger duplicate push
- ✅ Multiple past-due activities each get their own push

## Key Architecture Decisions

- **Window**: 24-hour lookback to catch missed activities after container restart
- **Deduplication**: `remindedAt` timestamp on `daily_activities` — only sends once per activity
- **Format**: `formatDuration()` produces "X menit", "X jam Y menit", or "X jam" (Indonesian)
- **Injectable**: `_dispatchActivityEndCore(now, { findDue, markSent, sendToAll })` for pure unit tests
