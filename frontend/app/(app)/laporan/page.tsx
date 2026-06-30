"use client";

/**
 * /laporan — Report generation screen (REPORT-01, REPORT-02)
 *
 * User selects a date range via LaporanDateRangeSelector, writes an optional
 * doctor note (max 500 chars), and taps "Buat Laporan" to navigate to the
 * preview page with date range and note as URL search params.
 *
 * The doctor note is NEVER persisted to the database — it lives only in
 * component state and a URL-encoded search param (D-06).
 */
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import LaporanDateRangeSelector from "@/components/laporan/LaporanDateRangeSelector";

export default function LaporanPage() {
  const router = useRouter();
  const { accessToken, isLoading, isAuthenticated } = useAuth();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [catatan, setCatatan] = useState("");
  const [hasValidRange, setHasValidRange] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleRangeChange = useCallback((s: string, e: string) => {
    setStartDate(s);
    setEndDate(e);
    setHasValidRange(true);
  }, []);

  const handleBuatLaporan = useCallback(() => {
    if (!hasValidRange || !startDate || !endDate) return;
    const params = new URLSearchParams({
      dari: startDate,
      sampai: endDate,
    });
    if (catatan.trim()) {
      params.set("catatan", catatan.trim());
    }
    router.push(`/laporan/preview?${params.toString()}`);
  }, [hasValidRange, startDate, endDate, catatan, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-xs font-medium text-[#7a8c8a]">Memuat...</p>
      </div>
    );
  }

  // Unauthenticated state — redirect will happen
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-4 space-y-6">
      {/* Back button + page heading */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#f0faf9] transition-colors"
          aria-label="Kembali"
        >
          <ChevronLeft className="w-5 h-5 text-[#7a8c8a]" />
        </button>
      {/* Page heading */}
        <h1 className="text-sm font-bold text-[#1a2e2c]">Buat Laporan</h1>
      </div>
        <p className="text-xs font-medium text-[#7a8c8a]" style={{ marginTop: 2 }}>
          Pilih periode untuk laporan kunjungan dokter kamu.
        </p>
      </div>

      {/* Date range selector */}
      <LaporanDateRangeSelector onChange={handleRangeChange} />

      {/* Doctor note textarea */}
      <div>
        <label
          htmlFor="catatan-dokter"
          className="block text-xs font-medium text-[#1a2e2c] mb-1"
        >
          Catatan untuk dokter (opsional)
        </label>
        <textarea
          id="catatan-dokter"
          maxLength={500}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Tuliskan catatan atau pertanyaan untuk dokter kamu..."
          className="flex min-h-[96px] max-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40 resize-y"
        />
        {/* Character counter */}
        <div className="flex justify-between mt-1">
          <span className="text-[10px] font-medium text-[#7a8c8a]">
            Tidak disimpan ke sistem.
          </span>
          <span
            className={`text-[10px] font-medium ${
              catatan.length >= 500
                ? "text-[#d4183d]"
                : catatan.length >= 400
                  ? "text-[#ef9f27]"
                  : "text-[#7a8c8a]"
            }`}
          >
            {catatan.length}/500
          </span>
        </div>
      </div>

      {/* Buat Laporan button */}
      <button
        type="button"
        disabled={!hasValidRange}
        onClick={handleBuatLaporan}
        className="w-full h-11 rounded-xl bg-[#2a9d8f] text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#238a7d] transition-colors"
      >
        Buat Laporan
      </button>
    </div>
  );
}
