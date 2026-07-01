"use client";

/**
 * FluidLogList.tsx — List of fluid log entries for a given date
 *
 * Fetches GET /api/fluid?date=YYYY-MM-DD and renders:
 * - Empty state if no entries
 * - Date header + list of FluidLogItem rows
 *
 * Refreshes when `refreshKey` increments (after a new entry is saved).
 */

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";
import FluidLogItem from "./FluidLogItem";
import { Droplets } from "lucide-react";

interface FluidEntry {
  id: string;
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

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00"); // Avoid timezone edge cases
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
      // Backend returns { date, entries: FluidEntry[] }
      const data = await authFetch<{ date: string; entries: FluidEntry[] } | FluidEntry[]>(
        `/api/fluid?date=${targetDate}`,
        accessToken,
      );
      const entries = Array.isArray(data) ? data : (data as { date: string; entries: FluidEntry[] }).entries ?? [];
      setEntries(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat catatan");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, targetDate]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries, refreshKey]);

  // Listen for fluid:saved events from the form to auto-refresh
  useEffect(() => {
    const handleSaved = () => {
      fetchEntries();
    };
    window.addEventListener("fluid:saved", handleSaved);
    return () => window.removeEventListener("fluid:saved", handleSaved);
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
    <div className="space-y-1">
      {/* Date header */}
      <p
        className="font-sans mb-2"
        style={{ fontSize: 13, color: "#3d6b66", textTransform: "capitalize" }}
      >
        {formatDateLabel(targetDate)}
      </p>

      {/* Entry list */}
      {entries.map((entry) => (
        <FluidLogItem key={entry.id} entry={entry} accessToken={accessToken} metodeTerapi={metodeTerapi} onEdited={fetchEntries} />
      ))}

      {/* Entry count footer */}
      <p
        className="font-sans text-right mt-1"
        style={{ fontSize: 13, color: "#3d6b66" }}
      >
        {entries.length} catatan
      </p>
    </div>
  );
}
