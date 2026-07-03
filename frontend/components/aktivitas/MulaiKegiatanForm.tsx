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

export default function MulaiKegiatanForm({
  accessToken,
  onSuccess,
  onClose,
}: MulaiKegiatanFormProps) {
  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [estimasiMenit, setEstimasiMenit] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!namaKegiatan.trim()) {
      toast("Nama kegiatan tidak boleh kosong", { duration: 2000 });
      return;
    }
    const menit = parseInt(estimasiMenit, 10);
    if (isNaN(menit) || menit <= 0) {
      toast("Estimasi durasi harus angka lebih dari 0", { duration: 2000 });
      return;
    }

    setIsSubmitting(true);
    try {
      await authFetch("/api/activities", accessToken, {
        method: "POST",
        body: JSON.stringify({
          namaKegiatan: namaKegiatan.trim(),
          estimasiMenit: menit,
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

      {/* Estimasi Durasi */}
      <div className="space-y-1.5">
        <label
          htmlFor="estimasiMenit"
          className="font-sans font-medium"
          style={{ fontSize: 13, color: "#1a2e2c" }}
        >
          Estimasi Durasi (menit)
        </label>
        <input
          id="estimasiMenit"
          type="number"
          placeholder="Contoh: 30"
          value={estimasiMenit}
          onChange={(e) => setEstimasiMenit(e.target.value)}
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
          Masukkan perkiraan waktu dalam satuan menit.
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
