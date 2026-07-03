"use client";

/**
 * useUnreadAnomalyCount.ts — shared unread-count fetch for the notification
 * bell badge (TopBar + MobileHeader), per UI-SPEC "Notification Bell Icon".
 *
 * Only counts normal-severity, still-`aktif` alerts — tinggi-severity alerts
 * do NOT rely on this badge; they interrupt via the blocking
 * EmergencyAnomalyModal directly.
 */
import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";

interface AnomalyAlertRow {
  severity: string;
  status: string;
}

export function useUnreadAnomalyCount(accessToken: string | null): number {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await authFetch<{ alerts: AnomalyAlertRow[] }>(
        "/api/anomaly",
        accessToken,
      );
      const unread = (res.alerts ?? []).filter(
        (a) => a.severity === "normal" && a.status === "aktif",
      ).length;
      setCount(unread);
    } catch {
      // Silently fail — badge simply doesn't show a count this cycle
    }
  }, [accessToken]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return count;
}
