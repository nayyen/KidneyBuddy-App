"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { BookOpen } from "lucide-react";

export default function EdukasiPage() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();

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

  if (!isAuthenticated) return null;

  return (
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
        style={{ fontSize: 12, color: "#7a8c8a" }}
      >
        Artikel dan panduan edukasi akan tersedia di update berikutnya.
      </p>
    </div>
  );
}
