"use client";

/**
 * EducationCard.tsx — single education content card (EDU-01).
 *
 * Rendered by EducationList inside a vertical list. ringkasan is rendered as
 * a plain JSX text child only (React auto-escapes it) — no raw-HTML
 * injection APIs are used anywhere in this component. Therapy-tag badge
 * colors and tipeKonten icon mapping per 06-UI-SPEC.md.
 */
import { BookOpen, Dumbbell, Salad } from "lucide-react";

export interface EducationItem {
  id: string;
  judul: string;
  ringkasan: string;
  isi: string;
  tipeKonten: "artikel" | "panduan_senam" | "gaya_hidup";
  metodeTerapi: "CAPD" | "HD" | "Transplantasi" | "Umum";
  gambarUrl: string | null;
  createdAt?: string;
}

const THERAPY_BADGE: Record<
  EducationItem["metodeTerapi"],
  { label: string; color: string; bg: string }
> = {
  CAPD: { label: "CAPD", color: "#2a9d8f", bg: "#f0faf9" },
  HD: { label: "Hemodialisis", color: "#ef9f27", bg: "#fdf3e3" },
  Transplantasi: { label: "Transplantasi", color: "#6b5ca5", bg: "#f1eef9" },
  Umum: { label: "Umum", color: "#7a8c8a", bg: "#f3ede5" },
};

const TIPE_KONTEN_ICON: Record<EducationItem["tipeKonten"], typeof BookOpen> = {
  artikel: BookOpen,
  panduan_senam: Dumbbell,
  gaya_hidup: Salad,
};

interface EducationCardProps {
  item: EducationItem;
  onClick: (item: EducationItem) => void;
}

export default function EducationCard({ item, onClick }: EducationCardProps) {
  const badge = THERAPY_BADGE[item.metodeTerapi];
  const Icon = TIPE_KONTEN_ICON[item.tipeKonten];

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className="w-full text-left bg-card transition-colors hover:bg-muted/50"
      style={{
        backgroundColor: "#ffffff",
        border: "0.5px solid #f0faf9",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            backgroundColor: badge.bg,
          }}
        >
          <Icon size={16} style={{ color: badge.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className="font-heading font-bold"
              style={{ fontSize: 14, color: "#1a2e2c" }}
            >
              {item.judul}
            </h3>
          </div>
          <p
            className="font-sans mt-1 line-clamp-2"
            style={{ fontSize: 13, color: "#3d6b66", lineHeight: 1.5 }}
          >
            {item.ringkasan}
          </p>
          <span
            className="font-sans font-bold inline-flex items-center mt-2"
            style={{
              fontSize: 12,
              color: badge.color,
              backgroundColor: badge.bg,
              borderRadius: 20,
              padding: "2px 10px",
            }}
          >
            {badge.label}
          </span>
        </div>
      </div>
    </button>
  );
}
