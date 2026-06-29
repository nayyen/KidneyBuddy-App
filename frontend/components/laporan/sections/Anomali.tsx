"use client";

/**
 * Anomali — Report section 4: detected anomalies placeholder
 *
 * Phase 4 placeholder (D-09): shows a static message indicating
 * anomaly detection will be available after AI feature activation.
 * Phase 5 replaces the inner card with real anomaly data.
 */
import { AlertTriangle } from "lucide-react";

export default function Anomali() {
  return (
    <div className="laporan-section-card">
      {/* Section header with teal accent */}
      <div className="border-l-[3px] border-[#2a9d8f] pl-3 mb-4">
        <h2 className="text-sm font-bold text-[#1a2e2c]">
          Anomali Terdeteksi
        </h2>
      </div>

      <div className="flex flex-col items-center py-6 text-center">
        <AlertTriangle className="w-10 h-10 text-[#cfe8e4] mb-2" />
        <p className="text-xs font-medium text-[#7a8c8a] italic">
          Deteksi anomali akan tersedia setelah fitur AI diaktifkan.
        </p>
      </div>
    </div>
  );
}
