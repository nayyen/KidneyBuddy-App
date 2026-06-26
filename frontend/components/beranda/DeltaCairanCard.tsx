"use client";

/**
 * DeltaCairanCard.tsx — Hero fluid balance card for Beranda
 *
 * Fetches GET /api/fluid/daily-balance and renders:
 * - FluidRing SVG (144×144px)
 * - Balance number colored by threshold
 * - Masuk/Keluar subline
 *
 * Thresholds (Claude's discretion per RESEARCH.md A3 — visual guidance only):
 * - No data (0 entries): number = grey #7a8c8a
 * - Normal |delta| ≤ 1000 ml: teal #2a9d8f
 * - Caution |delta| 1001–2000 ml: amber #ef9f27
 * - Critical |delta| > 2000 ml: red #d4183d
 *
 * Per UI-SPEC DeltaCairanCard visual states.
 */

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";

interface DailyBalance {
  date: string;
  masuk: number;
  keluar: number;
  delta: number;
  unit: string;
}

interface DeltaCairanCardProps {
  accessToken: string;
  /** Increment this to trigger a refresh after a new entry is saved */
  refreshKey?: number;
  /** Called when the balance response has abnormal condition data */
  onBalanceFetched?: (balance: DailyBalance) => void;
}

function getDeltaColor(delta: number, hasData: boolean): string {
  if (!hasData) return "#7a8c8a";
  const abs = Math.abs(delta);
  if (abs <= 1000) return "#2a9d8f";
  if (abs <= 2000) return "#ef9f27";
  return "#d4183d";
}

/** Compute SVG stroke-dasharray for the progress ring */
function computeRingProgress(masuk: number, keluar: number): number {
  const total = masuk + keluar;
  if (total === 0) return 0;
  // Show masuk fraction as progress (0–1)
  const fraction = Math.min(masuk / total, 1);
  const circumference = 2 * Math.PI * 60; // r=60
  return fraction * circumference;
}

function formatVolume(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`;
  return `${ml} ml`;
}

export default function DeltaCairanCard({
  accessToken,
  refreshKey = 0,
  onBalanceFetched,
}: DeltaCairanCardProps) {
  const [balance, setBalance] = useState<DailyBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const data = await authFetch<DailyBalance>(
        `/api/fluid/daily-balance?date=${today}`,
        accessToken,
      );
      setBalance(data);
      onBalanceFetched?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data cairan");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, onBalanceFetched]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance, refreshKey]);

  const hasData = balance !== null && (balance.masuk > 0 || balance.keluar > 0);
  const delta = balance?.delta ?? 0;
  const masuk = balance?.masuk ?? 0;
  const keluar = balance?.keluar ?? 0;
  const deltaColor = getDeltaColor(delta, hasData);
  const circumference = 2 * Math.PI * 60;
  const progress = computeRingProgress(masuk, keluar);

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
      {/* Card title */}
      <p
        className="font-heading font-bold mb-3"
        style={{ fontSize: 14, color: "#1a2e2c" }}
      >
        Keseimbangan Cairan Hari Ini
      </p>

      {/* FluidRing SVG + centered text */}
      <div className="flex flex-col items-center">
        <div style={{ position: "relative", width: 144, height: 144 }}>
          <svg width={144} height={144} viewBox="0 0 144 144">
            {/* Track */}
            <circle
              cx={72}
              cy={72}
              r={60}
              fill="none"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={10}
            />
            {/* Progress */}
            {hasData && (
              <circle
                cx={72}
                cy={72}
                r={60}
                fill="none"
                stroke="white"
                strokeWidth={10}
                strokeDasharray={`${progress} ${circumference}`}
                strokeDashoffset={circumference * 0.25}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 0.6s ease" }}
              />
            )}
          </svg>

          {/* Centered content inside ring */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            {isLoading ? (
              <span
                className="font-sans"
                style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}
              >
                Memuat...
              </span>
            ) : error ? (
              <span
                className="font-sans text-center px-2"
                style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}
              >
                Gagal memuat
              </span>
            ) : (
              <>
                <span
                  className="font-sans"
                  style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}
                >
                  Keseimbangan
                </span>
                <span
                  className="font-heading font-bold"
                  style={{ fontSize: 20, color: deltaColor, lineHeight: 1 }}
                >
                  {hasData ? `${delta >= 0 ? "+" : ""}${delta}` : "0"}
                </span>
                <span
                  className="font-sans"
                  style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}
                >
                  ml
                </span>
              </>
            )}
          </div>
        </div>

        {/* Masuk · Keluar subline */}
        {!isLoading && !error && (
          <p
            className="font-sans mt-2 text-center"
            style={{ fontSize: 10, color: "#7a8c8a" }}
          >
            {hasData
              ? `Masuk: ${formatVolume(masuk)} · Keluar: ${formatVolume(keluar)}`
              : "Belum ada catatan hari ini"}
          </p>
        )}

        {error && (
          <button
            onClick={fetchBalance}
            className="mt-2 font-sans text-xs"
            style={{ color: "#2a9d8f", textDecoration: "underline" }}
          >
            Coba Lagi
          </button>
        )}
      </div>
    </div>
  );
}
