"use client";

/**
 * KepatuhanObat — Report section 2: medication adherence
 *
 * Shows adherence % metric, progress bar, and per-medication breakdown.
 * Empty state with Pill icon when scheduled === 0.
 */
import { Pill } from "lucide-react";

export interface MedicationAdherenceData {
  taken: number;
  scheduled: number;
  pct: number;
}

interface Props {
  medicationAdherence: MedicationAdherenceData;
}

export default function KepatuhanObat({ medicationAdherence }: Props) {
  const { taken, scheduled, pct } = medicationAdherence;
  const hasData = scheduled > 0;

  return (
    <div className="laporan-section-card">
      {/* Section header with teal accent */}
      <div className="border-l-[3px] border-[#2a9d8f] pl-3 mb-4">
        <h2 className="text-sm font-bold text-[#1a2e2c]">Kepatuhan Obat</h2>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Pill className="w-12 h-12 text-[#cfe8e4] mb-3" />
          <p className="text-sm font-bold text-[#1a2e2c]">
            Tidak ada data obat
          </p>
          <p className="text-xs font-medium text-[#7a8c8a] mt-1">
            Tidak ada pengingat obat yang terjadwal dalam periode ini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Large adherence percentage */}
          <div className="text-center">
            <span className="adherence-metric-number text-[28px] font-bold text-[#1a2e2c]">
              {pct}%
            </span>
            <p className="text-xs font-medium text-[#7a8c8a] mt-1">
              dosis terkonfirmasi
            </p>
          </div>

          {/* Summary text */}
          <p className="text-xs font-medium text-[#7a8c8a] text-center">
            {taken} dari {scheduled} dosis terjadwal dikonfirmasi
          </p>

          {/* Progress bar */}
          <div className="w-full bg-[#f0faf9] rounded-full h-2">
            <div
              className="bg-[#2a9d8f] h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
