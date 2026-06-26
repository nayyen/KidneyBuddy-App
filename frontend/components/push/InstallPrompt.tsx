"use client";

// iOS Add-to-Home-Screen interstitial (NOTIF-03)
// Shown when: isIos() && !isInStandaloneMode()
// Must be shown BEFORE any Notification.requestPermission() call on iOS — push
// permissions only work when the PWA is launched from the Home Screen icon.
// Copy follows UI-SPEC.md "iOS install gate" section.

import { Share2, Plus, Check } from "lucide-react";

export default function InstallPrompt() {
  return (
    <div
      className="rounded-[14px] p-4 space-y-4"
      style={{ backgroundColor: "#f0faf9", border: "0.5px solid rgba(42, 157, 143, 0.25)" }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#2a9d8f" }}
        >
          <Share2 size={18} color="#ffffff" />
        </div>
        <div>
          <h3
            className="text-sm font-bold leading-tight"
            style={{ fontFamily: "Plus Jakarta Sans", color: "#1a2e2c" }}
          >
            Pasang ke Home Screen Dulu
          </h3>
          <p
            className="text-xs mt-1 leading-relaxed"
            style={{ fontFamily: "DM Sans", color: "#7a8c8a" }}
          >
            Pada iPhone, KidneyBuddy perlu dipasang ke Home Screen agar dapat
            mengirimkan pengingat terapi.
          </p>
        </div>
      </div>

      {/* Steps */}
      <ol className="space-y-3">
        <li className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{ backgroundColor: "#2a9d8f", color: "#ffffff", fontFamily: "Plus Jakarta Sans" }}
          >
            1
          </div>
          <div className="flex items-center gap-2 flex-1">
            <Share2 size={16} style={{ color: "#2a9d8f", flexShrink: 0 }} />
            <p
              className="text-xs leading-snug"
              style={{ fontFamily: "DM Sans", color: "#1a2e2c" }}
            >
              Ketuk ikon <strong>Share</strong> di bagian bawah Safari
            </p>
          </div>
        </li>

        <li className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{ backgroundColor: "#2a9d8f", color: "#ffffff", fontFamily: "Plus Jakarta Sans" }}
          >
            2
          </div>
          <div className="flex items-center gap-2 flex-1">
            <Plus size={16} style={{ color: "#2a9d8f", flexShrink: 0 }} />
            <p
              className="text-xs leading-snug"
              style={{ fontFamily: "DM Sans", color: "#1a2e2c" }}
            >
              Pilih <strong>&ldquo;Add to Home Screen&rdquo;</strong> dari menu
            </p>
          </div>
        </li>

        <li className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{ backgroundColor: "#2a9d8f", color: "#ffffff", fontFamily: "Plus Jakarta Sans" }}
          >
            3
          </div>
          <div className="flex items-center gap-2 flex-1">
            <Check size={16} style={{ color: "#2a9d8f", flexShrink: 0 }} />
            <p
              className="text-xs leading-snug"
              style={{ fontFamily: "DM Sans", color: "#1a2e2c" }}
            >
              Ketuk <strong>&ldquo;Add&rdquo;</strong> — lalu buka KidneyBuddy
              dari ikon di Home Screen
            </p>
          </div>
        </li>
      </ol>

      {/* Helper note */}
      <p
        className="text-xs leading-relaxed"
        style={{ fontFamily: "DM Sans", color: "#7a8c8a" }}
      >
        Setelah terpasang, buka kembali dari ikon dan aktifkan notifikasi di
        halaman Profil.
      </p>
    </div>
  );
}
