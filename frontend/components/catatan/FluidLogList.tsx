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
import RangeFilterSelect, {
  type RangeLabel,
  rangeDaysFor,
} from "@/components/shared/RangeFilterSelect";

// Item 13: /api/fluid/recent has no native "all data" concept (it always
// takes a numeric `days`) — map the shared "Semua data" sentinel (0) to a
// generous practical value instead of omitting the param (which would
// default to 7). 3650 days (~10 years) comfortably covers any real usage
// history for this app.
const ALL_DATA_DAYS = 3650;

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
  // Item 13: range filter, default "Semua data".
  const [range, setRange] = useState<RangeLabel>("Semua data");

  const fetchEntries = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const days = rangeDaysFor(range) || ALL_DATA_DAYS;
      const data = await authFetch<{ entries: FluidEntry[] }>(
        `/api/fluid/recent?days=${days}`,
        accessToken,
      );
      setEntries(data.entries ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat catatan");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, range]);

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

  // Item 13: range dropdown stays visible above every state.
  const rangeDropdown = (
    <RangeFilterSelect
      value={range}
      onChange={setRange}
      aria-label="Filter rentang catatan cairan"
    />
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {rangeDropdown}
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
      <div className="space-y-3">
        {rangeDropdown}
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
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-3">
        {rangeDropdown}
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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rangeDropdown}
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
        return sortedDates.map((dateKey) => {
          // Fix 2 (quick-260708-qqd): per-day total fluid balance, same
          // +/-/0 color convention used elsewhere (RingkasanCairan, ActivityList).
          const dayEntries = groups[dateKey];
          const dayMasuk = dayEntries
            .filter((e) => e.tipe === "masuk")
            .reduce((sum, e) => sum + (Number(e.volume) || 0), 0);
          const dayKeluar = dayEntries
            .filter((e) => e.tipe === "keluar")
            .reduce((sum, e) => sum + (Number(e.volume) || 0), 0);
          const daySelisih = dayMasuk - dayKeluar;
          const selisihColor =
            daySelisih > 0 ? "#2a9d8f" : daySelisih < 0 ? "#d4183d" : "#7a8c8a";

          return (
          <div key={dateKey}>
            {/* Date section label — same style as ActivityList */}
            <div className="flex items-center justify-between mb-1.5 px-1">
              <p className="text-xs font-sans font-semibold text-muted-foreground uppercase tracking-wider">
                {getGroupLabel(dateKey)}
              </p>
              <p className="text-xs font-sans font-semibold" style={{ color: selisihColor }}>
                Selisih: {daySelisih > 0 ? "+" : ""}
                {daySelisih} ml
              </p>
            </div>
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
          );
        });
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
