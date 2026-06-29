# Plan 03-05 SUMMARY: Backend Lab Upload & Trend Queries

**Status**: ✅ COMPLETE
**Phase**: 3 (Activity Logging & Lab Results)
**Plan**: 03-05 — File upload for lab documents + trend data API
**Date**: 2026-06-28

## Deliverables

### Files Created

| File | Purpose |
|------|---------|
| `src/lib/uploadLab.ts` | Multer config for lab files: PDF/JPG/PNG, 10MB, UUID-based filenames |
| `src/test/labUploadTrend.test.ts` | 4 tests for upload + trend |

### Files Modified

| File | Change |
|------|--------|
| `src/repositories/labResult.repository.ts` | Added `findTrendData()` — date-range query with `sumber='manual'` filter, asc order |
| `src/services/labResult.service.ts` | Added `createUploadEntry()` + `getTrendData()` + `UploadResult`/`TrendPoint` types |
| `src/controllers/labResult.controller.ts` | Added `upload()`, `serveFile()`, `getTrend()` handlers + file serving logic |
| `src/routes/labResult.routes.ts` | Added POST `/upload` (multer), GET `/file/:fileId`, GET `/trend?parameter=&days=` |

## API Endpoints Added

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/lab/upload` | JWT | Upload PDF/JPG/PNG with `tanggalPemeriksaan` |
| GET | `/api/lab/file/:fileId` | JWT | Serve uploaded file (inline) |
| GET | `/api/lab/trend?parameter=X&days=30` | JWT | Trend data points ordered by date asc |

## Upload Flow (LAB-05)
1. Client sends multipart: `file` + `tanggalPemeriksaan`
2. Multer saves file to `/app/uploads/lab-files/` as `{uuid}.{ext}`
3. Controller extracts `fileId` (UUID without extension), calls `createUploadEntry`
4. Service inserts `lab_results` row with `sumber='upload'`, `namaParameter='Dokumen Lab'`, `nilai='(file)'`
5. Response returns file metadata (id, fileId, originalName, mimeType, fileSize)

## Trend Query (LAB-06)
- `GET /api/lab/trend?parameter=Kreatinin&days=90`
- Filters: `sumber='manual'`, `diarsipkan=false`, `tanggalPemeriksaan >= cutoff`
- Returns: `{ parameter, days, data: [{ tanggalPemeriksaan, nilai, satuan }] }`

## Test Results

```
# tests 13 (9 existing + 4 new)
# pass 13
# fail 0
```

## Infrastructure
- No new Docker volume needed — uses existing `uploads` volume at `/app/uploads/lab-files/`
- No new migration needed — existing `lab_results` schema supports `sumber`, `fileId`, `diarsipkan`
