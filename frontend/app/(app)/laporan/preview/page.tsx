"use client";

/**
 * /laporan/preview — Report print preview (REPORT-01, REPORT-02)
 *
 * Reads `dari`, `sampai`, `catatan` from URL search params.
 * Fetches GET /api/report via authFetch, renders LaporanPreviewContent.
 * "Cetak / Simpan PDF" calls window.print().
 *
 * Print targeting: the preview wrapper uses literal className
 * "laporan-preview-content" for @media print CSS targeting.
 */
import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { authFetch } from "@/lib/api";
import LaporanPreviewContent, {
  type ReportData,
} from "@/components/laporan/LaporanPreviewContent";
import { ChevronLeft, Printer } from "lucide-react";

function LaporanPreviewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, isLoading, isAuthenticated, user } = useAuth();

  const dari = searchParams.get("dari") || "";
  const sampai = searchParams.get("sampai") || "";
  const catatan = searchParams.get("catatan") || "";

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Fetch report
  const fetchReport = useCallback(async () => {
    if (!accessToken || !dari || !sampai) return;
    setLoading(true);
    setError(null);
    try {
      const data = await authFetch<ReportData>(
        `/api/report?dari=${dari}&sampai=${sampai}`,
        accessToken,
      );
      setReport(data);
    } catch {
      setError(
        "Gagal memuat data laporan. Periksa koneksi, lalu coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, dari, sampai]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-xs font-medium text-[#7a8c8a]">Memuat...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div>
      {/* Screen header (hidden in print) */}
      <div className="no-print p-4 border-b border-[#f0faf9]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-xs font-medium text-[#7a8c8a] hover:text-[#1a2e2c] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Kembali ke Laporan
          </button>
          <h1 className="text-sm font-bold text-[#1a2e2c]">
            Pratinjau Laporan
          </h1>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#2a9d8f] text-white text-xs font-medium hover:bg-[#238a7d] transition-colors"
          >
            <Printer className="w-4 h-4" />
            Cetak / Simpan PDF
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <p className="text-xs font-medium text-[#7a8c8a]">
              Memuat data laporan...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <p className="text-xs font-medium text-[#d4183d] mb-4">
              {error}
            </p>
            <button
              type="button"
              onClick={fetchReport}
              className="h-9 px-4 rounded-xl bg-[#2a9d8f] text-white text-xs font-medium hover:bg-[#238a7d] transition-colors"
            >
              Muat Ulang Laporan
            </button>
          </div>
        ) : report ? (
          <LaporanPreviewContent
            report={report}
            catatan={catatan}
            dari={dari}
            sampai={sampai}
            namaLengkap={user?.namaLengkap || "Pasien"}
            metodeTerapi={user?.metodeTerapiAktif || null}
          />
        ) : null}
      </div>
    </div>
  );
}

export default function LaporanPreviewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><p className="text-xs font-medium text-[#7a8c8a]">Memuat...</p></div>}>
      <LaporanPreviewInner />
    </Suspense>
  );
}
