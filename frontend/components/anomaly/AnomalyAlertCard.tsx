"use client";

/**
 * AnomalyAlertCard.tsx — single anomaly alert card, reused on Beranda
 * (compact, ellipsized) and `/notifikasi` (full, untruncated + feedback).
 *
 * Per UI-SPEC Screen Contract 3 (Beranda) + Contract 6 (/notifikasi) and the
 * Color contract's "Alert Variant Lock":
 * - severity === "normal"  -> Alert AI/Info (teal gradient) — every Beranda
 *   card, and most /notifikasi history rows.
 * - severity === "tinggi"  -> Alert Darurat static card (red, no modal
 *   chrome) — only ever rendered here for already-acknowledged historical
 *   rows on /notifikasi (the live/aktif case is handled by
 *   EmergencyAnomalyModal instead).
 */
import { AlertTriangle, ThumbsUp, ThumbsDown } from "lucide-react";

export interface AnomalyAlertCardData {
  id: string;
  tipeAnomali: string;
  severity: string; // "normal" | "tinggi"
  deskripsi: string;
  status: string; // "aktif" | "dibaca" | "ditindaklanjuti"
  feedbackPengguna?: string | null; // "relevan" | "tidak_relevan" | null
  createdAt: string;
}

interface AnomalyAlertCardProps {
  alert: AnomalyAlertCardData;
  variant?: "compact" | "full";
  onClick?: () => void;
  onFeedback?: (feedback: "relevan" | "tidak_relevan") => void;
}

const TYPE_LABELS: Record<string, string> = {
  penurunan_volume_keluar: "Penurunan Volume Cairan Keluar",
  kondisi_cairan_abnormal: "Kondisi Cairan Tidak Normal",
  jadwal_terlewat: "Jadwal Terapi Terlewat",
  pola_asupan_menyimpang: "Pola Asupan Cairan Menyimpang",
};

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string; border?: string }> = {
  aktif: { label: "Aktif", bg: "#2a9d8f", text: "#ffffff" },
  dibaca: { label: "Sudah Dibaca", bg: "transparent", text: "#7a8c8a", border: "#cfe8e4" },
  ditindaklanjuti: { label: "Ditindaklanjuti", bg: "transparent", text: "#2a9d8f", border: "#2a9d8f" },
};

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AnomalyAlertCard({
  alert,
  variant = "compact",
  onClick,
  onFeedback,
}: AnomalyAlertCardProps) {
  const isDarurat = alert.severity === "tinggi";
  const title = TYPE_LABELS[alert.tipeAnomali] ?? alert.tipeAnomali;
  const showUnreadDot = alert.status === "aktif" && !isDarurat;
  const badge = STATUS_BADGE[alert.status];

  const containerStyle: React.CSSProperties = isDarurat
    ? {
        background: "#fdecee",
        borderLeft: "3px solid #d4183d",
        borderRadius: 16,
        padding: "11px 13px",
      }
    : {
        background: "linear-gradient(135deg, #f0faf9, #e0f5f2)",
        borderRadius: 16,
        padding: "11px 13px",
      };

  // Hover border swaps to teal only for clickable (Beranda) normal-severity
  // cards, signalling tappability toward /notifikasi (UI-SPEC Interaction States).
  const borderClassName = isDarurat
    ? undefined
    : onClick
      ? "border-[0.5px] border-[#cfe8e4] hover:border-[#2a9d8f] transition-colors"
      : "border-[0.5px] border-[#cfe8e4]";

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={[borderClassName, onClick ? "cursor-pointer" : ""].filter(Boolean).join(" ")}
      style={{ ...containerStyle, display: "flex", gap: 12, alignItems: "flex-start" }}
    >
      {/* Icon container */}
      <div
        style={{
          width: 30,
          height: 30,
          background: isDarurat ? "#fbd9dd" : "rgba(255,255,255,.7)",
          borderRadius: 9,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <AlertTriangle size={16} style={{ color: isDarurat ? "#d4183d" : "#2a9d8f" }} />
        {showUnreadDot && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#ef9f27",
            }}
          />
        )}
      </div>

      {/* Text area */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className="font-heading font-bold"
            style={{ fontSize: 14, color: isDarurat ? "#d4183d" : "#1a2e2c" }}
          >
            {title}
          </p>
          {variant === "full" && badge && (
            <span
              className="font-sans font-medium shrink-0"
              style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 9999,
                background: badge.bg,
                color: badge.text,
                border: badge.border ? `1px solid ${badge.border}` : undefined,
              }}
            >
              {badge.label}
            </span>
          )}
        </div>

        <p
          className="font-sans mt-1"
          style={{
            fontSize: 12,
            color: isDarurat ? "#9c1530" : "#3d6b66",
            lineHeight: 1.6,
            ...(variant === "compact"
              ? {
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical" as const,
                  overflow: "hidden",
                }
              : {}),
          }}
        >
          {alert.deskripsi}
        </p>

        <p className="font-sans mt-1.5" style={{ fontSize: 10, color: "#7a8c8a" }}>
          {formatRelativeTime(alert.createdAt)}
        </p>

        {/* Feedback footer — only on /notifikasi, and only once dibaca+ */}
        {variant === "full" && alert.status !== "aktif" && onFeedback && (
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFeedback("relevan");
              }}
              className="font-sans font-medium transition-colors"
              style={{
                height: 32,
                padding: "0 12px",
                borderRadius: 20,
                fontSize: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                border: `1px solid #2a9d8f`,
                background: alert.feedbackPengguna === "relevan" ? "#2a9d8f" : "transparent",
                color: alert.feedbackPengguna === "relevan" ? "#ffffff" : "#2a9d8f",
              }}
            >
              <ThumbsUp size={12} /> Relevan
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFeedback("tidak_relevan");
              }}
              className="font-sans font-medium transition-colors"
              style={{
                height: 32,
                padding: "0 12px",
                borderRadius: 20,
                fontSize: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                border: `1px solid ${alert.feedbackPengguna === "tidak_relevan" ? "#7a8c8a" : "#cfe8e4"}`,
                background: alert.feedbackPengguna === "tidak_relevan" ? "#7a8c8a" : "transparent",
                color: alert.feedbackPengguna === "tidak_relevan" ? "#ffffff" : "#7a8c8a",
              }}
            >
              <ThumbsDown size={12} /> Tidak Relevan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
