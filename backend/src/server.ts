import "dotenv/config";
import { app } from "./app.js";
import { startScheduler } from "./jobs/scheduler.js";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

app.listen(PORT, () => {
  console.log(`KidneyBuddy backend listening on port ${PORT}`);
  startScheduler();
});
