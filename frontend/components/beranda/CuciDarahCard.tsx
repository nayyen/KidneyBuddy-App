"use client";

/**
 * CuciDarahCard.tsx — Today's dialysis (HD/CAPD) sessions with inline confirm
 *
 * Mirrors ObatCard structure but for Cuci Darah session compliance.
 * Fetches GET /api/dialysis-log/today.
 * For each unconfirmed session, shows an inline "Sudah Cuci Darah" confirm toggle.
 * POST /api/dialysis-log/confirm on confirm.
 *
 * Dispatches cucidarah:confirmed event for cross-page sync (/catatan, PengingatBerikutnya).
 */

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";
import { Check, Droplets } from "lucide-react";

interface DialysisEntry {
  id: string;
  reminderId: string;
  jenis: "capd" | "hd";
  nama: string;
  konsentrasiCapd: string | null;
  status: "dikonfirmasi" | "tertunda" | "terlewat";
  waktuPengingat: string;
}

interface CuciDarahCardProps {
  accessToken: string;
  refreshKey?: number;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const JENIS_LABELS: Record<string, string> = {
  capd: "CAPD",
  hd: "HD",
};

export default function CuciDarahCard({
  accessToken,
  refreshKey = 0,
}: CuciDarahCardProps) {
  const [entries, setEntries] = useState<DialysisEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await authFetch<DialysisEntry[]>(
        "/api/dialysis-log/today",
        accessToken,
      );
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat cuci darah");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries, refreshKey]);

  // Refresh when cuci darah confirmed from another page or reminders updated
  useEffect(() => {
    const refresh = () => fetchEntries();
    window.addEventListener("cucidarah:confirmed", refresh);
    window.addEventListener("reminder:updated", refresh);
    return () => {
      window.removeEventListener("cucidarah:confirmed", refresh);
      window.removeEventListener("reminder:updated", refresh);
    };
  }, [fetchEntries]);

  const handleConfirm = async (logId: string) => {
    const originalEntries = entries;
    setEntries((prev) =>
      prev.map((e) =>
        e.id === logId ? { ...e, status: "dikonfirmasi" } : e,
      ),
    );
    try {
      await authFetch(`/api/dialysis-log/${logId}/confirm`, accessToken, {
        method: "POST",
      });
      window.dispatchEvent(new CustomEvent("cucidarah:confirmed"));
    } catch {
      setEntries(originalEntries);
    } finally {
      await fetchEntries();
    }
  };

  const handleUnconfirm = async (logId: string) => {
    const originalEntries = entries;
    setEntries((prev) =>
      prev.map((e) =>
        e.id === logId ? { ...e, status: "tertunda" } : e,
      ),
    );
    try {
      await authFetch(`/api/dialysis-log/${logId}/unconfirm`, accessToken, {
        method: "POST",
      });
      window.dispatchEvent(new CustomEvent("cucidarah:confirmed"));
    } catch {
      setEntries(originalEntries);
    } finally {
      await fetchEntries();
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "0.5px solid #f0faf9",
        borderRadius: 14,
        padding: 14,
      }}
    >
      {/* Card title */}
      <div className="flex items-center gap-2 mb-3">
        <Droplets size={14} style={{ color: "#2a9d8f" }} />
        <p
          className="font-heading font-bold"
          style={{ fontSize: 14, color: "#1a2e2c" }}
        >
          Cuci Darah Hari Ini
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ height: 36, borderRadius: 8, background: "#f0faf9" }}
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-center">
          <p className="font-sans" style={{ fontSize: 12, color: "#d4183d" }}>
            Gagal memuat data.
          </p>
          <button
            onClick={fetchEntries}
            className="font-sans mt-1"
            style={{ fontSize: 14, color: "#0d4a44", textDecoration: "underline" }}
          >
            Coba Lagi
          </button>
        </div>
      ) : entries.length === 0 ? (
        <p className="font-sans" style={{ fontSize: 14, color: "#3d6b66" }}>
          Tidak ada jadwal cuci darah hari ini
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const isConfirmed = entry.status === "dikonfirmasi";
            const isLate =
              !isConfirmed &&
              entry.status === "tertunda" &&
              new Date(entry.waktuPengingat) < new Date();
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3"
                style={{ padding: "6px 0" }}
              >
                {/* Confirm circle */}
                <button
                  type="button"
                  onClick={() => isConfirmed ? handleUnconfirm(entry.id) : handleConfirm(entry.id)}
                  aria-label={isConfirmed ? "Batalkan konfirmasi" : "Tandai sudah cuci darah"}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    flexShrink: 0,
                    cursor: "pointer",
                    backgroundColor: isConfirmed ? "#2a9d8f" : "transparent",
                    border: isConfirmed ? "none" : "1.5px solid #cfe8e4",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background-color 0.2s",
                  }}
                >
                  {isConfirmed && <Check size={14} color="#ffffff" strokeWidth={2.5} />}
                </button>

                {/* Session name + time */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-sans font-medium truncate"
                    style={{
                      fontSize: 14,
                      color: isConfirmed ? "#3d6b66" : "#1a2e2c",
                      textDecoration: isConfirmed ? "line-through" : "none",
                    }}
                  >
                    {entry.nama}
                  </p>
                  <p className="font-sans" style={{ fontSize: 14, color: "#3d6b66" }}>
                    {formatTime(entry.waktuPengingat)} · {JENIS_LABELS[entry.jenis] ?? entry.jenis}
                  </p>
                  {isLate && (
                    <p
                      className="font-sans font-medium"
                      style={{ fontSize: 13, color: "#ef9f27", marginTop: 2 }}
                    >
                      Terlambat — segera lakukan cuci darah
                    </p>
                  )}
                </div>

                {/* Status label for confirmed */}
                {isConfirmed && (
                  <span
                    className="font-sans font-medium shrink-0"
                    style={{
                      fontSize: 13,
                      color: "#0d4a44",
                      paddingLeft: 6,
                      paddingRight: 6,
                      paddingTop: 2,
                      paddingBottom: 2,
                      borderRadius: 5,
                      backgroundColor: "#f0faf9",
                    }}
                  >
                    Sudah cuci darah
                  </span>
                )}

                {/* CTA for unconfirmed */}
                {!isConfirmed && (
                  <button
                    type="button"
                    onClick={() => handleConfirm(entry.id)}
                    className="font-sans font-medium shrink-0 transition-colors hover:opacity-80"
                    style={{
                      fontSize: 13,
                      color: "#0d4a44",
                      paddingLeft: 6,
                      paddingRight: 6,
                      paddingTop: 2,
                      paddingBottom: 2,
                      borderRadius: 5,
                      border: "0.5px solid #0d4a44",
                      background: "none",
                      cursor: "pointer",
                    }}
                  >
                    Sudah cuci darah
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
