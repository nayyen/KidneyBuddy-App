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
// F2 (quick-260705-9n4 task 11): "makanan"/"minuman" added so Cairan Masuk
// (fluid IN) can offer real intake sources instead of wrongly reusing
// "urine" (which is a Cairan Keluar/fluid OUT-only source). Mirrors the
// backend's FLUID_SUMBER in fluid.service.ts — keep both in sync.
export const FLUID_SUMBER = ["urine", "capd", "lainnya", "makanan", "minuman"] as const;
// Sources valid ONLY for tipe="masuk" (fluid IN) — never offered/accepted
// for tipe="keluar".
const SUMBER_MASUK_ONLY = new Set<string>(["makanan", "minuman"]);
// Sources valid ONLY for tipe="keluar" (fluid OUT) — never offered/accepted
// for tipe="masuk". Urine must NEVER appear under Sumber for Cairan Masuk.
const SUMBER_KELUAR_ONLY = new Set<string>(["urine"]);

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

export const createFluidSchema = z
  .object({
    tipe: z.enum(FLUID_TYPE, {
      errorMap: () => ({ message: "Pilih tipe cairan: Masuk atau Keluar" }),
    }),
    // F1 (quick-260705-9n4 task 11): Sumber is now REQUIRED — every fluid
    // entry (masuk or keluar) must say what kind of fluid it is. Mirrors the
    // backend's createFluidSchema; previously `.optional().nullable()` here
    // made the "(opsional)" label in CatatCairanForm.tsx technically
    // accurate but conceptually wrong for a field that should always be set.
    sumber: z.enum(FLUID_SUMBER, {
      errorMap: (issue) => ({
        message:
          issue.code === "invalid_type"
            ? "Sumber wajib diisi"
            : "Pilih sumber cairan",
      }),
    }),
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
  })
  .superRefine((data, ctx) => {
    // F2: mirrors the backend's cross-field validation — reject nonsensical
    // tipe/sumber combos client-side too, for fast inline feedback.
    if (data.tipe === "masuk" && SUMBER_KELUAR_ONLY.has(data.sumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sumber"],
        message: "Urine hanya berlaku untuk Cairan Keluar",
      });
    }
    if (data.tipe === "keluar" && SUMBER_MASUK_ONLY.has(data.sumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sumber"],
        message: "Makanan/Minuman hanya berlaku untuk Cairan Masuk",
      });
    }
    if (data.sumber === "capd" && !data.konsentrasiCapd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["konsentrasiCapd"],
        message: "Konsentrasi CAPD wajib diisi untuk sumber Exchange CAPD",
      });
    }
    // quick-260707-8je item 2: Kondisi Cairan Keluar is required whenever
    // sumber is Exchange CAPD AND the entry is Cairan Keluar — mirrors the
    // now-always-shown-when-required UI gating in CatatCairanForm/FluidEditSheet.
    if (
      data.sumber === "capd" &&
      data.tipe === "keluar" &&
      !data.kondisiKeluar
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["kondisiKeluar"],
        message: "Kondisi cairan keluar wajib diisi untuk Exchange CAPD",
      });
    }
  });

export type CreateFluidFormData = z.infer<typeof createFluidSchema>;

/**
 * getSumberOptions — F2 (quick-260705-9n4 task 11): the Sumber dropdown's
 * option list depends on BOTH `tipe` (masuk vs keluar) and whether the
 * patient's active therapy is CAPD:
 *   - tipe="masuk": Makanan, Minuman, (Exchange CAPD if CAPD), Lainnya — NEVER Urine.
 *   - tipe="keluar": Urine, (Exchange CAPD if CAPD), Lainnya.
 */
export function getSumberOptions(
  tipe: (typeof FLUID_TYPE)[number],
  isCAPD: boolean,
): (typeof FLUID_SUMBER)[number][] {
  if (tipe === "masuk") {
    return [
      "makanan",
      "minuman",
      ...(isCAPD ? (["capd"] as const) : []),
      "lainnya",
    ];
  }
  return [...(["urine"] as const), ...(isCAPD ? (["capd"] as const) : []), "lainnya"];
}

// Label maps for UI display
export const TIPE_LABELS: Record<string, string> = {
  masuk: "Cairan Masuk",
  keluar: "Cairan Keluar",
};

export const SUMBER_LABELS: Record<string, string> = {
  urine: "Urine",
  capd: "Exchange CAPD",
  lainnya: "Lainnya",
  makanan: "Makanan",
  minuman: "Minuman",
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
