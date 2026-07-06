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
import { Trash2, FlaskConical, ChevronRight } from "lucide-react";
import LabEditSheet from "./LabEditSheet";
import LabUploadEditSheet from "./LabUploadEditSheet";
import { toast } from "sonner";
import { SYNC_EVENTS, dispatchSyncEvent } from "@/lib/syncEvents";
import RangeFilterSelect, {
  type RangeLabel,
  rangeDaysFor,
} from "@/components/shared/RangeFilterSelect";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  /** Item 10: range state lifted into catatan/page.tsx (interlinked with
   * the trend chart's range). */
  range: RangeLabel;
  onRangeChange: (range: RangeLabel) => void;
}

export default function LabResultList({
  accessToken,
  refreshKey = 0,
  range,
  onRangeChange,
}: LabResultListProps) {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<LabResult | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openFile = useCallback(async (fileId: string) => {
    if (!accessToken) return;
    const fileUrl = `http://localhost:4000/api/lab/file/${fileId}?token=${encodeURIComponent(accessToken)}`;
    window.open(fileUrl, "_blank");
  }, [accessToken]);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const days = rangeDaysFor(range);
      const query = days ? `?days=${days}` : "";
      const data = await authFetch<{ results: LabResult[] }>(
        `/api/lab${query}`,
        accessToken,
      );
      setResults(data.results ?? []);
    } catch {
      // Silently fail — list will be empty
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, range]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults, refreshKey]);

  // Item 7: replaces the old "Arsipkan" action with delete-with-confirm.
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await authFetch(`/api/lab/${id}`, accessToken, { method: "DELETE" });
      setResults((prev) => prev.filter((r) => r.id !== id));
      toast.success("Hasil lab dihapus");
      dispatchSyncEvent(SYNC_EVENTS.LAB_SAVED);
    } catch {
      toast.error("Gagal menghapus hasil lab");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Group results by tanggalPemeriksaan (newest first)
  const grouped = results.reduce<Record<string, LabResult[]>>((acc, r) => {
    if (!acc[r.tanggalPemeriksaan]) acc[r.tanggalPemeriksaan] = [];
    acc[r.tanggalPemeriksaan].push(r);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Item 10: range dropdown stays visible above every state (loading/empty/
  // list) so the user can broaden the range even from an empty result.
  const rangeDropdown = (
    <RangeFilterSelect
      value={range}
      onChange={onRangeChange}
      aria-label="Filter rentang daftar hasil lab"
    />
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {rangeDropdown}
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground font-sans">Memuat...</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="space-y-3">
        {rangeDropdown}
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <FlaskConical className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-sans font-medium text-foreground">
            Belum ada hasil lab
          </p>
          <p className="text-xs font-sans text-muted-foreground mt-1">
            Tambahkan hasil lab untuk melihat riwayat pemeriksaan
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rangeDropdown}
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

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Edit button — item 11: upload entries now get their
                        own edit sheet (replace file + nama/tanggal),
                        manual entries keep the existing field-edit sheet. */}
                    {result.sumber === "upload" ? (
                      <LabUploadEditSheet
                        entry={result}
                        accessToken={accessToken}
                        onSaved={fetchResults}
                      />
                    ) : (
                      <LabEditSheet
                        entry={result}
                        accessToken={accessToken}
                        onSaved={fetchResults}
                      />
                    )}
                    {/* Hapus button — item 7: replaces "Arsipkan" with a
                        delete-with-confirm action (no more archive UI). */}
                    <button
                      onClick={() => setDeleteTarget(result)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                      title="Hapus"
                      aria-label="Hapus hasil lab"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Delete confirm dialog (item 7) — reuses the AlertDialog pattern
          from DeleteReminderConfirm.tsx / ActivityList.tsx. */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading font-bold" style={{ fontSize: 14, color: "#1a2e2c" }}>
              Hapus Hasil Lab?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>
              Hasil lab &apos;{deleteTarget?.namaParameter}&apos; akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="font-sans font-medium"
              style={{ fontSize: 12, borderRadius: 20, height: 36 }}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
              disabled={isDeleting}
              className="font-sans font-medium disabled:opacity-50"
              style={{
                fontSize: 12,
                borderRadius: 20,
                height: 36,
                backgroundColor: "#d4183d",
                color: "#ffffff",
                border: "none",
              }}
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
