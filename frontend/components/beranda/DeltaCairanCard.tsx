"use client";

/**
 * DeltaCairanCard.tsx — Hero fluid balance card for Beranda
 *
 * Fetches GET /api/fluid/daily-balance and renders HumanFluidChart
 * (body silhouette with animated fluid fill).
 *
 * Legacy ring chart version: DeltaCairanCardLegacy.tsx
 * To revert: swap import in app/(app)/beranda/page.tsx.
 */

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";
import HumanFluidChart from "./HumanFluidChart";

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

  return (
    <HumanFluidChart
      delta={delta}
      masuk={masuk}
      keluar={keluar}
      hasData={hasData}
      isLoading={isLoading}
      error={error}
      onRetry={fetchBalance}
    />
  );
}
