"use client";
/**
 * FluidLogItem.tsx — Single fluid log entry row
 * Per UI-SPEC FluidLogItem spec:
 * - Time (10px DM Sans muted), type badge pill, volume, condition dot, Terlambat badge
 * - Click card to open detail overlay showing all input fields
 * - Delete button with confirm alert
 */

import FluidEditSheet from "@/components/cairan/FluidEditSheet";
import { useState } from "react";
import { Trash2, Droplets } from "lucide-react";
import { authFetch } from "@/lib/api";
import { toast } from "sonner";
import { SYNC_EVENTS, dispatchSyncEvent } from "@/lib/syncEvents";

interface FluidEntry {
  id: string;
  tanggal: string;
  waktu: string;
  tipe: "masuk" | "keluar";
  sumber: string | null;
  konsentrasiCapd: string | null;
  volume: number;
  satuan: string;
  kondisiKeluar: string | null;
  catatan: string | null;
  isLateEntry: boolean;
  hasAbnormalCondition: boolean;
  createdAt: string;
}

interface FluidLogItemProps {
  entry: FluidEntry;
  accessToken?: string;     // Needed for edit sheet
  metodeTerapi?: string;    // Needed for CAPD-specific fields
  onEdited?: () => void;   // Called after successful edit
}

function getConditionDotColor(kondisi: string | null): string {
  if (!kondisi) return "";
  if (kondisi === "jernih") return "#2a9d8f";
  if (kondisi === "keruh" || kondisi === "keruh_gumpalan") return "#ef9f27";
  if (kondisi === "berdarah") return "#d4183d";
  return "#7a8c8a";
}

function formatWaktu(waktu: string): string {
  // Handle HH:mm or ISO datetime
  if (waktu.includes("T")) {
    const date = new Date(waktu);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }
  return waktu.slice(0, 5); // Take HH:mm
}

function formatSumber(sumber: string | null, konsentrasi: string | null): string {
  if (!sumber) return "";
  if (sumber === "capd" && konsentrasi) return `CAPD ${konsentrasi}`;
  const labels: Record<string, string> = {
     urine: "Urine",
    capd: "CAPD",
    lainnya: "Lainnya",
  };
  return labels[sumber] ?? sumber;
}

