# Plan 03-01 SUMMARY: Backend Activity Foundation

**Status**: ✅ COMPLETE
**Phase**: 3 (Activity Logging & Lab Results)
**Plan**: 03-01 — Activity Backend (Schema → Repository → Service → Controller → Routes → Tests)
**Date**: 2026-06-27

## Deliverables

### Database
- ✅ `daily_activities` table created in PostgreSQL with 11 columns, 2 indexes, FK → users
- ✅ Migration `0006_even_butterfly.sql` generated and applied
- ✅ Table verified via `\d daily_activities`

### Files Created

| File | Purpose |
|------|---------|
| `src/db/schema/dailyActivity.schema.ts` | Drizzle ORM schema with pgTable, indexes, FK |
| `src/repositories/dailyActivity.repository.ts` | CRUD: insertActivity, findActiveByUser, findByDate, completeById, findDueForEndReminder |
| `src/services/activities.service.ts` | Business logic with injectable `_createActivityCore` / `_completeActivityCore` |
| `src/controllers/activities.controller.ts` | Thin handlers: create, list, getActive, complete |
| `src/routes/activities.routes.ts` | Authenticated routes: POST "/", GET "/", GET "/active", PATCH "/:id/complete" |
| `src/test/activity.service.test.ts` | 8 TDD tests covering schema validation, create, past-time rejection, complete with encryption |

### Files Modified

| File | Change |
|------|--------|
| `src/db/schema/index.ts` | Added `dailyActivities` export |
| `src/app.ts` | Added import + mount of `/api/activities` |

## Test Results

```
# tests 8
# pass 8
# fail 0
```

- ✅ Schema validation (4 tests): empty namaKegiatan, invalid format, missing field, valid payload
- ✅ `_createActivityCore` (2 tests): valid → berlangsung, past estimasi → rejected
- ✅ `_completeActivityCore` (2 tests): with feelings + encrypted catatan, skipped feelings → null

## Security
- T-03-01: All repository queries filter by userId (IDOR prevention)
- T-03-02: CatatanPerasaan encrypted via AES-256-GCM before INSERT (app-layer encryption)

## Next
- **Plan 03-02**: Activity end reminder cron job (`activityEndReminder.job.ts`)
- **Plan 03-03**: Frontend activity UI components
- **Plan 03-04**: Lab results backend (schema, service, controller, routes)
