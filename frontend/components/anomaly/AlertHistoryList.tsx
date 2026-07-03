"use client";

/**
 * AlertHistoryList.tsx — full alert history for `/notifikasi` (D-09, ANOMALY-04).
 *
 * Fetches ALL alerts (both severities, all statuses) newest-first via
 * GET /api/anomaly. Tapping a still-`aktif` card marks it `dibaca` (reusing
 * the acknowledge endpoint's status transition); "Relevan"/"Tidak Relevan"
 * feedback pills only render once a card is `dibaca` or later, and PATCH
 * /api/anomaly/:id/feedback, per UI-SPEC Screen Contract 6.
 */
import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { authFetch } from "@/lib/api";
import AnomalyAlertCard, {
  type AnomalyAlertCardData,
} from "@/components/anomaly/AnomalyAlertCard";

interface AlertHistoryListProps {
  accessToken: string;
}

export default function AlertHistoryList({ accessToken }: AlertHistoryListProps) {
  const [alerts, setAlerts] = useState<AnomalyAlertCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchAlerts = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await authFetch<{ alerts: AnomalyAlertCardData[] }>(
        "/api/anomaly",
        accessToken,
      );
      setAlerts(res.alerts ?? []);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Tapping a still-unread card marks it dibaca — optimistic update, reverted
  // if the server call fails.
  const handleCardClick = useCallback(
    async (alertId: string, status: string) => {
      if (status !== "aktif") return;
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: "dibaca" } : a)),
      );
      try {
        await authFetch(`/api/anomaly/${alertId}/acknowledge`, accessToken, {
          method: "POST",
        });
      } catch {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? { ...a, status: "aktif" } : a)),
        );
      }
    },
    [accessToken],
  );

  const handleFeedback = useCallback(
    async (alertId: string, feedback: "relevan" | "tidak_relevan") => {
      const previous = alerts;
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, feedbackPengguna: feedback } : a)),
      );
      try {
        await authFetch(`/api/anomaly/${alertId}/feedback`, accessToken, {
          method: "PATCH",
          body: JSON.stringify({ feedback }),
        });
      } catch {
        setAlerts(previous);
      }
    },
    [accessToken, alerts],
  );

  if (isLoading) {
    return (
      <p className="font-sans text-center py-8" style={{ fontSize: 14, color: "#3d6b66" }}>
        Memuat...
      </p>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center text-center py-8">
        <p className="font-sans" style={{ fontSize: 14, color: "#d4183d" }}>
          Gagal memuat riwayat peringatan. Periksa koneksi, lalu coba lagi.
        </p>
        <button
          type="button"
          onClick={fetchAlerts}
          className="mt-2 font-sans font-medium"
          style={{ fontSize: 13, color: "#2a9d8f", textDecoration: "underline" }}
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-16">
        <Bell size={48} style={{ color: "#cfe8e4" }} className="mb-3" />
        <p className="font-heading font-bold" style={{ fontSize: 14, color: "#1a2e2c" }}>
          Belum Ada Peringatan
        </p>
        <p
          className="font-sans mt-1"
          style={{ fontSize: 12, color: "#7a8c8a", maxWidth: 280 }}
        >
          Peringatan akan muncul di sini jika sistem mendeteksi pola yang perlu
          diperhatikan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <AnomalyAlertCard
          key={alert.id}
          alert={alert}
          variant="full"
          onClick={
            alert.status === "aktif"
              ? () => handleCardClick(alert.id, alert.status)
              : undefined
          }
          onFeedback={(fb) => handleFeedback(alert.id, fb)}
        />
      ))}
    </div>
  );
}
