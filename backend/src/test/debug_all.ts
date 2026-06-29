// Direct test of getTodayLogs logic
const { db } = await import("../lib/db.js");
const { eq, and } = await import("drizzle-orm");
const { reminderSchedule } = await import("../db/schema/reminderSchedule.schema.js");

async function main() {
  // Get all users with obat reminders
  const allRems = await db.select().from(reminderSchedule).where(
    and(eq(reminderSchedule.jenis, "obat"), eq(reminderSchedule.aktif, true))
  );
  console.log("Total active obat reminders:", allRems.length);
  
  for (const r of allRems) {
    const hariAktif = r.hariAktif as string[];
    console.log(`  User ${r.userId}: ${r.nama}, hariAktif:`, JSON.stringify(hariAktif));
    
    // Test WIB day name matching
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const jakartaNow = new Date(Date.now() + 7 * 3600 * 1000);
    const todayName = days[jakartaNow.getUTCDay()].toLowerCase();
    console.log(`  Today (WIB): ${todayName}, matches:`, hariAktif.includes(todayName));
  }
  
  process.exit(0);
}
main().catch(e => { console.error("Error:", e); process.exit(1); });
