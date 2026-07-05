"use client";

/**
 * FluidLogList.tsx — List of fluid log entries for a given date
 *
 * Fetches GET /api/fluid/recent?days=7 and renders entries grouped by:
 * - "Hari Ini" (today)
 * - "Kemarin" (yesterday)
 * - Date label with year (e.g. "Senin, 30 Juni 2026")
 *
 * Refreshes when `refreshKey` increments (after a new entry is saved).
 */

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";
import FluidLogItem from "./FluidLogItem";
import { Droplets } from "lucide-react";
import { SYNC_EVENTS } from "@/lib/syncEvents";

interface FluidEntry {
  id: string;
  tanggal: string;
  waktu: string;
  tipe: "masuk" | "keluar";
  sumber: string | null;
  konsentrasiCapd: string | null;
  volume: number;
  satuan: string;
  kondisiKeluar: string | null;
  catatan: string | null;
  isLateEntry: boolean;
  hasAbnormalCondition: boolean;
  createdAt: string;
}

interface FluidLogListProps {
  accessToken: string;
  /** YYYY-MM-DD — defaults to today if not passed */
  date?: string;
  /** Increment to trigger a refetch */
  refreshKey?: number;
  /** Active therapy method for CAPD-specific fields */
  metodeTerapi?: string;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function wibTodayStr(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function wibYesterdayStr(): string {
  return new Date(Date.now() + 7 * 3600 * 1000 - 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00"); // Avoid timezone edge cases
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getGroupLabel(tanggal: string): string {
  if (tanggal === wibTodayStr()) return "Hari Ini";
  if (tanggal === wibYesterdayStr()) return "Kemarin";
  return formatDateLabel(tanggal);
}

export default function FluidLogList({
  accessToken,
  date,
  refreshKey = 0,
  metodeTerapi,
}: FluidLogListProps) {
  const targetDate = date ?? todayDateString();
  const [entries, setEntries] = useState<FluidEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      // Fetch recent entries (last 7 days) for date-grouped view
      const data = await authFetch<{ entries: FluidEntry[] }>(
        `/api/fluid/recent?days=7`,
        accessToken,
      );
      setEntries(data.entries ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat catatan");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries, refreshKey]);

  // Listen for fluid:saved events from the form to auto-refresh
  useEffect(() => {
    const handleSaved = () => {
      fetchEntries();
    };
    window.addEventListener(SYNC_EVENTS.FLUID_SAVED, handleSaved);
    return () => window.removeEventListener(SYNC_EVENTS.FLUID_SAVED, handleSaved);
  }, [fetchEntries]);

  // Refetch on tab focus (quick-260705-9n4 task 5)
  useEffect(() => {
    const onFocus = () => fetchEntries();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchEntries();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchEntries]);

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
          {error}
        </p>
        <button
          onClick={fetchEntries}
          className="font-sans mt-2"
          style={{ fontSize: 14, color: "#0d4a44", textDecoration: "underline" }}
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center gap-3"
      >
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
          <Droplets size={22} style={{ color: "#0d4a44" }} />
        </div>
        <div>
          <p
            className="font-heading font-bold"
            style={{ fontSize: 14, color: "#1a2e2c" }}
          >
            Belum ada catatan cairan
          </p>
          <p
            className="font-sans mt-1 max-w-[200px] mx-auto"
            style={{ fontSize: 14, color: "#3d6b66" }}
          >
            Ketuk tombol Catat di bawah untuk mulai mencatat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(() => {
        // Group entries by tanggal
        const groups: Record<string, FluidEntry[]> = {};
        for (const entry of entries) {
          const key = entry.tanggal;
          if (!groups[key]) groups[key] = [];
          groups[key].push(entry);
        }
        // Sort dates descending (newest first)
        const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
        return sortedDates.map((dateKey) => (
          <div key={dateKey}>
            {/* Date section label — same style as ActivityList */}
            <p
              className="text-xs font-sans font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1"
            >
              {getGroupLabel(dateKey)}
            </p>
            <div className="space-y-2">
              {groups[dateKey].map((entry) => (
                <FluidLogItem
                  key={entry.id}
                  entry={entry}
                  accessToken={accessToken}
                  metodeTerapi={metodeTerapi}
                  onEdited={fetchEntries}
                />
              ))}
            </div>
          </div>
        ));
      })()}
      <p
        className="font-sans text-right mt-1"
        style={{ fontSize: 13, color: "#3d6b66" }}
      >
        {entries.length} catatan
      </p>
    </div>
  );
}
