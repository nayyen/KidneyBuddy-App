"use client";

/**
 * HDReminderForm.tsx — REMIND-06 HD dialysis schedule form
 *
 * Fields (per UI-SPEC HDReminderForm fields table):
 *   nama, jamPengingat, hariAktif (day(s) of week), catatanWaktu
 *
 * Only shown for users with metodeTerapiAktif === "HD".
 */

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authFetch } from "@/lib/api";
import {
  createHdFormSchema,
  type CreateHdFormData,
  HARI_OPTIONS,
} from "@/lib/validators/reminder.schema";

interface HDReminderFormProps {
  accessToken: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function HDReminderForm({
  accessToken,
  onSuccess,
  onCancel,
}: HDReminderFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateHdFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createHdFormSchema) as any,
    defaultValues: {
      jenis: "hd",
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

  const onSubmit: SubmitHandler<CreateHdFormData> = async (data) => {
    await authFetch("/api/reminders", accessToken, {
      method: "POST",
      body: JSON.stringify({
        ...data,
        jenis: "hd",
      }),
    });
    reset();
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-4">
      {/* ── Nama Jadwal HD ── */}
      <div>
        <label
          htmlFor="hd-nama"
          className="block font-sans font-medium mb-1"
          style={{ fontSize: 12, color: "#1a2e2c" }}
        >
          Nama Jadwal HD
        </label>
        <input
          {...register("nama")}
          id="hd-nama"
          placeholder="mis: Sesi Hemodialisis Senin"
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

      {/* ── Jam Pengingat ── */}
      <div>
        <label
          htmlFor="hd-jam"
          className="block font-sans font-medium mb-1"
          style={{ fontSize: 12, color: "#1a2e2c" }}
        >
          Jam Pengingat
        </label>
        <input
          {...register("jamPengingat")}
          id="hd-jam"
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

      {/* ── Hari Dialisis ── */}
      <div>
        <label
          className="block font-sans font-medium mb-2"
          style={{ fontSize: 12, color: "#1a2e2c" }}
        >
          Hari Dialisis
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
                  backgroundColor: isChecked ? "#ef9f27" : "#fdf3e3",
                  color: isChecked ? "#ffffff" : "#7a4c0a",
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

      {/* ── Catatan (optional) ── */}
      <div>
        <label
          htmlFor="hd-catatan"
          className="block font-sans font-medium mb-1"
          style={{ fontSize: 12, color: "#1a2e2c" }}
        >
          Catatan{" "}
          <span style={{ color: "#7a8c8a", fontWeight: 400 }}>(opsional)</span>
        </label>
        <input
          {...register("catatanWaktu")}
          id="hd-catatan"
          placeholder="mis: Klinik Ginjal RS Harapan"
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
            backgroundColor: "#ef9f27",
            color: "#ffffff",
            border: "none",
            cursor: isSubmitting ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting ? "Menyimpan..." : "Simpan Jadwal HD"}
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
