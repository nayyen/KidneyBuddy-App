"use client";

/**
 * AktivitasReport — Report section: Aktivitas (Fix 6, quick-260708-qqd)
 *
 * Renders a table of ALL activity data in the report's date range (nama,
 * tanggal, waktu, durasi menit, perasaan, catatan) — on screen AND
 * print/PDF, since LaporanPreviewContent's DOM is shared between the two
 * (window.print of the same content). Same `.laporan-section-card` wrapper
 * + teal left-accent header + table styling pattern as RingkasanCairan's
 * "Rincian Harian" table / Anomali's table.
 */
import { Activity } from "lucide-react";
import { PERASAAN_COLOR, PERASAAN_LABEL } from "@/lib/perasaan";

export interface ActivityReportRow {
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string | null;
  namaKegiatan: string;
  durasiMenit: number | null;
  perasaan: string | null;
  catatan: string | null;
}

interface Props {
  activities: ActivityReportRow[];
}

function formatTanggal(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatWaktu(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDurasi(menit: number | null): string {
  if (menit === null) return "-";
  const hours = Math.floor(menit / 60);
  const mins = menit % 60;
  return hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;
}

export default function AktivitasReport({ activities }: Props) {
  const hasData = activities.length > 0;

  return (
    <div className="laporan-section-card">
      {/* Section header with teal accent */}
      <div className="border-l-[3px] border-[#2a9d8f] pl-3 mb-4">
        <h2 className="text-sm font-bold text-[#1a2e2c]">Aktivitas</h2>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center py-6 text-center">
          <Activity className="w-8 h-8 text-[#cfe8e4] mb-2" />
          <p className="text-xs font-medium text-[#7a8c8a] italic">
            Tidak ada aktivitas tercatat dalam periode yang dipilih.
          </p>
        </div>
      ) : (
        <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className="text-[10px] font-medium text-[#7a8c8a] uppercase tracking-wider pb-1.5">
                Tanggal
              </th>
              <th className="text-[10px] font-medium text-[#7a8c8a] uppercase tracking-wider pb-1.5">
                Kegiatan
              </th>
              <th className="text-[10px] font-medium text-[#7a8c8a] uppercase tracking-wider pb-1.5">
                Durasi
              </th>
              <th className="text-[10px] font-medium text-[#7a8c8a] uppercase tracking-wider pb-1.5">
                Perasaan
              </th>
              <th className="text-[10px] font-medium text-[#7a8c8a] uppercase tracking-wider pb-1.5">
                Catatan
              </th>
            </tr>
          </thead>
          <tbody>
            {activities.map((row, i) => (
              <tr
                key={i}
                className="border-t border-[#f0faf9]"
                style={{ pageBreakInside: "avoid" }}
              >
                <td className="text-xs font-medium text-[#1a2e2c] py-1.5 pr-2 align-top whitespace-nowrap">
                  {formatTanggal(row.tanggal)}
                </td>
                <td className="text-xs font-medium text-[#1a2e2c] py-1.5 pr-2 align-top">
                  {row.namaKegiatan}
                  <div className="text-[10px] font-medium text-[#7a8c8a]">
                    {formatWaktu(row.waktuMulai)}
                    {row.waktuSelesai ? ` — ${formatWaktu(row.waktuSelesai)}` : ""}
                  </div>
                </td>
                <td className="text-xs font-medium text-[#1a2e2c] py-1.5 pr-2 align-top whitespace-nowrap">
                  {formatDurasi(row.durasiMenit)}
                </td>
                <td className="text-xs font-medium py-1.5 pr-2 align-top">
                  {row.perasaan ? (
                    <span
                      className="inline-block rounded-full px-2 py-0.5 font-semibold"
                      style={{
                        color: PERASAAN_COLOR[row.perasaan] ?? "#1a2e2c",
                        backgroundColor: `${PERASAAN_COLOR[row.perasaan] ?? "#7a8c8a"}20`,
                      }}
                    >
                      {PERASAAN_LABEL[row.perasaan] ?? row.perasaan}
                    </span>
                  ) : (
                    <span className="text-[#1a2e2c]">-</span>
                  )}
                </td>
                <td className="text-xs font-medium text-[#1a2e2c] py-1.5 align-top">
                  {row.catatan || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
