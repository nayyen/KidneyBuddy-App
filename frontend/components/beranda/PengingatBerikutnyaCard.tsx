"use client";

/**
 * PengingatBerikutnyaCard.tsx — Next upcoming reminder display
 *
 * Fetches GET /api/reminders/next.
 * Shows the next upcoming reminder's time + name.
 * Empty state: "Tidak ada pengingat berikutnya" per UI-SPEC.
 *
 * Per UI-SPEC desktop grid:
 *   DeltaCairanCard spans 2 columns, PengingatBerikutnyaCard spans 1 column.
 */

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/api";
import { Bell, Check, Droplets, Pill } from "lucide-react";
import { SYNC_EVENTS, dispatchSyncEvent } from "@/lib/syncEvents";

interface NextReminder {
  id: string;
  jenis: "obat" | "capd" | "hd";
  nama: string;
  jamPengingat: string;
  catatanWaktu?: string | null;
}
interface GroupedNextReminder {
  obat: NextReminder[];
  cuciDarah: NextReminder[];
}

interface PengingatBerikutnyaCardProps {
  accessToken: string;
  refreshKey?: number;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  obat: { bg: "#f0faf9", text: "#0d4a44" },
  capd: { bg: "#f0faf9", text: "#0d4a44" },
  hd: { bg: "#fdf3e3", text: "#7a4c00" },
};

const TYPE_LABELS: Record<string, string> = {
  obat: "Obat",
  capd: "CAPD",
  hd: "HD",
};

