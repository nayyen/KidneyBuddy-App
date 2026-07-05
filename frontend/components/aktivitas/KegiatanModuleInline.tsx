"use client";

/**
 * KegiatanModuleInline.tsx — Beranda card showing current activity status
 *
 * Three states:
 * 1. No active activity: shows "Mulai Kegiatan" prompt (quiet teal card)
 * 2. Active within estimasiSelesai: shows elapsed "· Xm" duration in teal
 * 3. Active past estimasiSelesai: amber card, red "Terlewat X Menit" indicator
 *
 * Timer shows actual elapsed/overdue duration since waktuMulai/estimasiSelesai,
 * ticking live via the `now` state (updated every 60s).
 *
 * Selesai dispatches the shared `activity:complete` event (same as /catatan's
 * ActivityList) so AppShell opens FeelingsRatingSheet — quick-260705-r8b bug 4.
 *
 * Each render state's root container carries `self-start` so this card keeps
 * its intrinsic height regardless of sibling cards (ObatCard/CuciDarahCard)
 * growing in the shared grid row — quick-260705-r8b bug 5.
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
  refreshKey?: number;
  onMulaiKegiatan?: () => void;
}

// Device-timezone formatter (quick-260705-9n4 task 3): omitting `timeZone`
// lets Intl use the browser's own local timezone instead of a hardcoded
// Jakarta assumption.
function formatLocalTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Calculate elapsed minutes since the activity started (waktuMulai), as of `now`.
 */
function computeDurationMinutes(waktuMulai: string, now: number): number {
  const startTime = new Date(waktuMulai).getTime();
  if (now <= startTime) return 0;
  return Math.floor((now - startTime) / 60000);
}

/**
 * Minutes elapsed since estimasiSelesai was passed, as of `now` (min 1).
 * quick-260705-r8b bug 3 (frontend): drives the "Terlewat X Menit" indicator.
 */
function computeOverdueMinutes(estimasiSelesai: string, now: number): number {
  const endTime = new Date(estimasiSelesai).getTime();
  return Math.max(1, Math.floor((now - endTime) / 60000));
}

function isPastEstimasi(estimasiSelesai: string, now: number): boolean {
  return now > new Date(estimasiSelesai).getTime();
}

export default function KegiatanModuleInline({
  accessToken,
  refreshKey = 0,
  onMulaiKegiatan,
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

  // quick-260705-r8b bug 4: dispatch the SAME shared event /catatan's
  // ActivityList uses instead of hitting a dead `/finish` endpoint + no-op
  // callback prop. AppShell already listens for `activity:complete` and
  // opens FeelingsRatingSheet, which itself PATCHes /api/activities/:id/complete
  // — this must work identically whether the activity is within-estimate or
  // overdue, so no local branching on `pastEnd` here.
  const handleSelesai = () => {
    if (!activeActivity) return;
    window.dispatchEvent(
      new CustomEvent("activity:complete", {
        detail: { id: activeActivity.id, namaKegiatan: activeActivity.namaKegiatan },
      }),
    );
  };

  if (isLoading) {
    return (
      <div className="w-full self-start" style={{ background: "linear-gradient(145deg, #f0faf9, #e0f5f2)", borderRadius: 16, padding: 16 }}>
        <p className="font-sans text-sm" style={{ color: "#3d6b66" }}>Memuat...</p>
      </div>
    );
  }

  // State 1: No active activity — prompt to start
  if (!activeActivity) {
    return (
      <div
        className="w-full self-start cursor-pointer active:scale-[0.98] transition-transform"
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
  const pastEnd = isPastEstimasi(activeActivity.estimasiSelesai, now);
  // quick-260705-r8b bug 3 (frontend): while active and within estimate, show
  // elapsed time since waktuMulai ("· 13m"); once past estimasiSelesai, switch
  // to "Terlewat X Menit" in the existing red #d4183d overdue color — both
  // tick live via the `now` state.
  const durationMinutes = computeDurationMinutes(activeActivity.waktuMulai, now);
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  const durationText = hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;
  const overdueMinutes = computeOverdueMinutes(activeActivity.estimasiSelesai, now);
  const indicatorText = pastEnd ? `Terlewat ${overdueMinutes} Menit` : `· ${durationText}`;

  return (
    <div
      className="w-full self-start"
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
              {indicatorText}
            </span>
          </p>
          <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>
            Estimasi selesai: {formatLocalTime(activeActivity.estimasiSelesai)}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSelesai}
          className="font-sans font-medium transition-colors hover:opacity-90 active:opacity-80 shrink-0"
          style={{
            height: 32,
            paddingLeft: 12,
            paddingRight: 12,
            borderRadius: 16,
            fontSize: 12,
            backgroundColor: "#2a9d8f",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Selesai
        </button>
      </div>
    </div>
  );
}
