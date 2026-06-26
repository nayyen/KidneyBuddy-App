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
import { useRef } from "react";
import { authFetch } from "@/lib/api";
import {
  createObatFormSchema,
  type CreateObatFormData,
  HARI_OPTIONS,
} from "@/lib/validators/reminder.schema";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface MedicationReminderFormProps {
  accessToken: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function MedicationReminderForm({
  accessToken,
  onSuccess,
  onCancel,
}: MedicationReminderFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateObatFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createObatFormSchema) as any,
    defaultValues: {
      jenis: "obat",
      jenisObat: "minum",
      hariAktif: [],
    },
  });

  const watchedJenisObat = watch("jenisObat");
  const watchedHariAktif = watch("hariAktif") ?? [];
  const watchedFotoObat = watch("fotoObat");

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

  const onSubmit: SubmitHandler<CreateObatFormData> = async (data) => {
    // Build multipart FormData — multer expects foto_obat field
    const fd = new FormData();
    fd.append("jenis", "obat");
    fd.append("nama", data.nama);
    fd.append("dosis", data.dosis);
    fd.append("jenisObat", data.jenisObat);
    if (data.catatanWaktu) fd.append("catatanWaktu", data.catatanWaktu);
    // hariAktif is an array — append each item separately (backend reads req.body.hariAktif)
    data.hariAktif.forEach((day) => fd.append("hariAktif[]", day));
    fd.append("jamPengingat", data.jamPengingat);
    if (data.fotoObat instanceof File) {
      fd.append("foto_obat", data.fotoObat);
    }

    // Use native fetch for multipart (authFetch sets Content-Type: application/json)
    const res = await fetch(`${API_BASE}/api/reminders`, {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: fd,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.error?.message ?? `Gagal menyimpan pengingat (${res.status})`;
      throw new Error(msg);
    }

    reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-4">
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
          <p className="mt-1 font-sans" style={{ fontSize: 10, color: "#d4183d" }}>
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
          <p className="mt-1 font-sans" style={{ fontSize: 10, color: "#d4183d" }}>
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
          <p className="mt-1 font-sans" style={{ fontSize: 10, color: "#d4183d" }}>
            {errors.jenisObat.message}
          </p>
        )}
      </div>

      {/* ── Catatan Waktu (optional) ── */}
      <div>
        <label
          htmlFor="rem-catatan"
          className="block font-sans font-medium mb-1"
          style={{ fontSize: 12, color: "#1a2e2c" }}
        >
          Catatan Waktu{" "}
          <span style={{ color: "#7a8c8a", fontWeight: 400 }}>(opsional)</span>
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

      {/* ── Hari Aktif — 7-day checkbox row ── */}
      <div>
        <label
          className="block font-sans font-medium mb-2"
          style={{ fontSize: 12, color: "#1a2e2c" }}
        >
          Hari Aktif
        </label>
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
                  fontSize: 10,
                  backgroundColor: isChecked ? "#2a9d8f" : "#f0faf9",
                  color: isChecked ? "#ffffff" : "#7a8c8a",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {hari.label}
              </button>
            );
          })}
        </div>
        {errors.hariAktif && (
          <p className="mt-1 font-sans" style={{ fontSize: 10, color: "#d4183d" }}>
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
          <p className="mt-1 font-sans" style={{ fontSize: 10, color: "#d4183d" }}>
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
          <span style={{ color: "#7a8c8a", fontWeight: 400 }}>(opsional)</span>
        </label>
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
          <p className="mt-1 font-sans" style={{ fontSize: 10, color: "#7a8c8a" }}>
            {watchedFotoObat.name} ({(watchedFotoObat.size / 1024).toFixed(0)} KB)
          </p>
        )}
        {errors.fotoObat && (
          <p className="mt-1 font-sans" style={{ fontSize: 10, color: "#d4183d" }}>
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
              color: "#7a8c8a",
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
