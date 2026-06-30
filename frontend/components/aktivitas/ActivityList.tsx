"use client";

/**
 * ActivityList.tsx — List of activities grouped by date with edit/delete
 *
 * Groups by: Hari Ini, Kemarin, then formatted date.
 * Each item shows: duration, status, perasaan + catatan, edit/delete buttons.
 */

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";
import { Clock, CheckCircle2, Play, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface ActivityResult {
  id: string;
  namaKegiatan: string;
  waktuMulai: string;
  estimasiSelesai: string;
  status: string;
  waktuSelesai: string | null;
  perasaan: string | null;
  catatanPerasaan: string | null;
}

interface ActivityListProps {
  accessToken: string;
  refreshKey?: number;
  onCompleteActivity?: (id: string, nama: string) => void;
}

const PERASAAN_LABEL: Record<string, string> = {
  nyaman: "Nyaman",
  biasa: "Biasa",
  lelah: "Lelah",
  berat: "Berat",
};
const PERASAAN_COLOR: Record<string, string> = {
  nyaman: "#2a9d8f",
  biasa: "#7a8c8a",
  lelah: "#ef9f27",
  berat: "#d4183d",
};

function formatWIB(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
}

function formatDateWIB(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" });
}

function getDateKey(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
}

function isToday(isoStr: string): boolean {
  const d = new Date(isoStr);
  const today = new Date();
  return d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }) === today.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
}

function isYesterday(isoStr: string): boolean {
  const d = new Date(isoStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }) === yesterday.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
}

function computeDurationMinutes(waktuMulai: string, waktuSelesai?: string | null): number {
  const start = new Date(waktuMulai).getTime();
  const end = waktuSelesai ? new Date(waktuSelesai).getTime() : Date.now();
  return Math.floor((end - start) / 60000);
}

function isPastEstimasi(estimasiSelesai: string): boolean {
  if (!estimasiSelesai) return false;
  return Date.now() > new Date(estimasiSelesai).getTime();
}

