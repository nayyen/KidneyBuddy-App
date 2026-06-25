import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";

export const app = express();

// --- Middleware ---
app.use(
  cors({
    origin: process.env.NODE_ENV === "production"
      ? ["https://kidneybuddy.vercel.app"]
      : ["http://localhost:3000"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// --- Routes ---
app.use("/api/auth", authRoutes);

// --- Health check ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// --- Error handler (must be last) ---
app.use(errorHandler);
