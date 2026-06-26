---
phase: "02-fluid-medication-tracking-with-reminders"
plan: "01"
subsystem: "frontend-shell"
tags: [responsive, shell, navigation, shadcn, pwa]
dependency_graph:
  requires: []
  provides:
    - "AppShell responsive layout wrapper (mobile/tablet/desktop)"
    - "BottomNav 5-tab fixed navigation"
    - "Sidebar desktop left navigation with Catat Cairan button"
    - "MobileHeader compact header with notification bell"
    - "TopBar desktop header with page title, bell, avatar"
    - "FAB floating Droplets action button"
    - "(app)/ route group wrapping authenticated pages in AppShell"
    - "Placeholder pages: catatan, pengingat, edukasi"
    - "shadcn component primitives (17 UI components)"
  affects:
    - "All Phase 2+ screens inherit the AppShell layout"
    - "Dashboard, Profil, Onboarding now render inside the shell"
tech_stack:
  added:
    - "shadcn/ui (CLI, new-york style, Tailwind v4 compatible)"
    - "sonner@2.0.7 (toast notifications)"
    - "next-themes@0.4.6 (theme provider via shadcn)"
    - "radix-ui@1.6.0 (unified Radix primitives package)"
  patterns:
    - "Route group pattern: (app)/ for shell-wrapped pages, (auth)/ for auth pages"
    - "AppShell: flex container with conditional Sidebar (lg:flex) vs BottomNav (lg:hidden)"
    - "Active nav detection: usePathname() compared to NAV_ITEMS[].href"
    - "FAB positioned absolutely above BottomNav using relative wrapper"
    - "Placeholder pages: useAuth() redirect guard + empty-state copy from UI-SPEC"
key_files:
  created:
    - "frontend/components.json"
    - "frontend/lib/utils.ts"
    - "frontend/lib/nav.ts"
    - "frontend/components/shell/AppShell.tsx"
    - "frontend/components/shell/BottomNav.tsx"
    - "frontend/components/shell/Sidebar.tsx"
    - "frontend/components/shell/MobileHeader.tsx"
    - "frontend/components/shell/TopBar.tsx"
    - "frontend/components/shell/FAB.tsx"
    - "frontend/app/(app)/layout.tsx"
    - "frontend/app/(app)/catatan/page.tsx"
    - "frontend/app/(app)/pengingat/page.tsx"
    - "frontend/app/(app)/edukasi/page.tsx"
    - "frontend/components/ui/button.tsx"
    - "frontend/components/ui/input.tsx"
    - "frontend/components/ui/form.tsx"
    - "frontend/components/ui/select.tsx"
    - "frontend/components/ui/tabs.tsx"
    - "frontend/components/ui/sheet.tsx"
    - "frontend/components/ui/dialog.tsx"
    - "frontend/components/ui/alert-dialog.tsx"
    - "frontend/components/ui/badge.tsx"
    - "frontend/components/ui/toggle.tsx"
    - "frontend/components/ui/checkbox.tsx"
    - "frontend/components/ui/label.tsx"
    - "frontend/components/ui/separator.tsx"
    - "frontend/components/ui/avatar.tsx"
    - "frontend/components/ui/scroll-area.tsx"
    - "frontend/components/ui/switch.tsx"
    - "frontend/components/ui/sonner.tsx"
  modified:
    - "frontend/package.json (added: sonner, next-themes, radix-ui)"
    - "frontend/package-lock.json"
  moved:
    - "frontend/app/dashboard/ → frontend/app/(app)/dashboard/"
    - "frontend/app/profil/ → frontend/app/(app)/profil/"
    - "frontend/app/onboarding/ → frontend/app/(app)/onboarding/"
decisions:
  - "Created components.json manually instead of running npx shadcn init to prevent globals.css overwrite (CSS tokens #2a9d8f, Plus Jakarta Sans/DM Sans preserved)"
  - "Used Tailwind class border-l-[3px] border-primary in Sidebar active state (matches acceptance criteria exactly)"
  - "FAB positioned with absolute + relative wrapper inside the bottom nav container, giving it correct stacking above BottomNav"
  - "AppShell uses <style> tag injection to override padding-bottom on desktop (lg) — avoids Tailwind JIT generating conflicting safe-area-inset calc utilities"
  - "Catatan sub-tabs: Aktivitas and Lab disabled tabs fire sonner toast on tap (Fitur ini akan hadir di update berikutnya) as specified in UI-SPEC"
metrics:
  started: "2026-06-26T13:35:00Z"
  completed: "2026-06-26T14:35:55Z"
  duration_minutes: 61
  tasks_completed: 3
  tasks_total: 4
  files_created: 31
  files_modified: 2
  files_moved: 7
  commits: 3
---

# Phase 02 Plan 01: Responsive UI Shell Summary

**One-liner:** shadcn initialized (17 primitives, CSS tokens preserved) + six shell components (AppShell/BottomNav/Sidebar/MobileHeader/TopBar/FAB) + (app)/ route group with three layout breakpoints (mobile bottom-nav / tablet 2-col / desktop sidebar).

## What Was Built

### Task 1: shadcn initialization and UI primitives

Created `components.json` manually (Tailwind v4 config — empty `tailwind.config`, `css: "app/globals.css"`) to safely initialize shadcn without risking globals.css modification. Added `lib/utils.ts` with `cn()` helper (clsx + tailwind-merge). Ran `npx shadcn@latest add` for 17 components: button, input, form, select, tabs, sheet, dialog, alert-dialog, badge, toggle, checkbox, label, separator, avatar, scroll-area, switch, sonner. Verified globals.css unchanged via `diff` (all `--color-*` and font tokens preserved).

New dependencies added by shadcn: `sonner@2.0.7`, `next-themes@0.4.6`, `radix-ui@1.6.0`.

