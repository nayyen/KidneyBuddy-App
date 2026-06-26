"use client";

/**
 * CAPDEffluentBanner.tsx — Non-dismissable Alert Darurat for CAPD effluent anomaly
 *
 * Strictly per UI-SPEC Component: CAPDEffluentBanner and DESIGN_SYSTEM_KidneyBuddy_v3.md:
 * - Background: #fdecee
 * - Border-left: 3px solid #d4183d
 * - NO X/close icon anywhere
 * - Persists across page navigation until the action button is pressed
 * - Action button "Saya mengerti, hubungi dokter segera" dismisses AND POSTs acknowledgment
 *
 * FLUID-03 / T-02-04-05 (CAPD acknowledgment logging)
 */

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { authFetch } from "@/lib/api";

interface CAPDEffluentBannerProps {
  accessToken: string;
  onDismiss?: () => void;
}

export default function CAPDEffluentBanner({
  accessToken,
  onDismiss,
}: CAPDEffluentBannerProps) {
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  const handleAcknowledge = async () => {
    setIsAcknowledging(true);
    try {
      // POST acknowledgment to record that patient has been informed (T-02-04-05)
      await authFetch("/api/fluid/acknowledge-abnormal", accessToken, {
        method: "POST",
        body: JSON.stringify({ acknowledgedAt: new Date().toISOString() }),
      }).catch(() => {
        // Non-blocking — if the POST fails, we still dismiss locally
        // The patient's acknowledgment is also implied by the fact they pressed the button
      });
    } finally {
      setIsAcknowledging(false);
      onDismiss?.();
    }
  };

  return (
    <div
      className="w-full"
      style={{
        background: "#fdecee",
        borderLeft: "3px solid #d4183d",
        borderRadius: 16,
        padding: "11px 13px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
      role="alert"
      aria-live="assertive"
    >
      {/* Icon container — NO close button here, per spec */}
      <div
        style={{
          width: 30,
          height: 30,
          background: "#fbd9dd",
          borderRadius: 9,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertTriangle size={16} style={{ color: "#d4183d" }} />
      </div>

      {/* Text area */}
      <div className="flex-1">
        <p
          className="font-heading font-bold"
          style={{ fontSize: 14, color: "#d4183d" }}
        >
          Kondisi Cairan Tidak Normal
        </p>
        <p
          className="font-sans mt-1"
          style={{ fontSize: 12, color: "#9c1530" }}
        >
          Cairan keluar yang keruh atau berdarah bisa menjadi tanda infeksi
          serius. Segera hubungi dokter atau perawat CAPD Anda.
        </p>

        {/* Only this button can dismiss the banner — NO X icon anywhere */}
        <button
          onClick={handleAcknowledge}
          disabled={isAcknowledging}
          className="mt-2 font-sans font-medium transition-opacity disabled:opacity-60"
          style={{
            background: "#d4183d",
            color: "#ffffff",
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: 12,
            border: "none",
            cursor: isAcknowledging ? "not-allowed" : "pointer",
          }}
        >
          {isAcknowledging
            ? "Memproses..."
            : "Saya mengerti, hubungi dokter segera"}
        </button>
      </div>
    </div>
  );
}
