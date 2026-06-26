import { z } from "zod";

export const therapyEnum = z.enum(["CAPD", "HD", "Transplantasi"]);
export type TherapyType = z.infer<typeof therapyEnum>;

export const therapySchema = z.object({
  metodeTerapi: therapyEnum,
});
export type TherapyFormData = z.infer<typeof therapySchema>;

const reminderJenisEnum = z.enum(["obat", "capd", "hd"]);

export const firstReminderSchema = z
  .object({
    nama: z.string().min(1, "Nama pengingat wajib diisi"),
    jamPengingat: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Format jam harus HH:MM"),
    jenis: reminderJenisEnum,
    catatanWaktu: z.string().optional().default(""),
  })
  .refine(
    (data) => {
      // At least one type content is filled — nama and jamPengingat are required
      return data.nama.length > 0 && data.jamPengingat.length > 0;
    },
    { message: "Lengkapi nama dan jam pengingat" }
  );

export type FirstReminderFormData = z.infer<typeof firstReminderSchema>;

export const reminderJenisLabels: Record<string, string> = {
  obat: "Obat",
  capd: "Exchange CAPD",
  hd: "Jadwal HD",
};

export const therapyLabels: Record<TherapyType, string> = {
  CAPD: "CAPD",
  HD: "Hemodialisis",
  Transplantasi: "Transplantasi",
};
