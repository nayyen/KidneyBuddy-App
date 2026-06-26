import { z } from "zod";
import { therapyEnum, type TherapyType } from "./onboarding.schema";

export type { TherapyType };

/** Schema for changing therapy method — requires explicit confirmed: true */
export const changeTherapySchema = z.object({
  newMethod: therapyEnum,
  confirmed: z.literal(true, {
    errorMap: () => ({
      message: "Konfirmasi diperlukan untuk mengubah metode terapi",
    }),
  }),
});

export type ChangeTherapyData = z.infer<typeof changeTherapySchema>;

/** Response from POST /api/profile/therapy */
export interface ChangeTherapyResponse {
  changed: boolean;
  message: string;
  metodeTerapiAktif?: string;
  tanggalMulaiTerapi?: string;
}

/** A single history entry returned from GET /api/profile/therapy-history */
export interface TherapyHistoryEntry {
  id: string;
  userId: string;
  metodeSebelum: string | null;
  metodeBaru: string;
  changedAt: string;
}
