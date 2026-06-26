"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { authFetch } from "@/lib/api";
import LogoutButton from "@/components/LogoutButton";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Profile {
  userId: string;
  namaLengkap: string;
  email: string;
  nomorTelepon: string;
  role: string;
}

interface OnboardingProgress {
  onboardingComplete: boolean;
  lastCompletedStep: number;
  reminderConfigured: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const { accessToken, isLoading, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !accessToken) {
      router.replace("/login");
      return;
    }

    authFetch<Profile>("/api/auth/me", accessToken)
      .then((data) => setProfile(data))
      .catch((err) => setError(err.message));

    // Fetch onboarding progress to determine if reminder banner is needed
    authFetch<OnboardingProgress>("/api/onboarding/progress", accessToken)
      .then((res) => {
        setOnboardingProgress(res);
        // If onboarding not complete (step < 2), redirect to /onboarding
        if (!res.onboardingComplete || res.lastCompletedStep < 2) {
          router.replace("/onboarding");
        }
      })
      .catch(() => {
        // Silently fail — banner just won't show
      });
  }, [isLoading, isAuthenticated, accessToken, router]);

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

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {profile && (
          <div className="rounded-[14px] bg-card p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold text-foreground">
                Selamat datang, {profile.namaLengkap}
              </h2>
              <LogoutButton />
            </div>
            <p className="text-sm text-muted-foreground font-sans">
              Email: {profile.email}
            </p>
            {profile.role && (
              <p className="text-sm text-muted-foreground font-sans mt-1">
                Role: {profile.role}
              </p>
            )}
          </div>
        )}

        {/* Reminder banner */}
        {onboardingProgress &&
          onboardingProgress.onboardingComplete &&
          !onboardingProgress.reminderConfigured && (
            <div className="mt-4 rounded-[14px] bg-amber-50 border border-amber-200 p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <svg
                    className="w-4 h-4 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800 font-sans">
                    Atur Pengingat
                  </p>
                  <p className="text-xs text-amber-700 font-sans mt-0.5">
                    Kamu belum mengatur pengingat. Yuk atur sekarang supaya tidak lupa jadwal terapi.
                  </p>
                  <button
                    onClick={() => router.push("/onboarding")}
                    className="mt-2 text-xs font-semibold text-amber-800 hover:text-amber-900 underline font-sans"
                  >
                    Atur Pengingat
                  </button>
                </div>
              </div>
            </div>
          )}

        <p className="mt-6 text-xs text-muted-foreground font-sans">
          KidneyBuddy &mdash; Pendamping Harian Pasien Ginjal
        </p>
      </div>
    </main>
  );
}
