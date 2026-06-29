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
}

interface Props {
  fluidSummary: FluidSummaryData;
}

export default function RingkasanCairan({ fluidSummary }: Props) {
  const { totalIn, totalOut, balance } = fluidSummary;
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
        </div>
      )}
    </div>
  );
}
