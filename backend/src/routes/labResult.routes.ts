/**
 * labResult.routes.ts — /api/lab route definitions
 *
 * ALL routes require authentication — lab data is sensitive health data (T-04-01).
 * Pattern: follows fluid.routes.ts with authenticate middleware on every route.
 */
import { Router } from "express";
import * as labResultController from "../controllers/labResult.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { labFileUpload } from "../lib/uploadLab.js";

const router = Router();

// POST /api/lab — create a new manual lab result entry
router.post("/", authenticate, labResultController.create);

// POST /api/lab/upload — upload a lab document file (PDF/JPG/PNG, LAB-05)
router.post(
  "/upload",
  authenticate,
  labFileUpload.single("file"),
  labResultController.upload,
);

// GET /api/lab/file/:fileId — serve an uploaded lab file (LAB-05)
router.get("/file/:fileId", labResultController.serveFile);

// GET /api/lab/trend?parameter=X&days=30 — trend data for chart (LAB-06)
router.get("/trend", authenticate, labResultController.getTrend);

// GET /api/lab — list lab results (?tanggal=YYYY-MM-DD&parameter=)
router.get("/", authenticate, labResultController.list);

// GET /api/lab/parameters — get distinct parameter names
router.get("/parameters", authenticate, labResultController.getParameters);

// GET /api/lab/archived — list archived lab results only
router.get("/archived", authenticate, labResultController.listArchived);

// PATCH /api/lab/:id/archive — archive (soft-delete) a lab result
router.patch("/:id/archive", authenticate, labResultController.archive);

// PATCH /api/lab/:id/restore — restore an archived lab result
router.patch("/:id/restore", authenticate, labResultController.restore);

// PUT /api/lab/:id — update a manual lab result entry
router.put("/:id", authenticate, labResultController.update);

export default router;
