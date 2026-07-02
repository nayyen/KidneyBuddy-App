"use client";

/**
 * HumanFluidChart.tsx — Human body silhouette fluid balance visualization
 *
 * Replaces the abstract ring chart with an intuitive body silhouette where
 * the fluid level rises/falls based on daily selisih cairan (fluid balance).
 *
 * Fluid level mapping:
 *   delta = 0  (balanced)    → 50% fill
 *   delta > 0  (retained)    → fluid RISES above 50% (more fill = more retained)
 *   delta < 0  (good UF)     → fluid at/below 50%
 *   Range: ±2000ml maps to 20%–80% fill (clamped)
 *
 * Color states:
 *   delta > 0          → amber #ef9f27 @ 30% + "Cairan tertahan" label
 *   -1000 ≤ delta ≤ 0  → teal #2a9d8f @ 30% (normal)
 *   delta < -1000      → red #d4183d @ 20% + "Output berlebih" label
 *
 * Size: ~200px mobile, ~240px desktop (responsive via viewBox)
 *
 * SVG anatomy:
 *   - clipPath#hfc-body-clip: contains perfect-circle head + continuous body path
 *   - Fluid wave group: clipped to body so waves stay inside the silhouette
 *   - Body outline path: same path with stroke=#2a9d8f, fill=none (on top)
 *   - Silhouette is perfectly symmetrical around x=60 with smooth bezier curves
 */

interface HumanFluidChartProps {
  /** Selisih cairan = masuk - keluar (ml). Positive = retained. */
  delta: number;
  /** Total cairan masuk (ml) */
  masuk: number;
  /** Total cairan keluar (ml) */
  keluar: number;
  /** Whether there is actual data for today */
  hasData: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error message (null if no error) */
  error: string | null;
  /** Retry callback when error occurs */
  onRetry?: () => void;
}

// ── Body silhouette path (viewBox 0 0 120 260) ──────────────────────────
// A friendly, minimalist, non-anatomical full-body icon.
// Perfectly round head (separate <circle> in clipPath) + one continuous
// body outline where thick arms merge seamlessly into the torso. Legs are
// straight, uniform columns with rounded semi-circular feet. No armpit gap,
// no leg tapering. Symmetrical around x=60.
//
// Geometry (right half, mirrored on left):
//   Head:      <circle cx=60 cy=23 r=15/> — perfect circle, y=8–38
//   Neck:      y=38–40, width 30 (x=45–75), merged with head bottom
//   Shoulder:  y=40–58, span to x=24 / x=96
//   Arm:       y=58–124, thick stroke merged into torso
//   Hand:      y=124–138, rounded cap
//   Torso:     y=58–142, continuous with arms
//   Hip:       y=120–142, smooth curve into leg
//   Leg:       y=142–237, straight uniform column (width 18 each)
//   Foot:      y=237–246, semi-circle radius 9
//   Crotch:    small center gap x=56–64
const BODY_PATH = `
M 45 40
C 35 42 28 48 24 58
L 24 124
C 24 134 34 140 40 138
L 40 76
C 40 68 41 62 42 58
L 42 120
C 42 128 40 136 38 142
L 38 237
A 9 9 0 0 1 56 237
L 56 142
C 56 138 57 134 60 134
C 63 134 64 138 64 142
L 64 237
A 9 9 0 0 1 82 237
L 82 142
C 80 136 78 128 78 120
L 78 58
C 79 62 80 68 80 76
L 80 138
C 86 140 96 134 96 124
L 96 58
C 92 48 85 42 75 40
Z
`.trim();

// Body vertical bounds for fill calculation (includes the separate head circle)
const BODY_TOP = 8;
const BODY_BOTTOM = 246;
const BODY_HEIGHT = BODY_BOTTOM - BODY_TOP; // 238

// Wave path (wider than body for seamless animation, clipped by body)
const WAVE_PATH = `
M 0 0
Q 30 -4 60 0
T 120 0
T 180 0
T 240 0
T 300 0
T 360 0
L 360 260
L 0 260
Z
`.trim();

