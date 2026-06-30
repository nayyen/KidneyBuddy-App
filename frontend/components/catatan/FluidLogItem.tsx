"use client";

/**
 * FluidLogItem.tsx — Single fluid log entry row
 *

import FluidEditSheet from "@/components/cairan/FluidEditSheet";
 * Per UI-SPEC FluidLogItem spec:
 * - Time (10px DM Sans muted), type badge pill, volume, condition dot, Terlambat badge
 */

interface FluidEntry {
  id: string;
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
    minuman: "Minuman",
    makanan: "Makanan",
    capd: "CAPD",
    lainnya: "Lainnya",
  };
  return labels[sumber] ?? sumber;
}

export default function FluidLogItem({ entry, accessToken, metodeTerapi, onEdited }: FluidLogItemProps) {
  const isMasuk = entry.tipe === "masuk";
  const dotColor = entry.kondisiKeluar
    ? getConditionDotColor(entry.kondisiKeluar)
    : "";
  const showEdit = !!accessToken;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "0.5px solid #f0faf9",
        borderRadius: 13,
        padding: "9px 11px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        minHeight: 48,
      }}
    >
      {/* Time */}
      <span
        className="font-sans shrink-0"
        style={{ fontSize: 10, color: "#7a8c8a", minWidth: 32 }}
      >
        {formatWaktu(entry.waktu)}
      </span>

      {/* Center: type badge + source */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1">
          {/* Type badge */}
          <span
            className="font-sans font-medium shrink-0"
            style={{
              fontSize: 10,
              borderRadius: 10,
              paddingLeft: 6,
              paddingRight: 6,
              paddingTop: 2,
              paddingBottom: 2,
              backgroundColor: isMasuk ? "#f0faf9" : "#fdf3e3",
              color: isMasuk ? "#2a9d8f" : "#ef9f27",
            }}
          >
            {isMasuk ? "Masuk" : "Keluar"}
          </span>

          {/* Source text */}
          {entry.sumber && (
            <span
              className="font-sans truncate"
              style={{ fontSize: 10, color: "#7a8c8a" }}
            >
              {formatSumber(entry.sumber, entry.konsentrasiCapd)}
            </span>
          )}

          {/* Late entry badge */}
          {entry.isLateEntry && (
            <span
              className="font-sans shrink-0"
              style={{
                fontSize: 8,
                borderRadius: 8,
                paddingLeft: 5,
                paddingRight: 5,
                paddingTop: 2,
                paddingBottom: 2,
                background: "#f3ede5",
                color: "#7a8c8a",
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
            style={{ fontSize: 10, color: "#7a8c8a" }}
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
            style={{ fontSize: 10, color: "#7a8c8a" }}
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
            onSaved={onEdited}
          />
        )}
      </div>
    </div>
  );
}
