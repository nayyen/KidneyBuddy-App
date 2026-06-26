import { z } from "zod";
import { AppError } from "../middleware/errorHandler.js";
import * as userRepository from "../repositories/user.repository.js";
import * as therapyHistoryRepository from "../repositories/therapyHistory.repository.js";

// ─── Schemas ───────────────────────────────────────────────────────────

const therapyEnum = z.enum(["CAPD", "HD", "Transplantasi"]);

export const changeTherapySchema = z.object({
  newMethod: therapyEnum,
  confirmed: z.literal(true, {
    errorMap: () => ({ message: "Konfirmasi diperlukan untuk mengubah metode terapi" }),
  }),
});

// ─── Change Therapy Method ─────────────────────────────────────────────

export async function changeTherapyMethod(
  userId: string,
  newMethod: string,
  confirmed: boolean,
) {
  // Validate input
  const parsed = changeTherapySchema.parse({ newMethod, confirmed });

  // Read current user data
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "Pengguna tidak ditemukan");
  }

  const currentMethod = user.metodeTerapiAktif;

  // No-op if same method
  if (currentMethod === parsed.newMethod) {
    return {
      changed: false,
      message: "Metode terapi sudah sama, tidak ada perubahan",
      metodeTerapiAktif: currentMethod,
    };
  }

  // Build new riwayatTerapi entry
  const today = new Date().toISOString().split("T")[0];
  const riwayatEntry = {
    metode: parsed.newMethod,
    tanggalMulai: today,
    tanggalDipilih: today,
  };
  const existingRiwayat = Array.isArray(user.riwayatTerapi) ? user.riwayatTerapi : [];
  const updatedRiwayat = [...existingRiwayat, riwayatEntry];

  // Update user
  await userRepository.updateTherapyMethod(
    userId,
    parsed.newMethod,
    today,
    updatedRiwayat,
  );

  // Record therapy history
  await therapyHistoryRepository.append(
    userId,
    currentMethod ?? null,
    parsed.newMethod,
  );

  return {
    changed: true,
    message: "Metode terapi berhasil diubah",
    metodeTerapiAktif: parsed.newMethod,
    tanggalMulaiTerapi: today,
  };
}

// ─── Get Therapy History ───────────────────────────────────────────────

export async function getTherapyHistory(userId: string) {
  const history = await therapyHistoryRepository.findByUser(userId);
  return history;
}
