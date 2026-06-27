"use client";

/**
 * catatan/obat/page.tsx — Medication log sub-route
 *
 * Accessible directly at /catatan/obat (standalone) or via the Catatan page's
 * Obat sub-tab. Renders MedicationLogList for today's dose confirmations.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import MedicationLogList from "@/components/catatan/MedicationLogList";

export default function CatatanObatPage() {
  const router = useRouter();
  const { accessToken, isLoading, isAuthenticated } = useAuth();

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
      <h1
        className="font-heading font-bold"
        style={{ fontSize: 14, color: "#1a2e2c" }}
      >
        Log Obat Hari Ini
      </h1>
      <MedicationLogList accessToken={accessToken} />
    </div>
  );
}
