"use client";

/**
 * ActivityList.tsx — List of activities grouped by date with edit/delete
 *
 * Groups by: Hari Ini, Kemarin, then formatted date.
 * Each item shows: duration, status, perasaan + catatan, edit/delete buttons.
 */

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";
import { Clock, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

// Device-timezone formatters (quick-260705-9n4 task 3): omitting `timeZone`
// lets Intl use the browser's own local timezone instead of a hardcoded
// Jakarta assumption, so times display correctly for patients outside Indonesia's western zone.
function formatLocalTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatLocalDate(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function getDateKey(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString("id-ID");
}

function isToday(isoStr: string): boolean {
  const d = new Date(isoStr);
  const today = new Date();
  return d.toLocaleDateString("id-ID") === today.toLocaleDateString("id-ID");
}

function isYesterday(isoStr: string): boolean {
  const d = new Date(isoStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toLocaleDateString("id-ID") === yesterday.toLocaleDateString("id-ID");
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
  const [editNama, setEditNama] = useState("");
  const [editEstimasi, setEditEstimasi] = useState("");
  const [editTanggal, setEditTanggal] = useState("");
  const [editPerasaan, setEditPerasaan] = useState<string>("");
  const [editCatatan, setEditCatatan] = useState("");

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

  const startEdit = (activity: ActivityResult) => {
    setEditingId(activity.id);
    setEditNama(activity.namaKegiatan);
    // Extract HH:mm from estimasiSelesai ISO string
    const estimasi = new Date(activity.estimasiSelesai);
    setEditEstimasi(`${String(estimasi.getHours()).padStart(2, "0")}:${String(estimasi.getMinutes()).padStart(2, "0")}`);
    setEditTanggal(activity.waktuMulai.slice(0, 10));
    setEditPerasaan(activity.perasaan ?? "");
    setEditCatatan(activity.catatanPerasaan ?? "");
  };

  const handleEditSave = async (id: string, status: string) => {
    const body: Record<string, unknown> = {};
    if (status === "selesai") {
      // Completed: only update perasaan + catatan
      body.perasaan = editPerasaan || null;
      body.catatan = editCatatan || null;
    } else {
      // Active: update nama, estimasi, tanggal
      if (!editNama.trim()) { toast.error("Nama kegiatan tidak boleh kosong"); return; }
      body.namaKegiatan = editNama.trim();
      body.estimasiSelesai = editEstimasi;
      body.tanggal = editTanggal;
    }
    try {
      const updated = await authFetch<ActivityResult>(`/api/activities/${id}`, accessToken, {
        method: "PUT", body: JSON.stringify(body),
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
    return formatLocalDate(iso);
  }

  if (isLoading) {
    return <p className="font-sans text-sm" style={{ color: "#3d6b66" }}>Memuat...</p>;
  }
  if (error) {
    return <p className="font-sans text-sm" style={{ color: "#d4183d" }}>{error}</p>;
  }
  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="font-sans font-medium" style={{ fontSize: 14, color: "#3d6b66" }}>Belum ada aktivitas</p>
        <p className="font-sans" style={{ fontSize: 13, color: "#3d6b66", marginTop: 4 }}>Mulai kegiatan dari halaman Beranda</p>
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
                            <span className="font-sans font-medium inline-flex items-center gap-1" style={{ fontSize: 13, color: overdue ? "#d4183d" : "#0d4a44", backgroundColor: overdue ? "#fdecee" : "#f0faf9", borderRadius: 10, padding: "2px 8px" }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: overdue ? "#d4183d" : "#2a9d8f", display: "inline-block" }} />
                                {durText}{overdue ? " · Lebih Dari Waktu Estimasi" : ""}
                            </span>
                          </div>
                        )}

                        {editingId === activity.id ? (
                          activity.status === "selesai" ? (
                            /* ── Edit completed activity: perasaan + catatan ── */
                            <div className="space-y-2">
                              {/* Perasaan selector */}
                              <div className="flex gap-1.5">
                                {["nyaman", "biasa", "lelah", "berat"].map((p) => (
                                  <button
                                    key={p}
                                    onClick={() => setEditPerasaan(p)}
                                    className="font-sans font-medium text-[13px] px-3 py-1.5 rounded-full transition-all"
                                    style={{
                                      backgroundColor: editPerasaan === p ? `${PERASAAN_COLOR[p]}20` : "#f0faf9",
                                      color: editPerasaan === p ? PERASAAN_COLOR[p] : "#3d6b66",
                                      border: editPerasaan === p ? `1.5px solid ${PERASAAN_COLOR[p]}` : "1.5px solid transparent",
                                    }}
                                  >
                                    {PERASAAN_LABEL[p] ?? p}
                                  </button>
                                ))}
                              </div>
                              {/* Catatan textarea */}
                              <textarea
                                value={editCatatan}
                                onChange={(e) => setEditCatatan(e.target.value)}
                                maxLength={200}
                                placeholder="Catatan perasaan..."
                                className="w-full font-sans text-xs rounded-lg border px-3 py-2 outline-none resize-none"
                                style={{ borderColor: "#d0e8e4", backgroundColor: "#fafdfc", color: "#1a2e2c", minHeight: 60 }}
                              />
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => setEditingId(null)} className="font-sans text-[13px] px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#f0faf9", color: "#3d6b66", border: "1px solid #d0e8e4" }}>Batal</button>
                                <button onClick={() => handleEditSave(activity.id, activity.status)} className="font-sans text-[13px] px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#2a9d8f", color: "#ffffff", border: "none" }}>Simpan</button>
                              </div>
                            </div>
                          ) : (
                            /* ── Edit active activity: nama + tanggal + estimasi ── */
                            <div className="space-y-2">
                              <input
                                value={editNama}
                                onChange={(e) => setEditNama(e.target.value)}
                                placeholder="Nama kegiatan"
                                maxLength={100}
                                className="w-full font-sans text-sm rounded-lg border px-3 py-2 outline-none"
                                style={{ borderColor: "#d0e8e4", backgroundColor: "#fafdfc", color: "#1a2e2c" }}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <label className="font-sans text-[13px] text-muted-foreground block mb-0.5">Tanggal</label>
                                  <input type="date" value={editTanggal} onChange={(e) => setEditTanggal(e.target.value)}
                                    className="w-full font-sans text-xs rounded-lg border px-3 py-2 outline-none"
                                    style={{ borderColor: "#d0e8e4", backgroundColor: "#fafdfc", color: "#1a2e2c" }} />
                                </div>
                                <div className="flex-1">
                                  <label className="font-sans text-[13px] text-muted-foreground block mb-0.5">Estimasi Selesai</label>
                                  <input type="time" value={editEstimasi} onChange={(e) => setEditEstimasi(e.target.value)}
                                    className="w-full font-sans text-xs rounded-lg border px-3 py-2 outline-none"
                                    style={{ borderColor: "#d0e8e4", backgroundColor: "#fafdfc", color: "#1a2e2c" }} />
                                </div>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => setEditingId(null)} className="font-sans text-[13px] px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#f0faf9", color: "#3d6b66", border: "1px solid #d0e8e4" }}>Batal</button>
                                <button onClick={() => handleEditSave(activity.id, activity.status)} className="font-sans text-[13px] px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#2a9d8f", color: "#ffffff", border: "none" }}>Simpan</button>
                              </div>
                            </div>
                          )
                        ) : (
                          <p className="font-heading font-semibold truncate" style={{ fontSize: 14, color: "#1a2e2c" }}>{activity.namaKegiatan}</p>
                        )}

                        <p className="font-sans" style={{ fontSize: 13, color: "#3d6b66", marginTop: 1 }}>
                          {formatLocalDate(activity.waktuMulai)} · {formatLocalTime(activity.waktuMulai)}
                          {activity.waktuSelesai ? ` — ${formatLocalTime(activity.waktuSelesai)}` : ` — estimasi ${formatLocalTime(activity.estimasiSelesai)}`}
                        </p>
                      </div>

                      {/* Right side */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {activity.status === "selesai" && !editingId ? (
                          <>
                            {/* C4 (quick-260705-9n4 task 9): bumped from 13px to match the
                                surrounding body text (~14px) — was rendering too small/hard to read. */}
                            {activity.perasaan && <span className="font-sans font-medium" style={{ fontSize: 14, color: PERASAAN_COLOR[activity.perasaan] ?? "#3d6b66", textAlign: "right" }}>{PERASAAN_LABEL[activity.perasaan] ?? activity.perasaan}</span>}
                            {activity.catatanPerasaan && <span className="font-sans text-right" style={{ fontSize: 16, fontWeight: 500, color: "#1a2e2c", maxWidth: 140, lineHeight: 1.4 }}>{activity.catatanPerasaan}</span>}
                          </>
                        ) : activity.status !== "selesai" && editingId !== activity.id ? (
                          <button onClick={() => window.dispatchEvent(new CustomEvent("activity:complete", { detail: { id: activity.id, namaKegiatan: activity.namaKegiatan } }))}
                            className="font-sans font-medium cursor-pointer active:scale-95 transition-transform" style={{ fontSize: 13, borderRadius: 20, padding: "4px 12px", backgroundColor: "#ef9f27", color: "#ffffff", border: "none" }}>
                            Selesaikan
                          </button>
                        ) : <div style={{ minHeight: 32 }} />}

                        {/* Edit & Delete buttons */}
                        <div className="flex items-center gap-2 mt-1">
                          <button onClick={() => startEdit(activity)} className="p-3 rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-center" aria-label="Edit aktivitas" style={{ minHeight: 44, minWidth: 44 }}>
                            <Pencil className="h-5 w-5" style={{ color: "#3d6b66" }} />
                          </button>
                          <button onClick={() => handleDelete(activity.id)} className="p-3 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center" aria-label="Hapus aktivitas" style={{ minHeight: 44, minWidth: 44 }}>
                            <Trash2 className="h-5 w-5" style={{ color: "#d4183d" }} />
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
