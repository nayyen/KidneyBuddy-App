"use client";

/**
 * CatatCairanForm.tsx — Fluid log entry form
 *
 * Features (per 02-PLAN.md Task 3):
 * - FluidTypeToggle: Masuk/Keluar pill toggle
 * - FluidSourceSelect: sumber (CAPD option only for CAPD users)
 * - CAPDConcentrationSelect + CAPDConditionSelect: shown only when user.metodeTerapiAktif === "CAPD"
 * - VolumeInput: numeric with ml/kg toggle
 * - CAPDConditionSelect: selecting abnormal kondisiKeluar shows inline Alert Darurat immediately
 * - RetroactiveDateTimePicker: revealed by isLateEntry checkbox (FLUID-04)
 * - Submit: POST /api/fluid; on offline/failure → enqueue to offlineQueue
 *
 * Pattern: follows FirstReminderStep.tsx (react-hook-form + zodResolver + input styling).
 */

import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { authFetch } from "@/lib/api";
import { apiFetch } from "@/lib/api";
import {
  createFluidSchema,
  type CreateFluidFormData,
  SUMBER_LABELS,
  CAPD_KONSENTRASI_LABELS,
  KONDISI_KELUAR_LABELS,
  ABNORMAL_KONDISI,
  getSumberOptions,
} from "@/lib/validators/fluid.schema";
import {
  enqueue,
  getQueue,
  setAccessTokenForQueue,
  registerOnlineListener,
  flush,
} from "@/lib/offlineQueue";
import { useEffect } from "react";

