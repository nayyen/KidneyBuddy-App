"use client";

/**
 * KegiatanModuleInline.tsx — Beranda card showing current activity status
 *
 * Three states:
 * 1. No active activity: shows "Mulai Kegiatan" prompt (quiet teal card)
 * 2. Active within estimasiSelesai: shows "Sedang: [nama]" in green with time
 * 3. Active past estimasiSelesai: amber "Masih Aktif · X menit lebih" banner
 *
 * Pattern: follows DeltaCairanCard.tsx (authFetch, loading/error states, refreshKey)
 */

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";
import { Play, Clock, AlertTriangle } from "lucide-react";

interface ActivityResult {
  id: string;
  userId: string;
  namaKegiatan: string;
  waktuMulai: string;
  estimasiSelesai: string;
  status: string;
  waktuSelesai: string | null;
  perasaan: string | null;
  catatanPerasaan: string | null;
  createdAt: string;
}

interface KegiatanModuleInlineProps {
  accessToken: string;
  /** Refresh key from parent — incremented after activity:saved event */
  refreshKey?: number;
}

function formatWIB(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
}

function computePastMinutes(estimasiSelesai: string): number {
  const endTime = new Date(estimasiSelesai).getTime();
  const now = Date.now();
  if (now <= endTime) return 0;
  return Math.floor((now - endTime) / 60000);
}

export default function KegiatanModuleInline({
  accessToken,
  refreshKey = 0,
  onMulaiKegiatan,
  onCompleteActivity,
}: KegiatanModuleInlineProps) {
  const [activeActivity, setActiveActivity] = useState<ActivityResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActiveActivity = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const data = await authFetch<ActivityResult | null>(
        "/api/activities/active",
        accessToken,
      );
      setActiveActivity(data);
    } catch {
      setActiveActivity(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchActiveActivity();
  }, [fetchActiveActivity, refreshKey]);

  if (isLoading) {
    return (
      <div
        className="w-full"
        style={{
          background: "linear-gradient(145deg, #f0faf9, #e0f5f2)",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <p className="font-sans text-sm" style={{ color: "#7a8c8a" }}>Memuat...</p>
      </div>
    );
  }

  // State 1: No active activity — prompt to start
  if (!activeActivity) {
    return (
      <div
        className="w-full cursor-pointer active:scale-[0.98] transition-transform"
        style={{
          background: "linear-gradient(145deg, #f0faf9, #e0f5f2)",
          borderRadius: 16,
          padding: 16,
        }}
        onClick={() => window.dispatchEvent(new CustomEvent("activity:start"))}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") window.dispatchEvent(new CustomEvent("activity:start"));
        }}
        aria-label="Mulai kegiatan"
      >
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 36,
              height: 36,
              background: "#2a9d8f",
              borderRadius: 10,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Play size={18} color="#ffffff" style={{ marginLeft: 2 }} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-heading font-bold"
              style={{ fontSize: 14, color: "#1a2e2c" }}
            >
              Mulai Kegiatan
            </p>
            <p className="font-sans" style={{ fontSize: 12, color: "#7a8c8a" }}>
              Catat aktivitas harianmu
            </p>
          </div>
        </div>
      </div>
    );
  }

  // State 2 & 3: Active activity — show status
  const pastMinutes = computePastMinutes(activeActivity.estimasiSelesai);
  const isPastEnd = pastMinutes > 0;

  return (
    <div
      className="w-full"
      style={{
        background: isPastEnd
          ? "linear-gradient(145deg, #fff8e6, #ffefbf)"
          : "linear-gradient(145deg, #f0faf9, #e0f5f2)",
        borderRadius: 16,
        padding: 16,
        border: isPastEnd ? "1px solid #ef9f27" : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 36,
            height: 36,
            background: isPastEnd ? "#ef9f27" : "#2a9d8f",
            borderRadius: 10,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isPastEnd ? (
            <AlertTriangle size={18} color="#ffffff" />
          ) : (
            <Clock size={18} color="#ffffff" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="font-heading font-bold"
            style={{ fontSize: 14, color: "#1a2e2c" }}
          >
            {isPastEnd ? (
              <>
                Masih Aktif{" "}
                <span style={{ color: "#ef9f27", fontWeight: 700 }}>
                  · {pastMinutes} menit lebih
                </span>
              </>
            ) : (
              `Sedang: ${activeActivity.namaKegiatan}`
            )}
          </p>
          <p className="font-sans" style={{ fontSize: 12, color: "#7a8c8a" }}>
            Mulai {formatWIB(activeActivity.waktuMulai)} · Estimasi{" "}
            {formatWIB(activeActivity.estimasiSelesai)}
          </p>
        </div>
        {!isPastEnd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(
                new CustomEvent("activity:complete", {
                  detail: { id: activeActivity.id, namaKegiatan: activeActivity.namaKegiatan },
                }),
              );
            }}
            className="shrink-0 cursor-pointer font-sans font-medium active:scale-95 transition-transform"
            style={{
              fontSize: 12,
              borderRadius: 20,
              padding: "6px 14px",
              background: "#2a9d8f",
              color: "#ffffff",
              border: "none",
            }}
            aria-label="Selesaikan kegiatan"
          >
            Selesai
          </button>
        )}
      </div>
    </div>
  );
}
