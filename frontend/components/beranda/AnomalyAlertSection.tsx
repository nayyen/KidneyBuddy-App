"use client";

/**
 * AnomalyAlertSection.tsx — Beranda "Peringatan" section (D-09).
 *
 * Renders ONLY when >=1 alert with status IN ('aktif','dibaca') AND
 * severity === 'normal' exists for the current user — otherwise renders
 * null entirely (no empty state; per UI-SPEC "Alert section on Beranda").
 * `tinggi`-severity alerts never show here — they're handled exclusively
 * by the global EmergencyAnomalyModal.
 */
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { authFetch } from "@/lib/api";
import AnomalyAlertCard, {
  type AnomalyAlertCardData,
} from "@/components/anomaly/AnomalyAlertCard";

interface AnomalyAlertSectionProps {
  accessToken: string;
  refreshKey?: number;
}

const MAX_VISIBLE = 3;

export default function AnomalyAlertSection({
  accessToken,
  refreshKey = 0,
}: AnomalyAlertSectionProps) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<AnomalyAlertCardData[]>([]);

  const fetchAlerts = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await authFetch<{ alerts: AnomalyAlertCardData[] }>(
        "/api/anomaly",
        accessToken,
      );
      const relevant = (res.alerts ?? [])
        .filter(
          (a) => a.severity === "normal" && (a.status === "aktif" || a.status === "dibaca"),
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAlerts(relevant);
    } catch {
      // Silently fail — the section simply doesn't render (no empty state
      // needed on Beranda for this component per UI-SPEC).
      setAlerts([]);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts, refreshKey]);

  const handleCardClick = useCallback(
    async (alertId: string) => {
      // Mark aktif -> dibaca (reuses the acknowledge endpoint's status
      // transition), then navigate to the full history.
      try {
        await authFetch(`/api/anomaly/${alertId}/acknowledge`, accessToken, {
          method: "POST",
        });
      } catch {
        // Non-blocking — still navigate even if the mark-as-read call fails
      } finally {
        router.push("/notifikasi");
      }
    },
    [accessToken, router],
  );

  if (alerts.length === 0) return null;

  const visible = alerts.slice(0, MAX_VISIBLE);

  return (
    <div className="w-full">
      <p
        className="font-heading font-bold"
        style={{ fontSize: 14, color: "#1a2e2c", marginBottom: 8 }}
      >
        Peringatan
      </p>
      <div className="space-y-2">
        {visible.map((alert) => (
          <AnomalyAlertCard
            key={alert.id}
            alert={alert}
            variant="compact"
            onClick={() => handleCardClick(alert.id)}
          />
        ))}
      </div>
      {alerts.length > MAX_VISIBLE && (
        <button
          type="button"
          onClick={() => router.push("/notifikasi")}
          className="font-sans font-semibold flex items-center gap-1 mt-2"
          style={{ fontSize: 12, color: "#2a9d8f" }}
        >
          Lihat Semua Peringatan
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
