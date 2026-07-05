"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { authFetch } from "@/lib/api";
import ReminderList from "@/components/pengingat/ReminderList";
import AddReminderSheet from "@/components/pengingat/AddReminderSheet";
import { toast } from "sonner";
import { SYNC_EVENTS, dispatchSyncEvent } from "@/lib/syncEvents";

export default function PengingatPage() {
  const router = useRouter();
  const { accessToken, user, isLoading, isAuthenticated } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [reminderRefreshKey, setReminderRefreshKey] = useState(0);
  const [hasReminders, setHasReminders] = useState<boolean | null>(null);

  // Auth redirect guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // CAREGIVER-02: cross-device sync polling (30s)
  useEffect(() => {
    if (!accessToken) return;
    let lastMaxUpdatedAt = "";
    const interval = setInterval(async () => {
      try {
        const reminders: any[] = await authFetch("/api/reminders", accessToken);
        const maxDate = reminders.reduce((max, r) => {
          const d = r.updatedAt ?? r.updated_at ?? "";
          return d > max ? d : max;
        }, "");
        if (lastMaxUpdatedAt && maxDate > lastMaxUpdatedAt && document.hidden) {
          toast("Jadwal pengingat diperbarui dari perangkat lain.");
          setReminderRefreshKey((k) => k + 1);
        }
        lastMaxUpdatedAt = maxDate || lastMaxUpdatedAt;
      } catch {
        // silent
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [accessToken]);

  // Cross-page sync (quick-260705-9n4 task 5): a medication/dialysis
  // confirm on /beranda or /catatan doesn't change reminder schedules, but
  // this page must still stay consistent with the canonical event set —
  // and any future per-reminder "confirmed today" indicator here would
  // depend on it, so refresh alongside the other two surfaces rather than
  // silently omitting /pengingat from the sync contract.
  useEffect(() => {
    const refresh = () => setReminderRefreshKey((k) => k + 1);
    window.addEventListener(SYNC_EVENTS.OBAT_CONFIRMED, refresh);
    window.addEventListener(SYNC_EVENTS.CUCIDARAH_CONFIRMED, refresh);
    return () => {
      window.removeEventListener(SYNC_EVENTS.OBAT_CONFIRMED, refresh);
      window.removeEventListener(SYNC_EVENTS.CUCIDARAH_CONFIRMED, refresh);
    };
  }, []);

  // Refetch on tab focus (quick-260705-9n4 task 5) — returning to this page
  // (or tab regaining focus) always shows current reminder schedules.
  useEffect(() => {
    const onFocus = () => setReminderRefreshKey((k) => k + 1);
    const onVisibility = () => {
      if (document.visibilityState === "visible") setReminderRefreshKey((k) => k + 1);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const handleReminderAdded = () => {
    setReminderRefreshKey((k) => k + 1);
    setHasReminders(true);
    toast.success("Pengingat berhasil ditambahkan");
    // Creating a reminder must also notify /beranda's ObatCard, CuciDarahCard,
    // and PengingatBerikutnyaCard, plus /catatan's log lists (quick-260705-9n4
    // task 5) — previously only edit/delete (in ReminderList.tsx) dispatched
    // this event; creation via AddReminderSheet never did.
    dispatchSyncEvent(SYNC_EVENTS.REMINDER_UPDATED);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground font-sans text-sm">Memuat...</p>
      </div>
    );
  }

  if (!isAuthenticated || !accessToken) return null;

  return (
    <>
      <div className="space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1
            className="font-heading font-bold"
            style={{ fontSize: 14, color: "#1a2e2c" }}
          >
            Pengingat
          </h1>
          <button
            onClick={() => setIsSheetOpen(true)}
            className="font-sans font-medium transition-colors hover:opacity-90 active:opacity-80"
            style={{
              height: 36,
              paddingLeft: 16,
              paddingRight: 16,
              borderRadius: 20,
              fontSize: 12,
              backgroundColor: "#2a9d8f",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
            }}
          >
            + Tambah
          </button>
        </div>

        {/* Reminder list — renders its own loading/error states */}
        <ReminderList
          accessToken={accessToken}
          refreshKey={reminderRefreshKey}
        />

        {/* Empty state — always visible, list shows nothing when empty */}
        <EmptyState
          onAdd={() => setIsSheetOpen(true)}
          refreshKey={reminderRefreshKey}
          accessToken={accessToken}
        />
      </div>

      {/* AddReminderSheet — type-aware (CAPD/HD based on therapy) */}
      <AddReminderSheet
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        accessToken={accessToken}
        metodeTerapiAktif={user?.metodeTerapiAktif ?? null}
        onSuccess={handleReminderAdded}
      />
    </>
  );
}

/**
 * EmptyState — shown when reminder list is empty.
 * We render it alongside ReminderList; ReminderList returns null when empty,
 * so this only appears when there are no reminders.
 */
function EmptyState({
  onAdd,
  refreshKey,
  accessToken,
}: {
  onAdd: () => void;
  refreshKey: number;
  accessToken: string;
}) {
  const [isEmpty, setIsEmpty] = useState<boolean | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    // Check if reminders exist (we fetch ourselves to track emptiness)
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/reminders`,
      {
        credentials: "include",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    )
      .then((r) => r.json())
      .then((data) => setIsEmpty(Array.isArray(data) && data.length === 0))
      .catch(() => setIsEmpty(false));
  }, [accessToken, refreshKey]);

  if (isEmpty !== true) return null;

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
      <h2
        className="font-heading font-bold"
        style={{ fontSize: 14, color: "#1a2e2c" }}
      >
        Belum ada pengingat
      </h2>
      <p
        className="font-sans font-medium max-w-xs"
        style={{ fontSize: 14, color: "#3d6b66" }}
      >
        Tambahkan pengingat agar tidak melewatkan jadwal terapi atau obat.
      </p>
      <button
        onClick={onAdd}
        className="font-sans font-medium transition-colors hover:opacity-90 active:opacity-75"
        style={{
          height: 44,
          borderRadius: 20,
          backgroundColor: "#2a9d8f",
          color: "#ffffff",
          fontSize: 14,
          paddingLeft: 24,
          paddingRight: 24,
          border: "none",
          cursor: "pointer",
        }}
      >
        Tambah Pengingat
      </button>
    </div>
  );
}
