"use client";

/**
 * KegiatanModuleInline.tsx — Beranda card showing current activity status
 *
 * Three states:
 * 1. No active activity: shows "Mulai Kegiatan" prompt (quiet teal card)
 * 2. Active within estimasiSelesai: shows "Sedang: [nama]" in green with duration
 * 3. Active past estimasiSelesai: amber "Terlambat" + elapsed duration banner
 *
 * Timer shows actual duration since waktuMulai, updated every 60s.
 */

import { useEffect, useState, useCallback, useRef } from "react";
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
  refreshKey?: number;
  onMulaiKegiatan?: () => void;
  onCompleteActivity?: (id: string, nama: string) => void;
}

function formatWIB(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
}

/**
 * Calculate elapsed minutes since the activity started (waktuMulai).
 */
function computeDurationMinutes(waktuMulai: string): number {
  const startTime = new Date(waktuMulai).getTime();
  const now = Date.now();
  if (now <= startTime) return 0;
  return Math.floor((now - startTime) / 60000);
}

function isPastEstimasi(estimasiSelesai: string): boolean {
  return Date.now() > new Date(estimasiSelesai).getTime();
}

export default function KegiatanModuleInline({
  accessToken,
  refreshKey = 0,
  onMulaiKegiatan,
  onCompleteActivity,
}: KegiatanModuleInlineProps) {
  const [activeActivity, setActiveActivity] = useState<ActivityResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Poll every 60s to update duration counter in real-time
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchActiveActivity = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const data = await authFetch<ActivityResult | null>("/api/activities/active", accessToken);
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
      <div className="w-full" style={{ background: "linear-gradient(145deg, #f0faf9, #e0f5f2)", borderRadius: 16, padding: 16 }}>
        <p className="font-sans text-sm" style={{ color: "#3d6b66" }}>Memuat...</p>
      </div>
    );
  }

  // State 1: No active activity — prompt to start
  if (!activeActivity) {
    return (
      <div
        className="w-full cursor-pointer active:scale-[0.98] transition-transform"
        style={{ background: "linear-gradient(145deg, #f0faf9, #e0f5f2)", borderRadius: 16, padding: 16 }}
        onClick={() => window.dispatchEvent(new CustomEvent("activity:start"))}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") window.dispatchEvent(new CustomEvent("activity:start")); }}
        aria-label="Mulai kegiatan"
      >
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, background: "#2a9d8f", borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Play size={18} color="#ffffff" style={{ marginLeft: 2 }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading font-bold" style={{ fontSize: 14, color: "#1a2e2c" }}>Mulai Kegiatan</p>
            <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Catat aktivitas harianmu</p>
          </div>
        </div>
      </div>
    );
  }

  // State 2 & 3: Active activity
  const durationMinutes = computeDurationMinutes(activeActivity.waktuMulai);
  const pastEnd = isPastEstimasi(activeActivity.estimasiSelesai);
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  const durationText = hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;

  return (
    <div
      className="w-full"
      style={{
        background: pastEnd ? "linear-gradient(145deg, #fff8e6, #ffefbf)" : "linear-gradient(145deg, #f0faf9, #e0f5f2)",
        borderRadius: 16,
        padding: 16,
        border: pastEnd ? "1px solid #ef9f27" : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        <div style={{ width: 36, height: 36, background: pastEnd ? "#ef9f27" : "#2a9d8f", borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {pastEnd ? <AlertTriangle size={18} color="#ffffff" /> : <Clock size={18} color="#ffffff" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-bold" style={{ fontSize: 14, color: "#1a2e2c" }}>
            {activeActivity.namaKegiatan}
            <span style={{ color: pastEnd ? "#d4183d" : "#2a9d8f", fontWeight: 700, marginLeft: 4 }}>
              · {durationText}
            </span>
          </p>
          <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>
            Mulai {formatWIB(activeActivity.waktuMulai)} · Estimasi {formatWIB(activeActivity.estimasiSelesai)}
            {pastEnd && <span style={{ color: "#ef9f27", marginLeft: 4 }}>· Lebih Dari Waktu Estimasi</span>}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onCompleteActivity?.(activeActivity.id, activeActivity.namaKegiatan); }}
          className="font-sans font-medium cursor-pointer active:scale-95 transition-transform shrink-0"
          style={{
            fontSize: 13,
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
      </div>
    </div>
  );
}
