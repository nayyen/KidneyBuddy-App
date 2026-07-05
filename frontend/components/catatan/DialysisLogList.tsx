"use client";

/**
 * DialysisLogList.tsx — Today's dialysis session log entries for /catatan Cuci Darah tab
 *
 * Fetches GET /api/dialysis-log/today and renders each entry via DialysisLogItem.
 * Allows inline confirmation. Shows "Cuci Darah Hari Ini" header.
 * Refreshes on cucidarah:confirmed and reminder:updated events.
 */

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";
import DialysisLogItem, { type DialysisLog } from "./DialysisLogItem";
import { Droplets } from "lucide-react";
import { SYNC_EVENTS, dispatchSyncEvent } from "@/lib/syncEvents";

interface DialysisLogListProps {
  accessToken: string;
  refreshKey?: number;
}

export default function DialysisLogList({
  accessToken,
  refreshKey = 0,
}: DialysisLogListProps) {
  const [logs, setLogs] = useState<DialysisLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await authFetch<DialysisLog[]>(
        "/api/dialysis-log/today",
        accessToken,
      );
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat log cuci darah");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshKey]);

  useEffect(() => {
    const refresh = () => fetchLogs();
    window.addEventListener(SYNC_EVENTS.CUCIDARAH_CONFIRMED, refresh);
    window.addEventListener(SYNC_EVENTS.REMINDER_UPDATED, refresh);
    return () => {
      window.removeEventListener(SYNC_EVENTS.CUCIDARAH_CONFIRMED, refresh);
      window.removeEventListener(SYNC_EVENTS.REMINDER_UPDATED, refresh);
    };
  }, [fetchLogs]);

  // Refetch on tab focus (quick-260705-9n4 task 5)
  useEffect(() => {
    const onFocus = () => fetchLogs();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchLogs();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchLogs]);

  const handleConfirm = async (logId: string) => {
    const originalLogs = logs;
    setLogs((prev) =>
      prev.map((log) => (log.id === logId ? { ...log, status: "dikonfirmasi" } : log))
    );
    try {
      await authFetch(`/api/dialysis-log/${logId}/confirm`, accessToken, {
        method: "POST",
      });
      dispatchSyncEvent(SYNC_EVENTS.CUCIDARAH_CONFIRMED);
    } catch {
      setLogs(originalLogs);
    } finally {
      await fetchLogs();
    }
  };

  const handleUnconfirm = async (logId: string) => {
    const originalLogs = logs;
    setLogs((prev) =>
      prev.map((log) => (log.id === logId ? { ...log, status: "tertunda" } : log))
    );
    try {
      await authFetch(`/api/dialysis-log/${logId}/unconfirm`, accessToken, {
        method: "POST",
      });
      dispatchSyncEvent(SYNC_EVENTS.CUCIDARAH_CONFIRMED);
    } catch {
      setLogs(originalLogs);
    } finally {
      await fetchLogs();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{ background: "#f0faf9", borderRadius: 13, height: 72 }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: "#fff5f5",
          border: "0.5px solid #fce4e4",
          borderRadius: 13,
          padding: "12px 14px",
          textAlign: "center",
        }}
      >
        <p className="font-sans" style={{ fontSize: 14, color: "#d4183d" }}>
          Gagal memuat data. Periksa koneksi internet Anda, lalu coba lagi.
        </p>
        <button
          onClick={fetchLogs}
          className="font-sans mt-2"
          style={{ fontSize: 14, color: "#0d4a44", textDecoration: "underline" }}
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header label */}
      <div className="flex items-center gap-2">
        <Droplets size={16} style={{ color: "#2a9d8f" }} />
        <p className="font-heading font-bold" style={{ fontSize: 15, color: "#1a2e2c" }}>
          Cuci Darah Hari Ini
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: "#f0faf9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Droplets size={24} style={{ color: "#cfe8e4" }} />
          </div>
          <p className="font-sans" style={{ fontSize: 14, color: "#3d6b66" }}>
            Tidak ada jadwal cuci darah hari ini
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <DialysisLogItem
              key={log.id}
              log={log}
              onConfirm={handleConfirm}
              onUnconfirm={handleUnconfirm}
            />
          ))}
        </div>
      )}
    </div>
  );
}
