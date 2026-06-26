import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import onboardingRoutes from "./routes/onboarding.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import pushRoutes from "./routes/push.routes.js";

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
app.use(cookieParser());

// helmet must come AFTER cors/cookieParser and BEFORE route registration
// Sets Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, etc.
app.use(helmet());

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/push", pushRoutes);

// --- Health check ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// --- Error handler (must be last) ---
app.use(errorHandler);
