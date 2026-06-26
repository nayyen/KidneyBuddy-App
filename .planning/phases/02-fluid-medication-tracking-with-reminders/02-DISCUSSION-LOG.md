# Phase 2: Fluid & Medication Tracking with Reminders - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-26
**Phase:** 2-fluid-medication-tracking-with-reminders
**Areas discussed:** Main UI Shell & Navigation

---

## Main UI Shell & Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Beranda / Cairan / Pengingat / Edukasi / Profil | Dedicated Cairan tab | |
| Beranda / Log / Pengingat / Komunitas / Profil | Komunitas in main nav | |
| Beranda / Cairan / Obat / Lab / Profil | Per-tracking tabs | |
| **Beranda / Catatan / Pengingat / Edukasi / Profil** | Consolidated "Catatan" tab | ✓ |

**Notes:** User chose "Catatan" as the consolidated logging tab name over the suggested options.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Semua log dalam satu halaman dengan tab internal | Full sub-tab from day 1 | |
| **Hanya Cairan & Obat di Phase 2, nanti bisa tambah sub-tab** | Phase 2 scope only, extensible | ✓ |
| Feed campuran chronological | Mixed timeline | |

**Notes:** Pragmatic choice — Phase 2 scope is Cairan + Obat only. Sub-tab infrastructure is built to be extensible for Phase 3 (Aktivitas + Lab).

---

| Option | Description | Selected |
|--------|-------------|----------|
| **Ringkasan hari ini: delta cairan + obat hari ini + pengingat berikutnya** | Focused daily summary | ✓ |
| Metric cards grid: cairan + obat + aktivitas + lab terbaru | Dense grid with placeholders | |
| Status strip + quick actions | Horizontal status bar | |

**Notes:** Recommended option chosen. AI summary card slot noted as Phase 5 placeholder — build the slot in Phase 2 so Phase 5 can drop content without layout surgery.

---

| Option | Description | Selected |
|--------|-------------|----------|
| **Selalu "Catat Cairan" di semua halaman** | Consistent, simple | ✓ |
| Kontekstual: berbeda per sub-tab aktif | Smarter but confusing for 50+ users | |

**Notes:** Consistency wins for 50+ user base. Single meaning for the FAB.

---

| Option | Description | Selected |
|--------|-------------|----------|
| **Sidebar vertikal + "Catat Cairan" fixed di bawah sidebar** | Per ROADMAP.md section 7.2 | ✓ |
| Top navigation bar + konten full-width | Website-style, inconsistent with PRD | |

**Notes:** ROADMAP.md section 7.2 explicitly specifies left sidebar at 1024px+. Recommended option matches spec.

---

## Claude's Discretion

- **Nav icon set** — Standard Lucide/shadcn icons; planner picks specific names
- **Active state indicator** — Filled icon + teal label on mobile; teal left border + background on sidebar
- **Empty state for delta card** — Neutral grey "0 ml" when no entries, not red
- **Desktop top bar** — Page title left, bell + avatar right; no logo (logo in sidebar)
- **CAPD effluent warning** — Full-width red Alert Darurat component at top of Beranda, requires active dismiss ("Saya mengerti, hubungi dokter segera")
- **Tailwind breakpoints** — Use Tailwind's md:/lg:/xl: matching 768/1024/1280; verify at exact ROADMAP breakpoints per RESPONSIVE-04

## Deferred Ideas

None — discussion stayed within Phase 2 scope.
