import "dotenv/config";
import { app } from "./app.js";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

app.listen(PORT, () => {
  console.log(`KidneyBuddy backend listening on port ${PORT}`);
});
