"use client";

/**
 * LabResultList.tsx — Lab results list for the Lab tab on Catatan page
 *
 * Shows lab results grouped by tanggalPemeriksaan (newest first).
 * Each row shows parameter name, value+unit, and reference range.
 * Supports swipe-to-archive (soft-delete).
 *
 * Pattern: follows FluidLogList.tsx and ActivityList.tsx.
 */

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";
import { Archive, FlaskConical, ChevronRight } from "lucide-react";
import LabEditSheet from "./LabEditSheet";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface LabResult {
  id: string;
  tanggalPemeriksaan: string;
  kategori: string | null;
  namaParameter: string;
  nilai: string;
  satuan: string | null;
  nilaiRujukan: string | null;
  catatan: string | null;
  sumber: string;
  fileId: string | null;
}

interface LabResultListProps {
  accessToken: string;
  refreshKey?: number;
}

export default function LabResultList({
  accessToken,
  refreshKey = 0,
}: LabResultListProps) {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState<string | null>(null);

  const openFile = useCallback(async (fileId: string) => {
    if (!accessToken) return;
    const fileUrl = `http://localhost:4000/api/lab/file/${fileId}?token=${encodeURIComponent(accessToken)}`;
    window.open(fileUrl, "_blank");
  }, [accessToken]);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const data = await authFetch<{ results: LabResult[] }>(
        "/api/lab",
        accessToken,
      );
      setResults(data.results ?? []);
    } catch {
      // Silently fail — list will be empty
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults, refreshKey]);

  const handleArchive = async (id: string) => {
    setArchiving(id);
    try {
      await authFetch(`/api/lab/${id}/archive`, accessToken, {
        method: "PATCH",
      });
      setResults((prev) => prev.filter((r) => r.id !== id));
      toast.success("Item diarsipkan");
    } catch {
      toast.error("Gagal mengarsipkan");
    } finally {
      setArchiving(null);
    }
  };

  // Group results by tanggalPemeriksaan (newest first)
  const grouped = results.reduce<Record<string, LabResult[]>>((acc, r) => {
    if (!acc[r.tanggalPemeriksaan]) acc[r.tanggalPemeriksaan] = [];
    acc[r.tanggalPemeriksaan].push(r);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground font-sans">Memuat...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <FlaskConical className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-sans font-medium text-foreground">
          Belum ada hasil lab
        </p>
        <p className="text-xs font-sans text-muted-foreground mt-1">
          Tambahkan hasil lab untuk melihat riwayat pemeriksaan
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedDates.map((date) => (
        <div key={date}>
          <p className="text-xs font-sans font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
            {new Date(date + "T00:00:00").toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <div className="space-y-1.5">
            {grouped[date].map((result) => (
              <div
                key={result.id}
                className="rounded-xl border border-border bg-card p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-sans font-semibold text-foreground">
                        {result.namaParameter}
                      </span>
                      {result.sumber === "upload" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); if (result.fileId) openFile(result.fileId); }}
                          className="text-[10px] font-sans font-medium text-primary underline underline-offset-2 hover:text-primary/80 ml-1 bg-transparent border-none cursor-pointer"
                        >
                          Buka File
                        </button>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-lg font-sans font-bold text-primary">
                        {result.nilai}
                      </span>
                      {result.satuan && (
                        <span className="text-xs font-sans text-muted-foreground">
                          {result.satuan}
                        </span>
                      )}
                    </div>
                    {result.nilaiRujukan && (
                      <p className="text-xs font-sans text-muted-foreground mt-0.5">
                        Rujukan: {result.nilaiRujukan}
                      </p>
                    )}
                    {result.catatan && (
                      <p className="text-xs font-sans text-muted-foreground mt-1 italic">
                        {result.catatan}
                      </p>
                    )}
                  </div>

                  {/* Archive button */}
                                    {/* Edit button */}
                                    {result.sumber !== "upload" && (
                                      <LabEditSheet
                                        entry={result}
                                        accessToken={accessToken}
                                        onSaved={fetchResults}
                                      />
                                    )}
                                    {/* Archive button */}
                  <button
                    onClick={() => handleArchive(result.id)}
                    disabled={archiving === result.id}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
                    title="Arsipkan"
                  >
                    <Archive className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
