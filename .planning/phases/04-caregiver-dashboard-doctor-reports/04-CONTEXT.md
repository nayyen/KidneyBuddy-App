# Phase 4: Caregiver Dashboard & Doctor Reports - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Caregivers can log in on a separate device using the same patient account credentials and see an identical dashboard with all tracking data in real time (synchronized via polling), receiving a push notification when a reminder schedule is changed from another device. Patients can generate a print-ready doctor-visit report that summarizes fluid in/out, medication adherence, CAPD condition frequency, and an anomaly placeholder — with an optional free-text note added before showing the doctor.

</domain>

<decisions>
## Implementation Decisions

### Real-Time Sync (CAREGIVER-02)

- **D-01:** Sync mechanism is **short-interval polling** — frontend polls `GET /api/reminders` every 30 seconds. Max "real-time" lag = 30 seconds. Fits within the 3-container constraint (no Redis or WebSocket server added). Same pattern already used in `KegiatanModuleInline` (`setInterval`).
- **D-02:** Detecting changes: use existing `updated_at` timestamp on `reminder_schedule` rows. Frontend compares `max(updated_at)` from the last poll response; if changed, it re-fetches and shows a notification. No new DB column needed.
- **D-03:** Notification to the non-updating device is **push notification (VAPID) + in-app Sonner toast**. When one device saves a reminder change, backend sends a VAPID push to all OTHER push subscriptions for the same `user_id` (same fan-out pattern as `sendToAllDevices` minus the originating subscription). The in-app toast appears on next poll cycle. Push notification copy: "Jadwal pengingat diperbarui dari perangkat lain." (title: "Pengingat Diperbarui").

### Doctor Report Format (REPORT-01, REPORT-02)

- **D-04:** Format is a **print-friendly webpage** — a dedicated route (e.g., `/laporan/preview`) with CSS `@print` media queries. User taps "Cetak / Simpan PDF" and the browser's native print dialog handles PDF generation. No server-side PDF library needed. Dokter bisa lihat di layar pasien atau minta hardcopy.
- **D-05:** Date range selection uses **preset + custom**: presets "7 hari", "30 hari", "3 bulan" plus a custom date-from/date-to picker. Same UX pattern as `LabTrendChart` (Phase 3).
- **D-06:** REPORT-02 optional note is written **in the preview page UI** (textarea before/after the report preview). Note text appears in the printed report but is NOT persisted to the database — held in component state only. This avoids a new `doctor_reports` entity and keeps Phase 4 scope minimal.
- **D-07:** Report sections (per REPORT-01): (1) Ringkasan Cairan — fluid in/out summary per day in date range, daily balance; (2) Kepatuhan Obat — medication adherence % (confirmed / total expected doses); (3) Kondisi CAPD — frequency count of each effluen condition (jernih/keruh/berdarah), only shown for CAPD patients; (4) Anomali Terdeteksi — placeholder section (see D-09).

### Caregiver Identity & Role (CAREGIVER-01)

- **D-08:** **No role distinction needed.** Caregiver and patient share one account — the dashboard is identical by definition. No role badge, no role-switching UI, no self-declaration. `users.role` field is not used in Phase 4. CAREGIVER-01 is satisfied automatically because both devices see the same data. Phase 4 focus is the real-time sync and report features.

### Anomaly Section in Report (Phase 5 dependency)

- **D-09:** Section anomali di laporan menampilkan **placeholder** untuk Phase 4: "Deteksi anomali akan tersedia setelah fitur AI diaktifkan." Section header tetap ada (layout siap untuk Phase 5), tapi tidak ada data anomali ditampilkan. Phase 5 tinggal replace placeholder dengan data nyata dari `anomaly_alerts` table.

### Claude's Discretion

- Exact report layout/typography — planner decides. Must be print-friendly (no dark backgrounds, sufficient contrast, readable font size ≥ 12pt for print).
- Polling implementation detail — use `setInterval(30000)` in a `useEffect` on the Pengingat page; clear on unmount.
- Which push subscription receives the "reminder updated" push — all subscriptions for `user_id` EXCEPT the one that made the change (identify by device endpoint or use `sendToAllDevices` blindly — acceptable since the updating device will also re-fetch via poll and can suppress toast if it was the originator).
- Medication adherence calculation: (confirmed medication logs / total scheduled doses in range) × 100%. If no reminders in range, show "Tidak ada data."

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope
- `.planning/REQUIREMENTS.md` — CAREGIVER-01, CAREGIVER-02, REPORT-01, REPORT-02 (exact v1 requirements this phase satisfies)
- `.planning/ROADMAP.md` — Phase 4 section: goal, success criteria (4 items), requirement list
- `PRD.md` §5.1 — FR-CG-001 (caregiver dashboard parity), FR-CG-002 (real-time reminder sync); no explicit Report FR but described in §4.1 scope

