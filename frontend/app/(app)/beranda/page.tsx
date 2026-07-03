"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { authFetch } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DeltaCairanCard from "@/components/beranda/DeltaCairanCard";
import CAPDEffluentBanner from "@/components/beranda/CAPDEffluentBanner";
import NoReminderBanner from "@/components/beranda/NoReminderBanner";
import AiPlaceholderCard from "@/components/beranda/AiPlaceholderCard";
import ObatCard from "@/components/beranda/ObatCard";
import CuciDarahCard from "@/components/beranda/CuciDarahCard";
import PengingatBerikutnyaCard from "@/components/beranda/PengingatBerikutnyaCard";
import KegiatanModuleInline from "@/components/aktivitas/KegiatanModuleInline";

interface OnboardingProgress {
  onboardingComplete: boolean;
  lastCompletedStep: number;
  reminderConfigured: boolean;
}

interface DailyBalance {
  date: string;
  masuk: number;
  keluar: number;
  delta: number;
  unit: string;
  hasAbnormalCondition?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const { accessToken, isLoading, isAuthenticated } = useAuth();
  const [onboardingProgress, setOnboardingProgress] =
    useState<OnboardingProgress | null>(null);
  const [showCAPDBanner, setShowCAPDBanner] = useState(false);
  const [fluidRefreshKey, setFluidRefreshKey] = useState(0);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);

  // Auth guard + onboarding check
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !accessToken) {
      router.replace("/login");
      return;
    }

    // Fetch onboarding progress to determine if reminder banner is needed
    authFetch<OnboardingProgress>("/api/onboarding/progress", accessToken)
      .then((res) => {
        setOnboardingProgress(res);
        // If onboarding not complete, redirect to /onboarding
        if (!res.onboardingComplete || res.lastCompletedStep < 2) {
          router.replace("/onboarding");
        }
      })
      .catch(() => {
        // Silently fail — reminder banner just won't show
      });
  }, [isLoading, isAuthenticated, accessToken, router]);

  // Listen for fluid:saved events to refresh DeltaCairanCard
  useEffect(() => {
    const handleFluidSaved = () => {
      setFluidRefreshKey((k) => k + 1);
    };
    window.addEventListener("fluid:saved", handleFluidSaved);
    return () => window.removeEventListener("fluid:saved", handleFluidSaved);
  }, []);

  // Listen for activity:saved events to refresh KegiatanModuleInline
  useEffect(() => {
    const handleActivitySaved = () => {
      setActivityRefreshKey((k) => k + 1);
    };
    window.addEventListener("activity:saved", handleActivitySaved);
    return () => window.removeEventListener("activity:saved", handleActivitySaved);
  }, []);

  // Called by DeltaCairanCard when it receives balance data
  const handleBalanceFetched = useCallback((balance: DailyBalance) => {
    const abnormal = !!balance.hasAbnormalCondition;
    setShowCAPDBanner(abnormal);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground font-sans text-sm">Memuat...</p>
      </div>
    );
  }

  if (!isAuthenticated || !accessToken) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Row 1 */}
      <div className="md:col-span-2">
        <DeltaCairanCard
          accessToken={accessToken}
          refreshKey={fluidRefreshKey}
          onBalanceFetched={handleBalanceFetched}
        />
      </div>
      <div className="md:col-span-1">
        <PengingatBerikutnyaCard accessToken={accessToken} />
      </div>

      {/* Row 2 */}
      <div className="md:col-span-3">
        <AiPlaceholderCard />
      </div>
      
      {/* Banners (full width) */}
      {showCAPDBanner && (
        <div className="md:col-span-3">
          <CAPDEffluentBanner />
        </div>
      )}
      {onboardingProgress && !onboardingProgress.reminderConfigured && (
        <div className="md:col-span-3">
          <NoReminderBanner />
        </div>
      )}

      {/* Row 3 - Today's Compliance Cards */}
      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        <KegiatanModuleInline
          accessToken={accessToken}
          refreshKey={activityRefreshKey}
          onMulaiKegiatan={() => { /* logic to open activity sheet */ }}
          onCompleteActivity={(id, nama) => { /* logic to open completion form */ }}
        />
        <ObatCard accessToken={accessToken} />
        <CuciDarahCard accessToken={accessToken} />
      </div>
    </div>
  );
}
