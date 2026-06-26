"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  therapySchema,
  type TherapyFormData,
  type TherapyType,
} from "@/lib/validators/onboarding.schema";

interface TherapyOption {
  id: TherapyType;
  nama: string;
  namaPanjang: string;
  penjelasan: string;
  warna: string;
  warnaBg: string;
}

interface TherapySelectStepProps {
  therapyOptions: TherapyOption[];
  onSubmit: (data: TherapyFormData) => Promise<void>;
  isLoading: boolean;
}

export default function TherapySelectStep({
  therapyOptions,
  onSubmit,
  isLoading,
}: TherapySelectStepProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TherapyFormData>({
    resolver: zodResolver(therapySchema),
  });

  const selectedTherapy = watch("metodeTerapi");

  function handleSelect(therapyId: TherapyType) {
    setValue("metodeTerapi", therapyId, { shouldValidate: true });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="font-heading text-lg font-bold text-foreground mb-1">
          Pilih Jenis Terapi
        </h2>
        <p className="text-sm text-muted-foreground font-sans">
          Terapi apa yang sedang kamu jalani?
        </p>
      </div>

      {/* Therapy cards */}
      <div className="space-y-3">
        {therapyOptions.map((therapy) => {
          const isSelected = selectedTherapy === therapy.id;
          const isExpanded = expandedId === therapy.id;

          return (
            <div key={therapy.id}>
              <button
                type="button"
                onClick={() => handleSelect(therapy.id)}
                className={`w-full text-left rounded-[14px] border-2 p-4 transition-all ${
                  isSelected
                    ? "border-primary shadow-sm"
                    : "border-border hover:border-primary/40"
                }`}
                style={{
                  backgroundColor: isSelected ? `${therapy.warnaBg}` : "transparent",
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Color dot */}
                  <div
                    className="w-5 h-5 rounded-full mt-0.5 shrink-0"
                    style={{ backgroundColor: therapy.warna }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-heading font-bold text-foreground">
                      {therapy.namaPanjang}
                    </div>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">
                      {therapy.nama}
                    </p>
                  </div>
                  {isSelected && (
                    <svg
                      className="w-5 h-5 text-primary shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M9 12l2 2 4-4"
                      />
                    </svg>
                  )}
                </div>
              </button>

              {/* "Apa ini?" expand */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : therapy.id)}
                className="mt-1 ml-2 text-xs font-medium text-primary hover:underline font-sans"
              >
                {isExpanded ? "Tutup" : "Apa ini?"}
              </button>

              {isExpanded && (
                <div className="mt-2 ml-2 p-4 rounded-[10px] bg-muted/50 border border-border text-sm text-muted-foreground font-sans leading-relaxed">
                  {therapy.penjelasan}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Error */}
      {errors.metodeTerapi && (
        <p className="text-xs text-destructive font-sans">
          {errors.metodeTerapi.message}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!selectedTherapy || isLoading}
        className="w-full rounded-[10px] bg-primary px-4 py-2.5 text-sm font-semibold font-sans text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? "Menyimpan..." : "Lanjutkan"}
      </button>
    </form>
  );
}
