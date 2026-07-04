"use client";

/**
 * EducationDetail.tsx — full article detail, presented inside a Dialog
 * opened from EducationList's selected-article state (EDU-01).
 *
 * Renders the full body as a plain JSX text child with whitespace-pre-wrap
 * so user-visible line breaks are preserved WITHOUT any raw-HTML injection
 * API (T-06-06). No video/iframe embeds per D-11 — an optional static
 * <img> illustration only.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EducationItem } from "@/components/edukasi/EducationCard";

const THERAPY_BADGE: Record<
  EducationItem["metodeTerapi"],
  { label: string; color: string; bg: string }
> = {
  CAPD: { label: "CAPD", color: "#2a9d8f", bg: "#f0faf9" },
  HD: { label: "Hemodialisis", color: "#ef9f27", bg: "#fdf3e3" },
  Transplantasi: { label: "Transplantasi", color: "#6b5ca5", bg: "#f1eef9" },
  Umum: { label: "Umum", color: "#7a8c8a", bg: "#f3ede5" },
};

interface EducationDetailProps {
  item: EducationItem | null;
  onOpenChange: (open: boolean) => void;
}

export default function EducationDetail({
  item,
  onOpenChange,
}: EducationDetailProps) {
  const open = item !== null;
  const badge = item ? THERAPY_BADGE[item.metodeTerapi] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {item && badge && (
          <>
            <DialogHeader>
              <DialogTitle
                className="font-heading font-bold"
                style={{ fontSize: 18, color: "#1a2e2c", lineHeight: 1.2 }}
              >
                {item.judul}
              </DialogTitle>
            </DialogHeader>

            <span
              className="font-sans font-bold inline-flex items-center self-start"
              style={{
                fontSize: 12,
                color: badge.color,
                backgroundColor: badge.bg,
                borderRadius: 20,
                padding: "2px 10px",
                width: "fit-content",
              }}
            >
              {badge.label}
            </span>

            {item.gambarUrl && (
              // Static illustration only — no video/iframe per D-11.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.gambarUrl}
                alt={item.judul}
                className="w-full rounded-lg"
                style={{ maxHeight: 200, objectFit: "cover" }}
              />
            )}

            <p
              className="font-sans whitespace-pre-wrap mt-2"
              style={{ fontSize: 13, color: "#1a2e2c", lineHeight: 1.6 }}
            >
              {item.isi}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
