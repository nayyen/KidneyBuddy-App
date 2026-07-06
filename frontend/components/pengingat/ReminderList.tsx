"use client";

/**
 * ReminderList.tsx — All reminders sorted by jamPengingat
 *
 * Fetches GET /api/reminders and renders each entry via ReminderItem.
 * Handles loading skeleton, error state, and empty state per UI-SPEC.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import { Pill, Droplets } from "lucide-react";
import { authFetch } from "@/lib/api";
import ReminderItem, { type Reminder } from "./ReminderItem";
import { SYNC_EVENTS, dispatchSyncEvent } from "@/lib/syncEvents";

interface ReminderListProps {
  accessToken: string;
  /** Increment to force refetch (e.g., after a new reminder is saved) */
  refreshKey?: number;
}

function sortByTime(reminders: Reminder[]): Reminder[] {
  return [...reminders].sort((a, b) =>
    a.jamPengingat.localeCompare(b.jamPengingat),
  );
}

export default function ReminderList({
  accessToken,
  refreshKey = 0,
}: ReminderListProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fix (quick-260706-ea3): the skeleton must render ONLY on the true
  // initial load. Background refetches (window focus after the OS file
  // picker closes, visibilitychange, the 30s cross-device poll, SYNC_EVENTS)
  // must never flip isLoading back to true — doing so unmounts every
  // <ReminderItem>, destroying its local showEdit state and silently
  // closing an open EditReminderSheet mid-edit.
  const hasLoadedOnceRef = useRef(false);
  // Mirrors `reminders` for synchronous reads inside fetchReminders (which
  // is memoized with only `accessToken` as a dep, so it can't safely close
  // over the `reminders` state value directly).
  const remindersRef = useRef<Reminder[]>([]);

  useEffect(() => {
    remindersRef.current = reminders;
  }, [reminders]);

  const fetchReminders = useCallback(async () => {
    if (!accessToken) return;
    if (!hasLoadedOnceRef.current) {
      setIsLoading(true);
    }
    try {
      const data = await authFetch<Reminder[]>("/api/reminders", accessToken);
      setReminders(sortByTime(Array.isArray(data) ? data : []));
      setError(null);
    } catch (err) {
        // A background refetch failure must never tear down an already
        // -rendered list into the full-page error state — only surface the
        // blocking error UI when there is no data currently displayed.
        if (remindersRef.current.length === 0) {
          setError(
            err instanceof Error ? err.message : "Gagal memuat pengingat",
          );
        }
      } finally {
        hasLoadedOnceRef.current = true;
        setIsLoading(false);
      }
    }, [accessToken]);

    useEffect(() => {
      fetchReminders();
    }, [fetchReminders, refreshKey]);

    const handleDeleted = (id: string) => {
      setReminders((prev) => prev.filter((r) => r.id !== id));
      dispatchSyncEvent(SYNC_EVENTS.REMINDER_UPDATED);
  };

  const handleUpdated = (updated: Reminder) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r)),
    );
      dispatchSyncEvent(SYNC_EVENTS.REMINDER_UPDATED);
  };

  // 3(a) fix (quick-260706-8zc): after a successful EDIT, force a genuine
  // server refetch instead of merging the stale pre-edit `reminder` prop
  // ReminderItem's handleEditSuccess used to pass via onUpdated(reminder).
  // That stale object still held the OLD fotoObat, so a deleted photo kept
  // showing in the UI even though the backend correctly nulled the column.
  const handleEdited = async () => {
    await fetchReminders();
    dispatchSyncEvent(SYNC_EVENTS.REMINDER_UPDATED);
  };

    if (isLoading) {
      return (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ background: "#f0faf9", borderRadius: 13, height: 80 }}
            />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div
          style={{
            background: "#fff5f5",
            border: "0.5px solid #fce4e4",
            borderRadius: 13,
            padding: "12px 14px",
            textAlign: "center",
          }}
        >
          <p className="font-sans" style={{ fontSize: 14, color: "#d4183d" }}>
          Gagal memuat data. Periksa koneksi internet Anda, lalu coba lagi.
        </p>
        <button
          onClick={fetchReminders}
          className="font-sans mt-2"
          style={{ fontSize: 14, color: "#0d4a44", textDecoration: "underline" }}
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (reminders.length === 0) {
    return null; // Empty state is rendered by the page (has a CTA button)
  }

    const obatReminders = reminders.filter((r) => r.jenis === "obat");
    const cuciDarahReminders = reminders.filter(
      (r) => r.jenis === "capd" || r.jenis === "hd",
    );

  return (
      <div className="space-y-4">
              {obatReminders.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Pill size={16} style={{ color: "#2a9d8f" }} />
                    <p className="font-heading font-bold" style={{ fontSize: 15, color: "#1a2e2c" }}>
                      Pengingat Obat
                    </p>
                  </div>
                  {obatReminders.map((reminder) => (
                    <ReminderItem
                      key={reminder.id}
                      reminder={reminder}
                      accessToken={accessToken}
                      onDeleted={handleDeleted}
                      onUpdated={handleUpdated}
                      onEdited={handleEdited}
                    />
                  ))}
                </div>
              )}

              {obatReminders.length > 0 && cuciDarahReminders.length > 0 && (
                <hr style={{ border: "none", borderTop: "1px solid #e6f5f3", margin: "0" }} />
              )}

              {cuciDarahReminders.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Droplets size={16} style={{ color: "#2a9d8f" }} />
                    <p className="font-heading font-bold" style={{ fontSize: 15, color: "#1a2e2c" }}>
                      Pengingat Cuci Darah (CAPD/HD)
                    </p>
                  </div>
                  {cuciDarahReminders.map((reminder) => (
                    <ReminderItem
                      key={reminder.id}
                      reminder={reminder}
                      accessToken={accessToken}
                      onDeleted={handleDeleted}
                      onUpdated={handleUpdated}
                      onEdited={handleEdited}
                    />
                  ))}
                </div>
              )}
      <p
        className="font-sans text-right mt-1"
        style={{ fontSize: 13, color: "#3d6b66" }}
      >
        {reminders.length} pengingat
      </p>
    </div>
  );
}
