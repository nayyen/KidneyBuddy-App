"use client";

/**
 * DialysisLogItem.tsx — Single dialysis session entry row for /catatan Cuci Darah tab
 *
 * Shows session name, time, jenis badge, status, and inline confirm.
 * Clicking the card opens a detail overlay showing all fields.
 */

import { Check, Droplets } from "lucide-react";
import { useState } from "react";

export interface DialysisLog {
  id: string;
  reminderId: string;
  jenis: "capd" | "hd";
  nama: string;
  konsentrasiCapd: string | null;
  status: "dikonfirmasi" | "tertunda" | "terlewat";
  waktuPengingat: string;
  waktuKonfirmasi: string | null;
}

interface DialysisLogItemProps {
  log: DialysisLog;
  onConfirm: (reminderId: string) => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string | null): string {
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

const JENIS_LABELS: Record<string, string> = {
  capd: "CAPD",
  hd: "HD",
};

const STATUS_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  dikonfirmasi: { text: "Sudah Cuci Darah", color: "#0d4a44", bg: "#f0faf9" },
  tertunda: { text: "Belum Cuci Darah", color: "#7a4c00", bg: "#fdf3e3" },
  terlewat: { text: "Terlewat", color: "#d4183d", bg: "#fdecee" },
};

export default function DialysisLogItem({ log, onConfirm }: DialysisLogItemProps) {
  const [showDetail, setShowDetail] = useState(false);
  const isConfirmed = log.status === "dikonfirmasi";
  const isLate =
    !isConfirmed &&
    log.status === "tertunda" &&
    new Date(log.waktuPengingat) < new Date();
  const statusStyle = STATUS_LABELS[log.status] ?? STATUS_LABELS.tertunda;

  return (
    <>
      <div
        onClick={() => setShowDetail(true)}
        className="flex items-center gap-3 cursor-pointer hover:bg-[#f8fcfb] transition-colors"
        style={{
          minHeight: 72,
          padding: "12px 14px",
          borderRadius: 13,
          backgroundColor: "#ffffff",
          border: "0.5px solid #f0faf9",
        }}
      >
        {/* Confirm circle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            !isConfirmed && onConfirm(log.reminderId);
          }}
          aria-label={isConfirmed ? "Sudah cuci darah" : "Tandai sudah cuci darah"}
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

        {/* Session details */}
        <div className="flex-1 min-w-0">
          <p
            className="font-sans font-medium truncate"
            style={{
              fontSize: 14,
              color: isConfirmed ? "#3d6b66" : "#1a2e2c",
              textDecoration: isConfirmed ? "line-through" : "none",
            }}
          >
            {log.nama}
          </p>
          <p className="font-sans" style={{ fontSize: 14, color: "#3d6b66" }}>
            {formatTime(log.waktuPengingat)} · {JENIS_LABELS[log.jenis] ?? log.jenis}
          </p>
          {isLate && (
            <p className="font-sans font-medium" style={{ fontSize: 13, color: "#ef9f27", marginTop: 2 }}>
              Terlambat — segera lakukan cuci darah
            </p>
          )}
        </div>

        {/* Status badge */}
        <span
          className="font-sans font-medium shrink-0"
          style={{
            fontSize: 12,
            color: statusStyle.color,
            backgroundColor: statusStyle.bg,
            paddingLeft: 8,
            paddingRight: 8,
            paddingTop: 3,
            paddingBottom: 3,
            borderRadius: 10,
          }}
        >
          {statusStyle.text}
        </span>
      </div>

      {/* Detail overlay */}
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
              <Droplets size={18} style={{ color: "#2a9d8f" }} />
              <p className="font-heading font-bold" style={{ fontSize: 16, color: "#1a2e2c" }}>
                Detail Cuci Darah
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Nama</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>{log.nama}</p>
              </div>
              <div>
                <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Jenis</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>
                  {JENIS_LABELS[log.jenis] ?? log.jenis}
                </p>
              </div>
              <div>
                <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Waktu Pengingat</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>
                  {formatTime(log.waktuPengingat)}
                </p>
              </div>
              {log.konsentrasiCapd && (
                <div>
                  <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Konsentrasi CAPD</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>
                    {log.konsentrasiCapd}
                  </p>
                </div>
              )}
              <div>
                <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Status</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: statusStyle.color }}>
                  {statusStyle.text}
                </p>
              </div>
              {log.waktuKonfirmasi && (
                <div>
                  <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Waktu Konfirmasi</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>
                    {formatDateTime(log.waktuKonfirmasi)}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDetail(false)}
              className="font-sans font-medium w-full mt-5"
              style={{
                fontSize: 14,
                height: 44,
                borderRadius: 22,
                backgroundColor: "#f0faf9",
                color: "#0d4a44",
                border: "none",
                cursor: "pointer",
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
