// One-shot migration: adds informed_consent column to users table
// Run: docker-compose exec backend node src/db/migrations/apply_0004.js

import { db } from "../../lib/db.js";

async function main() {
  console.log("Applying migration 0004...");
  await db.execute(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS informed_consent boolean NOT NULL DEFAULT false"
  );
  await db.execute(
    "INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at) VALUES (4, '0004_add_informed_consent', 1782490000000) ON CONFLICT (id) DO NOTHING"
  );
  console.log("Migration 0004 applied OK");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
