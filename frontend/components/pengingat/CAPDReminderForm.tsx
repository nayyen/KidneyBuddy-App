"use client";

/**
 * CAPDReminderForm.tsx — REMIND-05 CAPD exchange reminder form
 *
 * Fields (per UI-SPEC CAPDReminderForm fields table):
 *   nama, konsentrasiCapd (select), jamPengingat, hariAktif, catatanWaktu
 *
 * Only shown for users with metodeTerapiAktif === "CAPD".
 */

import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authFetch } from "@/lib/api";
import {
  createCapdFormSchema,
  type CreateCapdFormData,
  HARI_OPTIONS,
  CAPD_KONSENTRASI_OPTIONS,
} from "@/lib/validators/reminder.schema";

interface CAPDReminderFormProps {
  accessToken: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CAPDReminderForm({
  accessToken,
  onSuccess,
  onCancel,
}: CAPDReminderFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateCapdFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createCapdFormSchema) as any,
    defaultValues: {
      jenis: "capd",
      hariAktif: [],
    },
  });

  const watchedHariAktif = watch("hariAktif") ?? [];

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

  const onSubmit: SubmitHandler<CreateCapdFormData> = async (data) => {
    await authFetch("/api/reminders", accessToken, {
      method: "POST",
      body: JSON.stringify({
        ...data,
        jenis: "capd",
      }),
    });
    reset();
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
      {/* ── Nama Pengingat Terapi ── */}
      <div>
        <label
          htmlFor="capd-nama"
          className="block font-sans font-medium mb-1"
          style={{ fontSize: 12, color: "#1a2e2c" }}
        >
          Nama Pengingat Terapi
        </label>
        <input
          {...register("nama")}
          id="capd-nama"
          placeholder="mis: Exchange CAPD pagi"
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

      {/* ── Konsentrasi Cairan ── */}
      <div>
        <label
          htmlFor="capd-konsentrasi"
          className="block font-sans font-medium mb-1"
          style={{ fontSize: 12, color: "#1a2e2c" }}
        >
          Konsentrasi Cairan
        </label>
        <select
          {...register("konsentrasiCapd")}
          id="capd-konsentrasi"
          className="w-full rounded-[10px] border bg-white px-4 py-2.5 font-sans focus:outline-none"
          style={{
            fontSize: 12,
            color: "#1a2e2c",
            border: errors.konsentrasiCapd
              ? "1px solid #d4183d"
              : "0.5px solid #cfe8e4",
          }}
        >
          <option value="">Pilih konsentrasi</option>
          {CAPD_KONSENTRASI_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.konsentrasiCapd && (
          <p className="mt-1 font-sans" style={{ fontSize: 13, color: "#d4183d" }}>
            {errors.konsentrasiCapd.message}
          </p>
        )}
      </div>

      {/* ── Jam Pengingat ── */}
      <div>
        <label
          htmlFor="capd-jam"
          className="block font-sans font-medium mb-1"
          style={{ fontSize: 12, color: "#1a2e2c" }}
        >
          Jam Pengingat
        </label>
        <input
          {...register("jamPengingat")}
          id="capd-jam"
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
          <p className="mt-0.5 font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>
            Waktu WIB (Waktu Indonesia Barat)
          </p>
        {errors.jamPengingat && (
          <p className="mt-1 font-sans" style={{ fontSize: 13, color: "#d4183d" }}>
            {errors.jamPengingat.message}
          </p>
        )}
      </div>

      {/* ── Hari Aktif ── */}
      <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-sans font-medium" style={{ fontSize: 12, color: "#1a2e2c" }}>
              Hari Aktif
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setValue("hariAktif", HARI_OPTIONS.map((h) => h.value), { shouldValidate: true })}
                className="font-sans font-medium"
                style={{ fontSize: 12, color: "#0d4a44", border: "none", background: "transparent", cursor: "pointer", textDecoration: "underline" }}
              >
                Pilih Semua
              </button>
              <button
                type="button"
                onClick={() => setValue("hariAktif", [], { shouldValidate: true })}
                className="font-sans font-medium"
                style={{ fontSize: 12, color: "#3d6b66", border: "none", background: "transparent", cursor: "pointer", textDecoration: "underline" }}
              >
                Hapus Semua
              </button>
            </div>
          </div>
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
        {errors.hariAktif && (
          <p className="mt-1 font-sans" style={{ fontSize: 13, color: "#d4183d" }}>
            {errors.hariAktif.message}
          </p>
        )}
      </div>

      {/* ── Catatan Waktu (optional) ── */}
      <div>
        <label
          htmlFor="capd-catatan"
          className="block font-sans font-medium mb-1"
          style={{ fontSize: 12, color: "#1a2e2c" }}
        >
          Catatan Waktu{" "}
          <span style={{ color: "#3d6b66", fontWeight: 400 }}>(opsional)</span>
        </label>
        <input
          {...register("catatanWaktu")}
          id="capd-catatan"
          placeholder="mis: Setelah makan malam"
          className="w-full rounded-[10px] border bg-white px-4 py-2.5 font-sans focus:outline-none"
          style={{
            fontSize: 12,
            color: "#1a2e2c",
            border: "0.5px solid #cfe8e4",
          }}
        />
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