export default function FluidLogItem({ entry, accessToken, metodeTerapi, onEdited }: FluidLogItemProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isMasuk = entry.tipe === "masuk";
  const dotColor = entry.kondisiKeluar
    ? getConditionDotColor(entry.kondisiKeluar)
    : "";
  const showEdit = !!accessToken;

  const handleDelete = async () => {
    if (!accessToken) return;
    setIsDeleting(true);
    try {
      await authFetch(`/api/fluid/${entry.id}`, accessToken, { method: "DELETE" });
      toast.success("Catatan cairan dihapus");
      dispatchSyncEvent(SYNC_EVENTS.FLUID_SAVED);
      onEdited?.();
    } catch {
      toast.error("Gagal menghapus catatan");
    } finally {
      setIsDeleting(false);
        setShowDeleteConfirm(false);
      }
    };

    return (
      <>
      <div
        onClick={() => setShowDetail(true)}
        className="cursor-pointer hover:bg-[#f8fcfb] transition-colors"
        style={{
          background: "#ffffff",
          border: "0.5px solid #f0faf9",
          borderRadius: 13,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          minHeight: 64,
        }}
      >
      {/* Time */}
      <span
        className="font-sans shrink-0"
        style={{ fontSize: 14, color: "#1a2e2c", minWidth: 32 }}
      >
        {formatWaktu(entry.waktu)}
      </span>

      {/* Center: type badge + source */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1">
          {/* Type badge — dark text on teal/amber bg for WCAG AA */}
          <span
            className="font-sans font-medium shrink-0"
            style={{
              fontSize: 14,
              borderRadius: 10,
              paddingLeft: 6,
              paddingRight: 6,
              paddingTop: 2,
              paddingBottom: 2,
              backgroundColor: isMasuk ? "#f0faf9" : "#fdf3e3",
              color: isMasuk ? "#0d4a44" : "#7a4c00",
            }}
          >
            {isMasuk ? "Masuk" : "Keluar"}
          </span>

          {/* Source text */}
          {entry.sumber && (
            <span
              className="font-sans truncate"
              style={{ fontSize: 14, color: "#1a2e2c" }}
            >
              {formatSumber(entry.sumber, entry.konsentrasiCapd)}
            </span>
          )}

          {/* Late entry badge */}
          {entry.isLateEntry && (
            <span
              className="font-sans shrink-0"
              style={{
                fontSize: 12,
                borderRadius: 8,
                paddingLeft: 5,
                paddingRight: 5,
                paddingTop: 2,
                paddingBottom: 2,
                background: "#f3ede5",
                color: "#3d6b66",
              }}
            >
              Terlambat
            </span>
          )}
        </div>

        {/* Catatan (if present) */}
        {entry.catatan && (
          <p
            className="font-sans mt-0.5 truncate"
            style={{ fontSize: 14, color: "#1a2e2c" }}
          >
            {entry.catatan}
          </p>
        )}
      </div>

      {/* Right: condition dot + volume */}
      <div
        className="flex items-center gap-1 shrink-0"
        style={{ textAlign: "right" }}
      >
        {/* CAPD condition dot */}
        {!isMasuk && entry.kondisiKeluar && (
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: dotColor,
              flexShrink: 0,
            }}
            title={entry.kondisiKeluar}
          />
        )}

        <div>
          <span
            className="font-heading font-bold"
            style={{ fontSize: 14, color: "#1a2e2c" }}
          >
            {entry.volume}
          </span>
          <span
            className="font-sans"
            style={{ fontSize: 14, color: "#1a2e2c" }}
          >
            {" "}
            {entry.satuan}
          </span>
        </div>
        {/* Edit button */}
        {showEdit && (
          <FluidEditSheet
            entry={entry}
            accessToken={accessToken}
            metodeTerapi={metodeTerapi ?? ""}
            onSaved={() => {
              // Editing must also notify other pages (e.g. beranda's
              // DeltaCairanCard) via the global sync event, not just this
              // list's local onEdited refetch (quick-260705-9n4 task 5).
              dispatchSyncEvent(SYNC_EVENTS.FLUID_SAVED);
              onEdited?.();
            }}
          />
        )}
         {/* Delete button */}
         {showEdit && (
           <button
             onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
             aria-label="Hapus catatan"
             style={{
               width: 32,
               height: 32,
               borderRadius: 8,
               border: "none",
               background: "transparent",
               cursor: "pointer",
               display: "flex",
               alignItems: "center",
               justifyContent: "center",
               flexShrink: 0,
             }}
           >
             <Trash2 size={16} color="#d4183d" />
           </button>
         )}
      </div>
    </div>

      {/* Detail overlay */}
      {showDetail && (
        <div
          onClick={() => setShowDetail(false)}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "#ffffff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500, padding: 20, paddingBottom: 32, maxHeight: "80vh", overflowY: "auto" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Droplets size={18} style={{ color: "#2a9d8f" }} />
              <p className="font-heading font-bold" style={{ fontSize: 16, color: "#1a2e2c" }}>Detail Catatan Cairan</p>
            </div>
            <div className="space-y-3">
              <div>
                <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Jenis</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>{isMasuk ? "Cairan Masuk" : "Cairan Keluar"}</p>
              </div>
              <div>
                <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Waktu</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>{formatWaktu(entry.waktu)}</p>
              </div>
              {entry.sumber && (
                <div>
                  <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Sumber</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>{formatSumber(entry.sumber, entry.konsentrasiCapd)}</p>
                </div>
              )}
              {entry.konsentrasiCapd && (
                <div>
                  <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Konsentrasi CAPD</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>{entry.konsentrasiCapd}</p>
                </div>
              )}
              <div>
                <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Volume</p>
                <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>{entry.volume} {entry.satuan}</p>
              </div>
              {entry.kondisiKeluar && (
                <div>
                  <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Kondisi Cairan Keluar</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>{entry.kondisiKeluar}</p>
                </div>
              )}
              {entry.catatan && (
                <div>
                  <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Catatan</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: "#1a2e2c" }}>{entry.catatan}</p>
                </div>
              )}
              {entry.isLateEntry && (
                <div>
                  <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>Status</p>
                  <p className="font-sans font-medium" style={{ fontSize: 14, color: "#7a4c00" }}>Entry Terlambat</p>
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

      {/* Delete confirm overlay */}
      {showDeleteConfirm && (
        <div
          onClick={() => setShowDeleteConfirm(false)}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "#ffffff", borderRadius: 16, width: "90%", maxWidth: 360, padding: 20, textAlign: "center" }}
          >
            <p className="font-heading font-bold" style={{ fontSize: 16, color: "#1a2e2c", marginBottom: 8 }}>
              Hapus Catatan?
            </p>
            <p className="font-sans" style={{ fontSize: 14, color: "#3d6b66", marginBottom: 16 }}>
              Yakin ingin menghapus catatan cairan ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="font-sans font-medium flex-1"
                style={{ fontSize: 14, height: 44, borderRadius: 22, backgroundColor: "#f0faf9", color: "#0d4a44", border: "none", cursor: "pointer" }}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="font-sans font-medium flex-1"
                style={{ fontSize: 14, height: 44, borderRadius: 22, backgroundColor: "#d4183d", color: "#ffffff", border: "none", cursor: isDeleting ? "not-allowed" : "pointer", opacity: isDeleting ? 0.7 : 1 }}
              >
                {isDeleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
  );
}
