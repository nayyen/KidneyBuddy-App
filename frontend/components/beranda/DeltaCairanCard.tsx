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
      // BUGFIX (B2, quick-260705-9n4 task 6): `toISOString()` converts to
      // UTC, NOT the browser's local timezone. For any device ahead of UTC
      // (e.g. WIB/UTC+7), the first several hours after LOCAL midnight are
      // still the PREVIOUS day in UTC — `toISOString().slice(0,10)` would
      // request YESTERDAY's balance, which still has real data, making the
      // silhouette/numbers look like they never reset to 0 at local
      // midnight. Build the date string from local Date components instead.
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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

  // Refetch on tab focus (quick-260705-9n4 task 5) — also covers B2's
  // daily-reset requirement: returning to /beranda re-derives "today" (now
  // local-timezone-correct, see fetchBalance above) instead of letting a
  // stale date's totals persist with no new fetch across local midnight.
  useEffect(() => {
    const onFocus = () => fetchBalance();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchBalance();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchBalance]);

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
