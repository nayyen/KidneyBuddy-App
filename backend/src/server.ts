import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { app } from "./app.js";
import { startScheduler } from "./jobs/scheduler.js";
import { db } from "./lib/db.js";

const PORT = parseInt(process.env.PORT ?? "4000", 10);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("[startup] Running database migrations…");
  await migrate(db, {
    migrationsFolder: path.join(__dirname, "db/migrations"),
  });
  console.log("[startup] Migrations complete.");

  app.listen(PORT, () => {
    console.log(`KidneyBuddy backend listening on port ${PORT}`);
    startScheduler();
  });
}

main().catch((err) => {
  console.error("[startup] Failed:", err);
  process.exit(1);
});
