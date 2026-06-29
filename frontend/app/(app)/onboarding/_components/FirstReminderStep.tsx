"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  firstReminderSchema,
  type FirstReminderFormData,
  reminderJenisLabels,
} from "@/lib/validators/onboarding.schema";

interface FirstReminderStepProps {
  onSubmit: (data: FirstReminderFormData) => Promise<void>;
  onSkip: () => Promise<void>;
  isSaving: boolean;
  isSkipping: boolean;
  onBack: () => void;
}

export default function FirstReminderStep({
  onSubmit,
  onSkip,
  isSaving,
  isSkipping,
  onBack,
}: FirstReminderStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FirstReminderFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(firstReminderSchema) as any,
    defaultValues: {
      jenis: "obat",
      nama: "",
      jamPengingat: "",
      catatanWaktu: "",
    },
  });

  const onFormSubmit: SubmitHandler<FirstReminderFormData> = (data) => onSubmit(data);

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      <div>
        <h2 className="font-heading text-lg font-bold text-foreground mb-1">
          Atur Pengingat Pertama
        </h2>
        <p className="text-sm text-muted-foreground font-sans">
          Kami akan bantu ingatkan jadwal terapi kamu. Isi minimal satu pengingat untuk memulai.
        </p>
      </div>

      {/* Nama */}
      <div>
        <label htmlFor="nama" className="block text-sm font-medium font-sans text-foreground mb-1">
          Nama Pengingat
        </label>
        <input
          {...register("nama")}
          id="nama"
          className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Contoh: Minum obat pagi"
        />
        {errors.nama && (
          <p className="mt-1 text-xs text-destructive font-sans">{errors.nama.message}</p>
        )}
      </div>

      {/* Jam */}
      <div>
        <label htmlFor="jamPengingat" className="block text-sm font-medium font-sans text-foreground mb-1">
          Jam
        </label>
        <input
          {...register("jamPengingat")}
          id="jamPengingat"
          type="time"
          className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {errors.jamPengingat && (
          <p className="mt-1 text-xs text-destructive font-sans">{errors.jamPengingat.message}</p>
        )}
      </div>

      {/* Jenis */}
      <div>
        <label htmlFor="jenis" className="block text-sm font-medium font-sans text-foreground mb-1">
          Jenis
        </label>
        <select
          {...register("jenis")}
          id="jenis"
          className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {Object.entries(reminderJenisLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.jenis && (
          <p className="mt-1 text-xs text-destructive font-sans">{errors.jenis.message}</p>
        )}
      </div>

      {/* Catatan waktu (optional) */}
      <div>
        <label htmlFor="catatanWaktu" className="block text-sm font-medium font-sans text-foreground mb-1">
          Catatan (opsional)
        </label>
        <input
          {...register("catatanWaktu")}
          id="catatanWaktu"
          className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Contoh: Setelah sarapan"
        />
      </div>

      {errors.root && (
        <p className="text-xs text-destructive font-sans">{errors.root.message}</p>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-[10px] bg-primary px-4 py-2.5 text-sm font-semibold font-sans text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? "Menyimpan..." : "Simpan & Lanjutkan"}
        </button>

        <button
          type="button"
          onClick={onSkip}
          disabled={isSkipping}
          className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground font-sans transition-colors disabled:opacity-50"
        >
          {isSkipping ? "..." : "Lewati untuk sekarang"}
        </button>
      </div>

      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-sans text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Kembali
      </button>
    </form>
  );
}