export default function ActivityList({ accessToken, refreshKey = 0, onCompleteActivity }: ActivityListProps) {
  const [activities, setActivities] = useState<ActivityResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fetchActivities = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await authFetch<{ activities: ActivityResult[] }>("/api/activities/all", accessToken);
      setActivities(data.activities ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat aktivitas");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { fetchActivities(); }, [fetchActivities, refreshKey]);

  const handleDelete = async (id: string) => {
    try {
      await authFetch(`/api/activities/${id}`, accessToken, { method: "DELETE" });
      toast.success("Aktivitas dihapus");
      setActivities((prev) => prev.filter((a) => a.id !== id));
    } catch { toast.error("Gagal menghapus"); }
  };

  const handleEditSave = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const updated = await authFetch<ActivityResult>(`/api/activities/${id}`, accessToken, {
        method: "PUT", body: JSON.stringify({ namaKegiatan: editName.trim() }),
      });
      setActivities((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setEditingId(null);
      toast.success("Aktivitas diperbarui");
    } catch { toast.error("Gagal memperbarui"); }
  };

  // Group by date
  const groups = activities.reduce<Record<string, ActivityResult[]>>((acc, a) => {
    const key = getDateKey(a.waktuMulai);
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  const sortedDates = Object.keys(groups).sort((a, b) => {
    const da = new Date(a.split("/").reverse().join("-"));
    const db = new Date(b.split("/").reverse().join("-"));
    return db.getTime() - da.getTime();
  });

  function getGroupLabel(dateStr: string): string {
    // dateStr is in locale format "dd/mm/yyyy" or similar
    // Create a date from this group's first item
    const activitiesInGroup = groups[dateStr];
    if (!activitiesInGroup || activitiesInGroup.length === 0) return dateStr;
    const iso = activitiesInGroup[0].waktuMulai;
    if (isToday(iso)) return "Hari Ini";
    if (isYesterday(iso)) return "Kemarin";
    return formatDateWIB(iso);
  }

  if (isLoading) {
    return <p className="font-sans text-sm" style={{ color: "#7a8c8a" }}>Memuat...</p>;
  }
  if (error) {
    return <p className="font-sans text-sm" style={{ color: "#d4183d" }}>{error}</p>;
  }
  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="font-sans font-medium" style={{ fontSize: 14, color: "#7a8c8a" }}>Belum ada aktivitas</p>
        <p className="font-sans" style={{ fontSize: 12, color: "#cfe8e4", marginTop: 4 }}>Mulai kegiatan dari halaman Beranda</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedDates.map((dateKey) => {
        const items = groups[dateKey];
        return (
          <div key={dateKey}>
            {/* Date separator */}
            <p className="text-xs font-sans font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
              {getGroupLabel(dateKey)}
            </p>
            <div className="space-y-1.5">
              {items.map((activity) => {
                const dur = computeDurationMinutes(activity.waktuMulai, activity.waktuSelesai);
                const hours = Math.floor(dur / 60);
                const mins = dur % 60;
                const durText = hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;
                const overdue = activity.status !== "selesai" && isPastEstimasi(activity.estimasiSelesai);

                return (
                  <div key={activity.id} className="rounded-xl px-4 py-3" style={{ backgroundColor: "#fafdfc", border: "1px solid #e8f5f2" }}>
                    <div className="flex items-center gap-3">
                      {/* Status icon */}
                      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: activity.status === "selesai" ? "#e0f5f2" : "#fff8e6" }}>
                        {activity.status === "selesai" ? <CheckCircle2 size={16} color="#2a9d8f" /> : <Clock size={16} color="#ef9f27" />}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        {activity.status !== "selesai" && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-sans font-medium inline-flex items-center gap-1" style={{ fontSize: 10, color: overdue ? "#d4183d" : "#2a9d8f", backgroundColor: overdue ? "#fdecee" : "#f0faf9", borderRadius: 10, padding: "2px 8px" }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: overdue ? "#d4183d" : "#2a9d8f", display: "inline-block" }} />
                              {durText}{overdue ? " · Terlambat" : ""}
                            </span>
                          </div>
                        )}

                        {editingId === activity.id ? (
                          <div className="flex gap-2 items-center">
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm flex-1" />
                            <button onClick={() => handleEditSave(activity.id)} className="p-1 rounded hover:bg-green-100"><Check className="h-4 w-4 text-green-600" /></button>
                            <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-gray-100"><X className="h-4 w-4 text-muted-foreground" /></button>
                          </div>
                        ) : (
                          <p className="font-heading font-semibold truncate" style={{ fontSize: 14, color: "#1a2e2c" }}>{activity.namaKegiatan}</p>
                        )}

                        <p className="font-sans" style={{ fontSize: 11, color: "#7a8c8a", marginTop: 1 }}>
                          {formatDateWIB(activity.waktuMulai)} · {formatWIB(activity.waktuMulai)}
                          {activity.waktuSelesai ? ` — ${formatWIB(activity.waktuSelesai)}` : ` — estimasi ${formatWIB(activity.estimasiSelesai)}`}
                        </p>
                      </div>

                      {/* Right side */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {activity.status === "selesai" ? (
                          <>
                            {activity.perasaan && <span className="font-sans font-medium" style={{ fontSize: 11, color: PERASAAN_COLOR[activity.perasaan] ?? "#7a8c8a", textAlign: "right" }}>{PERASAAN_LABEL[activity.perasaan] ?? activity.perasaan}</span>}
                            {activity.catatanPerasaan && <span className="font-sans text-right" style={{ fontSize: 10, color: "#7a8c8a", maxWidth: 120, lineHeight: 1.3 }}>{activity.catatanPerasaan}</span>}
                          </>
                        ) : (
                          <button onClick={() => window.dispatchEvent(new CustomEvent("activity:complete", { detail: { id: activity.id, namaKegiatan: activity.namaKegiatan } }))}
                            className="font-sans font-medium cursor-pointer active:scale-95 transition-transform" style={{ fontSize: 11, borderRadius: 20, padding: "4px 12px", backgroundColor: "#ef9f27", color: "#ffffff", border: "none" }}>
                            Selesaikan
                          </button>
                        )}

                        {/* Edit & Delete buttons */}
                        <div className="flex items-center gap-1 mt-1">
                          <button onClick={() => { setEditingId(activity.id); setEditName(activity.namaKegiatan); }} className="p-1 rounded hover:bg-gray-100 transition-colors" aria-label="Edit aktivitas">
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button onClick={() => handleDelete(activity.id)} className="p-1 rounded hover:bg-red-50 transition-colors" aria-label="Hapus aktivitas">
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
