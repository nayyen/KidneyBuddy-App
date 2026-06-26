"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  changeTherapySchema,
  type ChangeTherapyData,
  type ChangeTherapyResponse,
} from "@/lib/validators/profile.schema";
import { authFetch } from "@/lib/api";
import type { TherapyType } from "@/lib/validators/onboarding.schema";

interface TherapyOption {
  id: TherapyType;
  nama: string;
  namaPanjang: string;
  penjelasan: string;
  warna: string;
  warnaBg: string;
}

interface ChangeTherapyDialogProps {
  accessToken: string;
  currentTherapy: string;
  onTherapyChanged: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ChangeTherapyDialog({
  accessToken,
  currentTherapy,
  onTherapyChanged,
  open,
  onOpenChange,
}: ChangeTherapyDialogProps) {
  const [therapyOptions, setTherapyOptions] = useState<TherapyOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmStep, setConfirmStep] = useState<TherapyType | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ChangeTherapyData>({
    resolver: zodResolver(changeTherapySchema),
  });

  const selectedMethod = watch("newMethod") as TherapyType | undefined;

  // Fetch therapy options when dialog opens
  useEffect(() => {
    if (!open) {
      setConfirmStep(null);
      setServerError(null);
      return;
    }

    setLoadingOptions(true);
    authFetch<TherapyOption[]>("/api/onboarding/therapy-content", accessToken)
      .then((options) => setTherapyOptions(options))
      .catch((err) => setServerError(err.message))
      .finally(() => setLoadingOptions(false));
  }, [open, accessToken]);

  function handleSelect(method: TherapyType) {
    setValue("newMethod", method, { shouldValidate: true });
    setValue("confirmed", true as any);
    setConfirmStep(method);
    setServerError(null);
  }

  function handleBack() {
    setConfirmStep(null);
    setValue("newMethod", undefined as any, { shouldValidate: false });
    setValue("confirmed", undefined as any, { shouldValidate: false });
  }

  async function onSubmit(data: ChangeTherapyData) {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await authFetch<ChangeTherapyResponse>(
        "/api/profile/therapy",
        accessToken,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
      if (res.changed) {
        onTherapyChanged();
        onOpenChange(false);
      } else {
        // Same-method no-op — just close
        onOpenChange(false);
      }
    } catch (err: any) {
      setServerError(err.message ?? "Gagal mengubah metode terapi");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const selectedOption = therapyOptions.find((o) => o.id === confirmStep);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !submitting && onOpenChange(false)}
      />

      {/* Sheet-like panel */}
      <div className="relative w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-[20px] sm:rounded-[20px] bg-background p-6 shadow-xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0">
        {/* Handle bar (mobile) */}
        <div className="sm:hidden w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-4" />

        {/* Close button */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
          disabled={submitting}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {confirmStep === null ? (
          /* STEP 1: Pilih metode */
          <>
            <h2 className="font-heading text-lg font-bold text-foreground mb-1">
              Ubah Metode Terapi
            </h2>
            <p className="text-sm text-muted-foreground font-sans mb-5">
              Pilih metode terapi yang baru. Saat ini:{" "}
              <span className="font-semibold text-foreground">{currentTherapy}</span>
            </p>

            {loadingOptions && (
              <p className="text-sm text-muted-foreground font-sans text-center py-8">
                Memuat...
              </p>
            )}

            {serverError && !loadingOptions && (
              <div className="mb-4 p-3 rounded-[10px] bg-destructive/10 text-destructive text-sm font-sans">
                {serverError}
              </div>
            )}

            {!loadingOptions && (
              <div className="space-y-3">
                {therapyOptions
                  .filter((o) => o.id !== currentTherapy)
                  .map((therapy) => {
                    const isSelected = selectedMethod === therapy.id;
                    return (
                      <button
                        key={therapy.id}
                        type="button"
                        onClick={() => handleSelect(therapy.id)}
                        className={`w-full text-left rounded-[14px] border-2 p-4 transition-all ${
                          isSelected
                            ? "border-primary shadow-sm"
                            : "border-border hover:border-primary/40"
                        }`}
                        style={{
                          backgroundColor: isSelected
                            ? `${therapy.warnaBg}`
                            : "transparent",
                        }}
                      >
                        <div className="flex items-start gap-3">
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
                            <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </>
        ) : (
          /* STEP 2: Konfirmasi */
          <>
            <h2 className="font-heading text-lg font-bold text-foreground mb-1">
              Konfirmasi Perubahan
            </h2>
            <p className="text-sm text-muted-foreground font-sans mb-5">
              Kamu akan mengubah metode terapi dari{" "}
              <span className="font-semibold text-foreground">{currentTherapy}</span>{" "}
              menjadi{" "}
              <span className="font-semibold text-foreground">{selectedOption?.namaPanjang ?? confirmStep}</span>
            </p>

            {selectedOption && (
              <div
                className="rounded-[14px] border border-border p-4 mb-5"
                style={{ backgroundColor: selectedOption.warnaBg }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: selectedOption.warna }}
                  />
                  <span className="font-heading font-semibold text-foreground text-sm">
                    {selectedOption.namaPanjang}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                  {selectedOption.penjelasan}
                </p>
              </div>
            )}

            {serverError && (
              <div className="mb-4 p-3 rounded-[10px] bg-destructive/10 text-destructive text-sm font-sans">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              {errors.confirmed && (
                <p className="text-xs text-destructive font-sans mb-3">
                  {errors.confirmed.message}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={submitting}
                  className="flex-1 rounded-[14px] border border-border px-4 py-3 font-sans text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-[14px] bg-primary px-4 py-3 font-sans text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Ya, Ubah"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
