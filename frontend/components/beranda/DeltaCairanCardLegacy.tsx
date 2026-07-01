"use client";

/**
 * DeltaCairanCardLegacy.tsx — Original ring chart version (kept for revert)
 *
 * This is the legacy fluid balance card using a circular progress ring.
 * Replaced by DeltaCairanCard.tsx which renders HumanFluidChart (body silhouette).
 *
 * To revert: swap the import in app/(app)/beranda/page.tsx back to this file.
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

interface DeltaCairanCardLegacyProps {
  accessToken: string;
  refreshKey?: number;
  onBalanceFetched?: (balance: DailyBalance) => void;
}

function getDeltaColor(delta: number, hasData: boolean): string {
  if (!hasData) return "#3d6b66";
  const abs = Math.abs(delta);
  if (abs <= 1000) return "#2a9d8f";
  if (abs <= 2000) return "#ef9f27";
  return "#d4183d";
}

function computeRingProgress(masuk: number, keluar: number): number {
  const total = masuk + keluar;
  if (total === 0) return 0;
  const fraction = Math.min(masuk / total, 1);
  const circumference = 2 * Math.PI * 60;
  return fraction * circumference;
}

function formatVolume(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`;
  return `${ml} ml`;
}

export default function DeltaCairanCardLegacy({
  accessToken,
  refreshKey = 0,
  onBalanceFetched,
}: DeltaCairanCardLegacyProps) {
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
      <p
        className="font-heading font-bold mb-3"
        style={{ fontSize: 14, color: "#1a2e2c" }}
      >
        Keseimbangan Cairan Hari Ini
      </p>

      <div className="flex flex-col items-center">
        <div style={{ position: "relative", width: 144, height: 144 }}>
          <svg width={144} height={144} viewBox="0 0 144 144">
            <circle
              cx={72}
              cy={72}
              r={60}
              fill="none"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={10}
            />
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
              <span className="font-sans" style={{ fontSize: 14, color: "#1a2e2c" }}>
                Memuat...
              </span>
            ) : error ? (
              <span className="font-sans text-center px-2" style={{ fontSize: 13, color: "#1a2e2c" }}>
                Gagal memuat
              </span>
            ) : (
              <>
                <span className="font-sans" style={{ fontSize: 16, color: "#1a2e2c" }}>
                  Keseimbangan
                </span>
                <span
                  className="font-heading font-bold"
                  style={{ fontSize: 20, color: deltaColor, lineHeight: 1 }}
                >
                  {hasData ? `${delta >= 0 ? "+" : ""}${delta}` : "0"}
                </span>
                <span className="font-sans" style={{ fontSize: 16, color: "#1a2e2c" }}>
                  ml
                </span>
              </>
            )}
          </div>
        </div>

        {!isLoading && !error && (
          <p
            className="font-sans mt-2 text-center"
            style={{ fontSize: 14, color: "#1a2e2c" }}
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
