"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { BookOpen } from "lucide-react";
import LifestyleSuggestionCard from "@/components/edukasi/LifestyleSuggestionCard";

export default function EdukasiPage() {
  const router = useRouter();
  const { accessToken, isLoading, isAuthenticated } = useAuth();

  // Auth redirect guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground font-sans text-sm">Memuat...</p>
      </div>
    );
  }

  if (!isAuthenticated || !accessToken) return null;

  return (
    <div className="space-y-4">
      {/* Saran gaya hidup personalisasi (AI-04, D-12) */}
      <LifestyleSuggestionCard accessToken={accessToken} />

      {/* Konten edukasi terjadwal — Phase 6 scope, tetap sebagai placeholder */}
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <BookOpen size={48} color="#cfe8e4" strokeWidth={1.5} />
        <h2
          className="font-heading font-bold"
          style={{ fontSize: 14, color: "#1a2e2c" }}
        >
          Konten Segera Hadir
        </h2>
        <p
          className="font-sans font-medium max-w-xs"
          style={{ fontSize: 14, color: "#3d6b66" }}
        >
          Artikel dan panduan edukasi akan tersedia di update berikutnya.
        </p>
      </div>
    </div>
  );
}
