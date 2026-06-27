"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import FluidLogList from "@/components/catatan/FluidLogList";
import MedicationLogList from "@/components/catatan/MedicationLogList";

type TabId = "cairan" | "obat" | "aktivitas" | "lab";

interface Tab {
  id: TabId;
  label: string;
  enabled: boolean;
}

const TABS: Tab[] = [
  { id: "cairan", label: "Cairan", enabled: true },
  { id: "obat", label: "Obat", enabled: true },
  { id: "aktivitas", label: "Aktivitas", enabled: false },
  { id: "lab", label: "Lab", enabled: false },
];

export default function CatatanPage() {
  const router = useRouter();
  const { accessToken, isLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("cairan");
  const [fluidRefreshKey, setFluidRefreshKey] = useState(0);

  // Auth redirect guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Listen for fluid:saved to refresh list
  useEffect(() => {
    const handleFluidSaved = () => {
      setFluidRefreshKey((k) => k + 1);
    };
    window.addEventListener("fluid:saved", handleFluidSaved);
    return () => window.removeEventListener("fluid:saved", handleFluidSaved);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground font-sans text-sm">Memuat...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const handleTabClick = (tab: Tab) => {
    if (!tab.enabled) {
      toast("Fitur ini akan hadir di update berikutnya", {
        duration: 2000,
        position: "bottom-center",
      });
      return;
    }
    setActiveTab(tab.id);
  };

  return (
    <>
      <Toaster />
      <div className="space-y-4">
        {/* Sub-tab pill row */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                aria-current={isActive ? "true" : undefined}
                className="shrink-0 font-sans font-medium transition-colors"
                style={{
                  fontSize: 12,
                  borderRadius: 20,
                  paddingLeft: 16,
                  paddingRight: 16,
                  height: 36,
                  cursor: tab.enabled ? "pointer" : "not-allowed",
                  opacity: tab.enabled ? 1 : 0.6,
                  backgroundColor:
                    isActive && tab.enabled
                      ? "#2a9d8f"
                      : "#f0faf9",
                  color:
                    isActive && tab.enabled
                      ? "#ffffff"
                      : tab.enabled
                      ? "#1a2e2c"
                      : "#cfe8e4",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "cairan" && accessToken && (
          <FluidLogList
            accessToken={accessToken}
            refreshKey={fluidRefreshKey}
          />
        )}

        {activeTab === "obat" && accessToken && (
          <MedicationLogList accessToken={accessToken} />
        )}
      </div>
    </>
  );
}