function formatVolume(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`;
  return `${ml} ml`;
}

export default function HumanFluidChart({
  delta,
  masuk,
  keluar,
  hasData,
  isLoading,
  error,
  onRetry,
}: HumanFluidChartProps) {
  // ── Compute fill level (20%–80% range, clamped) ──
  const clampedDelta = Math.max(-2000, Math.min(2000, delta));
  const fillPercent = hasData ? 50 + (clampedDelta / 2000) * 30 : 50;
  // fillY: top edge of fluid (lower y = higher fill)
  const fillY = BODY_TOP + (1 - fillPercent / 100) * BODY_HEIGHT;

  // ── Color state ──
  let fluidColor: string;
  let fluidOpacity: number;
  let statusLabel: string | null = null;
  let statusColor: string = "#1a2e2c";

  if (!hasData) {
    fluidColor = "#2a9d8f";
    fluidOpacity = 0.15;
  } else if (delta > 0) {
    fluidColor = "#ef9f27"; // amber — retained fluid
    fluidOpacity = 0.3;
    statusLabel = "Cairan tertahan";
    statusColor = "#ef9f27";
  } else if (delta < -1000) {
    fluidColor = "#d4183d"; // red — excessive output
    fluidOpacity = 0.2;
    statusLabel = "Output berlebih";
    statusColor = "#d4183d";
  } else {
    fluidColor = "#2a9d8f"; // teal — normal/balanced
    fluidOpacity = 0.3;
  }

  const deltaDisplay = hasData ? `${delta >= 0 ? "+" : ""}${delta} ml` : "0 ml";

  return (
    <div
      className="w-full"
      style={{
        background:
          "linear-gradient(145deg, #f0faf9, #e0f5f2, #cdeee9, #b8e3dc)",
        borderRadius: 16,
        padding: 16,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Wave animation keyframes (scoped via unique class names) */}
      <style>{`
        @keyframes humanFluidWaveScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-120px); }
        }
        @keyframes humanFluidWaveScroll2 {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-60px); }
        }
        .hfc-wave-front {
          animation: humanFluidWaveScroll 6s linear infinite;
        }
        .hfc-wave-back {
          animation: humanFluidWaveScroll2 9s linear infinite;
          opacity: 0.5;
        }
        @media (prefers-reduced-motion: reduce) {
          .hfc-wave-front, .hfc-wave-back {
            animation: none;
          }
        }
      `}</style>

      {/* Card title */}
      <p
        className="font-heading font-bold mb-2"
        style={{ fontSize: 14, color: "#1a2e2c" }}
      >
        Keseimbangan Cairan Hari Ini
      </p>

      {/* Body silhouette + overlay text */}
      <div className="flex flex-col items-center">
        {isLoading ? (
          <p
            className="font-sans py-12"
            style={{ fontSize: 14, color: "#1a2e2c" }}
          >
            Memuat...
          </p>
        ) : error ? (
          <div className="py-8 flex flex-col items-center gap-2">
            <p
              className="font-sans text-center"
              style={{ fontSize: 14, color: "#1a2e2c" }}
            >
              Gagal memuat data cairan
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="font-sans"
                style={{
                  fontSize: 14,
                  color: "#2a9d8f",
                  textDecoration: "underline",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "6px 12px",
                }}
              >
                Coba Lagi
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── SVG body silhouette with fluid fill ── */}
            <svg
              viewBox="0 0 120 260"
              style={{
                width: "auto",
                height: 200,
                maxWidth: "100%",
                display: "block",
              }}
              role="img"
              aria-label={`Visual cairan tubuh: ${deltaDisplay}, masuk ${formatVolume(masuk)}, keluar ${formatVolume(keluar)}`}
            >
              <defs>
                {/* Clip path = body silhouette (fluid fill stays inside body) */}
                <clipPath id="hfc-body-clip">
                  {/* Perfectly round head */}
                  <circle cx="60" cy="23" r="15" />
                  <path d={BODY_PATH} />
                </clipPath>

                {/* Wave gradient for subtle depth */}
                <linearGradient id="hfc-fluid-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={fluidColor}
                    stopOpacity={fluidOpacity * 0.7}
                  />
                  <stop
                    offset="100%"
                    stopColor={fluidColor}
                    stopOpacity={fluidOpacity}
                  />
                </linearGradient>
              </defs>

              {/* Fluid fill (clipped to body silhouette) */}
              <g clipPath="url(#hfc-body-clip)">
                {/* Back wave layer (slower, semi-transparent) */}
                <g
                  className="hfc-wave-back"
                  style={{ transformOrigin: "0 0" }}
                >
                  <path
                    d={WAVE_PATH}
                    fill={fluidColor}
                    fillOpacity={fluidOpacity * 0.6}
                    transform={`translate(-120, ${fillY + 2})`}
                  />
                </g>

                {/* Front wave layer + fluid body */}
                <g
                  className="hfc-wave-front"
                  style={{ transformOrigin: "0 0" }}
                >
                  <path
                    d={WAVE_PATH}
                    fill={fluidColor}
                    fillOpacity={fluidOpacity}
                    transform={`translate(-120, ${fillY})`}
                  />
                </g>

                {/* Solid fluid below wave (ensures full fill to bottom) */}
                <rect
                  x={0}
                  y={fillY + 2}
                  width={120}
                  height={BODY_BOTTOM - fillY}
                  fill={fluidColor}
                  fillOpacity={fluidOpacity}
                />
              </g>

              {/* Body outline (on top of fluid, same path as clip + head circle) */}
              <circle
                cx="60"
                cy="23"
                r="15"
                fill="none"
                stroke="#2a9d8f"
                strokeWidth={2}
              />
              <path
                d={BODY_PATH}
                fill="none"
                stroke="#2a9d8f"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>

            {/* ── Overlay text (below silhouette) ── */}
            <div className="flex flex-col items-center mt-2">
              {/* Large selisih number */}
              <span
                className="font-heading"
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#1a2e2c",
                  lineHeight: 1.1,
                }}
              >
                {deltaDisplay}
              </span>

              {/* Masuk · Keluar subtext */}
              <span
                className="font-sans mt-1 text-center"
                style={{ fontSize: 16, color: "#1a2e2c" }}
              >
                {hasData
                  ? `Cairan masuk ${formatVolume(masuk)} · Keluar ${formatVolume(keluar)}`
                  : "Belum ada catatan hari ini"}
              </span>

              {/* Status label (conditional) */}
              {statusLabel && (
                <span
                  className="font-sans font-medium mt-1.5"
                  style={{
                    fontSize: 14,
                    color: statusColor,
                    backgroundColor: `${statusColor}15`,
                    borderRadius: 8,
                    paddingLeft: 10,
                    paddingRight: 10,
                    paddingTop: 4,
                    paddingBottom: 4,
                  }}
                >
                  {statusLabel}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
