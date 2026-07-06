"use client";

/**
 * DialysisLogItem.tsx — Single dialysis session entry row for /catatan Cuci Darah tab
 *
 * Shows session name, time, jenis badge, status, and inline confirm.
 * Clicking the card opens a detail overlay showing all fields.
 */

import { Check, Droplets, X } from "lucide-react";
import { useState } from "react";
import { getReminderDueState } from "@/lib/reminderStatus";

export interface DialysisLog {
  id: string;
  reminderId: string;
  jenis: "capd" | "hd";
  nama: string;
  konsentrasiCapd: string | null;
  status: "dikonfirmasi" | "tertunda" | "terlewat";
  waktuPengingat: string;
  waktuKonfirmasi: string | null;
  createdAt: string;
  catatanWaktu?: string | null;
}

interface DialysisLogItemProps {
  log: DialysisLog;
  onConfirm: (logId: string) => void;
  onUnconfirm: (logId: string) => void;
}

const JENIS_LABELS: Record<string, string> = {
  capd: "CAPD",
  hd: "HD",
};

export default function DialysisLogItem({ log, onConfirm, onUnconfirm }: DialysisLogItemProps) {
  const [showDetail, setShowDetail] = useState(false);
  const isConfirmed = log.status === "dikonfirmasi";
  const dueState = getReminderDueState({
    isConfirmed,
    status: log.status,
    waktuPengingat: log.waktuPengingat,
  });
  const isLate = dueState === "terlambat";
  const isSegera = dueState === "segera";
  const segeraText =
    log.jenis === "capd" ? "Segera lakukan exchange CAPD" : "Segera lakukan cuci darah";

  return (
    <>
      <button
        type="button"
        onClick={() => setShowDetail(true)}
        className="w-full text-left bg-white rounded-xl border border-[#f0faf9] p-2.5 shadow-sm"
      >
        <div className="flex items-center gap-3">
          {/* Confirm circle */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              isConfirmed ? onUnconfirm(log.id) : onConfirm(log.id);
            }}
            aria-label={isConfirmed ? "Batalkan konfirmasi" : "Tandai sudah cuci darah"}
            className="w-7 h-7 rounded-full flex-shrink-0 cursor-pointer flex items-center justify-center transition-colors"
            style={{
              backgroundColor: isConfirmed ? "#2a9d8f" : "transparent",
              border: isConfirmed ? "none" : "1.5px solid #cfe8e4",
            }}
          >
            {isConfirmed && <Check size={14} color="#ffffff" strokeWidth={2.5} />}
          </div>

          {/* Session name + time */}
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
            {log.jenis === "capd" && log.konsentrasiCapd && (
              <p className="font-sans" style={{ fontSize: 13, color: "#7a8c8a" }}>
                Konsentrasi {log.konsentrasiCapd}
              </p>
            )}
            {log.catatanWaktu && (
              <p className="font-sans" style={{ fontSize: 13, color: "#7a8c8a" }}>
                Catatan: {log.catatanWaktu}
              </p>
            )}
            {isSegera && (
              <p className="font-sans font-medium" style={{ fontSize: 13, color: "#ef9f27", marginTop: 2 }}>
                {segeraText}
              </p>
            )}
            {isLate && (
              <p className="font-sans font-medium" style={{ fontSize: 13, color: "#ef9f27", marginTop: 2 }}>
                Terlambat — segera lakukan cuci darah
              </p>
            )}
          </div>

          {/* Status badge */}
          <div
            className="rounded px-2 py-0.5 font-sans font-medium text-xs"
            style={{
              backgroundColor: isConfirmed
                ? "#f0faf9"
                : isLate
                  ? "#fff5f5"
                  : isSegera
                    ? "#fdf3e3"
                    : "#f3f3f5",
              color: isConfirmed
                ? "#2a9d8f"
                : isLate
                  ? "#d4183d"
                  : isSegera
                    ? "#7a4c0a"
                    : "#7a8c8a",
            }}
          >
            {isConfirmed
              ? `Selesai ${formatTime(log.waktuKonfirmasi!)}`
              : isLate
                ? "Terlambat"
                : isSegera
                  ? "Segera"
                  : "Tertunda"}
          </div>
        </div>
      </button>

      {showDetail && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-[90vw] max-w-md relative animate-in fade-in-0 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowDetail(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              aria-label="Tutup detail"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-[#1a2e2c] mb-4">Detail Catatan Cuci Darah</h2>
            <div className="divide-y divide-gray-200">
              <DetailRow label="Nama Jadwal" value={log.nama} />
              <DetailRow label="Jenis" value={JENIS_LABELS[log.jenis] ?? log.jenis} />
              <DetailRow label="Waktu Pengingat" value={formatTime(log.waktuPengingat)} />
              <DetailRow label="Status" value={log.status} />
              {log.waktuKonfirmasi && (
                <DetailRow label="Waktu Konfirmasi" value={formatTime(log.waktuKonfirmasi)} />
              )}
              {log.jenis === "capd" && (
                <DetailRow label="Konsentrasi CAPD" value={log.konsentrasiCapd} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) =>
  value ? (
    <div className="py-2">
      <p className="text-[10px] font-bold text-[#7a8c8a] uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-[#1a2e2c] whitespace-pre-wrap">{value}</p>
    </div>
  ) : null;

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
