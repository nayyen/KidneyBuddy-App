"use client";

/**
 * PengingatBerikutnyaCard.tsx — Next upcoming reminder display
 *
 * Fetches GET /api/reminders/next.
 * Shows the next upcoming reminder's time + name.
 * Empty state: "Tidak ada pengingat berikutnya" per UI-SPEC.
 *
 * Per UI-SPEC desktop grid:
 *   DeltaCairanCard spans 2 columns, PengingatBerikutnyaCard spans 1 column.
 */

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";
import { Bell } from "lucide-react";

interface NextReminder {
  id: string;
  jenis: "obat" | "capd" | "hd";
  nama: string;
  jamPengingat: string;
  catatanWaktu?: string | null;
}

interface PengingatBerikutnyaCardProps {
  accessToken: string;
  refreshKey?: number;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  obat: { bg: "#f0faf9", text: "#0d4a44" },
  capd: { bg: "#f0faf9", text: "#0d4a44" },
  hd: { bg: "#fdf3e3", text: "#7a4c00" },
};

const TYPE_LABELS: Record<string, string> = {
  obat: "Obat",
  capd: "CAPD",
  hd: "HD",
};

export default function PengingatBerikutnyaCard({
  accessToken,
  refreshKey = 0,
}: PengingatBerikutnyaCardProps) {
  const [next, setNext] = useState<NextReminder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNext = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await authFetch<NextReminder | null>(
        "/api/reminders/next",
        accessToken,
      );
      setNext(data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat pengingat");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchNext();
  }, [fetchNext, refreshKey]);

  const typeStyle = next ? (TYPE_COLORS[next.jenis] ?? TYPE_COLORS.obat) : null;

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "0.5px solid #f0faf9",
        borderRadius: 14,
        padding: 14,
        height: "100%",
      }}
    >
      {/* Card title */}
      <div className="flex items-center gap-2 mb-3">
        <Bell size={14} style={{ color: "#0d4a44" }} />
        <p
          className="font-heading font-bold"
          style={{ fontSize: 14, color: "#1a2e2c" }}
        >
          Pengingat Berikutnya
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-1">
          <div
            className="animate-pulse"
            style={{ height: 24, borderRadius: 8, background: "#f0faf9" }}
          />
          <div
            className="animate-pulse"
            style={{ height: 16, borderRadius: 8, background: "#f0faf9", width: "60%" }}
          />
        </div>
      ) : error ? (
        <div>
          <p className="font-sans" style={{ fontSize: 14, color: "#d4183d" }}>
            Gagal memuat data.
          </p>
          <button
            onClick={fetchNext}
            className="font-sans mt-1"
            style={{ fontSize: 14, color: "#0d4a44", textDecoration: "underline" }}
          >
            Coba Lagi
          </button>
        </div>
      ) : !next ? (
        <p className="font-sans" style={{ fontSize: 14, color: "#3d6b66" }}>
          Tidak ada pengingat berikutnya
        </p>
      ) : (
        <div>
          {/* Time + type badge row */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className="font-heading font-bold"
              style={{ fontSize: 20, color: "#0d4a44", lineHeight: 1.2 }}
            >
              {next.jamPengingat}
            </span>
            {typeStyle && (
              <span
                className="font-sans font-medium"
                style={{
                  fontSize: 14,
                  paddingLeft: 6,
                  paddingRight: 6,
                  paddingTop: 2,
                  paddingBottom: 2,
                  borderRadius: 5,
                  backgroundColor: typeStyle.bg,
                  color: typeStyle.text,
                }}
              >
                {TYPE_LABELS[next.jenis] ?? next.jenis}
              </span>
            )}
          </div>

          {/* Reminder name */}
          <p
            className="font-sans font-medium"
            style={{ fontSize: 14, color: "#1a2e2c" }}
          >
            {next.nama}
          </p>

          {/* Timing note */}
          {next.catatanWaktu && (
            <p
              className="font-sans mt-0.5"
              style={{ fontSize: 14, color: "#3d6b66" }}
            >
              {next.catatanWaktu}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
