"use client";

// Notification permission UI (NOTIF-01, NOTIF-03)
//
// CRITICAL iOS RULE (RESEARCH.md Pitfall 2):
// Notification.requestPermission() MUST be called as the FIRST expression
// inside the button's onClick handler. Any await, if-block, or fetch BEFORE
// the call breaks the user-gesture linkage on iOS Safari, causing the
// permission dialog to silently no-op with no error thrown.
//
// The pattern below is correct — requestPermission() is immediately awaited
// as the first statement:
//   const permission = await Notification.requestPermission(); // ← FIRST

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { isIos, isInStandaloneMode } from "@/lib/pwaDetection";
import { subscribeAndRegister, ensureFreshSubscription } from "@/lib/pushClient";
import InstallPrompt from "./InstallPrompt";

interface NotificationPermissionBannerProps {
  /** The user's current JWT access token — required to POST the subscription. */
  accessToken: string | null;
}

type PermissionState = "default" | "granted" | "denied" | "loading";

export default function NotificationPermissionBanner({
  accessToken,
}: NotificationPermissionBannerProps) {
  const [permState, setPermState] = useState<PermissionState>(() => {
    // Initialise from the current Notification.permission if available
    if (typeof window === "undefined") return "default";
    if (!("Notification" in window)) return "denied"; // not supported
    return Notification.permission as PermissionState;
  });
  const [error, setError] = useState<string | null>(null);

  // BUGFIX (quick-260705-9n4 task 4, live-test finding): browser-level
  // Notification permission persists across app-account switches on the same
  // device/browser (a common shared-device/demo-account scenario). Previously,
  // when permission was ALREADY "granted", this component rendered the
  // "already active" state below and NEVER called subscribeAndRegister() for
  // the newly logged-in user — so a second account on the same device/browser
  // never got a push_subscriptions row at all. Re-run the same
  // ensureFreshSubscription() helper used on visibilitychange here on mount
  // (keyed on accessToken) so the CURRENTLY authenticated user's session gets
  // (re-)registered/reassigned to this device, without changing the visible
  // "already active" UI. Safe to call repeatedly — subscribeAndRegister()
  // re-POSTs the existing browser subscription idempotently.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!accessToken) return;
    ensureFreshSubscription(accessToken);
  }, [accessToken]);

  // ── iOS Add-to-Home-Screen gate ─────────────────────────────────────────
  // If the user is on iOS Safari but has NOT yet added the app to Home Screen,
  // show the install interstitial instead of the permission button.
  // Push notifications on iOS only work when launched from the Home Screen icon.
  if (isIos() && !isInStandaloneMode()) {
    return <InstallPrompt />;
  }

  // ── Push not supported ──────────────────────────────────────────────────
  if (typeof window !== "undefined" && !("Notification" in window)) {
    return (
      <div
        className="rounded-[12px] px-4 py-3"
        style={{ backgroundColor: "#f3f3f5" }}
      >
        <p
          className="text-xs"
          style={{ fontFamily: "DM Sans", color: "#3d6b66" }}
        >
          Browser Anda tidak mendukung notifikasi push.
        </p>
      </div>
    );
  }

  // ── Already granted ─────────────────────────────────────────────────────
  if (permState === "granted") {
    return (
      <div
        className="rounded-[12px] px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: "#f0faf9" }}
      >
        <Bell size={16} style={{ color: "#2a9d8f", flexShrink: 0 }} />
        <p
          className="text-xs"
          style={{ fontFamily: "DM Sans", color: "#1a2e2c" }}
        >
          Notifikasi sudah aktif di perangkat ini.
        </p>
      </div>
    );
  }

  // ── Denied ──────────────────────────────────────────────────────────────
  if (permState === "denied") {
    return (
      <div
        className="rounded-[12px] px-4 py-3 flex items-start gap-3"
        style={{ backgroundColor: "#f3f3f5" }}
      >
        <BellOff size={16} style={{ color: "#3d6b66", flexShrink: 0, marginTop: 2 }} />
        <p
          className="text-xs leading-relaxed"
          style={{ fontFamily: "DM Sans", color: "#3d6b66" }}
        >
          Notifikasi tidak diizinkan. Aktifkan di pengaturan browser untuk
          menerima pengingat.
        </p>
      </div>
    );
  }

  // ── Default / loading: show the enable button ────────────────────────────
  // CRITICAL: onClick calls Notification.requestPermission() as the VERY FIRST
  // expression — this satisfies iOS's user-gesture requirement.
  const handleEnableClick = async () => {
    if (!("Notification" in window)) return;
    if (permState === "loading") return;

    setPermState("loading");
    setError(null);

    // ▼ MUST be the first expression in this handler (iOS permission rule)
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      setPermState(permission === "denied" ? "denied" : "default");
      return;
    }

    setPermState("granted");

    // Subscribe and register device with the backend
    if (!accessToken) {
      setError("Sesi tidak ditemukan. Silakan login ulang.");
      return;
    }
    try {
      await subscribeAndRegister(accessToken);
    } catch (err) {
      console.error("[NotificationPermissionBanner] Subscribe failed:", err);
      setError(
        "Gagal mendaftarkan perangkat. Periksa koneksi internet Anda.",
      );
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleEnableClick}
        disabled={permState === "loading"}
        className="w-full rounded-[14px] px-4 py-3 flex items-center justify-center gap-2 font-medium transition-opacity disabled:opacity-60"
        style={{
          backgroundColor: "#2a9d8f",
          color: "#ffffff",
          fontFamily: "DM Sans",
          fontSize: 14,
        }}
        aria-label="Aktifkan notifikasi push untuk menerima pengingat terapi"
      >
        <Bell size={16} color="#ffffff" />
        {permState === "loading" ? "Memproses..." : "Aktifkan Notifikasi"}
      </button>

      {error && (
        <p
          className="text-xs px-1"
          style={{ fontFamily: "DM Sans", color: "#d4183d" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
