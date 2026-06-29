"use client";

/**
 * NoReminderBanner.tsx — Amber info banner for users without a configured reminder
 *
 * Shown while onboardingProgress.reminderConfigured === false.
 * Per UI-SPEC Banners: "No-reminder banner (D-05)".
 * Links to /pengingat to set up a reminder.
 */

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NoReminderBanner() {
  const router = useRouter();

  return (
    <div
      className="w-full"
      style={{
        background: "#fdf3e3",
        border: "0.5px solid rgba(239, 159, 39, 0.3)",
        borderRadius: 14,
        padding: "12px 14px",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      {/* Bell icon */}
      <div
        style={{
          width: 30,
          height: 30,
          background: "rgba(239, 159, 39, 0.15)",
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Bell size={16} style={{ color: "#ef9f27" }} />
      </div>

      <div className="flex-1">
        <p
          className="font-sans font-medium"
          style={{ fontSize: 12, color: "#7a4c0a" }}
        >
          Kamu belum mengatur pengingat.
        </p>
        <p
          className="font-sans font-medium mt-0.5"
          style={{ fontSize: 12, color: "#7a4c0a" }}
        >
          Tambahkan pengingat agar tidak melewatkan jadwal terapi.
        </p>
        <button
          onClick={() => router.push("/pengingat")}
          className="font-sans font-medium mt-1 underline transition-opacity hover:opacity-80"
          style={{ fontSize: 12, color: "#ef9f27", background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          Atur Sekarang
        </button>
      </div>
    </div>
  );
}
