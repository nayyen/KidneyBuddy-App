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

  const handleConfirm = async (reminderId: string) => {
    try {
      await authFetch("/api/medication-log/confirm", accessToken, {
        method: "POST",
        body: JSON.stringify({ reminderId }),
      });
      // Optimistically update status
      setLogs((prev) =>
        prev.map((log) =>
          log.reminderId === reminderId
            ? { ...log, status: "dikonfirmasi" }
            : log,
        ),
      );
    } catch {
      // Silently fail — user can retry
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
        <p className="font-sans" style={{ fontSize: 12, color: "#d4183d" }}>
          Gagal memuat data. Periksa koneksi internet Anda, lalu coba lagi.
        </p>
        <button
          onClick={fetchLogs}
          className="font-sans mt-2"
          style={{ fontSize: 12, color: "#2a9d8f", textDecoration: "underline" }}
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
          <Pill size={22} style={{ color: "#2a9d8f" }} />
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
            style={{ fontSize: 12, color: "#7a8c8a" }}
          >
            Konfirmasi dosis dari notifikasi pengingat akan muncul di sini.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {logs.map((log) => (
        <MedicationLogItem key={log.id} log={log} onConfirm={handleConfirm} />
      ))}
      <p
        className="font-sans text-right mt-1"
        style={{ fontSize: 10, color: "#7a8c8a" }}
      >
        {logs.length} entri obat
      </p>
    </div>
  );
}
