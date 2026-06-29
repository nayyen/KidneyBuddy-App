"use client";

/**
 * LabArchivedList.tsx — List of archived lab results with restore button.
 *
 * Fetches from GET /api/lab/archived.
 * Each item shows a "Pulihkan" (restore) button that calls PATCH /api/lab/:id/restore.
 */

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";
import { Archive, RotateCcw, FlaskConical } from "lucide-react";
import { toast } from "sonner";

interface ArchivedLabResult {
  id: string;
  tanggalPemeriksaan: string;
  namaParameter: string;
  nilai: string;
  satuan: string | null;
  sumber: string;
}

interface LabArchivedListProps {
  accessToken: string;
  refreshKey?: number;
  onRestored?: () => void;
}

export default function LabArchivedList({
  accessToken,
  refreshKey = 0,
  onRestored,
}: LabArchivedListProps) {
  const [results, setResults] = useState<ArchivedLabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchArchived = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await authFetch<{ results: ArchivedLabResult[] }>(
        "/api/lab/archived",
        accessToken,
      );
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchArchived();
  }, [fetchArchived, refreshKey]);

  const handleRestore = async (id: string) => {
    setRestoring(id);
    try {
      await authFetch(`/api/lab/${id}/restore`, accessToken, {
        method: "PATCH",
      });
      toast.success("Item dipulihkan");
      setResults((prev) => prev.filter((r) => r.id !== id));
      onRestored?.();
    } catch {
      toast.error("Gagal memulihkan item");
    } finally {
      setRestoring(null);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground font-sans text-center py-4">
        Memuat...
      </p>
    );
  }

  if (results.length === 0) {
    return (
      <p className="text-xs text-muted-foreground font-sans text-center py-4">
        Belum ada item yang diarsipkan
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      <h4 className="font-heading font-bold text-sm text-foreground mb-2 flex items-center gap-2">
        <Archive size={14} className="text-muted-foreground" />
        Arsip
      </h4>
      {results.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-sans font-medium text-foreground truncate">
              {item.namaParameter}
            </p>
            <p className="text-xs font-sans text-muted-foreground">
              {item.tanggalPemeriksaan}
              {item.satuan ? ` — ${item.nilai} ${item.satuan}` : ""}
            </p>
          </div>
          <button
            onClick={() => handleRestore(item.id)}
            disabled={restoring === item.id}
            className="flex items-center gap-1 text-xs font-sans font-medium px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "#f0faf9",
              color: "#2a9d8f",
              border: "1px solid #d0e8e4",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={12} />
            Pulihkan
          </button>
        </div>
      ))}
    </div>
  );
}
