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

import { useState } from "react";
import Image from "next/image";
import { Check, X } from "lucide-react";
import { getReminderDueState } from "@/lib/reminderStatus";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface MedicationLog {
  id: string;
  reminderId: string;
  namaObat: string;
  dosis: string | null;
  jenisObat: string | null;
  status: "dikonfirmasi" | "tertunda" | "terlewat";
  waktuPengingat: string; // ISO timestamp
  waktuKonfirmasi: string | null;
  fotoObat?: string | null;
  catatanWaktu?: string | null;
}

interface MedicationLogItemProps {
  log: MedicationLog;
  onConfirm: (logId: string) => void;
  onUnconfirm: (logId: string) => void;
}

export default function MedicationLogItem({ log, onConfirm, onUnconfirm }: MedicationLogItemProps) {
  const [showDetail, setShowDetail] = useState(false);
  // Graceful fallback (quick-260705-9n4 task 9, C1) — if the stored
  // fotoObat path 404s or otherwise fails to load, hide the broken image
  // instead of showing a broken-image icon.
  const [photoFailed, setPhotoFailed] = useState(false);
  const isConfirmed = log.status === "dikonfirmasi";
  const dueState = getReminderDueState({
    isConfirmed,
    status: log.status,
    waktuPengingat: log.waktuPengingat,
  });
  const isLate = dueState === "terlambat";
  const isSegera = dueState === "segera";

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
              isConfirmed ? onUnconfirm(log.id) : onConfirm(log.id)
            }}
            aria-label={isConfirmed ? "Batalkan konfirmasi" : "Tandai sudah diminum"}
            className="w-7 h-7 rounded-full flex-shrink-0 cursor-pointer flex items-center justify-center transition-colors"
            style={{
              backgroundColor: isConfirmed ? "#2a9d8f" : "transparent",
              border: isConfirmed ? "none" : "1.5px solid #cfe8e4",
            }}
          >
            {isConfirmed && <Check size={14} color="#ffffff" strokeWidth={2.5} />}
          </div>

          {/* Medication name + time */}
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
            {log.dosis && (
              <p
                className="font-sans mt-0.5"
                style={{ fontSize: 13, color: "#7a8c8a" }}
              >
                Dosis {log.dosis}
              </p>
            )}
            {log.catatanWaktu && (
              <p
                className="font-sans mt-0.5"
                style={{ fontSize: 13, color: "#7a8c8a" }}
              >
                Catatan: {log.catatanWaktu}
              </p>
            )}
            {isSegera && (
              <p className="font-sans font-medium" style={{ fontSize: 13, color: "#ef9f27", marginTop: 2 }}>
                Segera minum obat
              </p>
            )}
            {isLate && (
              <p className="font-sans font-medium" style={{ fontSize: 13, color: "#d4183d", marginTop: 2 }}>
                Terlambat — segera minum obat
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
              ? `Diminum ${formatTime(log.waktuKonfirmasi!)}`
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
            <h2 className="text-lg font-bold text-[#1a2e2c] mb-4">Detail Catatan Obat</h2>
            <div className="divide-y divide-gray-200">
              <DetailRow label="Nama Obat" value={log.namaObat} />
              <DetailRow label="Waktu Pengingat" value={formatTime(log.waktuPengingat)} />
              <DetailRow label="Status" value={log.status} />
              {log.waktuKonfirmasi && (
                <DetailRow label="Waktu Konfirmasi" value={formatTime(log.waktuKonfirmasi)} />
              )}
              <DetailRow label="Dosis" value={log.dosis} />
              <DetailRow label="Jenis Obat" value={log.jenisObat} />
              <DetailRow label="Catatan" value={log.catatanWaktu} />
              {log.fotoObat && !photoFailed && (
                 <div className="py-2">
                    <p className="text-[10px] font-bold text-[#7a8c8a] uppercase tracking-wider">Foto Obat</p>
                    <div className="mt-2 relative w-full h-48 rounded-lg overflow-hidden bg-[#f0faf9]">
                      <Image
                        src={`${API_BASE}${log.fotoObat}`}
                        alt={`Foto obat untuk ${log.namaObat}`}
                        fill
                        unoptimized
                        style={{ objectFit: "cover" }}
                        onError={() => setPhotoFailed(true)}
                      />
                    </div>
                 </div>
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
    const d = new Date(iso);
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
