/**
 * fluid.schema.ts — Frontend Zod validation for fluid log entries
 *
 * Mirrors backend/src/services/fluid.service.ts createFluidSchema.
 * Used by CatatCairanForm (react-hook-form + zodResolver) for client-side
 * validation before POSTing to /api/fluid.
 *
 * Note: Backend always re-validates — this schema exists to give fast
 * inline error feedback without a network round-trip.
 */
import { z } from "zod";

export const FLUID_TYPE = ["masuk", "keluar"] as const;
export const FLUID_SUMBER = ["urine", "capd", "lainnya"] as const;
export const CAPD_KONSENTRASI = [
  "1.5%",
  "2.5%",
  "4.25%",
  "icodextrin_7.5%",
  "lainnya",
] as const;
export const KONDISI_KELUAR = [
  "jernih",
  "keruh",
  "keruh_gumpalan",
  "berdarah",
] as const;
export const FLUID_SATUAN = ["ml", "kg"] as const;

export const ABNORMAL_KONDISI = new Set<string>(["keruh", "keruh_gumpalan", "berdarah"]);

export const createFluidSchema = z.object({
  tipe: z.enum(FLUID_TYPE, {
    errorMap: () => ({ message: "Pilih tipe cairan: Masuk atau Keluar" }),
  }),
  sumber: z
    .enum(FLUID_SUMBER, {
      errorMap: () => ({ message: "Pilih sumber cairan" }),
    })
    .optional()
    .nullable(),
  konsentrasiCapd: z
    .enum(CAPD_KONSENTRASI, {
      errorMap: () => ({ message: "Pilih konsentrasi CAPD" }),
    })
    .optional()
    .nullable(),
  volume: z
    .number({
      required_error: "Volume wajib diisi",
      invalid_type_error: "Volume harus berupa angka",
    })
    .positive("Volume harus lebih dari 0 ml"),
  satuan: z.enum(FLUID_SATUAN).default("ml"),
  kondisiKeluar: z
    .enum(KONDISI_KELUAR, {
      errorMap: () => ({ message: "Pilih kondisi cairan keluar" }),
    })
    .optional()
    .nullable(),
  catatan: z.string().max(2000).optional().nullable(),
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
    .optional(),
  waktu: z.string().optional(),
  isLateEntry: z.boolean().default(false),
});

export type CreateFluidFormData = z.infer<typeof createFluidSchema>;

// Label maps for UI display
export const TIPE_LABELS: Record<string, string> = {
  masuk: "Cairan Masuk",
  keluar: "Cairan Keluar",
};

export const SUMBER_LABELS: Record<string, string> = {
  urine: "Urine",
  capd: "Exchange CAPD",
  lainnya: "Lainnya",
};

export const CAPD_KONSENTRASI_LABELS: Record<string, string> = {
  "1.5%": "1.5% (Low)",
  "2.5%": "2.5% (Standard)",
  "4.25%": "4.25% (High)",
  "icodextrin_7.5%": "Icodextrin 7.5%",
  lainnya: "Lainnya",
};

export const KONDISI_KELUAR_LABELS: Record<string, string> = {
  jernih: "Jernih (Normal)",
  keruh: "Keruh",
  keruh_gumpalan: "Keruh + Gumpalan",
  berdarah: "Berdarah",
};
