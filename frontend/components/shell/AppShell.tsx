"use client";

import { useState, useCallback } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import MobileHeader from "./MobileHeader";
import TopBar from "./TopBar";
import FAB from "./FAB";
import CatatCairanSheet from "@/components/cairan/CatatCairanSheet";
import { useAuth } from "@/lib/hooks/useAuth";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [catatCairanOpen, setCatatCairanOpen] = useState(false);
  const { accessToken, user } = useAuth();

  const handleCatatCairan = useCallback(() => {
    setCatatCairanOpen(true);
  }, []);

  // Called by CatatCairanSheet after a successful save — children refresh via
  // the custom event so DashboardPage can re-fetch the daily balance
  const handleSaved = useCallback(() => {
    window.dispatchEvent(new CustomEvent("fluid:saved"));
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
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-40"
          style={{ position: "fixed" }}
        >
          {/* FAB: absolutely positioned above the bottom nav */}
          <div className="relative">
            <FAB onClick={handleCatatCairan} />
          </div>
          <BottomNav />
        </nav>
      </div>

      {/* CatatCairanSheet — mounted here so it persists across page navigations */}
      <CatatCairanSheet
        isOpen={catatCairanOpen}
        onOpenChange={setCatatCairanOpen}
        accessToken={accessToken}
        metodeTerapiAktif={user?.metodeTerapiAktif ?? null}
        onSaved={handleSaved}
      />
    </div>
  );
}
