"use client";

/**
 * /edukasi/komunitas — new route (D-03) placeholder for the Quora-style
 * community feed (COMMUNITY-01..03, delivered in 06-06). Keeps the
 * Komunitas pill non-broken during this phase; reuses the exact auth-guard
 * boilerplate from /edukasi.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import EdukasiSubNav from "@/components/edukasi/EdukasiSubNav";

export default function KomunitasPage() {
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
    <div className="space-y-4">
      <EdukasiSubNav />

      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <Users size={48} color="#cfe8e4" strokeWidth={1.5} />
        <h2
          className="font-heading font-bold"
          style={{ fontSize: 14, color: "#1a2e2c" }}
        >
          Komunitas
        </h2>
        <p
          className="font-sans font-medium max-w-xs"
          style={{ fontSize: 14, color: "#3d6b66" }}
        >
          Diskusi sesama pasien akan tersedia di update berikutnya.
        </p>
      </div>
    </div>
  );
}
