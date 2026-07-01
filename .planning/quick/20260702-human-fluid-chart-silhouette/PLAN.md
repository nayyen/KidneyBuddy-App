---
status: in-progress
created: "2026-07-02"
---

# Quick Task: HumanFluidChart Silhouette Refinement

## Goal
Fine-tune the SVG human silhouette in `frontend/components/beranda/HumanFluidChart.tsx` to match the final intended minimalist icon style.

## Changes
1. Replace the hand-drawn head portion with a perfect `<circle>` (cx=60, cy=23, r=15).
2. Redesign the body path so arms are thick and seamlessly merged into the torso — no armpit gap or negative space.
3. Preserve all existing logic: clipPath wave animation, fill-level mapping, color states, overlay text, and accessibility attributes.

## Verification
- [x] TypeScript compilation passes for modified file (pre-existing errors elsewhere are out of scope).
- [x] Docker frontend container builds successfully.
- [x] Container redeployed and verified visually on `/beranda`.
