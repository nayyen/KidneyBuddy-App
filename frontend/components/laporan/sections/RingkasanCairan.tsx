"use client";

/**
 * RingkasanCairan — Report section 1: fluid summary
 *
 * Renders total masuk/keluar/balance + per-day table.
 * Empty state with Droplets icon when no data.
 */
import { Droplets } from "lucide-react";

export interface FluidSummaryData {
  totalIn: number;
  totalOut: number;
  balance: number;
  dailyBreakdown: Array<{
    tanggal: string;
    totalIn: number;
    totalOut: number;
    selisih: number;
  }>;
}

interface Props {
  fluidSummary: FluidSummaryData;
}

export default function RingkasanCairan({ fluidSummary }: Props) {
  const { totalIn, totalOut, balance } = fluidSummary;
  const { dailyBreakdown } = fluidSummary;
  const hasData = totalIn > 0 || totalOut > 0;

  return (
    <div className="laporan-section-card">
      {/* Section header with teal accent */}
      <div className="border-l-[3px] border-[#2a9d8f] pl-3 mb-4">
        <h2 className="text-sm font-bold text-[#1a2e2c]">Ringkasan Cairan</h2>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Droplets className="w-12 h-12 text-[#cfe8e4] mb-3" />
          <p className="text-sm font-bold text-[#1a2e2c]">
            Tidak ada data cairan
          </p>
          <p className="text-xs font-medium text-[#7a8c8a] mt-1">
            Tidak ada catatan cairan dalam periode yang dipilih.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary rows */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#f0faf9] rounded-lg p-3 text-center">
              <p className="text-[10px] font-medium text-[#7a8c8a]">
                Total Masuk
              </p>
              <p className="text-sm font-bold text-[#1a2e2c]">{totalIn} ml</p>
            </div>
            <div className="bg-[#f0faf9] rounded-lg p-3 text-center">
              <p className="text-[10px] font-medium text-[#7a8c8a]">
                Total Keluar
              </p>
              <p className="text-sm font-bold text-[#1a2e2c]">{totalOut} ml</p>
            </div>
            <div className="bg-[#f0faf9] rounded-lg p-3 text-center">
              <p className="text-[10px] font-medium text-[#7a8c8a]">
                Selisih
              </p>
              <p
                className={`text-sm font-bold ${
                  balance > 0
                    ? "text-[#2a9d8f]"
                    : balance < 0
                      ? "text-[#d4183d]"
                      : "text-[#7a8c8a]"
                }`}
              >
                {balance > 0 ? "+" : ""}
                {balance} ml
              </p>
            </div>
          </div>
          {/* Per-day breakdown table */}
          {dailyBreakdown && dailyBreakdown.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-bold text-[#7a8c8a] uppercase tracking-wider mb-2">
                Rincian Harian
              </p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#cccccc]" style={{ borderBottomWidth: 0.5 }}>
                    <th className="text-left font-bold text-[#7a8c8a] py-1.5 pr-2">Tanggal</th>
                    <th className="text-right font-bold text-[#7a8c8a] py-1.5 px-2">Masuk</th>
                    <th className="text-right font-bold text-[#7a8c8a] py-1.5 px-2">Keluar</th>
                    <th className="text-right font-bold text-[#7a8c8a] py-1.5 pl-2">Selisih</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyBreakdown.map((day) => {
                    const dayBalance = day.selisih;
                    return (
                      <tr key={day.tanggal} className="border-b border-[#cccccc]" style={{ borderBottomWidth: 0.5 }}>
                        <td className="py-1.5 pr-2 text-[#1a2e2c]">
                          {new Date(day.tanggal + "T12:00:00").toLocaleDateString("id-ID", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td className="text-right py-1.5 px-2 text-[#1a2e2c]">{day.totalIn} ml</td>
                        <td className="text-right py-1.5 px-2 text-[#1a2e2c]">{day.totalOut} ml</td>
                        <td
                          className={`text-right py-1.5 pl-2 font-bold ${
                            dayBalance > 0
                              ? "text-[#2a9d8f]"
                              : dayBalance < 0
                                ? "text-[#d4183d]"
                                : "text-[#7a8c8a]"
                          }`}
                        >
                          {dayBalance > 0 ? "+" : ""}{dayBalance} ml
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
