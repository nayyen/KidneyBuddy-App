/**
 * upload.ts — multer diskStorage configuration for medication photo uploads.
 *
 * T-02-05-01: limits to 10MB and only image/jpeg or image/png.
 * Storage path: <project-root>/uploads/medication-photos/.
 *
 * quick-260706-573 task 2: the default UPLOAD_DIR used to be hardcoded to the
 * absolute Docker path `/app/uploads/medication-photos`, which only resolves
 * correctly when running inside the Docker container (where the app's cwd IS
 * `/app`). app.ts's static file server, however, derives its serve directory
 * relative to __dirname (`path.join(__dirname, "../uploads")`), which resolves
 * to <project-root>/uploads whether running via `npm run dev` locally (tsx
 * from src/) or inside Docker (tsx from /app/src/ — see Dockerfile CMD). The
 * two only agreed by coincidence inside Docker; running the backend locally
 * without Docker (`npm run dev`) made multer write to a nonexistent host path
 * while the static server looked in the project's own uploads/ dir, so photos
 * silently never rendered. Deriving UPLOAD_DIR the same way app.ts derives its
 * static-serve path keeps both in agreement in every environment.
 */
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// src/lib -> ../.. -> project root -> uploads/medication-photos
// (mirrors app.ts's `path.join(__dirname, "../uploads")` from src/)
const DEFAULT_UPLOAD_DIR = path.join(__dirname, "../../uploads/medication-photos");

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? DEFAULT_UPLOAD_DIR;

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
