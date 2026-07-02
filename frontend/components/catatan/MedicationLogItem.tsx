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

import { Check, Pill } from "lucide-react";
import { useState } from "react";

export interface MedicationLog {
  id: string;
  reminderId: string;
  namaObat: string;
  status: "dikonfirmasi" | "tertunda" | "terlewat";
  waktuPengingat: string; // ISO timestamp
  waktuDikonfirmasi?: string | null;
  waktuKonfirmasi?: string | null;
  dosis?: string | null;
  jenisObat?: string | null;
  fotoObat?: string | null;
}

interface MedicationLogItemProps {
  log: MedicationLog;
  onConfirm?: (reminderId: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  dikonfirmasi: "Dikonfirmasi",
  tertunda: "Belum Diminum",
  terlewat: "Terlewat",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  dikonfirmasi: { bg: "#f0faf9", text: "#0d4a44" },
  tertunda: { bg: "#fdf3e3", text: "#7a4c00" },
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
function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
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
  const [showDetail, setShowDetail] = useState(false);
  const statusColor = STATUS_COLORS[log.status] ?? STATUS_COLORS.tertunda;
  const isConfirmed = log.status === "dikonfirmasi";
  const isLate =
    !isConfirmed &&
    log.status === "tertunda" &&
    new Date(log.waktuPengingat) < new Date();
  const displayStatus = isLate ? "Terlambat" : (STATUS_LABELS[log.status] ?? log.status);
  const displayColor = isLate ? STATUS_COLORS.terlewat : statusColor;

  return (
    <>
    <div
      onClick={() => setShowDetail(true)}
      className="flex items-center gap-3 cursor-pointer hover:bg-[#f8fcfb] transition-colors"
      style={{
        backgroundColor: "#ffffff",
        border: "0.5px solid #f0faf9",
        borderRadius: 13,
        padding: "12px 14px",
        minHeight: 56,
      }}
    >
      {/* Confirmation circle */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); !isConfirmed && onConfirm?.(log.reminderId); }}
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
          style={{
            fontSize: 14,
            color: isConfirmed ? "#3d6b66" : "#1a2e2c",
            textDecoration: isConfirmed ? "line-through" : "none",
          }}
        >
          {log.namaObat}
        </p>
        <p
          className="font-sans mt-0.5"
          style={{ fontSize: 13, color: "#3d6b66" }}
        >
          {formatTime(log.waktuPengingat)}
        </p>
        {isLate && (
          <p className="font-sans font-medium" style={{ fontSize: 13, color: "#d4183d", marginTop: 2 }}>
            Terlambat — segera minum obat
          </p>
        )}
      </div>

      {/* Status badge */}
      <span
        className="font-sans font-medium shrink-0"
        style={{
          fontSize: 12,
          paddingLeft: 8,
          paddingRight: 8,
          paddingTop: 3,
          paddingBottom: 3,
          borderRadius: 10,
          backgroundColor: displayColor.bg,
          color: displayColor.text,
        }}
      >
        {displayStatus}
      </span>
    </div>
    {showDetail && (
      <div
        onClick={() => setShowDetail(false)}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.4)",
          zIndex: 50,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px 20px 0 0",
            width: "100%",
            maxWidth: 500,
            padding: 20,
            paddingBottom: 32,
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Pill size={18} style={{ color: "#2a9d8f" }} />
            <p className="font-heading font-bold" style={{ fontSize: 16, color: "#1a2e2c" }}>
              Detail Obat
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Nama Obat</p>
              <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>{log.namaObat}</p>
            </div>
            {log.dosis && (
              <div>
                <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Dosis</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>{log.dosis}</p>
              </div>
            )}
            {log.jenisObat && (
              <div>
                <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Jenis Obat</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>
                  {log.jenisObat === "minum" ? "Minum" : "Suntik"}
                </p>
              </div>
            )}
            <div>
              <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Waktu Pengingat</p>
              <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>
                {formatTime(log.waktuPengingat)}
              </p>
            </div>
            <div>
              <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Status</p>
              <p className="font-sans font-medium" style={{ fontSize: 14, color: displayColor.text }}>
                {displayStatus}
              </p>
            </div>
            {(log.waktuKonfirmasi || log.waktuDikonfirmasi) && (
              <div>
                <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Waktu Konfirmasi</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>
                  {formatDateTime(log.waktuKonfirmasi ?? log.waktuDikonfirmasi)}
                </p>
              </div>
            )}
            {log.fotoObat && (
              <div>
                <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66", marginBottom: 6 }}>Foto Obat</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={log.fotoObat.startsWith("http") ? log.fotoObat : `http://localhost:4000${log.fotoObat}`}
                  alt="Foto obat"
                  style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 12 }}
                />
              </div>
            )}
          </div>
          <button
            onClick={() => setShowDetail(false)}
            className="font-sans font-medium w-full mt-5"
            style={{ fontSize: 14, height: 44, borderRadius: 22, backgroundColor: "#f0faf9", color: "#0d4a44", border: "none", cursor: "pointer" }}
          >
            Tutup
          </button>
        </div>
      </div>
    )}
    </>
  );
}
