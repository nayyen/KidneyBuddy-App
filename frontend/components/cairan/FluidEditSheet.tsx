"use client";

/**
 * FluidEditSheet.tsx — Edit an existing fluid log entry
 *
 * Opens a Sheet pre-filled with the current entry's data.
 * Uses react-hook-form + zod matching CatatCairanForm styling.
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authFetch } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Pencil, AlertTriangle } from "lucide-react";
import { SUMBER_LABELS, CAPD_KONSENTRASI_LABELS, KONDISI_KELUAR_LABELS, ABNORMAL_KONDISI } from "@/lib/validators/fluid.schema";

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
}

interface FluidEditSheetProps {
  entry: FluidEntry;
  accessToken: string;
  metodeTerapi: string;
  onSaved?: () => void;
}

const editSchema = z.object({
  sumber: z.string().optional().nullable(),
  konsentrasiCapd: z.string().optional().nullable(),
  volume: z.number({ required_error: "Volume wajib diisi", invalid_type_error: "Volume harus angka" }).positive("Volume harus > 0"),
  kondisiKeluar: z.string().optional().nullable(),
  catatan: z.string().max(2000).optional().nullable(),
});

type EditFormData = z.infer<typeof editSchema>;

export default function FluidEditSheet({
  entry,
  accessToken,
  metodeTerapi,
  onSaved,
}: FluidEditSheetProps) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState("");
  const isCAPD = metodeTerapi === "CAPD";
  const isKeluar = entry.tipe === "keluar";

  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } = useForm<EditFormData>({
    resolver: zodResolver(editSchema) as any,
    defaultValues: {
      volume: entry.volume,
      sumber: entry.sumber ?? null,
      konsentrasiCapd: entry.konsentrasiCapd ?? null,
      kondisiKeluar: entry.kondisiKeluar ?? null,
      catatan: entry.catatan ?? null,
    },
  });

  useEffect(() => {
    reset({
      volume: entry.volume,
      sumber: entry.sumber ?? null,
      konsentrasiCapd: entry.konsentrasiCapd ?? null,
      kondisiKeluar: entry.kondisiKeluar ?? null,
      catatan: entry.catatan ?? null,
    });
  }, [entry, reset]);

  const watchedKondisiKeluar = watch("kondisiKeluar");
  const isAbnormal = watchedKondisiKeluar ? ABNORMAL_KONDISI.has(watchedKondisiKeluar) : false;

  const onSubmit = async (data: EditFormData) => {
    setServerError("");
    const body: Record<string, unknown> = {
      volume: data.volume,
      sumber: data.sumber || null,
      catatan: data.catatan || null,
    };
    if (isCAPD && isKeluar) {
      body.konsentrasiCapd = data.konsentrasiCapd || null;
      body.kondisiKeluar = data.kondisiKeluar || null;
    }
    try {
      await authFetch(`/api/fluid/${entry.id}`, accessToken, { method: "PATCH", body: JSON.stringify(body) });
      toast.success("Catatan cairan berhasil diperbarui");
      setOpen(false);
      onSaved?.();
    } catch (err: any) {
      setServerError(err?.message ?? "Gagal menyimpan");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 transition-colors"
        aria-label="Edit catatan cairan"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Edit Catatan Cairan</SheetTitle>
            <SheetDescription>
              {entry.tipe === "masuk" ? "Cairan Masuk" : "Cairan Keluar"} —{" "}
              {entry.waktu.slice(0, 5)}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
            {serverError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-[10px] p-3 text-sm text-destructive font-sans">{serverError}</div>
            )}

            {/* Volume */}
            <div>
              <label htmlFor="edit-volume" className="block text-sm font-medium font-sans text-foreground mb-1">Volume <span className="text-destructive">*</span></label>
              <input {...register("volume", { valueAsNumber: true })} type="number" step="0.01" min="0" id="edit-volume" className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              {errors.volume && <p className="mt-1 text-xs text-destructive">{errors.volume.message}</p>}
            </div>

            {/* Sumber */}
            <div>
              <label htmlFor="edit-sumber" className="block text-sm font-medium font-sans text-foreground mb-1">Sumber <span className="text-muted-foreground font-normal">(opsional)</span></label>
              <Controller name="sumber" control={control} render={({ field }) => (
                <select {...field} value={field.value ?? ""} id="edit-sumber" className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Pilih sumber</option>
                  {Object.entries(SUMBER_LABELS).map(([v, lbl]) => {
                    if (v === "capd" && !isCAPD) return null;
                    return <option key={v} value={v}>{lbl}</option>;
                  })}
                </select>
              )} />
            </div>

            {/* CAPD fields */}
            {isCAPD && isKeluar && (
              <>
                <div>
                  <label htmlFor="edit-konsentrasi" className="block text-sm font-medium font-sans text-foreground mb-1">Konsentrasi Cairan</label>
                  <Controller name="konsentrasiCapd" control={control} render={({ field }) => (
                    <select {...field} value={field.value ?? ""} id="edit-konsentrasi" className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="">Pilih konsentrasi</option>
                      {Object.entries(CAPD_KONSENTRASI_LABELS).map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
                    </select>
                  )} />
                </div>
                <div>
                  <label htmlFor="edit-kondisi" className="block text-sm font-medium font-sans text-foreground mb-1">Kondisi Cairan Keluar</label>
                  <Controller name="kondisiKeluar" control={control} render={({ field }) => (
                    <select {...field} value={field.value ?? ""} id="edit-kondisi" className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="">Pilih kondisi</option>
                      {Object.entries(KONDISI_KELUAR_LABELS).map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
                    </select>
                  )} />
                  {isAbnormal && (
                    <div className="flex items-start gap-2 mt-2 p-3 rounded-[10px]" style={{ background: "#fdecee", border: "1px solid #d4183d40" }}>
                      <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: "#d4183d" }} />
                      <p className="text-xs font-sans" style={{ color: "#9c1530" }}>Kondisi cairan tidak normal. Segera hubungi dokter.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Catatan */}
            <div>
              <label htmlFor="edit-catatan" className="block text-sm font-medium font-sans text-foreground mb-1">Catatan <span className="text-muted-foreground font-normal">(opsional)</span></label>
              <textarea {...register("catatan")} id="edit-catatan" rows={3} className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Catatan tambahan" />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
