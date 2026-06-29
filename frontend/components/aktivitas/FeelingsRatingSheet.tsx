"use client";

/**
 * FeelingsRatingSheet.tsx — Sheet shown after completing an activity
 * to rate how the user felt (perasaan) with optional catatan.
 *
 * Feelings options: nyaman, biasa, lelah, berat
 * Calls PATCH /api/activities/:id/complete on submit.
 *
 * Pattern: follows shadcn Sheet with side="bottom", authFetch with toast.
 */

import { useState } from "react";
import { authFetch, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Smile, Meh, Frown, AlertCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Perasaan = "nyaman" | "biasa" | "lelah" | "berat";

interface FeelingsOption {
  value: Perasaan;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const FEELINGS_OPTIONS: FeelingsOption[] = [
  {
    value: "nyaman",
    label: "Nyaman",
    icon: <Smile size={24} />,
    color: "#2a9d8f",
  },
  {
    value: "biasa",
    label: "Biasa",
    icon: <Meh size={24} />,
    color: "#7a8c8a",
  },
  {
    value: "lelah",
    label: "Lelah",
    icon: <Frown size={24} />,
    color: "#ef9f27",
  },
  {
    value: "berat",
    label: "Berat",
    icon: <AlertCircle size={24} />,
    color: "#d4183d",
  },
];

interface FeelingsRatingSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string | null;
  activityId: string | null;
  namaKegiatan: string | null;
  onCompleted?: () => void;
}

export default function FeelingsRatingSheet({
  isOpen,
  onOpenChange,
  accessToken,
  activityId,
  namaKegiatan,
  onCompleted,
}: FeelingsRatingSheetProps) {
  const [selectedFeelings, setSelectedFeelings] = useState<Perasaan | null>(null);
  const [catatan, setCatatan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!accessToken || !activityId) return;

    setIsSubmitting(true);
    try {
      await authFetch(`/api/activities/${activityId}/complete`, accessToken, {
        method: "PATCH",
        body: JSON.stringify({
          perasaan: selectedFeelings,
          catatan: catatan.trim() || null,
        }),
      });

      toast("Kegiatan selesai! ✅", { duration: 2000 });
      onCompleted?.();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        toast(err.message, { duration: 3000 });
      } else {
        toast("Gagal menyimpan. Coba lagi.", { duration: 3000 });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    // Set perasaan and catatan to null
    if (!accessToken || !activityId) return;

    setIsSubmitting(true);
    try {
      await authFetch(`/api/activities/${activityId}/complete`, accessToken, {
        method: "PATCH",
        body: JSON.stringify({ perasaan: null, catatan: null }),
      });

      toast("Kegiatan selesai! ✅", { duration: 2000 });
      onCompleted?.();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        toast(err.message, { duration: 3000 });
      } else {
        toast("Gagal menyimpan. Coba lagi.", { duration: 3000 });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset state when sheet opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSelectedFeelings(null);
      setCatatan("");
    }
    onOpenChange(open);
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] rounded-t-2xl sm:max-w-md sm:rounded-2xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[85dvh]"
      >
        <SheetHeader className="pb-2 sm:px-6 sm:pt-5 sm:pb-3 shrink-0">
          <SheetTitle className="font-heading text-base font-bold text-foreground text-left">
            Bagaimana perasaanmu?
          </SheetTitle>
          {namaKegiatan && (
            <p className="font-sans" style={{ fontSize: 13, color: "#7a8c8a" }}>
              Setelah &quot;{namaKegiatan}&quot;
            </p>
          )}
        </SheetHeader>

        <div className="px-4 pb-4 sm:px-6 sm:pb-6 overflow-y-auto flex-1 min-h-0 space-y-4">
          {/* Feelings options */}
          <div className="grid grid-cols-4 gap-2">
            {FEELINGS_OPTIONS.map((opt) => {
              const isSelected = selectedFeelings === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSelectedFeelings(opt.value)}
                  disabled={isSubmitting}
                  className="flex flex-col items-center gap-1.5 rounded-xl py-3 cursor-pointer active:scale-95 transition-all"
                  style={{
                    backgroundColor: isSelected ? `${opt.color}15` : "#f0faf9",
                    border: isSelected ? `2px solid ${opt.color}` : "2px solid transparent",
                  }}
                  aria-label={opt.label}
                >
                  <span style={{ color: isSelected ? opt.color : "#7a8c8a" }}>
                    {opt.icon}
                  </span>
                  <span
                    className="font-sans font-medium"
                    style={{
                      fontSize: 11,
                      color: isSelected ? opt.color : "#7a8c8a",
                    }}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Catatan */}
          <div className="space-y-1.5">
            <label
              htmlFor="catatanPerasaan"
              className="font-sans font-medium"
              style={{ fontSize: 13, color: "#1a2e2c" }}
            >
              Catatan (opsional)
            </label>
            <textarea
              id="catatanPerasaan"
              placeholder="Ceritakan bagaimana perasaanmu..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              maxLength={200}
              disabled={isSubmitting}
              className="w-full font-sans rounded-xl border px-4 py-3 outline-none transition-colors resize-none"
              style={{
                fontSize: 14,
                borderColor: "#d0e8e4",
                backgroundColor: "#fafdfc",
                color: "#1a2e2c",
                minHeight: 80,
              }}
            />
            <p className="font-sans text-right" style={{ fontSize: 11, color: "#7a8c8a" }}>
              {catatan.length}/200
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className="flex-1 font-sans font-medium rounded-xl py-3 cursor-pointer active:scale-[0.98] transition-transform"
              style={{
                fontSize: 14,
                backgroundColor: "#f0faf9",
                color: "#7a8c8a",
                border: "1px solid #d0e8e4",
              }}
            >
              Lewati
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedFeelings}
              className="flex-1 font-sans font-medium rounded-xl py-3 cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-60"
              style={{
                fontSize: 14,
                backgroundColor: "#2a9d8f",
                color: "#ffffff",
                border: "none",
              }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Menyimpan...
                </span>
              ) : (
                "Simpan"
              )}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
