---
phase: quick-260705-pmi
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/components/shell/BottomNav.tsx
autonomous: false
requirements:
  - quick-260705-pmi
must_haves:
  truths:
    - "At non-desktop width, an unselected bottom-nav item's icon and label are clearly visible against white (muted teal-gray, not near-white)"
    - "At desktop width, the notification bell in the top bar navigates to /notifikasi and shows the unread badge"
  artifacts:
    - path: "frontend/components/shell/BottomNav.tsx"
      provides: "Bottom nav with readable inactive icon/label color matching desktop sidebar"
      contains: "#3d6b66"
    - path: "frontend/components/shell/TopBar.tsx"
      provides: "Desktop notification bell already wired to /notifikasi with unread badge"
      contains: "onNotificationClick"
  key_links:
    - from: "frontend/components/shell/BottomNav.tsx"
      to: "Sidebar inactive icon color"
      via: "shared hex #3d6b66"
      pattern: "#3d6b66"
    - from: "frontend/components/shell/TopBar.tsx"
      to: "/notifikasi"
      via: "onNotificationClick -> router.push"
      pattern: "onNotificationClick"
---

<objective>
Fix two navigation UI issues at once:

1. **Bottom-nav inactive color too light (real bug):** `BottomNav.tsx` renders unselected nav icons and labels in `#cfe8e4`, a near-white teal that is hard to see against the white nav background. The desktop `Sidebar.tsx` uses `#3d6b66` (muted teal-gray) for its inactive icons, which reads clearly. Change the bottom nav's inactive color to match the desktop sidebar.

2. **Desktop notification bell (verify — likely already present):** Code analysis shows the desktop-only header `TopBar.tsx` (`hidden lg:flex`) already renders a `Bell` button wired via `onNotificationClick` -> `router.push("/notifikasi")` with the same unread badge logic as the mobile `MobileHeader.tsx`. The reported "missing bell on desktop" does not match current code. Verify at desktop width before adding anything, to avoid introducing a redundant/confusing second bell.

Purpose: Improve nav legibility and confirm notification reachability across breakpoints.
Output: Updated `BottomNav.tsx`; confirmation that desktop bell works.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

@frontend/components/shell/BottomNav.tsx
@frontend/components/shell/Sidebar.tsx
@frontend/components/shell/TopBar.tsx
@frontend/components/shell/MobileHeader.tsx
@frontend/components/shell/AppShell.tsx

# Design system reference (color tokens)
# NOTE: DESIGN_SYSTEM_KidneyBuddy_v3.md line 175 lists "#cfe8e4" as the
# inactive tab color. The PO has explicitly decided this is too washed-out
# for the bottom nav and wants it matched to the desktop sidebar's inactive
# icon color (#3d6b66). Honor the PO decision; do not revert to #cfe8e4.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Darken bottom-nav inactive icon and label color to match desktop sidebar</name>
  <files>frontend/components/shell/BottomNav.tsx</files>
  <action>
In `BottomNav.tsx`, the inactive (unselected) state currently uses `#cfe8e4` in two places: the `<Icon>` `color` prop (`color={isActive ? "#2a9d8f" : "#cfe8e4"}`) and the label `<span>` inline `style.color` (`color: isActive ? "#2a9d8f" : "#cfe8e4"`). Replace BOTH inactive `#cfe8e4` values with `#3d6b66` — the exact inactive icon color used by the desktop `Sidebar.tsx`. Leave the active color `#2a9d8f`, the active-indicator dot, and all sizing/strokeWidth unchanged.

Rationale for label: the desktop sidebar uses `#1a2e2c` for its inactive *label* but `#3d6b66` for its inactive *icon*. Using `#3d6b66` for both the bottom-nav icon AND label keeps the icon+label pair visually unified and readable at 10px, while satisfying the explicit request to match the desktop inactive icon color. Do NOT introduce `#1a2e2c` here.

Do not add a shared token/refactor — keep the inline hex approach already used throughout these shell components (no shared inactive-color constant exists).
  </action>
  <verify>
    <automated>cd frontend && grep -c "#3d6b66" components/shell/BottomNav.tsx | grep -qv '^0$' && ! grep -q "#cfe8e4" components/shell/BottomNav.tsx && echo OK</automated>
  </verify>
  <done>`BottomNav.tsx` contains no `#cfe8e4`; both the inactive icon `color` prop and the inactive label `style.color` use `#3d6b66`. Active state (`#2a9d8f`) and the active dot are unchanged.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
No new code was needed for the desktop notification bell: analysis confirmed `TopBar.tsx` (the desktop-only header, `hidden lg:flex`, rendered by `AppShell.tsx` at line 162) already contains a `Bell` button that calls `onNotificationClick` -> `router.push("/notifikasi")` (`AppShell.handleNotificationClick`), and already shows the amber unread dot via `useUnreadAnomalyCount` — identical to the mobile `MobileHeader.tsx` bell. Task 1's bottom-nav color fix has also been applied.
  </what-built>
  <how-to-verify>
1. Run the frontend dev server and open the app in a browser.
2. **Desktop width (>= 1024px / lg):** Confirm the top bar (top-right, next to the avatar) shows a bell icon. Click it — the app must navigate to `/notifikasi`. If you have unread anomaly alerts, confirm the small amber dot appears on the bell.
   - If the bell IS present and works: Fix 1 is already satisfied, no code change needed. Approve.
   - If you specifically want the bell duplicated INTO the left sidebar nav list (not just the top bar), say so — note that the sidebar already has a "Pengingat" bell icon (-> /pengingat), so a second bell there may be confusing.
3. **Non-desktop width (< 1024px):** Open the bottom nav. Confirm unselected items' icons and labels are now clearly visible (muted teal-gray `#3d6b66`), noticeably darker than before, and the selected item stays teal `#2a9d8f` with its dot.
  </how-to-verify>
  <resume-signal>Type "approved" if the desktop bell works and the bottom-nav color is readable, or describe what still needs changing (e.g. "add bell to sidebar too").</resume-signal>
</task>

</tasks>

<verification>
- `BottomNav.tsx` inactive icon + label color = `#3d6b66`, matching `Sidebar.tsx` inactive icon.
- No `#cfe8e4` remains in `BottomNav.tsx`.
- Desktop `TopBar.tsx` bell navigates to `/notifikasi` with unread badge (verified in browser, no code change expected).
</verification>

<success_criteria>
- Unselected bottom-nav icons/labels are clearly legible against white at non-desktop widths.
- Notification bell is reachable from desktop width (via existing TopBar bell) and lands on `/notifikasi`.
- No regressions to active nav state or the active-indicator dot.
</success_criteria>

<output>
Create `.planning/quick/260705-pmi-tambahkan-tombol-bell-di-navigasi-deskto/260705-pmi-SUMMARY.md` when done.
</output>