interface CatatCairanFormProps {
  accessToken: string;
  metodeTerapiAktif: string | null;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function CatatCairanForm({
  accessToken,
  metodeTerapiAktif,
  onSuccess,
  onClose,
}: CatatCairanFormProps) {
  const isCAPD = metodeTerapiAktif === "CAPD";

  // Register online listener and set access token for queue flush
  useEffect(() => {
    setAccessTokenForQueue(accessToken);
    registerOnlineListener(
      (count) => toast.success(`${count} catatan berhasil disinkronkan`),
      () => toast.error("Gagal menyinkronkan catatan"),
    );
    // Attempt to flush any queued entries on mount
    flush(
      (count) => toast.success(`${count} catatan berhasil disinkronkan`),
    ).catch(console.error);
  }, [accessToken]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateFluidFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createFluidSchema) as any,
    defaultValues: {
      tipe: "masuk",
      satuan: "ml",
      isLateEntry: false,
    },
  });

  const watchedTipe = watch("tipe");
  const watchedKondisiKeluar = watch("kondisiKeluar");
  const watchedIsLateEntry = watch("isLateEntry");
  const watchedSatuan = watch("satuan");
    const watchedSumber = watch("sumber");
  const isAbnormalCondition = watchedKondisiKeluar
    ? ABNORMAL_KONDISI.has(watchedKondisiKeluar)
    : false;

    // CAPD konsentrasi + kondisi only required when sumber is CAPD exchange.
    // For Urine or Lainnya, they become optional.
    const isSumberCapd = watchedSumber === "capd";

  const onSubmit: SubmitHandler<CreateFluidFormData> = async (data) => {
    try {
      if (!navigator.onLine) {
        // Store offline
        await enqueue(data);
        const q = await getQueue();
        toast("Catatan disimpan dan akan disinkronkan saat kembali online", {
          duration: 4000,
        });
        reset();
        onSuccess?.();
        return;
      }

      // Refresh token if expired
      let token = accessToken;
      try {
        const refreshed = await apiFetch<{ accessToken: string }>("/api/auth/refresh", { method: "POST" });
        token = refreshed.accessToken;
      } catch {
        // Refresh failed — keep existing token
      }
      await authFetch("/api/fluid", token, {
        method: "POST",
        body: JSON.stringify(data),
      });

      toast.success("Catatan cairan berhasil disimpan");
      reset();
      onSuccess?.();
    } catch (err) {
      // Network failure even though navigator.onLine was true → enqueue
      if (err instanceof TypeError && err.message.includes("fetch")) {
        await enqueue(data);
        toast("Catatan disimpan dan akan disinkronkan saat kembali online", {
          duration: 4000,
        });
        reset();
        onSuccess?.();
      } else {
        const msg =
          err instanceof Error ? err.message : "Gagal menyimpan catatan";
        toast.error(msg);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
      {/* ── Fluid type toggle: Masuk / Keluar ── */}
      <div>
        <label className="block text-sm font-medium font-sans text-foreground mb-2">
          Jenis Cairan
        </label>
        <Controller
          name="tipe"
          control={control}
          render={({ field }) => (
            <div className="flex gap-2">
              {(["masuk", "keluar"] as const).map((tipe) => (
                <button
                  key={tipe}
                  type="button"
                  onClick={() => field.onChange(tipe)}
                  className="flex-1 font-sans font-medium transition-colors"
                  style={{
                    height: 40,
                    borderRadius: 20,
                    fontSize: 13,
                    backgroundColor:
                      field.value === tipe ? "#2a9d8f" : "#f0faf9",
                    color: field.value === tipe ? "#ffffff" : "#1a2e2c",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {tipe === "masuk" ? "Cairan Masuk" : "Cairan Keluar"}
                </button>
              ))}
            </div>
          )}
        />
        {errors.tipe && (
          <p className="mt-1 text-xs text-destructive font-sans">
            {errors.tipe.message}
          </p>
        )}
      </div>

      {/* ── Fluid source (sumber) ──
          F1/F2 (quick-260705-9n4 task 11): Sumber is a REQUIRED field (no
          more misleading "(opsional)" label) whose option list depends on
          BOTH tipe (masuk vs keluar) and isCAPD — Urine only ever appears
          for Cairan Keluar; Makanan/Minuman only ever appear for Cairan
          Masuk; Exchange CAPD only appears for CAPD patients. */}
      <div>
        <label
          htmlFor="sumber"
          className="block text-sm font-medium font-sans text-foreground mb-1"
        >
          Sumber
        </label>
        <select
          {...register("sumber")}
          id="sumber"
          defaultValue=""
          className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="" disabled>
            Pilih sumber
          </option>
          {getSumberOptions(watchedTipe, isCAPD).map((value) => (
            <option key={value} value={value}>
              {SUMBER_LABELS[value]}
            </option>
          ))}
        </select>
        {errors.sumber && (
          <p className="mt-1 text-xs text-destructive font-sans">
            {errors.sumber.message}
          </p>
        )}
      </div>

      {/* ── CAPD-specific fields — only when isCAPD AND keluar ── */}
        {isCAPD && (
        <>
          <div>
            <label
              htmlFor="konsentrasiCapd"
              className="block text-sm font-medium font-sans text-foreground mb-1"
            >
                Konsentrasi CAPD{!isSumberCapd ? " (opsional)" : ""}
            </label>
            <select
              {...register("konsentrasiCapd")}
              id="konsentrasiCapd"
              className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Pilih konsentrasi</option>
              {Object.entries(CAPD_KONSENTRASI_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
            {errors.konsentrasiCapd && (
              <p className="mt-1 text-xs text-destructive font-sans">
                {errors.konsentrasiCapd.message}
              </p>
            )}
          </div>

            {watchedTipe === "keluar" && (
          <div>
            <label
              htmlFor="kondisiKeluar"
              className="block text-sm font-medium font-sans text-foreground mb-1"
            >
                Kondisi Cairan Keluar{!isSumberCapd ? " (opsional)" : ""}
            </label>
            <select
              {...register("kondisiKeluar")}
              id="kondisiKeluar"
              className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Pilih kondisi</option>
              {Object.entries(KONDISI_KELUAR_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.kondisiKeluar && (
              <p className="mt-1 text-xs text-destructive font-sans">
                {errors.kondisiKeluar.message}
              </p>
            )}

            {/* Inline Alert Darurat for abnormal CAPD condition */}
            {isAbnormalCondition && (
              <div
                className="mt-2 w-full rounded-xl px-3 py-2 flex items-start gap-2"
                style={{
                  background: "#fdecee",
                  borderLeft: "3px solid #d4183d",
                }}
              >
                <AlertTriangle
                  size={14}
                  style={{ color: "#d4183d", flexShrink: 0, marginTop: 2 }}
                />
                <div>
                  <p
                    className="text-xs font-semibold font-sans"
                    style={{ color: "#d4183d" }}
                  >
                    Kondisi Cairan Tidak Normal
                  </p>
                  <p
                    className="text-xs font-sans mt-0.5"
                    style={{ color: "#9c1530" }}
                  >
                    Cairan keruh atau berdarah bisa menandakan infeksi. Segera
                    hubungi dokter atau perawat CAPD Anda.
                  </p>
                </div>
              </div>
            )}
          </div>
            )}
        </>
      )}

      {/* ── Volume + satuan ── */}
      <div>
        <label
          htmlFor="volume"
          className="block text-sm font-medium font-sans text-foreground mb-1"
        >
          Volume
        </label>
        <div className="flex gap-2">
          <input
            {...register("volume", { valueAsNumber: true })}
            id="volume"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            placeholder="0"
            className="flex-1 rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {/* ml / kg toggle */}
          <Controller
            name="satuan"
            control={control}
            render={({ field }) => (
              <div className="flex rounded-[10px] border border-border overflow-hidden">
                {(["ml", "kg"] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => field.onChange(unit)}
                    className="font-sans font-medium px-3 text-sm transition-colors"
                    style={{
                      backgroundColor:
                        field.value === unit ? "#2a9d8f" : "#f0faf9",
                      color: field.value === unit ? "#ffffff" : "#1a2e2c",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            )}
          />
        </div>
        {errors.volume && (
          <p className="mt-1 text-xs text-destructive font-sans">
            {errors.volume.message}
          </p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground font-sans">
            {watchedSatuan === "kg"
              ? "1 kg cairan ≈ 1000 ml. Gunakan koma untuk desimal, contoh: 1,5"
              : "Masukkan dalam mililiter (ml). Gunakan koma untuk desimal, contoh: 250,5"}
        </p>
      </div>

      {/* ── Catatan (optional free text) ── */}
      <div>
        <label
          htmlFor="catatan"
          className="block text-sm font-medium font-sans text-foreground mb-1"
        >
          Catatan{" "}
          <span className="text-muted-foreground font-normal">(opsional)</span>
        </label>
        <textarea
          {...register("catatan")}
          id="catatan"
          rows={2}
          placeholder="Contoh: Setelah makan siang"
          className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        {errors.catatan && (
          <p className="mt-1 text-xs text-destructive font-sans">
            {errors.catatan.message}
          </p>
        )}
      </div>

      {/* ── Late entry checkbox + datetime picker (FLUID-04) ── */}
      <div className="flex items-center gap-2">
        <input
          {...register("isLateEntry")}
          id="isLateEntry"
          type="checkbox"
          className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
        />
        <label
          htmlFor="isLateEntry"
          className="text-sm font-sans text-foreground cursor-pointer"
        >
          Entry lama (catat waktu lampau)
        </label>
      </div>

      {watchedIsLateEntry && (
        <div>
          <label
            htmlFor="waktu"
            className="block text-sm font-medium font-sans text-foreground mb-1"
          >
            Waktu Sebenarnya
          </label>
          <input
            {...register("waktu")}
            id="waktu"
            type="datetime-local"
            max={new Date().toISOString().slice(0, 16)}
            className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-xs text-muted-foreground font-sans">
            Entry ini akan ditandai sebagai{" "}
            <span
              className="font-semibold"
              style={{ color: "#e07b39" }}
            >
              Terlambat
            </span>
          </p>
        </div>
      )}

      {/* ── Submit + Cancel ── */}
      <div className="space-y-2 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-[10px] bg-primary px-4 py-2.5 text-sm font-semibold font-sans text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Menyimpan..." : "Simpan Catatan"}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground font-sans transition-colors"
          >
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
