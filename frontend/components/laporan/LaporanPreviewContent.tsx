"use client";

/**
 * LaporanPreviewContent — Assembles the full report preview
 *
 * Renders the report header block (title, patient info, period),
 * optional doctor note, and all four sections (Ringkasan Cairan,
 * Kepatuhan Obat, Kondisi CAPD, Anomali).
 *
 * Sections 1, 2, 4 always render. Section 3 (KondisiCAPD) renders
 * only when metodeTerapiAktif === 'CAPD'.
 *
 * Print targeting: wrapper div uses literal className "laporan-preview-content".
 */
import { Separator } from "@/components/ui/separator";
import RingkasanCairan, {
  type FluidSummaryData,
} from "@/components/laporan/sections/RingkasanCairan";
import KepatuhanObat, {
  type MedicationAdherenceData,
} from "@/components/laporan/sections/KepatuhanObat";
import KepatuhanCuciDarah, {
  type DialysisAdherenceData,
} from "@/components/laporan/sections/KepatuhanCuciDarah";
import KondisiCAPD, {
  type CAPDFrequencyData,
} from "@/components/laporan/sections/KondisiCAPD";
import Anomali, { type AnomaliRow } from "@/components/laporan/sections/Anomali";
import AktivitasReport, {
  type ActivityReportRow,
} from "@/components/laporan/sections/AktivitasReport";

export interface ReportData {
  fluidSummary: FluidSummaryData;
  medicationAdherence: MedicationAdherenceData;
  dialysisAdherence: DialysisAdherenceData;
  capdFrequency: CAPDFrequencyData;
  anomalies: AnomaliRow[];
  activities: ActivityReportRow[];
}

interface Props {
  report: ReportData;
  catatan?: string;
  dari: string;
  sampai: string;
  namaLengkap: string;
  metodeTerapi: string | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+07:00");
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPeriod(dari: string, sampai: string): string {
  return `${formatDate(dari)} — ${formatDate(sampai)}`;
}

export default function LaporanPreviewContent({
  report,
  catatan,
  dari,
  sampai,
  namaLengkap,
  metodeTerapi,
}: Props) {
  const todayStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="laporan-preview-content max-w-[800px] mx-auto space-y-6">
      {/* Report header block */}
      <div className="text-center">
        <h1 className="text-sm font-bold text-[#1a2e2c]">
          Laporan Kunjungan Dokter
        </h1>
      </div>

      <div className="space-y-1 text-xs font-medium text-[#7a8c8a]">
        <p>
          <span className="font-medium text-[#1a2e2c]">Nama:</span>{" "}
          {namaLengkap}
        </p>
        <p>
          <span className="font-medium text-[#1a2e2c]">Metode Terapi:</span>{" "}
          {metodeTerapi || "-"}
        </p>
        <p>
          <span className="font-medium text-[#1a2e2c]">Periode:</span>{" "}
          {formatPeriod(dari, sampai)}
        </p>
        <p>
          <span className="font-medium text-[#1a2e2c]">Dibuat:</span>{" "}
          {todayStr}
        </p>
      </div>

      <Separator />

      {/* Doctor note (only when non-empty) */}
      {catatan && (
        <div className="border border-[rgba(0,0,0,0.15)] rounded-lg p-3">
          <p className="text-[10px] font-bold text-[#1a2e2c] mb-1">
            Catatan Dokter:
          </p>
          <p className="text-xs font-medium text-[#1a2e2c] whitespace-pre-wrap">
            {catatan}
          </p>
        </div>
      )}

      {/* Section 1: Ringkasan Cairan */}
      <RingkasanCairan fluidSummary={report.fluidSummary} />

      {/* Section 2: Kepatuhan Obat */}
      <KepatuhanObat medicationAdherence={report.medicationAdherence} />

      {/* Section 2.5: Kepatuhan Cuci Darah (CAPD/HD only) */}
      {(metodeTerapi === "CAPD" || metodeTerapi === "HD") && (
        <KepatuhanCuciDarah dialysisAdherence={report.dialysisAdherence} />
      )}

      {/* Section 3: Kondisi CAPD (CAPD only) */}
      {metodeTerapi === "CAPD" && (
        <KondisiCAPD capdFrequency={report.capdFrequency} />
      )}

      {/* Section 3.5: Aktivitas (Fix 6, quick-260708-qqd) — placed after the
          therapy-adherence sections, before Anomali (report ends on the
          alert/safety summary). */}
      <AktivitasReport activities={report.activities} />

      {/* Section 4: Anomali Terdeteksi (D-15 — real data) */}
      <Anomali anomalies={report.anomalies} />
    </div>
  );
}