### Visual & design system
- `DESIGN_SYSTEM_KidneyBuddy_v3.md` — print typography, color tokens; NOTE: print CSS must override dark backgrounds to white/cream

### Phase 2 artifacts (sync + push infrastructure)
- `.planning/phases/02-fluid-medication-tracking-with-reminders/02-CONTEXT.md` — D-09 (desktop sidebar layout), D-07/D-08 (responsive layout breakpoints); reminder_schedule schema
- `backend/src/services/notification.service.ts` — `sendToAllDevices(userId, payload)` fan-out; reuse for CAREGIVER-02 push
- `backend/src/lib/webPushClient.ts` — VAPID push dispatch
- `backend/src/db/schema/reminderSchedule.schema.ts` — `updated_at` timestamp column (verify exists; used for change detection D-02)
- `backend/src/jobs/scheduler.ts` — existing cron infrastructure; no new cron needed for Phase 4

### Phase 3 artifacts (patterns to reuse)
- `.planning/phases/03-activity-logging-lab-results/03-CONTEXT.md` — D-09 (single parameter chart pattern), date range preset pattern
- `frontend/components/lab/LabTrendChart.tsx` — date range selector UX (7d/30d/3m presets); Phase 4 report date range follows same pattern
- `frontend/app/(app)/catatan/page.tsx` — setInterval + authFetch polling pattern for polling

### Backend data sources for report
- `backend/src/db/schema/fluidLog.schema.ts` — fluid in/out data
- `backend/src/db/schema/medicationLog.schema.ts` — medication confirmation data
- `backend/src/db/schema/dailyActivity.schema.ts` — activity data (may be included in report future, not REPORT-01)

### Technical constraints
- `CLAUDE.md` — 3-container constraint (no Redis/WebSocket server); AES-256-GCM for encrypted fields; JWT auth on all routes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/src/services/notification.service.ts` — `sendToAllDevices(userId, payload)`: reuse directly for CAREGIVER-02 push when reminder is updated
- `frontend/lib/api.ts` — `authFetch`: all Phase 4 API calls use this
- `frontend/components/lab/LabTrendChart.tsx` — date range preset selector pattern (7d/30d/3m/all); reuse concept for report date range
- `frontend/app/(app)/beranda/page.tsx` — dashboard card composition; Phase 4 doesn't change this (CAREGIVER-01 = same dashboard = nothing to add)
- `frontend/app/(app)/pengingat/page.tsx` — home for polling setInterval (30s poll for CAREGIVER-02)

### Established Patterns
- **Polling via setInterval**: `KegiatanModuleInline.tsx` and `beranda/page.tsx` — `setInterval(fn, interval)` in `useEffect` with cleanup `clearInterval`. Phase 4 uses same pattern on pengingat page.
- **Layered backend**: Route → Controller → Service → Repository — Phase 4 adds `/api/report` endpoint following same pattern
- **Form pattern**: react-hook-form + zod + shadcn Form — report date range form follows same
- **WIB timezone**: all date queries use `Date.now() + 7*3600*1000` for WIB-aware filtering

### Integration Points
- `backend/src/app.ts` — mount new `/api/report` route alongside existing mounts
- `frontend/app/(app)/pengingat/page.tsx` — add 30s polling logic here; no new page needed for sync
- `frontend/app/(app)/` — new page `/laporan/page.tsx` for report generation UI + `/laporan/preview/page.tsx` for print view
- `backend/src/db/schema/index.ts` — no new tables in Phase 4 (report is computed, note not persisted)

</code_context>

<specifics>
## Specific Ideas

- Polling copy for reminder change toast (D-03): "Jadwal pengingat diperbarui dari perangkat lain."
- Push notification for CAREGIVER-02 (D-03): title "Pengingat Diperbarui", body "Jadwal pengingat telah diperbarui dari perangkat lain."
- Report placeholder anomaly copy (D-09): "Deteksi anomali akan tersedia setelah fitur AI diaktifkan."
- Print button copy: "Cetak / Simpan PDF" — standard Indonesian UX for browser print
- REPORT-02 note label: "Catatan untuk dokter (opsional)" — above or below the preview section, renders in the printed output

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 4 scope.

</deferred>

---

*Phase: 4-caregiver-dashboard-doctor-reports*
*Context gathered: 2026-06-29*
