/**
 * reminder.schema.ts — Frontend Zod validation for reminder creation forms
 *
 * Mirrors the per-jenis schemas in backend/src/services/reminders.service.ts.
 * Three separate schemas: obat (REMIND-01), capd (REMIND-05), hd (REMIND-06).
 *
 * Note: fotoObat uses z.instanceof(File) in the browser context for client-side
 * validation before building FormData for the multipart POST to /api/reminders.
 */
import { z } from "zod";

// ─── Shared constants ─────────────────────────────────────────────────────────

/** Backend stores active days as Indonesian day names (lowercase) */
export const HARI_OPTIONS = [
  { value: "senin", label: "Sen" },
  { value: "selasa", label: "Sel" },
  { value: "rabu", label: "Rab" },
  { value: "kamis", label: "Kam" },
  { value: "jumat", label: "Jum" },
  { value: "sabtu", label: "Sab" },
  { value: "minggu", label: "Min" },
] as const;

export const CAPD_KONSENTRASI_OPTIONS = [
  { value: "1.5%", label: "1.5%" },
  { value: "2.5%", label: "2.5%" },
  { value: "4.25%", label: "4.25%" },
  { value: "icodextrin_7.5%", label: "Icodextrin 7.5%" },
  { value: "lainnya", label: "Lainnya" },
] as const;

// ─── Shared base field schemas ────────────────────────────────────────────────

export const hariAktifSchema = z
  .array(z.string())
  .min(1, "Pilih minimal satu hari aktif");

export const jamPengingatSchema = z
  .string()
  .min(1, "Jam pengingat wajib diisi")
  .regex(/^\d{2}:\d{2}$/, "Format jam tidak valid (HH:mm)");

// ─── Medication (Obat) schema — REMIND-01 ────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES: string[] = ["image/jpeg", "image/png"];

export const createObatFormSchema = z.object({
  jenis: z.literal("obat").default("obat"),
  nama: z
    .string()
    .min(1, "Nama obat wajib diisi")
    .max(100, "Nama obat maksimal 100 karakter"),
  dosis: z.string().min(1, "Dosis wajib diisi"),
  jenisObat: z.enum(["minum", "suntik"], {
    errorMap: () => ({ message: "Pilih cara minum: Minum atau Suntik" }),
  }),
  catatanWaktu: z.string().optional().nullable(),
  hariAktif: hariAktifSchema,
  jamPengingat: jamPengingatSchema,
  fotoObat: z
    .custom<File | null | undefined>((val) => !val || val instanceof File)
    .refine(
      (f) => !f || ALLOWED_TYPES.includes(f.type),
      "Foto harus berformat JPEG atau PNG",
    )
    .refine(
      (f) => !f || f.size <= MAX_FILE_SIZE,
      "Ukuran foto maksimal 10 MB",
    )
    .optional()
    .nullable(),
});

export type CreateObatFormData = z.infer<typeof createObatFormSchema>;

// ─── CAPD schema — REMIND-05 ─────────────────────────────────────────────────

export const createCapdFormSchema = z.object({
  jenis: z.literal("capd").default("capd"),
  nama: z.string().min(1, "Nama pengingat wajib diisi"),
  konsentrasiCapd: z.string().min(1, "Pilih konsentrasi cairan CAPD"),
  jamPengingat: jamPengingatSchema,
  hariAktif: hariAktifSchema,
  catatanWaktu: z.string().optional().nullable(),
});

export type CreateCapdFormData = z.infer<typeof createCapdFormSchema>;

// ─── HD schema — REMIND-06 ───────────────────────────────────────────────────

export const createHdFormSchema = z.object({
  jenis: z.literal("hd").default("hd"),
  nama: z.string().min(1, "Nama jadwal HD wajib diisi"),
  jamPengingat: jamPengingatSchema,
  hariAktif: hariAktifSchema,
  catatanWaktu: z.string().optional().nullable(),
});

export type CreateHdFormData = z.infer<typeof createHdFormSchema>;
