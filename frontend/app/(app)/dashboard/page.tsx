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
import PengingatBerikutnyaCard from "@/components/beranda/PengingatBerikutnyaCard";

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
       * 2. DeltaCairanCard — hero fluid balance card (full width)
       * 3. NoReminderBanner — conditional on reminder not configured
       * 4. ObatCard — today's unconfirmed meds with inline confirm
       * 5. PengingatBerikutnyaCard — next upcoming reminder
       * 6. AiPlaceholderCard — always shown as Phase 5 placeholder
       *
       * Grid: 1-col mobile, 2-col at md:, 3-col at lg:
       * Desktop layout per UI-SPEC:
       *   DeltaCairanCard: lg:col-span-2
       *   PengingatBerikutnyaCard: 1 col (right of DeltaCairan on lg)
       *   ObatCard: lg:col-span-2
       *   AiPlaceholderCard: 1 col
       */}

      {/* Banner: CAPD effluent anomaly (full width, always on top) */}
      {showCAPDBanner && (
        <CAPDEffluentBanner
          accessToken={accessToken}
          onDismiss={() => setShowCAPDBanner(false)}
        />
      )}

      {/*
       * Hero + next-reminder row (desktop: DeltaCairan 2/3 width + PengingatBerikutnya 1/3)
       * Mobile/tablet: stack vertically
       */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* DeltaCairanCard — spans 2 cols on lg */}
        <div className="lg:col-span-2">
          <DeltaCairanCard
            accessToken={accessToken}
            refreshKey={fluidRefreshKey}
            onBalanceFetched={handleBalanceFetched}
          />
        </div>

        {/* PengingatBerikutnyaCard — 1 col (right on desktop, below delta on mobile) */}
        <div>
          <PengingatBerikutnyaCard accessToken={accessToken} />
        </div>
      </div>

      {/* Secondary cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* NoReminderBanner (conditional, full width) */}
        {onboardingProgress?.onboardingComplete &&
          !onboardingProgress.reminderConfigured && (
            <div className="md:col-span-2 lg:col-span-3">
              <NoReminderBanner />
            </div>
          )}

        {/* ObatCard — spans 2 cols on lg */}
        <div className="md:col-span-2">
          <ObatCard accessToken={accessToken} />
        </div>

        {/* AiPlaceholderCard — 1 col on lg (right of ObatCard) */}
        <div className="md:col-span-2 lg:col-span-1">
          <AiPlaceholderCard />
        </div>
      </div>
    </div>
  );
}
