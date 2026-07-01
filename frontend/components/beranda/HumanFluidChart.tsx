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
// A front-facing human body outline: head, torso, arms, legs.
const BODY_PATH = `
M 60 10
C 76 10, 82 22, 82 32
L 82 40
L 96 46
L 100 54
L 96 110
L 90 114
L 86 112
L 84 62
L 78 140
L 82 150
L 78 248
L 64 250
L 62 160
L 60 162
L 58 160
L 56 250
L 42 248
L 38 150
L 42 140
L 36 62
L 34 112
L 30 114
L 24 110
L 20 54
L 24 46
L 38 40
C 38 22, 44 10, 60 10
Z
`.trim();

// Body vertical bounds for fill calculation
const BODY_TOP = 10;
const BODY_BOTTOM = 250;
const BODY_HEIGHT = BODY_BOTTOM - BODY_TOP; // 240

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
                {/* Clip path = body silhouette (for fluid fill) */}
                <clipPath id="hfc-body-clip">
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

              {/* Fluid fill (clipped to body) */}
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

                {/* Solid fluid below wave (ensures full fill) */}
                <rect
                  x={0}
                  y={fillY + 2}
                  width={120}
                  height={BODY_BOTTOM - fillY}
                  fill={fluidColor}
                  fillOpacity={fluidOpacity}
                />
              </g>

              {/* Body outline (on top of fluid) */}
              <path
                d={BODY_PATH}
                fill="none"
                stroke="#2a9d8f"
                strokeWidth={2}
                strokeLinejoin="round"
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
