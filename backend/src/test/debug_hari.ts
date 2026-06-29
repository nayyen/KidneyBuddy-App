// Debug: check what findActiveObatByUser returns
const { db } = await import("../lib/db.js");
const { eq, and } = await import("drizzle-orm");
const { reminderSchedule } = await import("../db/schema/reminderSchedule.schema.js");
const { users } = await import("../db/schema/users.schema.js");

async function main() {
  // Get a user
  const [user] = await db.select().from(users).limit(1);
  console.log("User:", user.email);

  // Query active obat reminders
  const reminders = await db.select().from(reminderSchedule).where(
    and(
      eq(reminderSchedule.userId, user.userId as any),
      eq(reminderSchedule.jenis, "obat"),
      eq(reminderSchedule.aktif, true),
    ),
  );
  console.log("Reminders found:", reminders.length);
  for (const r of reminders) {
    console.log("  hariAktif value:", JSON.stringify(r.hariAktif));
    console.log("  hariAktif type:", typeof r.hariAktif);
    console.log("  isArray:", Array.isArray(r.hariAktif));
    if (Array.isArray(r.hariAktif)) {
      console.log("  includes 'sabtu':", r.hariAktif.includes("sabtu"));
    }
  }
  process.exit(0);
}
main().catch(e => { console.error("Error:", e); process.exit(1); });
