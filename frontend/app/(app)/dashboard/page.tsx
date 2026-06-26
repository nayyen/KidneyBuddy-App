"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { authFetch } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DeltaCairanCard from "@/components/beranda/DeltaCairanCard";
import CAPDEffluentBanner from "@/components/beranda/CAPDEffluentBanner";
import NoReminderBanner from "@/components/beranda/NoReminderBanner";
import AiPlaceholderCard from "@/components/beranda/AiPlaceholderCard";

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
  const [hasAbnormalCondition, setHasAbnormalCondition] = useState(false);
  const [showCAPDBanner, setShowCAPDBanner] = useState(false);
  const [fluidRefreshKey, setFluidRefreshKey] = useState(0);

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

  // Called by DeltaCairanCard when it receives balance data
  const handleBalanceFetched = useCallback((balance: DailyBalance) => {
    const abnormal = !!balance.hasAbnormalCondition;
    setHasAbnormalCondition(abnormal);
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
    <div className="space-y-3">
      {/*
       * D-04 Render Order (per UI-SPEC):
       * 1. CAPDEffluentBanner — only when today has an abnormal effluent
       * 2. DeltaCairanCard — hero fluid balance card
       * 3. NoReminderBanner — conditional on reminder not configured
       * 4. ObatCard slot — omitted until 02-07
       * 5. PengingatBerikutnyaCard slot — omitted until 02-07
       * 6. AiPlaceholderCard — always shown as Phase 5 placeholder
       *
       * Grid: single column on mobile, 2-col at md:, 3-col at lg:
       * But banner + delta card always span full width.
       */}

      {/* Banner: CAPD effluent anomaly (full width, always on top) */}
      {showCAPDBanner && (
        <div className="col-span-full">
          <CAPDEffluentBanner
            accessToken={accessToken}
            onDismiss={() => setShowCAPDBanner(false)}
          />
        </div>
      )}

      {/* Hero card: DeltaCairanCard (full width) */}
      <div>
        <DeltaCairanCard
          accessToken={accessToken}
          refreshKey={fluidRefreshKey}
          onBalanceFetched={handleBalanceFetched}
        />
      </div>

      {/* Grid of secondary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* NoReminderBanner (conditional) */}
        {onboardingProgress?.onboardingComplete &&
          !onboardingProgress.reminderConfigured && (
            <div className="md:col-span-2 lg:col-span-3">
              <NoReminderBanner />
            </div>
          )}

        {/*
         * ObatCard slot — placeholder until Plan 02-07
         * PengingatBerikutnyaCard slot — placeholder until Plan 02-07
         * These are intentionally absent (not stub empty states) per plan scope.
         */}

        {/* AiPlaceholderCard (always visible) */}
        <div className="md:col-span-2 lg:col-span-3">
          <AiPlaceholderCard />
        </div>
      </div>
    </div>
  );
}
