"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import MobileHeader from "./MobileHeader";
import TopBar from "./TopBar";
import FAB from "./FAB";
import CatatCairanSheet from "@/components/cairan/CatatCairanSheet";
import MulaiKegiatanSheet from "@/components/aktivitas/MulaiKegiatanSheet";
import FeelingsRatingSheet from "@/components/aktivitas/FeelingsRatingSheet";
import CatatLabSheet from "@/components/lab/CatatLabSheet";
import type { CreatedLabEntry } from "@/components/lab/InputManualForm";
import EmergencyAnomalyModal, {
  type AnomalyAlertRow,
} from "@/components/anomaly/EmergencyAnomalyModal";
import { useAuth } from "@/lib/hooks/useAuth";
import { authFetch } from "@/lib/api";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [catatCairanOpen, setCatatCairanOpen] = useState(false);
  const [mulaiKegiatanOpen, setMulaiKegiatanOpen] = useState(false);
  const [feelingsOpen, setFeelingsOpen] = useState(false);
  const [completingActivityId, setCompletingActivityId] = useState<string | null>(null);
  const [completingActivityName, setCompletingActivityName] = useState<string | null>(null);
  const [catatLabOpen, setCatatLabOpen] = useState(false);
  const [activeEmergencyAlert, setActiveEmergencyAlert] =
    useState<AnomalyAlertRow | null>(null);
  const { accessToken, user } = useAuth();
  const router = useRouter();

  const handleNotificationClick = useCallback(() => {
    router.push("/notifikasi");
  }, [router]);

  // Re-check for an active tinggi-severity alert on every AppShell mount
  // (new session) — server is the sole source of truth for whether the
  // emergency modal must (re)appear (D-07). Never gated behind a specific
  // route: this runs regardless of which page loaded underneath.
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    authFetch<{ alerts: AnomalyAlertRow[] }>(
      "/api/anomaly/active-high-severity",
      accessToken,
    )
      .then((res) => {
        if (cancelled) return;
        setActiveEmergencyAlert(res.alerts?.[0] ?? null);
      })
      .catch(() => {
        // Fail silently — a transient network error must not itself block
        // the user from using the app; the check simply retries next mount.
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  // Report the browser's own IANA timezone to the backend once per session
  // (quick-260705-9n4 task 3) so reminder due-time and "today" bounds are
  // computed for the user's actual device timezone instead of a hardcoded
  // WIB assumption. Guarded by localStorage so repeated AppShell mounts
  // within the same browser don't re-PATCH on every navigation — only fires
  // when the resolved zone differs from the last value this browser sent.
  useEffect(() => {
    if (!accessToken) return;
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!timezone) return;
      const lastSent = window.localStorage.getItem("kb_timezone_reported");
      if (lastSent === timezone) return;

      authFetch("/api/profile/timezone", accessToken, {
        method: "PATCH",
        body: JSON.stringify({ timezone }),
      })
        .then(() => {
          window.localStorage.setItem("kb_timezone_reported", timezone);
        })
        .catch(() => {
          // Fail silently — worst case, reminders keep using the last-known
          // (or default Asia/Jakarta) timezone until a future session succeeds.
        });
    } catch {
      // Intl.DateTimeFormat should always be available in modern browsers,
      // but never let a timezone-resolution failure block the rest of the app.
    }
  }, [accessToken]);

  const handleCatatCairan = useCallback(() => {
    setCatatCairanOpen(true);
  }, []);

  const handleMulaiKegiatan = useCallback(() => {
    setMulaiKegiatanOpen(true);
  }, []);

  const handleCompleteActivity = useCallback((activityId: string, namaKegiatan: string) => {
    setCompletingActivityId(activityId);
    setCompletingActivityName(namaKegiatan);
    setFeelingsOpen(true);
  }, []);

  // Called by CatatCairanSheet after a successful save — children refresh via
  // the custom event so DashboardPage can re-fetch the daily balance
  const handleFluidSaved = useCallback(() => {
    window.dispatchEvent(new CustomEvent("fluid:saved"));
  }, []);

  // Called by activity sheets after a successful save — children refresh
  const handleActivitySaved = useCallback(() => {
    window.dispatchEvent(new CustomEvent("activity:saved"));
  }, []);

  // Called by CatatLabSheet after a successful save — children refresh.
  // `created` (manual-entry only, AI-03/D-14) is forwarded in the event
  // detail so CatatanPage can mount a LabAnalysisCard for this specific
  // newly-saved result without a second round-trip.
  const handleLabSaved = useCallback((created?: CreatedLabEntry) => {
    window.dispatchEvent(new CustomEvent("lab:saved", { detail: { created } }));
  }, []);

  // Listen for custom events from KegiatanModuleInline and ActivityList
  useEffect(() => {
    const handleStart = () => setMulaiKegiatanOpen(true);
    const handleComplete = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id) {
        setCompletingActivityId(detail.id);
        setCompletingActivityName(detail.namaKegiatan ?? null);
        setFeelingsOpen(true);
      }
    };
    const handleLabOpen = () => setCatatLabOpen(true);
    window.addEventListener("activity:start", handleStart);
    window.addEventListener("activity:complete", handleComplete);
    window.addEventListener("lab:open", handleLabOpen);
    return () => {
      window.removeEventListener("activity:start", handleStart);
      window.removeEventListener("activity:complete", handleComplete);
      window.removeEventListener("lab:open", handleLabOpen);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop left sidebar — hidden below lg: */}
      <Sidebar onCatatCairan={handleCatatCairan} />

      {/* Main column — takes full width on mobile/tablet, shifts right on desktop */}
      <div className="flex flex-col min-h-screen w-full lg:ml-64">
        {/* Mobile header — visible below lg: */}
        <MobileHeader onNotificationClick={handleNotificationClick} />

        {/* Desktop top bar — visible at lg: and above */}
        <TopBar onNotificationClick={handleNotificationClick} />

        {/* Content area */}
        <main
          className="flex-1 w-full mx-auto px-4 md:px-6 py-4 md:py-6 lg:pt-[calc(56px+24px)]"
          style={{ maxWidth: 1280, paddingBottom: "calc(60px + env(safe-area-inset-bottom) + 24px)" }}
        >
          {/* Override pb for desktop — no bottom nav */}
          <style>{`
            @media (min-width: 1024px) {
              main { padding-bottom: 24px !important; }
            }
          `}</style>
          {children}
        </main>

        {/* Mobile/tablet bottom nav + FAB — hidden at lg: */}
        {/* FAB: fixed above bottom nav — separated to prevent overlap */}
        <div data-print-hidden="true" className="lg:hidden fixed z-50" style={{ bottom: "calc(64px + env(safe-area-inset-bottom))", left: "50%", transform: "translateX(-50%)" }}>
          <FAB onClick={handleCatatCairan} />
        </div>
        <nav
          data-print-hidden="true"
          className="lg:hidden fixed bottom-0 inset-x-0 z-40"
          style={{ position: "fixed" }}
        >
          <BottomNav />
        </nav>
      </div>

      {/* CatatCairanSheet — mounted here so it persists across page navigations */}
      <CatatCairanSheet
        isOpen={catatCairanOpen}
        onOpenChange={setCatatCairanOpen}
        accessToken={accessToken}
        metodeTerapiAktif={user?.metodeTerapiAktif ?? null}
        onSaved={handleFluidSaved}
      />

      {/* MulaiKegiatanSheet — mounted here so it works from any page */}
      <MulaiKegiatanSheet
        isOpen={mulaiKegiatanOpen}
        onOpenChange={setMulaiKegiatanOpen}
        accessToken={accessToken}
        onSaved={handleActivitySaved}
      />

      {/* FeelingsRatingSheet — shown after completing an activity */}
      <FeelingsRatingSheet
        isOpen={feelingsOpen}
        onOpenChange={setFeelingsOpen}
        accessToken={accessToken}
        activityId={completingActivityId}
        namaKegiatan={completingActivityName}
        onCompleted={handleActivitySaved}
      />

      {/* CatatLabSheet — two-tab sheet for lab results */}
      <CatatLabSheet
        isOpen={catatLabOpen}
        onOpenChange={setCatatLabOpen}
        accessToken={accessToken}
        onSaved={handleLabSaved}
      />

      {/* EmergencyAnomalyModal — mounted globally so it persists across
          navigation and blocks any route while a tinggi-severity alert is
          still aktif (D-05/D-07/D-08) */}
      <EmergencyAnomalyModal
        alert={activeEmergencyAlert}
        accessToken={accessToken}
        onAcknowledged={() => setActiveEmergencyAlert(null)}
      />
    </div>
  );
}
