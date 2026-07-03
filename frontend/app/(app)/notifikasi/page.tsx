"use client";

/**
 * /notifikasi — Alert history page (D-09, ANOMALY-04).
 *
 * NOT a bottom-nav tab — reachable via the TopBar/MobileHeader bell icons
 * and the "Lihat Semua Peringatan" link on Beranda's AnomalyAlertSection.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import AlertHistoryList from "@/components/anomaly/AlertHistoryList";

export default function NotifikasiPage() {
  const router = useRouter();
  const { accessToken, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-xs font-medium text-[#3d6b66]">Memuat...</p>
      </div>
    );
  }

  if (!isAuthenticated || !accessToken) return null;

  return (
    <div
      className="notifikasi-page-container mx-auto space-y-4"
      style={{ maxWidth: 640, padding: 16 }}
    >
      <style>{`
        @media (min-width: 768px) {
          .notifikasi-page-container { padding: 24px !important; }
        }
      `}</style>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#f0faf9] transition-colors"
          aria-label="Kembali"
        >
          <ChevronLeft className="w-5 h-5 text-[#3d6b66]" />
        </button>
        <h1 className="text-sm font-bold text-[#1a2e2c]">Riwayat Peringatan</h1>
      </div>

      <AlertHistoryList accessToken={accessToken} />
    </div>
  );
}
