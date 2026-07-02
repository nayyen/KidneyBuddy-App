"use client";

/**
 * ObatCard.tsx — Today's unconfirmed medications with inline confirm
 *
 * Fetches GET /api/medication-log/today.
 * For each unconfirmed (tertunda) medication, shows an inline "Sudah diminum" confirm toggle.
 * POST /api/medication-log/confirm on confirm; optimistically marks dikonfirmasi.
 *
 * Per UI-SPEC ObatCard:
 *   Empty: "Tidak ada obat hari ini" (body 12px muted)
 *   Confirmed check: teal circle #2a9d8f
 *   Card: white bg, border 0.5px #f0faf9, radius 14px, padding 14px
 */

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";
import { Check, Pill } from "lucide-react";

interface MedicationEntry {
  id: string;
  reminderId: string;
  namaObat: string;
  status: "dikonfirmasi" | "tertunda" | "terlewat";
  waktuPengingat: string;
}

interface ObatCardProps {
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

export default function ObatCard({ accessToken, refreshKey = 0 }: ObatCardProps) {
  const [entries, setEntries] = useState<MedicationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await authFetch<MedicationEntry[]>(
        "/api/medication-log/today",
        accessToken,
      );
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat obat");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries, refreshKey]);

  // Refresh when obat confirmed from another page or reminders updated
  useEffect(() => {
    const refresh = () => fetchEntries();
    window.addEventListener("obat:confirmed", refresh);
    window.addEventListener("reminder:updated", refresh);
    return () => {
      window.removeEventListener("obat:confirmed", refresh);
      window.removeEventListener("reminder:updated", refresh);
    };
  }, [fetchEntries]);

  const handleConfirm = async (reminderId: string) => {
    // Optimistic update
    setEntries((prev) =>
      prev.map((e) =>
        e.reminderId === reminderId ? { ...e, status: "dikonfirmasi" } : e,
      ),
    );
    try {
      await authFetch("/api/medication-log/confirm", accessToken, {
        method: "POST",
        body: JSON.stringify({ reminderId }),
      });
        // Refetch from server to get the true persisted state (not just optimistic)
        await fetchEntries();
        // Notify other pages (/catatan obat, PengingatBerikutnya) to refresh
        window.dispatchEvent(new CustomEvent("obat:confirmed"));
    } catch {
      // Revert on error
      setEntries((prev) =>
        prev.map((e) =>
          e.reminderId === reminderId ? { ...e, status: "tertunda" } : e,
        ),
      );
        // Still refetch to ensure UI matches server truth
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
        <Pill size={14} style={{ color: "#2a9d8f" }} />
        <p
          className="font-heading font-bold"
          style={{ fontSize: 14, color: "#1a2e2c" }}
        >
          Obat Hari Ini
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
          Tidak ada obat hari ini
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
                style={{
                  padding: "6px 0",
                }}
              >
                {/* Confirm circle */}
                <button
                  type="button"
                  onClick={() => !isConfirmed && handleConfirm(entry.reminderId)}
                  aria-label={isConfirmed ? "Sudah diminum" : "Tandai sudah diminum"}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    flexShrink: 0,
                    cursor: isConfirmed ? "default" : "pointer",
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

                {/* Medication name + time */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-sans font-medium truncate"
                    style={{
                      fontSize: 14,
                      color: isConfirmed ? "#3d6b66" : "#1a2e2c",
                      textDecoration: isConfirmed ? "line-through" : "none",
                    }}
                  >
                    {entry.namaObat}
                  </p>
                  <p
                    className="font-sans"
                    style={{ fontSize: 14, color: "#3d6b66" }}
                  >
                    {formatTime(entry.waktuPengingat)}
                  </p>
                    {isLate && (
                      <p
                        className="font-sans font-medium"
                        style={{ fontSize: 13, color: "#ef9f27", marginTop: 2 }}
                      >
                        Terlambat — segera minum obat
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
                    Sudah diminum
                  </span>
                )}

                {/* CTA for unconfirmed */}
                {!isConfirmed && (
                  <button
                    type="button"
                    onClick={() => handleConfirm(entry.reminderId)}
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
                    Sudah diminum
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
