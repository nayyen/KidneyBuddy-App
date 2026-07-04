"use client";

/**
 * /edukasi/komunitas — Quora-style community feed (COMMUNITY-01..03).
 * Replaces the 06-03 placeholder with the real CommunityFeed (list +
 * category/therapy filters + "Buat Postingan" composer), reusing the exact
 * auth-guard boilerplate from /edukasi.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import EdukasiSubNav from "@/components/edukasi/EdukasiSubNav";
import CommunityFeed from "@/components/komunitas/CommunityFeed";

export default function KomunitasPage() {
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
      <EdukasiSubNav />

      <CommunityFeed accessToken={accessToken} />
    </div>
  );
}
