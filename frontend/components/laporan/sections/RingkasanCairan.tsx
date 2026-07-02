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
  avgDailyBalance: number;
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
  const { totalIn, totalOut, balance, avgDailyBalance } = fluidSummary;
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
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#f0faf9] rounded-lg p-3">
              <p className="text-[10px] font-medium text-[#7a8c8a]">
                Total Masuk
              </p>
              <p className="text-sm font-bold text-[#1a2e2c]">{totalIn} ml</p>
            </div>
            <div className="bg-[#f0faf9] rounded-lg p-3">
              <p className="text-[10px] font-medium text-[#7a8c8a]">
                Total Keluar
              </p>
              <p className="text-sm font-bold text-[#1a2e2c]">{totalOut} ml</p>
            </div>
            <div className="bg-[#f0faf9] rounded-lg p-3">
              <p className="text-[10px] font-medium text-[#7a8c8a]">
                Selisih Total
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
            <div className="bg-[#f0faf9] rounded-lg p-3">
              <p className="text-[10px] font-medium text-[#7a8c8a]">
                Rata-rata Selisih Harian
              </p>
              <p
                className={`text-sm font-bold ${
                  avgDailyBalance > 0
                    ? "text-[#2a9d8f]"
                    : avgDailyBalance < 0
                      ? "text-[#d4183d]"
                      : "text-[#7a8c8a]"
                }`}
              >
                {avgDailyBalance > 0 ? "+" : ""}
                {Math.round(avgDailyBalance)} ml
              </p>
            </div>
          </div>
          {/* Per-day breakdown table */}
          {dailyBreakdown && dailyBreakdown.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-[#7a8c8a] uppercase tracking-wider mb-2">
                Rincian Harian
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#cccccc]" style={{ borderBottomWidth: 0.5 }}>
                    <th className="text-left font-bold text-[#7a8c8a] py-2 pr-2">Tanggal</th>
                    <th className="text-right font-bold text-[#7a8c8a] py-2 px-2">Masuk</th>
                    <th className="text-right font-bold text-[#7a8c8a] py-2 px-2">Keluar</th>
                    <th className="text-right font-bold text-[#7a8c8a] py-2 pl-2">Selisih</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyBreakdown.map((day) => {
                    const dayBalance = day.selisih;
                    return (
                      <tr key={day.tanggal} className="border-b border-[#e5e7eb]" style={{ borderBottomWidth: 0.5 }}>
                        <td className="font-medium text-[#1a2e2c] py-2 pr-2">{day.tanggal}</td>
                        <td className="text-right text-[#1a2e2c] py-2 px-2">{day.totalIn}</td>
                        <td className="text-right text-[#1a2e2c] py-2 px-2">{day.totalOut}</td>
                        <td
                          className={`text-right font-bold py-2 pl-2 ${
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
