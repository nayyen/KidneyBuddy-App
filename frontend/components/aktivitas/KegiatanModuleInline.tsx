"use client";

/**
 * KegiatanModuleInline.tsx — Beranda card showing current activity status
 *
 * quick-260708-qqd fix 1: now renders EVERY currently in-progress activity
 * (each with its own "Selesai" button), stacked vertically, PLUS a persistent
 * "Mulai Kegiatan" entry so the user can always start another activity —
 * previously only the single most-recently-started activity was shown,
 * silently hiding any others already in progress.
 *
 * Per active activity row:
 * - Within estimasiSelesai: shows elapsed "· Xm" duration in teal
 * - Past estimasiSelesai: amber card, red "Terlambat X Menit" indicator
 *
 * Timer shows actual elapsed/overdue duration since waktuMulai/estimasiSelesai,
 * ticking live via the `now` state (updated every 60s).
 *
 * Selesai dispatches the shared `activity:complete` event (same as /catatan's
 * ActivityList) so AppShell opens FeelingsRatingSheet — quick-260705-r8b bug 4.
 *
 * The root container carries `self-start` so this card keeps its intrinsic
 * height regardless of sibling cards (ObatCard/CuciDarahCard) growing in the
 * shared grid row — quick-260705-r8b bug 5.
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

/** A single in-progress activity row, with its own Selesai button. */
function ActiveActivityRow({
  activity,
  now,
  onSelesai,
}: {
  activity: ActivityResult;
  now: number;
  onSelesai: (activity: ActivityResult) => void;
}) {
  const pastEnd = isPastEstimasi(activity.estimasiSelesai, now);
  // quick-260705-r8b bug 3 (frontend): while active and within estimate, show
  // elapsed time since waktuMulai ("· 13m"); once past estimasiSelesai, switch
  // to "Terlambat X Menit" in the existing red #d4183d overdue color — both
  // tick live via the `now` state.
  const durationMinutes = computeDurationMinutes(activity.waktuMulai, now);
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  const durationText = hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;
  const overdueMinutes = computeOverdueMinutes(activity.estimasiSelesai, now);
  const indicatorText = pastEnd ? `Terlambat ${overdueMinutes} Menit` : `· ${durationText}`;

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
            {activity.namaKegiatan}
            <span style={{ color: pastEnd ? "#d4183d" : "#2a9d8f", fontWeight: 700, marginLeft: 4 }}>
              {indicatorText}
            </span>
          </p>
          <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>
            Estimasi selesai: {formatLocalTime(activity.estimasiSelesai)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelesai(activity)}
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

export default function KegiatanModuleInline({
  accessToken,
  refreshKey = 0,
  onMulaiKegiatan,
}: KegiatanModuleInlineProps) {
  const [activeActivities, setActiveActivities] = useState<ActivityResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Poll every 60s to update duration counter in real-time
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchActiveActivities = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const data = await authFetch<{ activities: ActivityResult[] }>(
        "/api/activities/active-all",
        accessToken,
      );
      setActiveActivities(data.activities ?? []);
    } catch {
      setActiveActivities([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchActiveActivities();
  }, [fetchActiveActivities, refreshKey]);

  // quick-260705-r8b bug 4: dispatch the SAME shared event /catatan's
  // ActivityList uses instead of hitting a dead `/finish` endpoint + no-op
  // callback prop. AppShell already listens for `activity:complete` and
  // opens FeelingsRatingSheet, which itself PATCHes /api/activities/:id/complete
  // — this must work identically whether the activity is within-estimate or
  // overdue, so no local branching on `pastEnd` here.
  const handleSelesai = (activity: ActivityResult) => {
    window.dispatchEvent(
      new CustomEvent("activity:complete", {
        detail: { id: activity.id, namaKegiatan: activity.namaKegiatan },
      }),
    );
  };

  const handleMulai = () => window.dispatchEvent(new CustomEvent("activity:start"));

  if (isLoading) {
    return (
      <div className="w-full self-start" style={{ background: "linear-gradient(145deg, #f0faf9, #e0f5f2)", borderRadius: 16, padding: 16 }}>
        <p className="font-sans text-sm" style={{ color: "#3d6b66" }}>Memuat...</p>
      </div>
    );
  }

  const hasActive = activeActivities.length > 0;

  return (
    <div className="w-full self-start flex flex-col gap-2">
      {activeActivities.map((activity) => (
        <ActiveActivityRow
          key={activity.id}
          activity={activity}
          now={now}
          onSelesai={handleSelesai}
        />
      ))}

      {/* Mulai Kegiatan entry — always shown. When there's already >=1
          active activity, render a more compact prompt so a second/third
          activity can still be started without dominating the card. */}
      {!hasActive ? (
        <div
          className="w-full cursor-pointer active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(145deg, #f0faf9, #e0f5f2)", borderRadius: 16, padding: 16 }}
          onClick={handleMulai}
          role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter") handleMulai(); }}
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
      ) : (
        <button
          type="button"
          onClick={handleMulai}
          className="w-full flex items-center gap-2 justify-center transition-colors hover:opacity-90 active:opacity-80"
          style={{
            background: "#f0faf9",
            border: "1px dashed #cfe8e4",
            borderRadius: 12,
            padding: "8px 12px",
            cursor: "pointer",
          }}
          aria-label="Mulai kegiatan lain"
        >
          <Play size={14} color="#2a9d8f" />
          <span className="font-sans font-medium" style={{ fontSize: 12, color: "#2a9d8f" }}>
            Mulai Kegiatan Lain
          </span>
        </button>
      )}
    </div>
  );
}
