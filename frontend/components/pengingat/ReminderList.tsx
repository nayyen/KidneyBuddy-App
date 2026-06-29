"use client";

/**
 * ReminderList.tsx — All reminders sorted by jamPengingat
 *
 * Fetches GET /api/reminders and renders each entry via ReminderItem.
 * Handles loading skeleton, error state, and empty state per UI-SPEC.
 */

import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { authFetch } from "@/lib/api";
import ReminderItem, { type Reminder } from "./ReminderItem";

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

  const fetchReminders = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await authFetch<Reminder[]>("/api/reminders", accessToken);
      setReminders(sortByTime(Array.isArray(data) ? data : []));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat pengingat",
      );
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders, refreshKey]);

  const handleDeleted = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdated = (updated: Reminder) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r)),
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              background: "#f0faf9",
              borderRadius: 13,
              height: 80,
            }}
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
        <p className="font-sans" style={{ fontSize: 12, color: "#d4183d" }}>
          Gagal memuat data. Periksa koneksi internet Anda, lalu coba lagi.
        </p>
        <button
          onClick={fetchReminders}
          className="font-sans mt-2"
          style={{ fontSize: 12, color: "#2a9d8f", textDecoration: "underline" }}
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (reminders.length === 0) {
    return null; // Empty state is rendered by the page (has a CTA button)
  }

  return (
    <div className="space-y-2">
      {reminders.map((reminder) => (
        <ReminderItem
          key={reminder.id}
          reminder={reminder}
          accessToken={accessToken}
          onDeleted={handleDeleted}
          onUpdated={handleUpdated}
        />
      ))}
      <p
        className="font-sans text-right mt-1"
        style={{ fontSize: 10, color: "#7a8c8a" }}
      >
        {reminders.length} pengingat
      </p>
    </div>
  );
}
