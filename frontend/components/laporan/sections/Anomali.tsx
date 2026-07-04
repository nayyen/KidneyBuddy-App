"use client";

/**
 * Anomali — Report section 4: detected anomalies (D-15, AI-05)
 *
 * Section container/heading unchanged from Phase 4's placeholder (teal
 * left-border card) — only the inner content changed: a 4-column table
 * (Tanggal | Tipe Anomali | Severity | Deskripsi) for >=1 anomaly in the
 * report's date range, or the same inline empty-state pattern as the
 * other 3 report sections when zero. Severity uses text color only (no
 * background chips) so this stays print-compatible with Phase 4's
 * existing @media print rules — no new print CSS needed.
 */
import { AlertTriangle } from "lucide-react";

export interface AnomaliRow {
  tanggal: string;
  tipeAnomali: string;
  severity: string; // "normal" | "tinggi"
  deskripsi: string;
}

interface Props {
  anomalies: AnomaliRow[];
}

// Mirrors AnomalyAlertCard.tsx's TYPE_LABELS — Bahasa Indonesia display
// labels for the rule-engine's tipeAnomali codes.
const TYPE_LABELS: Record<string, string> = {
  penurunan_volume_keluar: "Penurunan Volume Cairan Keluar",
  kondisi_cairan_abnormal: "Kondisi Cairan Tidak Normal",
  jadwal_terlewat: "Jadwal Terapi Terlewat",
  pola_asupan_menyimpang: "Pola Asupan Cairan Menyimpang",
};

function formatTanggal(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Anomali({ anomalies }: Props) {
  const hasData = anomalies.length > 0;

  return (
    <div className="laporan-section-card">
      {/* Section header with teal accent */}
      <div className="border-l-[3px] border-[#2a9d8f] pl-3 mb-4">
        <h2 className="text-sm font-bold text-[#1a2e2c]">
          Anomali Terdeteksi
        </h2>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center py-6 text-center">
          <AlertTriangle className="w-8 h-8 text-[#cfe8e4] mb-2" />
          <p className="text-xs font-medium text-[#7a8c8a] italic">
            Tidak ada anomali terdeteksi dalam periode yang dipilih.
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
                Tipe Anomali
              </th>
              <th className="text-[10px] font-medium text-[#7a8c8a] uppercase tracking-wider pb-1.5">
                Severity
              </th>
              <th className="text-[10px] font-medium text-[#7a8c8a] uppercase tracking-wider pb-1.5">
                Deskripsi
              </th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((row, i) => {
              const isTinggi = row.severity === "tinggi";
              return (
                <tr
                  key={i}
                  className="border-t border-[#f0faf9]"
                  style={{ pageBreakInside: "avoid" }}
                >
                  <td className="text-xs font-medium text-[#1a2e2c] py-1.5 pr-2 align-top whitespace-nowrap">
                    {formatTanggal(row.tanggal)}
                  </td>
                  <td className="text-xs font-medium text-[#1a2e2c] py-1.5 pr-2 align-top">
                    {TYPE_LABELS[row.tipeAnomali] ?? row.tipeAnomali}
                  </td>
                  <td
                    className={`text-xs py-1.5 pr-2 align-top ${
                      isTinggi
                        ? "font-bold text-[#d4183d]"
                        : "font-medium text-[#7a8c8a]"
                    }`}
                  >
                    {isTinggi ? "Tinggi" : "Normal"}
                  </td>
                  <td className="text-xs font-medium text-[#1a2e2c] py-1.5 align-top">
                    {row.deskripsi}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
