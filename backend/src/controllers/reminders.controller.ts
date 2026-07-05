/**
 * reminders.controller.ts — Thin Express controller for /api/reminders.
 * Business logic lives in reminders.service.ts.
 */
import type { Request, Response, NextFunction } from "express";
import * as remindersService from "../services/reminders.service.js";
import { sendToAllDevices } from "../services/notification.service.js";

export async function createReminder(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // multer sets req.file when a photo was uploaded
    const fotoObat = req.file ? `/uploads/medication-photos/${req.file.filename}` : null;
    const payload = { ...req.body, fotoObat };

    const reminder = await remindersService.createReminder(req.user!.id, payload);
    res.status(201).json(reminder);
  } catch (err) {
    next(err);
  }
}

export async function listReminders(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const reminders = await remindersService.listReminders(req.user!.id);
    res.json(reminders);
  } catch (err) {
    next(err);
  }
}

export async function getNextUpcoming(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const next_ = await remindersService.getNextUpcoming(req.user!.id);
    res.json(next_);
  } catch (err) {
    next(err);
  }
}

export async function updateReminder(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = String(req.params.id);
    // quick-260706-573 task 3: a new upload always wins; otherwise, an
    // explicit hapusFoto="true" flag (sent by the edit form's "Hapus Foto"
    // button when no replacement file was chosen) clears the existing photo.
    let fotoObat: string | null | undefined;
    if (req.file) {
      fotoObat = `/uploads/medication-photos/${req.file.filename}`;
    } else if (req.body.hapusFoto === "true") {
      fotoObat = null;
    }
    // Strip hapusFoto before spreading req.body — it's a form-only signal,
    // not a reminder_schedule column, and must not leak into the DB update.
    const { hapusFoto: _hapusFoto, ...body } = req.body;
    const data = { ...body, ...(fotoObat !== undefined && { fotoObat }) };

    const updated = await remindersService.updateReminder(req.user!.id, id, data);

    // CAREGIVER-02: fire-and-forget push to all devices
    sendToAllDevices(req.user!.id, {
      title: "Pengingat Diperbarui",
      body: "Jadwal pengingat telah diperbarui dari perangkat lain.",
    }).catch(() => {});

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteReminder(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const id = String(req.params.id);
    await remindersService.removeReminder(req.user!.id, id);
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
}
