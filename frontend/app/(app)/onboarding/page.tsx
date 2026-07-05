"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { authFetch, ApiError } from "@/lib/api";
import type { TherapyFormData } from "@/lib/validators/onboarding.schema";
import StepProgress from "./_components/StepProgress";
import TherapySelectStep from "./_components/TherapySelectStep";
import FirstReminderStep from "./_components/FirstReminderStep";
import OnboardingSuccess from "./_components/OnboardingSuccess";

interface TherapyOption {
  id: "CAPD" | "HD" | "Transplantasi";
  nama: string;
  namaPanjang: string;
  penjelasan: string;
  warna: string;
  warnaBg: string;
}

interface ProgressData {
  onboardingComplete: boolean;
  lastCompletedStep: number;
  reminderConfigured: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { accessToken, user, isLoading: authLoading, isAuthenticated } = useAuth();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const isTutorialMode = searchParams?.get("mode") === "tutorial";

  const [currentStep, setCurrentStep] = useState(0);
  const [therapyOptions, setTherapyOptions] = useState<TherapyOption[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTherapy, setSelectedTherapy] = useState<string | null>(null);

  // Therapy chosen in step 1 this session, falling back to the persisted
  // therapy (useAuth's user) for the re-entry/tutorial path that can land
  // directly on step 2 without step 1 having run in-session.
  const activeTherapy = selectedTherapy ?? user?.metodeTerapiAktif ?? null;

  // Item 9: tutorial-mode re-entry for an existing user with a therapy already
  // set must only show that one therapy on the Pilih Jenis Terapi step (a new
  // user with no therapy set keeps seeing all options, tutorial or not).
  const displayedTherapyOptions =
    isTutorialMode && user?.metodeTerapiAktif
      ? therapyOptions.filter((t) => t.id === user.metodeTerapiAktif)
      : therapyOptions;

  // ── Redirect if not authenticated ────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // ── Load therapy content + progress ──────────────────────────────
  useEffect(() => {
    if (!accessToken || !isAuthenticated) return;

    let cancelled = false;
    (async () => {
      try {
        const [therapyData, progress] = await Promise.all([
          authFetch<TherapyOption[]>(
            "/api/onboarding/therapy-content",
            accessToken
          ),
          authFetch<ProgressData>(
            "/api/onboarding/progress",
            accessToken
          ),
        ]);

        if (cancelled) return;

        // therapy-content returns array directly
        setTherapyOptions(therapyData);

        // Resume from last completed step
        const lastStep = progress.lastCompletedStep;
        if (isTutorialMode) {
          // Tutorial replay — show all steps from beginning without resuming
          setCurrentStep(1);
          return;
        }
        if (progress.onboardingComplete) {
          // Already completed but no reminder? Allow re-entry to set one
          if (!progress.reminderConfigured) {
            setCurrentStep(2); // Jump to reminder step
            return;
          }
          // Fully complete → redirect to dashboard
          router.replace("/beranda");
          return;
        }
        setCurrentStep(lastStep + 1); // step 0 → show step 1, step 1 → show step 2, etc.
      } catch (err) {
        if (cancelled) return;
        setError("Gagal memuat data. Silakan refresh halaman.");
      } finally {
        if (!cancelled) setIsLoadingContent(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthenticated, router]);

  // ── Step 1: Save therapy ──────────────────────────────────────────
  const handleTherapySubmit = useCallback(
    async (data: TherapyFormData) => {
      if (!accessToken) return;
      setIsSaving(true);
      setError(null);
      try {
        // Backend expects { therapy: "CAPD" } not { metodeTerapi: "CAPD", ... }
        await authFetch("/api/onboarding/therapy", accessToken, {
          method: "POST",
          body: JSON.stringify({ therapy: data.metodeTerapi }),
        });
        setSelectedTherapy(data.metodeTerapi);
        setCurrentStep(2);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Gagal menyimpan. Silakan coba lagi."
        );
      } finally {
        setIsSaving(false);
      }
    },
    [accessToken]
  );

  // ── Step 2: Reminder created via the reused /pengingat form ────────
  // The reminder itself is already saved by the reused form's own POST to
  // /api/reminders — this call only records onboarding completion so the
  // user is never asked to re-enter step 2 on a later visit.
  const handleReminderCreated = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    try {
      await authFetch("/api/onboarding/complete-reminder", accessToken, {
        method: "POST",
      });
      setCurrentStep(3);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal menyimpan. Silakan coba lagi."
      );
    }
  }, [accessToken]);

  // ── Step 2: Skip reminder ────────────────────────────────────────
  const handleSkipReminder = useCallback(async () => {
    if (!accessToken) return;
    setIsSkipping(true);
    setError(null);
    try {
      await authFetch("/api/onboarding/skip-reminder", accessToken, {
        method: "POST",
      });
      setCurrentStep(3);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal. Silakan coba lagi."
      );
    } finally {
      setIsSkipping(false);
    }
  }, [accessToken]);

  // ── Back ──────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
    setError(null);
  }, []);

  // ── Loading state ────────────────────────────────────────────────
  if (authLoading || isLoadingContent) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground font-sans">Memuat...</p>
      </main>
    );
  }

  // ── Not authenticated ────────────────────────────────────────────
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // ── Success ──────────────────────────────────────────────────────
  if (currentStep === 3) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
        <OnboardingSuccess />
      </main>
    );
  }

  // ── Wizard ───────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Gradient header */}
      <div className="bg-gradient-to-b from-primary/5 to-background px-4 pt-12 pb-6">
        <div className="max-w-md mx-auto">
          <StepProgress currentStep={currentStep} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-12">
        <div className="max-w-md mx-auto">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3"
            >
              <p className="text-sm font-medium text-destructive font-sans">{error}</p>
            </div>
          )}

          {currentStep === 1 && (
            <TherapySelectStep
              therapyOptions={displayedTherapyOptions}
              onSubmit={handleTherapySubmit}
              isLoading={isSaving}
            />
          )}

          {currentStep === 2 && accessToken && (
            <FirstReminderStep
              metodeTerapiAktif={activeTherapy}
              accessToken={accessToken}
              onReminderCreated={handleReminderCreated}
              onSkip={handleSkipReminder}
              isSkipping={isSkipping}
              onBack={handleBack}
            />
          )}
        </div>
      </div>
    </main>
  );
}
