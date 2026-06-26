import { db } from "../lib/db.js";
import { reminderSchedule } from "../db/schema/reminderSchedule.schema.js";

export async function insert(data: {
  userId: string;
  jenis: string;
  nama: string;
  jamPengingat: string;
  hariAktif?: unknown[];
  catatanWaktu?: string | null;
  aktif?: boolean;
}) {
  const [row] = await db.insert(reminderSchedule).values(data).returning();
  return row;
}
