---
status: pending
resolves_phase: null
created: 2026-07-04
---

# TopBar bell/avatar not visually rendering at desktop width (>=1024px)

## Symptom

On `/beranda` (and presumably every `(app)` route) at desktop width (sidebar
visible, `lg:` breakpoint active), the `TopBar` header renders no visible
bar, bell icon, or avatar circle at all — only the page's own content
heading is visible. `MobileHeader` (same bell-icon pattern, same
`useUnreadAnomalyCount` hook) works correctly at narrow widths.

## Diagnostic evidence (browser console, desktop width)

- `document.querySelectorAll('[aria-label="Notifikasi"]').length` → returned
  `2` on an early check, but a later `document.querySelectorAll('header').length`
  in the same session returned `1` (expected: 2, one per `MobileHeader` +
  `TopBar`, both always mounted regardless of which is CSS-hidden).
- `outerHTML` of the second `[aria-label="Notifikasi"]` match showed a
  fully-formed, correctly-styled `<button>` with a valid `lucide-bell` SVG
  and a real on-screen bounding rect (32x32 at roughly x:1184, y:11.75).
- `document.elementFromPoint(1200, 27)` (center of that same rect) returned
  the `<header>` element itself (matching TopBar's exact inline styles —
  height:56px, left:256px, z-index:20), not the button/svg — i.e. the
  header's own box was hit-tested, not its child.
- Screenshot at ~1999px window width confirms: sidebar renders correctly,
  but no header bar/border, no bell, no avatar are visible at all above the
  page content.

## Working theory (unconfirmed)

The two DOM snapshots are inconsistent with each other (2 buttons found,
then only 1 header found), suggesting `TopBar` may render successfully on
initial paint but then unmount or fail on a subsequent re-render/hydration
pass — possibly related to `useUnreadAnomalyCount` or `useAuth` firing an
error after mount that some ancestor (Next.js's default root error
boundary?) silently swallows for just that subtree. `MobileHeader` uses the
same `useUnreadAnomalyCount` hook and works, which points more toward
something specific to `TopBar` (e.g. `NAV_ITEMS.find` + `usePathname`
timing, or the `useAuth` user object arriving after an initial successful
render then throwing on a re-render).

## Next steps for whoever picks this up

1. Reproduce with React DevTools / Next.js dev mode (not the production
   Docker build) to get an actual component stack trace instead of
   guessing from DOM introspection alone.
2. Check whether `TopBar` is wrapped by any implicit error boundary and
   whether it throws on a second render (e.g. `user` transitioning from
   `null` -> populated, or `unreadCount` fetch resolving after mount).
3. Compare `TopBar.tsx` vs `MobileHeader.tsx` line-by-line for the one
   piece of logic MobileHeader doesn't have (`NAV_ITEMS.find`, `initials`
   computation) as the prime suspect.

## Impact

Cosmetic/navigation-only — does not affect the anomaly-detection safety
pipeline (modal, dedup, feedback lifecycle), which is independently
verified working. Desktop users currently have no way to reach
`/notifikasi` except via a normal-severity alert card's own click-through
(when one exists) — no other in-app nav item links there.
