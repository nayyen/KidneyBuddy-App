"use client";

/**
 * MulaiKegiatanForm.tsx — Form to start a new daily activity
 *
 * Fields: namaKegiatan (text), estimasiSelesai (HH:mm time picker)
 * Calls POST /api/activities on submit.
 *
 * Pattern: follows CatatCairanForm.tsx — authFetch, loading state, error toast, onSuccess callback.
 */

import { useState } from "react";
import { authFetch, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface MulaiKegiatanFormProps {
  accessToken: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

/**
 * Default the time picker to 30 minutes from now, in the browser's own
 * local timezone (quick-260705-9n4 task 8) — a sensible starting point the
 * user can adjust, rather than forcing them to pick a time from scratch.
 */
function defaultEstimasiSelesaiJam(): string {
  const d = new Date(Date.now() + 30 * 60 * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function MulaiKegiatanForm({
  accessToken,
  onSuccess,
  onClose,
}: MulaiKegiatanFormProps) {
  const [namaKegiatan, setNamaKegiatan] = useState("");
  // B5 (quick-260705-9n4 task 8): collects a wall-clock FINISH TIME
  // ("Estimasi Selesai Jam", e.g. "17:00") instead of a duration in minutes —
  // matches the backend's estimasiSelesaiJam contract, which builds the
  // absolute finish timestamp for today in the user's own local timezone
  // (backend resolves the user's stored IANA timezone from task 2).
  const [estimasiSelesaiJam, setEstimasiSelesaiJam] = useState(defaultEstimasiSelesaiJam);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!namaKegiatan.trim()) {
      toast("Nama kegiatan tidak boleh kosong", { duration: 2000 });
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(estimasiSelesaiJam)) {
      toast("Pilih jam estimasi selesai", { duration: 2000 });
      return;
    }

    setIsSubmitting(true);
    try {
      await authFetch("/api/activities", accessToken, {
        method: "POST",
        body: JSON.stringify({
          namaKegiatan: namaKegiatan.trim(),
          estimasiSelesaiJam,
        }),
      });

      toast("Kegiatan dimulai!", { duration: 2000 });
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError) {
        toast(err.message, { duration: 3000 });
      } else {
        toast("Gagal memulai kegiatan. Coba lagi.", { duration: 3000 });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nama kegiatan */}
      <div className="space-y-1.5">
        <label
          htmlFor="namaKegiatan"
          className="font-sans font-medium"
          style={{ fontSize: 13, color: "#1a2e2c" }}
        >
          Nama Kegiatan
        </label>
        <input
          id="namaKegiatan"
          type="text"
          placeholder="Contoh: Jalan pagi, Senam, Minum obat..."
          value={namaKegiatan}
          onChange={(e) => setNamaKegiatan(e.target.value)}
          maxLength={100}
          disabled={isSubmitting}
          className="w-full font-sans rounded-xl border px-4 py-3 outline-none transition-colors"
          style={{
            fontSize: 14,
            borderColor: "#d0e8e4",
            backgroundColor: "#fafdfc",
            color: "#1a2e2c",
          }}
          autoFocus
        />
      </div>

      {/* Estimasi Selesai Jam */}
      <div className="space-y-1.5">
        <label
          htmlFor="estimasiSelesaiJam"
          className="font-sans font-medium"
          style={{ fontSize: 13, color: "#1a2e2c" }}
        >
          Estimasi Selesai Jam
        </label>
        <input
          id="estimasiSelesaiJam"
          type="time"
          value={estimasiSelesaiJam}
          onChange={(e) => setEstimasiSelesaiJam(e.target.value)}
          disabled={isSubmitting}
          className="w-full font-sans rounded-xl border px-4 py-3 outline-none transition-colors"
          style={{
            fontSize: 14,
            borderColor: "#d0e8e4",
            backgroundColor: "#fafdfc",
            color: "#1a2e2c",
          }}
        />
        <p className="font-sans" style={{ fontSize: 13, color: "#3d6b66" }}>
          Pilih perkiraan jam kegiatan ini selesai.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="flex-1 font-sans font-medium rounded-xl py-3 cursor-pointer active:scale-[0.98] transition-transform"
          style={{
            fontSize: 14,
            backgroundColor: "#f0faf9",
            color: "#1a2e2c",
            border: "1px solid #d0e8e4",
          }}
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 font-sans font-medium rounded-xl py-3 cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-60"
          style={{
            fontSize: 14,
            backgroundColor: "#2a9d8f",
            color: "#ffffff",
            border: "none",
          }}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Menyimpan...
            </span>
          ) : (
            "Mulai"
          )}
        </button>
      </div>
    </form>
  );
}