export default function PengingatBerikutnyaCard({
  accessToken,
  refreshKey = 0,
}: PengingatBerikutnyaCardProps) {
    const [grouped, setGrouped] = useState<GroupedNextReminder>({
      obat: [],
      cuciDarah: [],
    });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Reminder ids currently being confirmed — disables the button + shows a
  // brief optimistic "done" state until the refetch (triggered by the sync
  // event below) removes the item from this widget for real (B4).
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());

  const fetchNext = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
        const data = await authFetch<GroupedNextReminder>(
        "/api/reminders/next",
        accessToken,
      );
        setGrouped(data ?? { obat: [], cuciDarah: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat pengingat");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchNext();
  }, [fetchNext, refreshKey]);


    // Refresh when medication, cuci darah, or reminder data changes
    useEffect(() => {
      const refresh = () => fetchNext();
      window.addEventListener(SYNC_EVENTS.OBAT_CONFIRMED, refresh);
      window.addEventListener(SYNC_EVENTS.CUCIDARAH_CONFIRMED, refresh);
      window.addEventListener(SYNC_EVENTS.REMINDER_UPDATED, refresh);
      return () => {
        window.removeEventListener(SYNC_EVENTS.OBAT_CONFIRMED, refresh);
        window.removeEventListener(SYNC_EVENTS.CUCIDARAH_CONFIRMED, refresh);
        window.removeEventListener(SYNC_EVENTS.REMINDER_UPDATED, refresh);
      };
    }, [fetchNext]);

    // Refetch on tab focus (quick-260705-9n4 task 5)
    useEffect(() => {
      const onFocus = () => fetchNext();
      const onVisibility = () => {
        if (document.visibilityState === "visible") fetchNext();
      };
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    }, [fetchNext]);

    // B4 (quick-260705-9n4 task 7): inline check/confirm directly from this
    // widget. "Slot" = identical jamPengingat HH:mm among the currently-
    // upcoming reminders of the same jenis — /api/reminders/next already
    // groups by identical slot (reminderSchedule.repository.ts#findNextUpcoming),
    // so grouped.obat / grouped.cuciDarah ARE the current slot's items.
    // Confirming here uses the REMINDER-based confirm endpoint (not a logId —
    // this widget only has reminder_schedule rows, not log rows), then
    // dispatches the same sync event Task 5 standardized so ObatCard/
    // CuciDarahCard (which will now show this item as done under "Hari Ini")
    // and this widget's own refetch (via the listener above) both update.
    // Once ALL items in the current slot are confirmed, the next fetchNext()
    // naturally advances to the next upcoming slot, since the backend
    // excludes already-confirmed-today reminders from findNextUpcoming.
    const handleConfirm = async (rem: NextReminder) => {
      if (confirmingIds.has(rem.id)) return;
      setConfirmingIds((prev) => new Set(prev).add(rem.id));
      try {
        const isObat = rem.jenis === "obat";
        await authFetch(
          isObat ? "/api/medication-log/confirm" : "/api/dialysis-log/confirm",
          accessToken,
          {
            method: "POST",
            body: JSON.stringify({ reminderId: rem.id }),
          },
        );
        dispatchSyncEvent(
          isObat ? SYNC_EVENTS.OBAT_CONFIRMED : SYNC_EVENTS.CUCIDARAH_CONFIRMED,
        );
      } catch {
        // Swallow — the button re-enables and the item remains in this
        // widget so the user can retry.
      } finally {
        setConfirmingIds((prev) => {
          const next = new Set(prev);
          next.delete(rem.id);
          return next;
        });
      }
    };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "0.5px solid #f0faf9",
        borderRadius: 14,
        padding: 14,
        height: "100%",
      }}
    >
      {/* Card title */}
      <div className="flex items-center gap-2 mb-3">
        <Bell size={14} style={{ color: "#0d4a44" }} />
        <p
          className="font-heading font-bold"
          style={{ fontSize: 14, color: "#1a2e2c" }}
        >
          Pengingat Berikutnya
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-1">
          <div
            className="animate-pulse"
            style={{ height: 24, borderRadius: 8, background: "#f0faf9" }}
          />
          <div
            className="animate-pulse"
            style={{ height: 16, borderRadius: 8, background: "#f0faf9", width: "60%" }}
          />
        </div>
      ) : error ? (
        <div>
          <p className="font-sans" style={{ fontSize: 14, color: "#d4183d" }}>
            Gagal memuat data.
          </p>
          <button
            onClick={fetchNext}
            className="font-sans mt-1"
            style={{ fontSize: 14, color: "#0d4a44", textDecoration: "underline" }}
          >
            Coba Lagi
          </button>
        </div>
          ) : !grouped.obat?.length && !grouped.cuciDarah?.length ? (
            <p className="font-sans" style={{ fontSize: 14, color: "#3d6b66" }}>
              Tidak ada pengingat berikutnya
            </p>
          ) : (
            <div className="space-y-3">
              {/* Section 1: Pengingat Obat Berikutnya */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Pill size={12} style={{ color: "#0d4a44" }} />
                  <p className="font-sans font-semibold" style={{ fontSize: 13, color: "#3d6b66" }}>
                    Pengingat Obat
                  </p>
                </div>
                {!grouped.obat || grouped.obat.length === 0 ? (
                  <p className="font-sans" style={{ fontSize: 14, color: "#3d6b66" }}>
                    Tidak ada pengingat obat berikutnya
                  </p>
                ) : (
                  <div className="space-y-2">
                    {grouped.obat.map((rem) => (
                      <div key={rem.id} className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => handleConfirm(rem)}
                          disabled={confirmingIds.has(rem.id)}
                          aria-label="Tandai sudah diminum"
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            flexShrink: 0,
                            marginTop: 2,
                            cursor: confirmingIds.has(rem.id) ? "default" : "pointer",
                            backgroundColor: "transparent",
                            border: "1.5px solid #cfe8e4",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: confirmingIds.has(rem.id) ? 0.5 : 1,
                          }}
                        >
                          {confirmingIds.has(rem.id) && (
                            <Check size={12} color="#2a9d8f" strokeWidth={2.5} />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-heading font-bold" style={{ fontSize: 20, color: "#0d4a44", lineHeight: 1.2 }}>
                              {rem.jamPengingat}
                            </span>
                            <span className="font-sans font-medium" style={{ fontSize: 13, paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2, borderRadius: 5, backgroundColor: (TYPE_COLORS[rem.jenis] ?? TYPE_COLORS.obat).bg, color: (TYPE_COLORS[rem.jenis] ?? TYPE_COLORS.obat).text }}>
                              {TYPE_LABELS[rem.jenis] ?? rem.jenis}
                            </span>
                          </div>
                          <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>
                            {rem.nama}
                          </p>
                          {rem.catatanWaktu && (
                            <p className="font-sans mt-0.5" style={{ fontSize: 13, color: "#3d6b66" }}>
                              {rem.catatanWaktu}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Horizontal divider between sections */}
              {grouped.obat?.length > 0 && grouped.cuciDarah?.length > 0 && (
                <hr style={{ border: "none", borderTop: "1px solid #e6f5f3", margin: "0" }} />
              )}

              {/* Section 2: Pengingat Cuci Darah Berikutnya */}
              {grouped.cuciDarah && grouped.cuciDarah.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Droplets size={12} style={{ color: "#0d4a44" }} />
                    <p className="font-sans font-semibold" style={{ fontSize: 13, color: "#3d6b66" }}>
                      Pengingat Cuci Darah
                    </p>
                  </div>
                  <div className="space-y-2">
                    {grouped.cuciDarah.map((rem) => (
                      <div key={rem.id} className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => handleConfirm(rem)}
                          disabled={confirmingIds.has(rem.id)}
                          aria-label="Tandai sudah cuci darah"
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            flexShrink: 0,
                            marginTop: 2,
                            cursor: confirmingIds.has(rem.id) ? "default" : "pointer",
                            backgroundColor: "transparent",
                            border: "1.5px solid #cfe8e4",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: confirmingIds.has(rem.id) ? 0.5 : 1,
                          }}
                        >
                          {confirmingIds.has(rem.id) && (
                            <Check size={12} color="#2a9d8f" strokeWidth={2.5} />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-heading font-bold" style={{ fontSize: 20, color: "#0d4a44", lineHeight: 1.2 }}>
                              {rem.jamPengingat}
                            </span>
                            <span className="font-sans font-medium" style={{ fontSize: 13, paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2, borderRadius: 5, backgroundColor: (TYPE_COLORS[rem.jenis] ?? TYPE_COLORS.obat).bg, color: (TYPE_COLORS[rem.jenis] ?? TYPE_COLORS.obat).text }}>
                              {TYPE_LABELS[rem.jenis] ?? rem.jenis}
                            </span>
                          </div>
                          <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>
                            {rem.nama}
                          </p>
                          {rem.catatanWaktu && (
                            <p className="font-sans mt-0.5" style={{ fontSize: 13, color: "#3d6b66" }}>
                              {rem.catatanWaktu}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>
    );
  }
