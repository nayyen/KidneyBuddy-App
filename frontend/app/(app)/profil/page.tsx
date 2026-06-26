"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { authFetch } from "@/lib/api";
import type { TherapyHistoryEntry } from "@/lib/validators/profile.schema";
import ChangeTherapyDialog from "./_components/ChangeTherapyDialog";
import ReplayTutorialButton from "./_components/ReplayTutorialButton";

interface ProfileData {
  userId: string;
  namaLengkap: string;
  email: string;
  metodeTerapiAktif: string;
  tanggalMulaiTerapi: string | null;
}

const therapyColorMap: Record<string, string> = {
  CAPD: "#2a9d8f",
  HD: "#ef9f27",
  Transplantasi: "#6b5ca5",
};

const therapyBgMap: Record<string, string> = {
  CAPD: "#f0faf9",
  HD: "#fdf3e3",
  Transplantasi: "#f1eef9",
};

export default function ProfilePage() {
  const router = useRouter();
  const { accessToken, isLoading, isAuthenticated, refreshAccessToken } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [therapyHistory, setTherapyHistory] = useState<TherapyHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!accessToken) return;
    try {
      // Try refresh first — access token may have expired
      let token = accessToken;
      const refreshed = await refreshAccessToken();
      if (refreshed) token = refreshed;
      const data = await authFetch<ProfileData>("/api/auth/me", token);
      setProfile(data);
    } catch (err: any) {
      if (err?.status === 401) {
        // Token truly expired — try one more refresh then give up
        const retryToken = await refreshAccessToken();
        if (retryToken) {
          const data = await authFetch<ProfileData>("/api/auth/me", retryToken);
          setProfile(data);
        } else {
          router.replace("/login");
        }
      } else {
        setError(err.message);
      }
    }
  }, [accessToken, refreshAccessToken, router]);

  const fetchTherapyHistory = useCallback(async () => {
    if (!accessToken) return;
    try {
      let token = accessToken;
      const refreshed = await refreshAccessToken();
      if (refreshed) token = refreshed;
      const data = await authFetch<TherapyHistoryEntry[]>("/api/profile/therapy-history", token);
      setTherapyHistory(data);
    } catch {
      // Silently fail — history section just won't show
    }
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !accessToken) {
      router.replace("/login");
      return;
    }
    fetchProfile();
    fetchTherapyHistory();
  }, [isLoading, isAuthenticated, accessToken, router, fetchProfile, fetchTherapyHistory]);

  function handleTherapyChanged() {
    fetchProfile();
    fetchTherapyHistory();
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-sans">Memuat...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-[14px] bg-destructive/10 p-6">
            <p className="text-destructive font-sans">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  const therapyColor = profile?.metodeTerapiAktif
    ? therapyColorMap[profile.metodeTerapiAktif] ?? "#64748b"
    : "#64748b";
  const therapyBg = profile?.metodeTerapiAktif
    ? therapyBgMap[profile.metodeTerapiAktif] ?? "#f8fafc"
    : "#f8fafc";

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">
            Profil
          </h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            Kelola informasi akun dan terapi kamu
          </p>
        </div>

        {/* Profile info card */}
        {profile && (
          <div className="rounded-[14px] bg-card p-5 shadow-sm border border-border space-y-4">
            {/* Avatar & nama */}
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-heading font-bold text-xl"
                style={{ backgroundColor: therapyColor }}
              >
                {profile.namaLengkap.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-heading font-bold text-foreground text-base">
                  {profile.namaLengkap}
                </h2>
                <p className="text-sm text-muted-foreground font-sans">
                  {profile.email}
                </p>
              </div>
            </div>

            {/* Divider */}
            <hr className="border-border" />

            {/* Terapi aktif */}
            <div>
              <p className="text-xs font-medium text-muted-foreground font-sans uppercase tracking-wide mb-2">
                Terapi Aktif
              </p>
              <div
                className="rounded-[10px] p-3 flex items-center gap-3"
                style={{ backgroundColor: therapyBg }}
              >
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: therapyColor }}
                />
                <div>
                  <p className="font-heading font-semibold text-foreground text-sm">
                    {profile.metodeTerapiAktif}
                  </p>
                  {profile.tanggalMulaiTerapi && (
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">
                      Sejak {profile.tanggalMulaiTerapi}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Change therapy button */}
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="w-full rounded-[14px] border border-border px-4 py-3 font-sans text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Ubah Metode Terapi
            </button>
          </div>
        )}

        {/* Therapy history */}
        {therapyHistory.length > 0 && (
          <div className="rounded-[14px] bg-card p-5 shadow-sm border border-border">
            <h3 className="font-heading font-bold text-foreground text-sm mb-3">
              Riwayat Perubahan Terapi
            </h3>
            <div className="space-y-3">
              {therapyHistory.map((entry) => {
                const color = therapyColorMap[entry.metodeBaru] ?? "#64748b";
                const bg = therapyBgMap[entry.metodeBaru] ?? "#f8fafc";
                const date = new Date(entry.changedAt).toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
                return (
                  <div
                    key={entry.id}
                    className="rounded-[10px] p-3"
                    style={{ backgroundColor: bg }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-heading font-semibold text-foreground text-sm">
                        {entry.metodeBaru}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans mt-1">
                      {entry.metodeSebelum
                        ? `Berubah dari ${entry.metodeSebelum}`
                        : "Metode terapi awal"}
                      {" — "}
                      {date}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Replay tutorial */}
        <ReplayTutorialButton />

        {/* Change therapy dialog */}
        {profile && (
          <ChangeTherapyDialog
            accessToken={accessToken!}
            currentTherapy={profile.metodeTerapiAktif}
            onTherapyChanged={handleTherapyChanged}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          />
        )}
      </div>
    </main>
  );
}
