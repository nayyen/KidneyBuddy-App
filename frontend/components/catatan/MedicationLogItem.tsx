"use client";

/**
 * MedicationLogItem.tsx — Single medication log entry
 *
 * Displays name, status with therapy-identity colors, and confirmation checkmark.
 * Status colors per UI-SPEC:
 *   dikonfirmasi → teal #2a9d8f check circle
 *   tertunda → amber #ef9f27
 *   terlewat → red #d4183d
 */

import { Check } from "lucide-react";

export interface MedicationLog {
  id: string;
  reminderId: string;
  namaObat: string;
  status: "dikonfirmasi" | "tertunda" | "terlewat";
  waktuPengingat: string; // ISO timestamp
  waktuDikonfirmasi?: string | null;
}

interface MedicationLogItemProps {
  log: MedicationLog;
  onConfirm?: (reminderId: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  dikonfirmasi: "Dikonfirmasi",
  tertunda: "Tertunda",
  terlewat: "Terlewat",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  dikonfirmasi: { bg: "#f0faf9", text: "#2a9d8f" },
  tertunda: { bg: "#fdf3e3", text: "#7a4c0a" },
  terlewat: { bg: "#fdecee", text: "#9c1530" },
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function MedicationLogItem({
  log,
  onConfirm,
}: MedicationLogItemProps) {
  const statusColor = STATUS_COLORS[log.status] ?? STATUS_COLORS.tertunda;
  const isConfirmed = log.status === "dikonfirmasi";

  return (
    <div
      className="flex items-center gap-3"
      style={{
        backgroundColor: "#ffffff",
        border: "0.5px solid #f0faf9",
        borderRadius: 13,
        padding: "9px 11px",
        minHeight: 48,
      }}
    >
      {/* Confirmation circle */}
      <button
        type="button"
        onClick={() => !isConfirmed && onConfirm?.(log.reminderId)}
        aria-label={isConfirmed ? "Sudah dikonfirmasi" : "Konfirmasi dosis"}
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          flexShrink: 0,
          cursor: isConfirmed ? "default" : "pointer",
          backgroundColor: isConfirmed ? "#2a9d8f" : "transparent",
          border: isConfirmed ? "none" : "1.5px solid #cfe8e4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background-color 0.2s",
        }}
      >
        {isConfirmed && <Check size={14} color="#ffffff" strokeWidth={2.5} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="font-sans font-medium truncate"
          style={{ fontSize: 12, color: "#1a2e2c" }}
        >
          {log.namaObat}
        </p>
        <p
          className="font-sans mt-0.5"
          style={{ fontSize: 10, color: "#7a8c8a" }}
        >
          {formatTime(log.waktuPengingat)}
        </p>
      </div>

      {/* Status badge */}
      <span
        className="font-sans font-medium shrink-0"
        style={{
          fontSize: 10,
          paddingLeft: 8,
          paddingRight: 8,
          paddingTop: 3,
          paddingBottom: 3,
          borderRadius: 6,
          backgroundColor: statusColor.bg,
          color: statusColor.text,
        }}
      >
        {STATUS_LABELS[log.status] ?? log.status}
      </span>
    </div>
  );
}
