import { z } from "zod";

export const registerSchema = z
  .object({
    namaLengkap: z.string().min(1, "Nama lengkap wajib diisi"),
    email: z.string().email("Format email tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter"),
    konfirmasiPassword: z.string(),
    informedConsent: z.literal(true, {
      errorMap: () => ({ message: "Kamu harus menyetujui syarat dan ketentuan" }),
    }),
  })
  .refine((data) => data.password === data.konfirmasiPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["konfirmasiPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Login Schema ──────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ─── Forgot Password Schema ────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: z.string().email("Format email tidak valid"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// ─── Reset Password Schema ─────────────────────────────────────────────

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password minimal 8 karakter"),
    konfirmasiPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.konfirmasiPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["konfirmasiPassword"],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
