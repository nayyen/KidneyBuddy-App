"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import LifestyleSuggestionCard from "@/components/edukasi/LifestyleSuggestionCard";
import EdukasiSubNav from "@/components/edukasi/EdukasiSubNav";
import EducationList from "@/components/edukasi/EducationList";

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
      {/* Sub-nav: Edukasi (active, D-04) / Komunitas (D-01/D-02/D-03) */}
      <EdukasiSubNav />

      {/* Saran gaya hidup personalisasi (AI-04, D-12) */}
      <LifestyleSuggestionCard accessToken={accessToken} />

      {/* Konten edukasi terfilter berdasarkan metode terapi (EDU-01) */}
      <EducationList accessToken={accessToken} />
    </div>
  );
}
