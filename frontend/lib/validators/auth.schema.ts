import { z } from "zod";

export const registerSchema = z
  .object({
    namaLengkap: z.string().min(1, "Nama lengkap wajib diisi"),
    email: z.string().email("Format email tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter"),
    konfirmasiPassword: z.string(),
    nomorTelepon: z.string().min(1, "Nomor telepon wajib diisi"),
    tanggalLahir: z.string().min(1, "Tanggal lahir wajib diisi"),
  })
  .refine((data) => data.password === data.konfirmasiPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["konfirmasiPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;
