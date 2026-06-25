import { z } from "zod";
import { hashPassword, verifyPassword } from "../utils/passwordHash.js";
import { AppError } from "../middleware/errorHandler.js";
import * as userRepository from "../repositories/user.repository.js";

export const registerSchema = z.object({
  namaLengkap: z.string().min(1, "Nama lengkap wajib diisi"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  konfirmasiPassword: z.string(),
  nomorTelepon: z.string().min(1, "Nomor telepon wajib diisi"),
  tanggalLahir: z.string().min(1, "Tanggal lahir wajib diisi"),
}).refine((data) => data.password === data.konfirmasiPassword, {
  message: "Konfirmasi password tidak cocok",
  path: ["konfirmasiPassword"],
});

export type RegisterPayload = z.infer<typeof registerSchema>;

export async function register(payload: RegisterPayload) {
  // Validate with zod
  const parsed = registerSchema.parse(payload);

  // Check for existing email — one email = one active account
  const existing = await userRepository.findByEmail(parsed.email);
  if (existing) {
    throw new AppError(409, "EMAIL_EXISTS", "Email sudah terdaftar");
  }

  // Hash password
  const passwordHash = await hashPassword(parsed.password);

  // Insert user
  const user = await userRepository.insertUser({
    namaLengkap: parsed.namaLengkap,
    email: parsed.email,
    passwordHash,
    nomorTelepon: parsed.nomorTelepon,
    tanggalLahir: parsed.tanggalLahir,
  });

  // Return user without passwordHash
  const { passwordHash: _hash, ...safeUser } = user;
  return safeUser;
}

export async function getProfile(email: string) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User tidak ditemukan");
  }
  const { passwordHash: _hash, ...safeUser } = user;
  return safeUser;
}
