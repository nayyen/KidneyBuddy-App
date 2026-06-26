"use client";

/**
 * AiPlaceholderCard.tsx — Grey gradient placeholder card for AI Summary (Phase 5)
 *
 * Per UI-SPEC and D-04 render order (last card on Beranda).
 * Static — no API call. "Ringkasan AI tersedia di Phase 5".
 */

import { Sparkles } from "lucide-react";

export default function AiPlaceholderCard() {
  return (
    <div
      className="w-full"
      style={{
        background: "linear-gradient(135deg, #f3f3f5, #e8e8eb)",
        borderRadius: 16,
        padding: 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity: 0.85,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          background: "#e0e0e5",
          borderRadius: 10,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Sparkles size={18} style={{ color: "#9999a8" }} />
      </div>

      <div>
        <p
          className="font-heading font-bold"
          style={{ fontSize: 14, color: "#1a2e2c" }}
        >
          Ringkasan AI
        </p>
        <p
          className="font-sans mt-0.5"
          style={{ fontSize: 10, color: "#7a8c8a" }}
        >
          Tersedia di Phase 5 — analisis tren cairan dan obat harian
        </p>
      </div>
    </div>
  );
}
