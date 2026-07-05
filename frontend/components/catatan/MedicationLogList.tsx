"use client";

/**
 * MedicationLogList.tsx — Today's medication log entries
 *
 * Fetches GET /api/medication-log/today and renders each entry
 * via MedicationLogItem. Allows inline confirmation.
 *
 * Empty state per UI-SPEC Catatan/Obat copy.
 */

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";
import MedicationLogItem, { type MedicationLog } from "./MedicationLogItem";
import { Pill } from "lucide-react";
import { SYNC_EVENTS, dispatchSyncEvent } from "@/lib/syncEvents";

interface MedicationLogListProps {
  accessToken: string;
  /** Increment to trigger a refetch */
  refreshKey?: number;
}

export default function MedicationLogList({
  accessToken,
  refreshKey = 0,
}: MedicationLogListProps) {
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await authFetch<MedicationLog[]>(
        "/api/medication-log/today",
        accessToken,
      );
      // Ensure array
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat log obat",
      );
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshKey]);

    // Refresh when obat confirmed from another page or reminders updated
    useEffect(() => {
      const refresh = () => fetchLogs();
      window.addEventListener(SYNC_EVENTS.OBAT_CONFIRMED, refresh);
      window.addEventListener(SYNC_EVENTS.REMINDER_UPDATED, refresh);
      return () => {
        window.removeEventListener(SYNC_EVENTS.OBAT_CONFIRMED, refresh);
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
      await authFetch(`/api/medication-log/${logId}/confirm`, accessToken, {
        method: "POST",
      });
      dispatchSyncEvent(SYNC_EVENTS.OBAT_CONFIRMED);
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
      await authFetch(`/api/medication-log/${logId}/unconfirm`, accessToken, {
        method: "POST",
      });
      dispatchSyncEvent(SYNC_EVENTS.OBAT_CONFIRMED);
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
            style={{
              background: "#f0faf9",
              borderRadius: 13,
              height: 48,
            }}
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

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "#f0faf9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Pill size={22} style={{ color: "#0d4a44" }} />
        </div>
        <div>
          <p
            className="font-heading font-bold"
            style={{ fontSize: 14, color: "#1a2e2c" }}
          >
            Belum ada log obat hari ini
          </p>
          <p
            className="font-sans mt-1 max-w-[220px] mx-auto"
            style={{ fontSize: 14, color: "#3d6b66" }}
          >
            Konfirmasi dosis dari notifikasi pengingat akan muncul di sini.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <p
        className="font-sans font-bold text-sm text-gray-500 mb-2 px-1"
        style={{ color: "#3d6b66" }}
      >
        Obat Hari Ini
      </p>
      <div className="space-y-2">
        {logs.map((log) => (
          <MedicationLogItem
            key={log.id}
            log={log}
            onConfirm={handleConfirm}
            onUnconfirm={handleUnconfirm}
          />
        ))}
      </div>
    </>
  );
}
