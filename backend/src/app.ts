import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import multer from "multer";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import onboardingRoutes from "./routes/onboarding.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import pushRoutes from "./routes/push.routes.js";
import fluidRoutes from "./routes/fluid.routes.js";
import remindersRoutes from "./routes/reminders.routes.js";
import medicationLogRoutes from "./routes/medicationLog.routes.js";
import dialysisLogRoutes from "./routes/dialysisLog.routes.js";
import activitiesRoutes from "./routes/activities.routes.js";
import labResultRoutes from "./routes/labResult.routes.js";
import reportRoutes from "./routes/report.routes.js";

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
app.use("/api/fluid", fluidRoutes);
app.use("/api/reminders", remindersRoutes);
app.use("/api/medication-log", medicationLogRoutes);
app.use("/api/dialysis-log", dialysisLogRoutes);
app.use("/api/activities", activitiesRoutes);
app.use("/api/lab", labResultRoutes);
app.use("/api/report", reportRoutes);

// --- Health check ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// --- Multer error handler (before generic errorHandler) ---
// Converts multer-specific errors (LIMIT_FILE_SIZE, fileFilter rejection) to clean 400 responses.
// Must be placed AFTER route registration and BEFORE the generic errorHandler.
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    // Known multer error (e.g. file too large)
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        code: "FILE_TOO_LARGE",
        message: "Ukuran file tidak boleh melebihi 10MB",
      });
    }
    return res.status(400).json({ code: "UPLOAD_ERROR", message: err.message });
  }
  if (err?.message === "Hanya file JPEG atau PNG yang diizinkan") {
    // fileFilter rejection from upload.ts
    return res.status(400).json({
      code: "INVALID_FILE_TYPE",
      message: err.message,
    });
  }
  next(err);
});

// --- Error handler (must be last) ---
app.use(errorHandler);
