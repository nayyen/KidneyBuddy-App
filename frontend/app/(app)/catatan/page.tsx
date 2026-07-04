"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { authFetch } from "@/lib/api";
import { toast } from "sonner";
import FluidLogList from "@/components/catatan/FluidLogList";
import MedicationLogList from "@/components/catatan/MedicationLogList";
import DialysisLogList from "@/components/catatan/DialysisLogList";
import ActivityList from "@/components/aktivitas/ActivityList";
import LabResultList from "@/components/lab/LabResultList";
import LabTrendChart from "@/components/lab/LabTrendChart";
import LabArchivedList from "@/components/lab/LabArchivedList";
import WeeklyInsightCard from "@/components/lab/WeeklyInsightCard";
import LabAnalysisCard from "@/components/lab/LabAnalysisCard";
import type { CreatedLabEntry } from "@/components/lab/InputManualForm";

type TabId = "cairan" | "obat" | "cucidarah" | "aktivitas" | "lab";

interface Tab {
  id: TabId;
  label: string;
  enabled: boolean;
}

const TABS: Tab[] = [
  { id: "cairan", label: "Cairan", enabled: true },
  { id: "obat", label: "Obat", enabled: true },
  { id: "cucidarah", label: "Cuci Darah", enabled: true },
  { id: "aktivitas", label: "Aktivitas", enabled: true },
  { id: "lab", label: "Lab", enabled: true },
];

export default function CatatanPage() {
  const router = useRouter();
  const { accessToken, isLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("cairan");
  const [fluidRefreshKey, setFluidRefreshKey] = useState(0);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const [labRefreshKey, setLabRefreshKey] = useState(0);
  const [showArchivedLab, setShowArchivedLab] = useState(false);
  // Parameter currently selected in LabTrendChart's dropdown — kept in sync
  // so LabAnalysisCard always analyzes the same parameter the user is
  // viewing the trend for.
  const [selectedLabParameter, setSelectedLabParameter] = useState<string>("");
  // Most recent lab result FOR THE SELECTED PARAMETER (AI-03/D-14) —
  // LabAnalysisCard always shows the latest entry's analysis on load, not
  // just a just-saved one, and updates when the parameter selection changes.
  const [lastSavedLab, setLastSavedLab] = useState<CreatedLabEntry | null>(null);

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

  // Listen for activity:saved to refresh list
  useEffect(() => {
    const handleActivitySaved = () => {
      setActivityRefreshKey((k) => k + 1);
    };
    window.addEventListener("activity:saved", handleActivitySaved);
    return () => window.removeEventListener("activity:saved", handleActivitySaved);
  }, []);

  // Listen for lab:saved to refresh list and trend.
  useEffect(() => {
    const handleLabSaved = () => {
      setLabRefreshKey((k) => k + 1);
    };
    window.addEventListener("lab:saved", handleLabSaved);
    return () => window.removeEventListener("lab:saved", handleLabSaved);
  }, []);

  // Fetch the most recent lab result FOR THE SELECTED PARAMETER (not just
  // this session's save) so LabAnalysisCard always shows on Lab tab load,
  // and re-syncs whenever the trend-chart dropdown selection changes
  // (AI-03/D-14 — analysis is keyed by labResultId, so any previously-saved
  // entry's cached analysis can be shown the same way).
  useEffect(() => {
    if (!accessToken || !selectedLabParameter) return;
    let cancelled = false;
    authFetch<{ results: CreatedLabEntry[] }>(
      `/api/lab?parameter=${encodeURIComponent(selectedLabParameter)}`,
      accessToken,
    )
      .then((res) => {
        if (cancelled) return;
        setLastSavedLab(res.results?.[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setLastSavedLab(null);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, labRefreshKey, selectedLabParameter]);

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
      <div className="space-y-4">
                {/* Laporan button — navigates to report generation page */}
                <button
                  onClick={() => router.push("/laporan")}
                  className="flex items-center justify-between w-full rounded-xl border border-border bg-card p-3.5 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#f0faf9] flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#2a9d8f]" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-sans font-semibold text-foreground">Buat Laporan Dokter</p>
                      <p className="text-[13px] font-sans text-muted-foreground mt-0.5">Ringkasan data untuk kontrol</p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

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

        {/* Wawasan tren mingguan (AI-02, D-11) — visible on every sub-tab,
            not just Lab, since it summarizes fluid/medication/activity data
            broadly rather than being lab-specific. */}
        {accessToken && <WeeklyInsightCard accessToken={accessToken} />}

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

          {activeTab === "cucidarah" && accessToken && (
            <DialysisLogList accessToken={accessToken} />
          )}

        {activeTab === "aktivitas" && accessToken && (
          <ActivityList
            accessToken={accessToken}
            refreshKey={activityRefreshKey}
          />
        )}

        {activeTab === "lab" && accessToken && (
          <div className="space-y-4">
            {/* Add button */}
            <button
              onClick={() =>
                window.dispatchEvent(new CustomEvent("lab:open"))
              }
              className="w-full font-sans font-semibold transition-opacity hover:opacity-90"
              style={{
                height: 44,
                borderRadius: 22,
                fontSize: 14,
                backgroundColor: "#2a9d8f",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
              }}
            >
              + Catat Hasil Lab
            </button>

            {/* Trend chart — drives which parameter LabAnalysisCard analyzes */}
            <LabTrendChart
              accessToken={accessToken}
              refreshKey={labRefreshKey}
              onParameterChange={setSelectedLabParameter}
            />

            {/* Analisis hasil lab — mengikuti parameter yang dipilih di
                dropdown tren di atas; selalu tampil saat tab Lab dimuat
                (AI-03, D-14 async non-blocking), termasuk konteks riwayat
                nilai-nilai sebelumnya untuk parameter yang sama. */}
            {lastSavedLab && (
              <LabAnalysisCard
                key={lastSavedLab.id}
                accessToken={accessToken}
                labResultId={lastSavedLab.id}
                namaParameter={lastSavedLab.namaParameter}
                nilai={lastSavedLab.nilai}
                nilaiRujukan={lastSavedLab.nilaiRujukan}
              />
            )}

            {/* Lab results list */}
            <LabResultList
              accessToken={accessToken}
              refreshKey={labRefreshKey}
            />

            {/* Archive link */}
            <button
              onClick={() => setShowArchivedLab(!showArchivedLab)}
              className="w-full font-sans text-sm text-center transition-opacity hover:opacity-80"
              style={{
                color: "#3d6b66",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "8px 0",
              }}
            >
              {showArchivedLab ? "Sembunyikan Arsip" : "Lihat Arsip"}
            </button>

            {/* Archived lab results */}
            {showArchivedLab && (
              <LabArchivedList
                accessToken={accessToken}
                refreshKey={labRefreshKey}
                onRestored={() => {
                  setLabRefreshKey((k) => k + 1);
                }}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
