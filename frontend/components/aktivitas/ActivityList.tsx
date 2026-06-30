"use client";

/**
 * ActivityList.tsx — List of today's activities for the Aktivitas tab
 *
 * Shows each activity with:
 * - Name and time range
 * - Status badge (Berlangsung/Selesai)
 * - Perasaan emoji if completed
 * - "Selesaikan" button for berlangsung activities
 *
 * Pattern: follows FluidLogList.tsx — authFetch, loading/error, refreshKey.
 */

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";
import { Clock, CheckCircle2, Play } from "lucide-react";
import { toast } from "sonner";
/**
 * Calculate duration in minutes since the activity started.
 */
function computeDurationMinutes(waktuMulai: string): number {
  const start = new Date(waktuMulai).getTime();
  const now = Date.now();
  return Math.floor((now - start) / 60000);
}

interface ActivityResult {
  id: string;
  namaKegiatan: string;
  waktuMulai: string;
  estimasiSelesai: string;
  status: string;
  waktuSelesai: string | null;
  perasaan: string | null;
  catatanPerasaan: string | null;
}

interface ActivityListProps {
  accessToken: string;
  refreshKey?: number;
}

const PERASAAN_LABEL: Record<string, string> = {
  nyaman: "😊 Nyaman",
  biasa: "😐 Biasa",
  lelah: "😅 Lelah",
  berat: "😰 Berat",
};

const PERASAAN_COLOR: Record<string, string> = {
  nyaman: "#2a9d8f",
  biasa: "#7a8c8a",
  lelah: "#ef9f27",
  berat: "#d4183d",
};

function formatWIB(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
}

/**
 * Calculate elapsed minutes past the estimated end time (WIB).
 * Returns null if the activity is still within the estimated time or completed.
 */
function getElapsedMinutesPastEnd(estimasiSelesai: string): number | null {

  function isPastEstimasi(estimasiSelesai: string): boolean {
    if (!estimasiSelesai) return false;
    return Date.now() > new Date(estimasiSelesai).getTime();
  }

  const now = Date.now() + 7 * 3600 * 1000; // WIB offset
  const end = new Date(estimasiSelesai).getTime();
  const elapsed = Math.floor((now - end) / 60000);
  return elapsed > 0 ? elapsed : null;
}

export default function ActivityList({
  accessToken,
  refreshKey = 0,
  onCompleteActivity,
}: ActivityListProps) {
  const [activities, setActivities] = useState<ActivityResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Poll every 60 seconds to update "Masih aktif · X menit lebih" counter
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchActivities = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await authFetch<{ activities: ActivityResult[] }>(
        "/api/activities",
        accessToken,
      );
      setActivities(data.activities ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat aktivitas");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities, refreshKey]);

  if (isLoading) {
    return (
      <p className="font-sans text-sm" style={{ color: "#7a8c8a" }}>
        Memuat...
      </p>
    );
  }

  if (error) {
    return (
      <p className="font-sans text-sm" style={{ color: "#d4183d" }}>
        {error}
      </p>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="font-sans font-medium" style={{ fontSize: 14, color: "#7a8c8a" }}>
          Belum ada aktivitas hari ini
        </p>
        <p className="font-sans" style={{ fontSize: 12, color: "#cfe8e4", marginTop: 4 }}>
          Mulai kegiatan dari halaman Beranda
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="rounded-xl px-4 py-3"
          style={{
            backgroundColor: "#fafdfc",
            border: "1px solid #e8f5f2",
          }}
        >
          <div className="flex items-center gap-3">
            {/* Status icon */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  activity.status === "selesai" ? "#e0f5f2" : "#fff8e6",
              }}
            >
              {activity.status === "selesai" ? (
                <CheckCircle2 size={16} color="#2a9d8f" />
              ) : (
                <Clock size={16} color="#ef9f27" />
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              {activity.status !== "selesai" && (
                <div className="flex items-center gap-1.5 mb-1">
                  {(() => {
                    const dur = computeDurationMinutes(activity.waktuMulai);
                    const hours = Math.floor(dur / 60);
                    const mins = dur % 60;
                    const durText = hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;
                    const overdue = activity.estimasiSelesai && isPastEstimasi(activity.estimasiSelesai);
                    if (overdue) {
                      return (
                        <span
                          className="font-sans font-medium inline-flex items-center gap-1"
                          style={{
                            fontSize: 10,
                            color: "#d4183d",
                            backgroundColor: "#fdecee",
                            borderRadius: 10,
                            padding: "2px 8px",
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#d4183d", display: "inline-block" }} />
                          {durText} · Terlambat
                        </span>
                      );
                    }
                    return (
                      <span
                        className="font-sans font-medium inline-flex items-center gap-1"
                        style={{
                          fontSize: 10,
                          color: "#2a9d8f",
                          backgroundColor: "#f0faf9",
                          borderRadius: 10,
                          padding: "2px 8px",
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#2a9d8f", display: "inline-block" }} />
                        {durText}
                      </span>
                    );
                  })()}
                </div>
              )}
              <p
                className="font-heading font-semibold truncate"
                style={{ fontSize: 14, color: "#1a2e2c" }}
              >
                {activity.namaKegiatan}
              </p>
              <p className="font-sans" style={{ fontSize: 11, color: "#7a8c8a" }}>
                {formatWIB(activity.waktuMulai)}
                {activity.waktuSelesai
                  ? ` — ${formatWIB(activity.waktuSelesai)}`
                  : ` — estimasi ${formatWIB(activity.estimasiSelesai)}`}
              </p>
            </div>

            {/* Status badge or complete button */}
            <div className="shrink-0">
              {activity.status === "selesai" ? (
              <div className="flex flex-col items-end gap-1">
              {activity.status === "selesai" ? (
                activity.perasaan ? (
                <>
                  <span
                    className="font-sans font-medium"
                    style={{
                      fontSize: 11,
                      color: PERASAAN_COLOR[activity.perasaan] ?? "#7a8c8a",
                      textAlign: "right",
                    }}
                  >
                    {PERASAAN_LABEL[activity.perasaan] ?? activity.perasaan}
                  </span>
                  {activity.catatanPerasaan && (
                    <span className="font-sans text-right" style={{ fontSize: 10, color: "#7a8c8a", maxWidth: 120, lineHeight: 1.3 }}>
                      {activity.catatanPerasaan}
                    </span>
                  )}
                </>
                ) : (
                  <span
                    className="font-sans"
                    style={{ fontSize: 11, color: "#2a9d8f" }}
                  >
                    ✅ Selesai
                  </span>
                )
              </div>
              ) : (
                <button
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("activity:complete", {
                        detail: { id: activity.id, namaKegiatan: activity.namaKegiatan },
                      }),
                    )
                  }
                  className="flex items-center gap-1 font-sans font-medium cursor-pointer active:scale-95 transition-transform"
                  style={{
                    fontSize: 11,
                    borderRadius: 20,
                    padding: "4px 12px",
                    backgroundColor: "#ef9f27",
                    color: "#ffffff",
                    border: "none",
                  }}
                  aria-label={`Selesaikan ${activity.namaKegiatan}`}
                >
                  <Play size={12} fill="white" />
                  Selesaikan
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
