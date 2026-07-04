"use client";

/**
 * InputManualForm.tsx — Manual lab parameter entry form
 *
 * Fields: tanggalPemeriksaan, kategori (optional), namaParameter, nilai,
 *        satuan (optional), nilaiRujukan (optional), catatan (optional, max 2000)
 * Submits: POST /api/lab
 *
 * Pattern: follows CatatCairanForm.tsx (react-hook-form + zodResolver).
 */

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { authFetch } from "@/lib/api";
import { z } from "zod";

// ─── Schema ──────────────────────────────────────────────────────────────────

const inputManualSchema = z.object({
  tanggalPemeriksaan: z
    .string({ required_error: "Tanggal pemeriksaan wajib diisi" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  namaParameter: z
    .string({ required_error: "Nama parameter wajib diisi" })
    .min(1, "Nama parameter tidak boleh kosong")
    .max(100, "Maksimal 100 karakter"),
  nilai: z
    .string({ required_error: "Nilai wajib diisi" })
    .min(1, "Nilai tidak boleh kosong")
    .max(50, "Maksimal 50 karakter"),
  satuan: z.string().max(20, "Maksimal 20 karakter").optional().or(z.literal("")),
  nilaiRujukan: z.string().max(50, "Maksimal 50 karakter").optional().or(z.literal("")),
  kategori: z.string().max(50, "Maksimal 50 karakter").optional().or(z.literal("")),
  catatan: z.string().max(2000, "Maksimal 2000 karakter").optional().or(z.literal("")),
});

type InputManualFormData = z.infer<typeof inputManualSchema>;

// Minimal shape of the created row this form cares about passing upward —
// LabAnalysisCard (05-07, AI-03) needs the new labResultId to poll its
// async analysis, plus nilai/nilaiRujukan to determine which figure (if
// any) is out-of-range for inline highlighting.
export interface CreatedLabEntry {
  id: string;
  namaParameter: string;
  nilai: string;
  nilaiRujukan: string | null;
}

interface InputManualFormProps {
  accessToken: string;
  onSuccess?: (created?: CreatedLabEntry) => void;
}

export default function InputManualForm({
  accessToken,
  onSuccess,
}: InputManualFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<InputManualFormData>({
    resolver: zodResolver(inputManualSchema) as any,
    defaultValues: {
      tanggalPemeriksaan: new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit: SubmitHandler<InputManualFormData> = async (data) => {
    try {
      // Convert empty strings to null for optional fields
      const payload = {
        ...data,
        satuan: data.satuan || null,
        nilaiRujukan: data.nilaiRujukan || null,
        kategori: data.kategori || null,
        catatan: data.catatan || null,
      };

      const created = await authFetch<CreatedLabEntry>("/api/lab", accessToken, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Hasil lab berhasil disimpan");
      reset();
      onSuccess?.(created);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gagal menyimpan hasil lab";
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Tanggal Pemeriksaan */}
      <div>
        <label
          htmlFor="tanggalPemeriksaan"
          className="block text-sm font-medium font-sans text-foreground mb-1"
        >
          Tanggal Pemeriksaan <span className="text-destructive">*</span>
        </label>
        <input
          {...register("tanggalPemeriksaan")}
          type="date"
          id="tanggalPemeriksaan"
          className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {errors.tanggalPemeriksaan && (
          <p className="mt-1 text-xs text-destructive font-sans">
            {errors.tanggalPemeriksaan.message}
          </p>
        )}
      </div>

      {/* Kategori (opsional) */}
      <div>
        <label
          htmlFor="kategori"
          className="block text-sm font-medium font-sans text-foreground mb-1"
        >
          Kategori{" "}
          <span className="text-muted-foreground font-normal">(opsional)</span>
        </label>
        <input
          {...register("kategori")}
          type="text"
          id="kategori"
          placeholder="Mis: Fungsi Ginjal, Elektrolit"
          className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {errors.kategori && (
          <p className="mt-1 text-xs text-destructive font-sans">
            {errors.kategori.message}
          </p>
        )}
      </div>

      {/* Nama Parameter */}
      <div>
        <label
          htmlFor="namaParameter"
          className="block text-sm font-medium font-sans text-foreground mb-1"
        >
          Nama Parameter <span className="text-destructive">*</span>
        </label>
        <input
          {...register("namaParameter")}
          type="text"
          id="namaParameter"
          placeholder="Mis: Kreatinin, Hemoglobin"
          className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {errors.namaParameter && (
          <p className="mt-1 text-xs text-destructive font-sans">
            {errors.namaParameter.message}
          </p>
        )}
      </div>

      {/* Nilai + Satuan row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="nilai"
            className="block text-sm font-medium font-sans text-foreground mb-1"
          >
            Nilai <span className="text-destructive">*</span>
          </label>
          <input
            {...register("nilai")}
            type="text"
            id="nilai"
            placeholder="Mis: 1.2"
            className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.nilai && (
            <p className="mt-1 text-xs text-destructive font-sans">
              {errors.nilai.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="satuan"
            className="block text-sm font-medium font-sans text-foreground mb-1"
          >
            Satuan{" "}
            <span className="text-muted-foreground font-normal">(opsional)</span>
          </label>
          <input
            {...register("satuan")}
            type="text"
            id="satuan"
            placeholder="Mis: mg/dL"
            className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.satuan && (
            <p className="mt-1 text-xs text-destructive font-sans">
              {errors.satuan.message}
            </p>
          )}
        </div>
      </div>

      {/* Nilai Rujukan */}
      <div>
        <label
          htmlFor="nilaiRujukan"
          className="block text-sm font-medium font-sans text-foreground mb-1"
        >
          Nilai Rujukan{" "}
          <span className="text-muted-foreground font-normal">(opsional)</span>
        </label>
        <input
          {...register("nilaiRujukan")}
          type="text"
          id="nilaiRujukan"
          placeholder="Mis: 0.6-1.2"
          className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {errors.nilaiRujukan && (
          <p className="mt-1 text-xs text-destructive font-sans">
            {errors.nilaiRujukan.message}
          </p>
        )}
      </div>

      {/* Catatan */}
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
          rows={3}
          maxLength={2000}
          placeholder="Catatan tambahan..."
          className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        {errors.catatan && (
          <p className="mt-1 text-xs text-destructive font-sans">
            {errors.catatan.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          width: "100%",
          height: 44,
          borderRadius: 22,
          fontSize: 14,
          fontWeight: 600,
          backgroundColor: "#2a9d8f",
          color: "#ffffff",
          border: "none",
          cursor: isSubmitting ? "not-allowed" : "pointer",
          opacity: isSubmitting ? 0.7 : 1,
        }}
        className="font-sans transition-opacity"
      >
        {isSubmitting ? "Menyimpan..." : "Simpan Hasil Lab"}
      </button>
    </form>
  );
}
