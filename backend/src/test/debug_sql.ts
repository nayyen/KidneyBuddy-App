// Debug: test the raw SQL query
const { db } = await import("../lib/db.js");
const { sql } = await import("drizzle-orm");
const { users } = await import("../db/schema/users.schema.js");
const { eq } = await import("drizzle-orm");

async function main() {
  // Get a user
  const [user] = await db.select().from(users).limit(1);
  if (!user) {
    console.error("No users found");
    process.exit(1);
  }
  console.log("User ID:", user.userId);
  console.log("User email:", user.email);

  // Test the SQL query
  try {
    const userId = user.userId;
    const todayName = "sabtu";
    const result = await db.execute(sql`
      SELECT * FROM reminder_schedule
      WHERE user_id = ${userId}
        AND jenis = 'obat'
        AND aktif = true
        AND hari_aktif ? ${todayName}
        AND id NOT IN (
          SELECT reminder_id FROM medication_log
          WHERE user_id = ${userId}
            AND waktu_pengingat >= CURRENT_DATE
            AND waktu_pengingat < CURRENT_DATE + INTERVAL '1 day'
        )
      ORDER BY jam_pengingat ASC
    `);
    console.log("Query succeeded");
    console.log("Rows:", JSON.stringify(result, null, 2));
  } catch (e) {
    console.error("Query failed:", e.message);
    console.error(e.stack);
  }

  // Test simpler query first
  try {
    const result2 = await db.execute(sql`
      SELECT * FROM reminder_schedule WHERE user_id = ${user.userId} LIMIT 5
    `);
    console.log("Simple query succeeded:", result2.rows?.length || 0, "rows");
  } catch (e) {
    console.error("Simple query failed:", e.message);
  }

  process.exit(0);
}
main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
