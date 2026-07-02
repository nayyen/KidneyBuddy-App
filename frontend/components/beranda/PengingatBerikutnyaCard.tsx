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
import { Bell, Droplets, Pill } from "lucide-react";

interface NextReminder {
  id: string;
  jenis: "obat" | "capd" | "hd";
  nama: string;
  jamPengingat: string;
  catatanWaktu?: string | null;
}
interface GroupedNextReminder {
  obat: NextReminder | null;
  cuciDarah: NextReminder | null;
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
    const [grouped, setGrouped] = useState<GroupedNextReminder>({
      obat: null,
      cuciDarah: null,
    });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNext = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
        const data = await authFetch<GroupedNextReminder>(
        "/api/reminders/next",
        accessToken,
      );
        setGrouped(data ?? { obat: null, cuciDarah: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat pengingat");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchNext();
  }, [fetchNext, refreshKey]);


    // Refresh when medication, cuci darah, or reminder data changes
    useEffect(() => {
      const refresh = () => fetchNext();
      window.addEventListener("obat:confirmed", refresh);
      window.addEventListener("cucidarah:confirmed", refresh);
      window.addEventListener("reminder:updated", refresh);
      return () => {
        window.removeEventListener("obat:confirmed", refresh);
        window.removeEventListener("cucidarah:confirmed", refresh);
        window.removeEventListener("reminder:updated", refresh);
      };
    }, [fetchNext]);

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
          ) : !grouped.obat && !grouped.cuciDarah ? (
            <p className="font-sans" style={{ fontSize: 14, color: "#3d6b66" }}>
              Tidak ada pengingat berikutnya
            </p>
          ) : (
            <div className="space-y-3">
              {/* Section 1: Pengingat Obat Berikutnya */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Pill size={12} style={{ color: "#0d4a44" }} />
                  <p className="font-sans font-semibold" style={{ fontSize: 13, color: "#3d6b66" }}>
                    Pengingat Obat
                  </p>
                </div>
                {!grouped.obat ? (
                  <p className="font-sans" style={{ fontSize: 14, color: "#3d6b66" }}>
                    Tidak ada pengingat obat berikutnya
                  </p>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-heading font-bold" style={{ fontSize: 20, color: "#0d4a44", lineHeight: 1.2 }}>
                        {grouped.obat.jamPengingat}
                      </span>
                      <span className="font-sans font-medium" style={{ fontSize: 13, paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2, borderRadius: 5, backgroundColor: (TYPE_COLORS[grouped.obat.jenis] ?? TYPE_COLORS.obat).bg, color: (TYPE_COLORS[grouped.obat.jenis] ?? TYPE_COLORS.obat).text }}>
                        {TYPE_LABELS[grouped.obat.jenis] ?? grouped.obat.jenis}
                      </span>
                    </div>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>
                      {grouped.obat.nama}
                    </p>
                    {grouped.obat.catatanWaktu && (
                      <p className="font-sans mt-0.5" style={{ fontSize: 13, color: "#3d6b66" }}>
                        {grouped.obat.catatanWaktu}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Horizontal divider between sections */}
              {grouped.obat && grouped.cuciDarah && (
                <hr style={{ border: "none", borderTop: "1px solid #e6f5f3", margin: "0" }} />
              )}

              {/* Section 2: Pengingat Cuci Darah Berikutnya */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Droplets size={12} style={{ color: "#0d4a44" }} />
                  <p className="font-sans font-semibold" style={{ fontSize: 13, color: "#3d6b66" }}>
                    Pengingat Cuci Darah
                  </p>
                </div>
                {!grouped.cuciDarah ? (
                  <p className="font-sans" style={{ fontSize: 14, color: "#3d6b66" }}>
                    Tidak ada pengingat cuci darah berikutnya
                  </p>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-heading font-bold" style={{ fontSize: 20, color: "#0d4a44", lineHeight: 1.2 }}>
                        {grouped.cuciDarah.jamPengingat}
                      </span>
                      <span className="font-sans font-medium" style={{ fontSize: 13, paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2, borderRadius: 5, backgroundColor: (TYPE_COLORS[grouped.cuciDarah.jenis] ?? TYPE_COLORS.obat).bg, color: (TYPE_COLORS[grouped.cuciDarah.jenis] ?? TYPE_COLORS.obat).text }}>
                        {TYPE_LABELS[grouped.cuciDarah.jenis] ?? grouped.cuciDarah.jenis}
                      </span>
                    </div>
                    <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>
                      {grouped.cuciDarah.nama}
                    </p>
                    {grouped.cuciDarah.catatanWaktu && (
                      <p className="font-sans mt-0.5" style={{ fontSize: 13, color: "#3d6b66" }}>
                        {grouped.cuciDarah.catatanWaktu}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
      </div>
    );
  }