### Task 2: Shell components

Six components implementing the three-breakpoint responsive layout:

- **`lib/nav.ts`** — `NAV_ITEMS` array: Beranda/Catatan/Pengingat/Edukasi/Profil with lucide-react icons (House/ClipboardPen/Bell/BookOpen/User).
- **`AppShell.tsx`** — Root layout wrapper. Desktop: fixed Sidebar (w-64) + content offset (`lg:ml-64`). Mobile/tablet: MobileHeader + bottom nav fixed (`lg:hidden`). Content: max-width 1280px, `px-4 md:px-6`, bottom padding clears bottom nav (`calc(60px + env(safe-area-inset-bottom) + 24px)`), overridden to 24px at lg+.
- **`BottomNav.tsx`** — Fixed bottom, 60px + `env(safe-area-inset-bottom)`, 5 tabs from NAV_ITEMS. Active: teal stroke (2.5px), teal label, 4px indicator dot. Inactive: `#cfe8e4`.
- **`Sidebar.tsx`** — `hidden lg:flex`, w-64, fixed. Logo row (Droplets + KidneyBuddy teal). Nav items with `border-l-[3px] border-primary bg-[#f0faf9] text-primary` active state. Bottom-anchored "Catat Cairan" button (teal, pill, 44px, `onCatatCairan` prop — wired in plan 02-04).
- **`MobileHeader.tsx`** — `flex lg:hidden`, h-14 white. App name teal. Bell button 44px tap target, `aria-label="Notifikasi"`.
- **`TopBar.tsx`** — `hidden lg:flex`, h-14, `position: fixed, left: 256, right: 0, z-index: 20`. Page title derived from NAV_ITEMS via `usePathname()`. Bell (32px) + initials avatar (32px teal).
- **`FAB.tsx`** — `lg:hidden`, circle 44px, gradient `#7a8c8a→#2a9d8f`, 3px white border, shadow. "Catat" label below. Positioned absolute `-top-28` centered in relative wrapper.

### Task 3: (app) route group + placeholder pages

Created `app/(app)/layout.tsx` (server component wrapping children in `<AppShell>`). Moved dashboard/, profil/ (with `_components/`), and onboarding/ (with `_components/`) into `(app)/` — URLs unchanged (/dashboard, /profil, /onboarding). Route-group parens are transparent to Next.js routing.

Three placeholder pages:
- **catatan/page.tsx**: 4 sub-tab pills (Cairan/Obat active, Aktivitas/Lab disabled). Disabled taps fire sonner toast. Cairan tab shows empty-state heading + body copy from UI-SPEC.
- **pengingat/page.tsx**: Empty state "Belum ada pengingat" + body + teal "Tambah Pengingat" button stub.
- **edukasi/page.tsx**: BookOpen 48px (#cfe8e4), "Konten Segera Hadir" heading, UI-SPEC body copy.

All three use `useAuth()` redirect guard. `npm run build` passes — 11 routes resolve correctly.

## Checkpoint Status

Task 4 is a `checkpoint:human-verify` gate requiring visual verification at exact breakpoints (375px / 768px / 1024px / 1280px) across Chrome and Firefox. This plan is paused at the checkpoint.

## Deviations from Plan

### Auto-handled (Rule 2)

**1. [Rule 2 - Missing] Created components.json manually instead of running npx shadcn init**
- **Found during:** Task 1
- **Issue:** `npx shadcn@latest init` is interactive and could overwrite `globals.css` design tokens. The plan acknowledges this risk ("keeping the existing globals.css as the token base").
- **Fix:** Created `components.json` with Tailwind v4 configuration manually, then ran `npx shadcn@latest add --yes` which only creates component files and does not touch globals.css.
- **Files modified:** `frontend/components.json` (created), `frontend/app/globals.css` (unchanged, verified via diff)
- **Commits:** b914951

**2. [Rule 2 - Missing] Used `<style>` injection for lg desktop padding override**
- **Found during:** Task 2
- **Issue:** Tailwind's JIT doesn't always generate `pb-6` that correctly overrides `pb-[calc(...)]` from the mobile value when combined with arbitrary calc expressions.
- **Fix:** Added `<style>` tag inside AppShell to force `padding-bottom: 24px` at lg breakpoint, ensuring the media query override works reliably.
- **Files modified:** `frontend/components/shell/AppShell.tsx`

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `onCatatCairan` no-op | `AppShell.tsx` | ~17 | FAB/Sidebar Catat Cairan button opens CatatCairanSheet — wired in plan 02-04 |
| Disabled sub-tabs (Aktivitas, Lab) | `catatan/page.tsx` | ~TABS array | Features not yet built — plans 02-03 (lab) and future phase for Aktivitas |
| Tambah Pengingat button no-op | `pengingat/page.tsx` | ~60 | AddReminderSheet wired in plan 02-05 |

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| No new threat surface | — | All new files are pure UI components. No new API endpoints, auth paths, or data access patterns introduced. The `useAuth()` redirect guard on placeholder pages satisfies T-02-01-01 (unauthenticated access prevention). |

## Self-Check: PASSED

- `frontend/app/(app)/layout.tsx` exists: FOUND
- `frontend/components/shell/AppShell.tsx` exists: FOUND
- `frontend/components/shell/BottomNav.tsx` exists: FOUND
- `frontend/components/shell/Sidebar.tsx` exists: FOUND
- `frontend/components/ui/button.tsx` exists: FOUND
- `frontend/app/(app)/edukasi/page.tsx` contains "Konten Segera Hadir": FOUND
- `frontend/app/dashboard/` removed: CONFIRMED
- Commits b914951, 4506db6, 7e833c5 exist: CONFIRMED
- `npm run build` passes (exit code 0): CONFIRMED
