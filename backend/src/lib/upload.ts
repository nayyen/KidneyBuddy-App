/**
 * upload.ts — multer diskStorage configuration for medication photo uploads.
 *
 * T-02-05-01: limits to 10MB and only image/jpeg or image/png.
 * Storage path: /app/uploads/medication-photos/ (Docker volume mounted via docker-compose.yml).
 * In local dev the path resolves to the backend container's filesystem.
 */
import multer from "multer";
import path from "node:path";
import fs from "node:fs";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "/app/uploads/medication-photos";

// Ensure the upload directory exists (won't exist in dev without Docker volume)
try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
  // Fail silently — when running inside Docker the volume mount will provide this directory.
  // Outside Docker, multer will fail at upload time with a clear error.
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Unique filename: timestamp-randomHex-originalname (prevent collisions)
    const timestamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${timestamp}-${rand}${ext}`);
  },
});

/**
 * fileFilter — T-02-05-01: reject non-image/jpeg and non-image/png uploads.
 */
const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Reject with a typed error (caught by multer error middleware in app.ts)
    cb(new Error("Hanya file JPEG atau PNG yang diizinkan") as any, false);
  }
};

/**
 * medicationPhotoUpload — configured multer instance.
 * Use as `medicationPhotoUpload.single("foto_obat")` in reminders routes.
 */
export const medicationPhotoUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB (PRD 8.5)
  },
  fileFilter,
});

export default medicationPhotoUpload;
