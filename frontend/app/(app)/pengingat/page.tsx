"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

export default function PengingatPage() {
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
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      <h2
        className="font-heading font-bold"
        style={{ fontSize: 14, color: "#1a2e2c" }}
      >
        Belum ada pengingat
      </h2>
      <p
        className="font-sans font-medium max-w-xs"
        style={{ fontSize: 12, color: "#7a8c8a" }}
      >
        Tambahkan pengingat agar tidak melewatkan jadwal terapi atau obat.
      </p>
      <button
        className="font-sans font-medium transition-colors hover:opacity-90 active:opacity-75"
        style={{
          height: 44,
          borderRadius: 20,
          backgroundColor: "#2a9d8f",
          color: "#ffffff",
          fontSize: 14,
          paddingLeft: 24,
          paddingRight: 24,
          cursor: "pointer",
        }}
        onClick={() => {
          // TODO: open AddReminderSheet — wired in plan 02-05
        }}
      >
        Tambah Pengingat
      </button>
    </div>
  );
}
