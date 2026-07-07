"use client";

/**
 * MedicationReminderForm.tsx — REMIND-01 medication reminder creation form
 *
 * Fields (per UI-SPEC MedicationReminderForm fields table):
 *   nama, dosis, jenisObat (Minum/Suntik pill toggle), catatanWaktu,
 *   hariAktif (7-day checkbox row), jamPengingat, fotoObat (optional file)
 *
 * Submits multipart/form-data to POST /api/reminders (multer expects foto_obat field).
 */

import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { authFetch } from "@/lib/api";
import { getCurrentPushEndpoint } from "@/lib/pushClient";
import {
  createObatFormSchema,
  type CreateObatFormData,
  HARI_OPTIONS,
} from "@/lib/validators/reminder.schema";
import type { Reminder } from "./ReminderItem";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface MedicationReminderFormProps {
  accessToken: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Reminder | null;
}

export default function MedicationReminderForm({
  accessToken,
  onSuccess,
  onCancel,
  initialData,
}: MedicationReminderFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditMode = !!initialData;
  // quick-260706-573 task 3: tracks whether the user explicitly removed the
  // already-uploaded photo in edit mode (mirrors UploadFileForm.tsx's
  // preview/remove pattern). While false and no new File has been chosen,
  // the existing photo (if any) is shown; once true, the file input reappears.
  const [removedExistingFoto, setRemovedExistingFoto] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateObatFormData>({
    resolver: zodResolver(createObatFormSchema) as any,
    defaultValues: isEditMode
      ? {
          jenis: 'obat',
          nama: initialData.nama,
          dosis: initialData.dosis ?? "",
          jenisObat: initialData.jenisObat as "minum" | "suntik" ?? "minum",
          hariAktif: initialData.hariAktif,
          jamPengingat: initialData.jamPengingat,
          catatanWaktu: initialData.catatanWaktu ?? "",
          fotoObat: null, // Can't pre-fill file input, but `fotoObat` string exists on initialData
        }
      : {
          jenis: "obat",
          jenisObat: "minum",
          hariAktif: [],
        },
  });

  const watchedJenisObat = watch("jenisObat");
  const watchedHariAktif = watch("hariAktif") ?? [];
  const watchedFotoObat = watch("fotoObat");

  // Show the already-uploaded photo (edit mode only) as long as it hasn't
  // been explicitly removed and no new replacement File has been chosen yet.
  const hasExistingPhoto =
    isEditMode &&
    !!initialData?.fotoObat &&
    !removedExistingFoto &&
    !(watchedFotoObat instanceof File);

  const toggleHari = (day: string) => {
    const current = watchedHariAktif;
    if (current.includes(day)) {
      setValue("hariAktif", current.filter((d) => d !== day), {
        shouldValidate: true,
      });
    } else {
      setValue("hariAktif", [...current, day], { shouldValidate: true });
    }
  };

  const toggleAllHari = () => {
    const allSelected = watchedHariAktif.length === HARI_OPTIONS.length;
    if (allSelected) {
      setValue("hariAktif", [], { shouldValidate: true });
    } else {
      setValue("hariAktif", HARI_OPTIONS.map(h => h.value), { shouldValidate: true });
    }
  };

  const onSubmit: SubmitHandler<CreateObatFormData> = async (data) => {
    try {
      const fd = new FormData();
      // Always include all fields the backend expects
      fd.append("jenis", "obat");
      fd.append("nama", data.nama);
      fd.append("dosis", data.dosis);
      fd.append("jenisObat", data.jenisObat);
      if (data.catatanWaktu) fd.append("catatanWaktu", data.catatanWaktu);

      if (data.hariAktif.length === 0) {
        toast.error("Pilih minimal satu hari aktif.");
        return;
      }
      data.hariAktif.forEach((day) => fd.append("hariAktif", day));

      fd.append("jamPengingat", data.jamPengingat);
      if (data.fotoObat instanceof File) {
        fd.append("foto_obat", data.fotoObat);
      } else if (isEditMode && removedExistingFoto) {
        // User explicitly removed the existing photo and did not pick a
        // replacement — tell the backend to clear fotoObat.
        fd.append("hapusFoto", "true");
      }

      const url = isEditMode
        ? `${API_BASE}/api/reminders/${initialData.id}`
        : `${API_BASE}/api/reminders`;

      const method = isEditMode ? "PATCH" : "POST";

      // quick-260707-98x: only needed on update — identifies this device so
      // the backend excludes it from the cross-device "diperbarui" push.
      // Do NOT set Content-Type — FormData sets its own multipart boundary.
      const pushEndpoint = isEditMode ? await getCurrentPushEndpoint() : null;

      const res = await fetch(url, {
        method: method,
        credentials: "include",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(pushEndpoint && { "X-Push-Endpoint": pushEndpoint }),
        },
        body: fd,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.error?.message ?? `Gagal menyimpan pengingat (${res.status})`;
        toast.error(msg);
        return;
      }

      toast.success(`Pengingat berhasil ${isEditMode ? 'diperbarui' : 'disimpan'}`);
      if (!isEditMode) {
        reset();
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pengingat");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
      {/* ── Nama Obat ── */}
      <div>
        <label
          htmlFor="rem-nama"
          className="block font-sans font-medium mb-1"
          style={{ fontSize: 12, color: "#1a2e2c" }}
        >
          Nama Obat
        </label>
        <input
          {...register("nama")}
          id="rem-nama"
          placeholder="mis: Amlodipine"
          className="w-full rounded-[10px] border bg-white px-4 py-2.5 font-sans focus:outline-none"
          style={{
            fontSize: 12,
            color: "#1a2e2c",
            border: errors.nama ? "1px solid #d4183d" : "0.5px solid #cfe8e4",
          }}
        />
        {errors.nama && (
          <p className="mt-1 font-sans" style={{ fontSize: 13, color: "#d4183d" }}>
            {errors.nama.message}
          </p>
        )}
      </div>

      {/* ── Dosis ── */}
      <div>
        <label
          htmlFor="rem-dosis"
          className="block font-sans font-medium mb-1"
          style={{ fontSize: 12, color: "#1a2e2c" }}
        >
          Dosis
        </label>
        <input
          {...register("dosis")}
          id="rem-dosis"
          placeholder="mis: 1 tablet, 500mg"
          className="w-full rounded-[10px] border bg-white px-4 py-2.5 font-sans focus:outline-none"
          style={{
            fontSize: 12,
            color: "#1a2e2c",
            border: errors.dosis ? "1px solid #d4183d" : "0.5px solid #cfe8e4",
          }}
        />
        {errors.dosis && (
          <p className="mt-1 font-sans" style={{ fontSize: 13, color: "#d4183d" }}>
            {errors.dosis.message}
          </p>
        )}
      </div>

      {/* ── Cara Minum: Minum / Suntik pill toggle ── */}
      <div>
        <label
          className="block font-sans font-medium mb-2"
          style={{ fontSize: 12, color: "#1a2e2c" }}
        >
          Cara Minum
        </label>
        <Controller
          name="jenisObat"
          control={control}
          render={({ field }) => (
            <div className="flex gap-2">
              {(["minum", "suntik"] as const).map((jenis) => (
                <button
                  key={jenis}
                  type="button"
                  onClick={() => field.onChange(jenis)}
                  className="flex-1 font-sans font-medium transition-colors"
                  style={{
                    height: 40,
                    borderRadius: 20,
                    fontSize: 12,
                    backgroundColor:
                      field.value === jenis ? "#2a9d8f" : "#f0faf9",
                    color: field.value === jenis ? "#ffffff" : "#1a2e2c",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {jenis === "minum" ? "Minum" : "Suntik"}
                </button>
              ))}
            </div>
          )}
        />
        {errors.jenisObat && (
          <p className="mt-1 font-sans" style={{ fontSize: 13, color: "#d4183d" }}>
            {errors.jenisObat.message}
          </p>
        )}
      </div>

      {/* ── Catatan (optional) ── */}
      <div>
        <label
          htmlFor="rem-catatan"
          className="block font-sans font-medium mb-1"
          style={{ fontSize: 12, color: "#1a2e2c" }}
        >
          Catatan{" "}
          <span style={{ color: "#3d6b66", fontWeight: 400 }}>(opsional)</span>
        </label>
        <input
          {...register("catatanWaktu")}
          id="rem-catatan"
          placeholder="mis: 30 menit sebelum makan"
          className="w-full rounded-[10px] border bg-white px-4 py-2.5 font-sans focus:outline-none"
          style={{
            fontSize: 12,
            color: "#1a2e2c",
            border: "0.5px solid #cfe8e4",
          }}
        />
      </div>

      {/* ── Hari Aktif ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
            <label
              className="block font-sans font-medium"
              style={{ fontSize: 12, color: "#1a2e2c" }}
            >
              Hari Aktif
            </label>
            <button
              type="button"
              onClick={toggleAllHari}
              className="text-xs font-medium text-[#2a9d8f] hover:underline"
            >
              {watchedHariAktif.length === HARI_OPTIONS.length ? "Hapus Semua" : "Pilih Semua"}
            </button>
        </div>
        <Controller
          name="hariAktif"
          control={control}
          render={({ field: { onChange } }) => (
            <div className="flex gap-1.5 flex-wrap">
              {HARI_OPTIONS.map((hari) => {
                const isChecked = watchedHariAktif.includes(hari.value);
                return (
                  <button
                    key={hari.value}
                    type="button"
                    onClick={() => toggleHari(hari.value)}
                    className="font-sans font-medium transition-colors"
                    style={{
                      height: 32,
                      minWidth: 36,
                      paddingLeft: 8,
                      paddingRight: 8,
                      borderRadius: 8,
                      fontSize: 13,
                      backgroundColor: isChecked ? "#2a9d8f" : "#f0faf9",
                      color: isChecked ? "#ffffff" : "#3d6b66",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {hari.label}
                  </button>
                );
              })}
            </div>
          )}
        />
        {errors.hariAktif && (
          <p className="mt-1 font-sans" style={{ fontSize: 13, color: "#d4183d" }}>
            {errors.hariAktif.message}
          </p>
        )}
      </div>

      {/* ── Jam Pengingat ── */}
      <div>
        <label
          htmlFor="rem-jam"
          className="block font-sans font-medium mb-1"
          style={{ fontSize: 12, color: "#1a2e2c" }}
        >
          Jam Pengingat
        </label>
        <input
          {...register("jamPengingat")}
          id="rem-jam"
          type="time"
          className="w-full rounded-[10px] border bg-white px-4 py-2.5 font-sans focus:outline-none"
          style={{
            fontSize: 12,
            color: "#1a2e2c",
            border: errors.jamPengingat
              ? "1px solid #d4183d"
              : "0.5px solid #cfe8e4",
          }}
        />
        {errors.jamPengingat && (
          <p className="mt-1 font-sans" style={{ fontSize: 13, color: "#d4183d" }}>
            {errors.jamPengingat.message}
          </p>
        )}
      </div>

      {/* ── Foto Obat (optional file upload) ── */}
      <div>
        <label
          htmlFor="rem-foto"
          className="block font-sans font-medium mb-1"
          style={{ fontSize: 12, color: "#1a2e2c" }}
        >
          Foto Obat{" "}
          <span style={{ color: "#3d6b66", fontWeight: 400 }}>(opsional)</span>
        </label>
        {hasExistingPhoto ? (
          // State (a): existing photo, edit mode, not removed, no new file chosen.
          <div>
            <div className="relative w-full h-48 rounded-lg overflow-hidden bg-[#f0faf9]">
              <Image
                src={`${API_BASE}${initialData!.fotoObat}`}
                alt={`Foto obat untuk ${initialData!.nama}`}
                fill
                unoptimized
                style={{ objectFit: "cover" }}
              />
            </div>
            <button
              type="button"
              onClick={() => setRemovedExistingFoto(true)}
              className="mt-2 font-sans font-medium"
              style={{
                fontSize: 13,
                color: "#d4183d",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Hapus Foto
            </button>
          </div>
        ) : (
          // State (b): removed / create mode / a new File has been chosen.
          <>
            <Controller
              name="fotoObat"
              control={control}
              render={({ field: { onChange } }) => (
                <input
                  ref={fileInputRef}
                  id="rem-foto"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    onChange(file);
                  }}
                  className="w-full font-sans text-sm"
                  style={{ color: "#1a2e2c", fontSize: 12 }}
                />
              )}
            />
            {watchedFotoObat instanceof File && (
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="font-sans" style={{ fontSize: 13, color: "#3d6b66" }}>
                  {watchedFotoObat.name} ({(watchedFotoObat.size / 1024).toFixed(0)} KB)
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setValue("fotoObat", null, { shouldValidate: true });
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="font-sans font-medium flex-shrink-0"
                  style={{
                    fontSize: 12,
                    color: "#d4183d",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Hapus
                </button>
              </div>
            )}
          </>
        )}
        {errors.fotoObat && (
          <p className="mt-1 font-sans" style={{ fontSize: 13, color: "#d4183d" }}>
            {errors.fotoObat.message as string}
          </p>
        )}
      </div>

      {/* ── Submit ── */}
      <div className="space-y-2 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full font-sans font-medium transition-colors disabled:opacity-50"
          style={{
            height: 44,
            borderRadius: 20,
            fontSize: 14,
            backgroundColor: "#2a9d8f",
            color: "#ffffff",
            border: "none",
            cursor: isSubmitting ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting ? "Menyimpan..." : "Simpan Pengingat"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full font-sans font-medium transition-colors"
            style={{
              fontSize: 12,
              color: "#3d6b66",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
