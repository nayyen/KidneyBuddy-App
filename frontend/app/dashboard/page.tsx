"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Profile {
  userId: string;
  namaLengkap: string;
  email: string;
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      setError("Tidak ada email — silakan daftar terlebih dahulu.");
      setLoading(false);
      return;
    }

    apiFetch<Profile>(`/api/auth/profile?email=${encodeURIComponent(email)}`)
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [email]);

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {loading && (
          <p className="text-muted-foreground font-sans">Memuat...</p>
        )}

        {error && (
          <div className="rounded-[14px] bg-destructive/10 p-6">
            <p className="text-destructive font-sans">{error}</p>
          </div>
        )}

        {profile && (
          <>
            <h1 className="font-heading text-2xl font-extrabold text-foreground mb-2">
              Halo, {profile.namaLengkap}!
            </h1>
            <p className="text-muted-foreground font-sans text-sm mb-6">
              Selamat datang di KidneyBuddy — pendamping harian ginjal Anda.
            </p>
            <div className="bg-card rounded-[14px] p-6 shadow-sm border border-border">
              <p className="text-sm font-sans text-foreground">
                Dasbor lengkap segera hadir di fase selanjutnya.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
