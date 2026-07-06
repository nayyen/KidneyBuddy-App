"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { authFetch } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DeltaCairanCard from "@/components/beranda/DeltaCairanCard";
import NoReminderBanner from "@/components/beranda/NoReminderBanner";
import AiDailySummaryCard from "@/components/beranda/AiDailySummaryCard";
import AnomalyAlertSection from "@/components/beranda/AnomalyAlertSection";
import ObatCard from "@/components/beranda/ObatCard";
import CuciDarahCard from "@/components/beranda/CuciDarahCard";
import PengingatBerikutnyaCard from "@/components/beranda/PengingatBerikutnyaCard";
import KegiatanModuleInline from "@/components/aktivitas/KegiatanModuleInline";
import { SYNC_EVENTS } from "@/lib/syncEvents";

interface OnboardingProgress {
  onboardingComplete: boolean;
  lastCompletedStep: number;
  reminderConfigured: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const { accessToken, isLoading, isAuthenticated, user } = useAuth();
  // quick-260705-q7w: dialysis (cuci darah) is not relevant to transplant
  // patients — hide the card entirely rather than showing an empty one.
  const isTransplant = (user?.metodeTerapiAktif ?? "").toLowerCase() === "transplantasi";
  const [onboardingProgress, setOnboardingProgress] =
    useState<OnboardingProgress | null>(null);
  const [fluidRefreshKey, setFluidRefreshKey] = useState(0);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  // Real reminder count (Item 8): the no-reminder banner must reflect actual
  // reminder_schedule rows, not the onboarding.reminderConfigured flag (which
  // only tracks whether the onboarding wizard step was completed, not whether
  // the reminder still exists/hasn't been deleted since).
  const [reminderCount, setReminderCount] = useState<number | null>(null);

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

  // Fetch actual reminder count (Item 8)
  const fetchReminderCount = useCallback(() => {
    if (!accessToken) return;
    authFetch<unknown[]>("/api/reminders", accessToken)
      .then((res) => setReminderCount(Array.isArray(res) ? res.length : 0))
      .catch(() => {
        // Silently fail — banner just won't show while count is unknown
      });
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    fetchReminderCount();
  }, [accessToken, fetchReminderCount]);

  useEffect(() => {
    window.addEventListener(SYNC_EVENTS.REMINDER_UPDATED, fetchReminderCount);
    return () => window.removeEventListener(SYNC_EVENTS.REMINDER_UPDATED, fetchReminderCount);
  }, [fetchReminderCount]);

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
        />
      </div>
      <div className="md:col-span-1">
        <PengingatBerikutnyaCard accessToken={accessToken} />
      </div>

      {/* Row 2 */}
      <div className="md:col-span-3">
        <AiDailySummaryCard accessToken={accessToken} />
      </div>

      {/* Peringatan — normal-severity anomaly alerts (D-09). Renders null
          when there are none; the old CAPD effluent banner is superseded by
          the global EmergencyAnomalyModal for tinggi-severity events. */}
      <div className="md:col-span-3">
        <AnomalyAlertSection accessToken={accessToken} />
      </div>

      {/* Banners (full width) — gated on the ACTUAL reminder count (not the
          onboarding.reminderConfigured flag) so it only shows when the user
          truly has zero reminders; suppressed entirely while the count is
          still loading (null) to avoid a flash. */}
      {reminderCount === 0 && (
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
        />
        {/* quick-260707-1la item 1: transplant patients have no Cuci Darah
            card, leaving an empty third column — widen Obat to fill the
            remaining width (2 cols) instead of leaving a gap. */}
        <div className={isTransplant ? "md:col-span-2" : ""}>
          <ObatCard accessToken={accessToken} />
        </div>
        {!isTransplant && (
          <CuciDarahCard accessToken={accessToken} />
        )}
      </div>
    </div>
  );
}
