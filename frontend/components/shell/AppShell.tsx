"use client";

import { useState, useCallback, useEffect } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import MobileHeader from "./MobileHeader";
import TopBar from "./TopBar";
import FAB from "./FAB";
import CatatCairanSheet from "@/components/cairan/CatatCairanSheet";
import MulaiKegiatanSheet from "@/components/aktivitas/MulaiKegiatanSheet";
import FeelingsRatingSheet from "@/components/aktivitas/FeelingsRatingSheet";
import CatatLabSheet from "@/components/lab/CatatLabSheet";
import { useAuth } from "@/lib/hooks/useAuth";

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
  const { accessToken, user } = useAuth();

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

  // Called by CatatLabSheet after a successful save — children refresh
  const handleLabSaved = useCallback(() => {
    window.dispatchEvent(new CustomEvent("lab:saved"));
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
        <MobileHeader />

        {/* Desktop top bar — visible at lg: and above */}
        <TopBar />

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
    </div>
  );
}
