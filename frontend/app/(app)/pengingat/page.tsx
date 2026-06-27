"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import ReminderList from "@/components/pengingat/ReminderList";
import AddReminderSheet from "@/components/pengingat/AddReminderSheet";
import { toast } from "sonner";

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

  const handleReminderAdded = () => {
    setReminderRefreshKey((k) => k + 1);
    setHasReminders(true);
    toast.success("Pengingat berhasil ditambahkan");
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
        style={{ fontSize: 12, color: "#7a8c8a" }}
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
