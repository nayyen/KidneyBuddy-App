// Direct test: findActiveObatByUser for specific user
import { findActiveObatByUser } from "../repositories/reminderSchedule.repository.js";

async function main() {
  // Use the trace user's ID
  const userId = "d924fc3b-222f-4186-bf9b-15f612c1793f";
  
  const reminders = await findActiveObatByUser(userId);
  console.log("Reminders found:", reminders.length);
  
  for (const r of reminders) {
    console.log("  ID:", r.id);
    console.log("  nama:", r.nama);
    console.log("  jenis:", r.jenis);
    console.log("  hariAktif:", JSON.stringify(r.hariAktif));
    console.log("  hariAktif type:", typeof r.hariAktif);
    console.log("  isArray:", Array.isArray(r.hariAktif));
    if (Array.isArray(r.hariAktif)) {
      console.log("  includes 'sabtu':", r.hariAktif.includes("sabtu"));
    }
  }
  
  process.exit(0);
}
main().catch(e => { console.error("Error:", e); process.exit(1); });
