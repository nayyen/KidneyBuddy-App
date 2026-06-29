import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { medicationPhotoUpload } from "../lib/upload.js";
import * as remindersController from "../controllers/reminders.controller.js";

const router = Router();

// All reminder routes require authentication
router.use(authenticate);

// POST / — Create a new reminder (with optional foto_obat upload)
router.post(
  "/",
  medicationPhotoUpload.single("foto_obat"),
  remindersController.createReminder,
);

// GET / — List all reminders for the authenticated user
router.get("/", remindersController.listReminders);

// GET /next — Next upcoming reminder (for D-04 PengingatBerikutnyaCard)
router.get("/next", remindersController.getNextUpcoming);

// PATCH /:id — Update a reminder (optionally replace photo)
router.patch(
  "/:id",
  medicationPhotoUpload.single("foto_obat"),
  remindersController.updateReminder,
);

// DELETE /:id — Remove a reminder (ownership enforced in service)
router.delete("/:id", remindersController.deleteReminder);

export default router;
