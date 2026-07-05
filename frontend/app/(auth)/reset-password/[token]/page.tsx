"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/validators/auth.schema";
import { apiFetch, ApiError } from "@/lib/api";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  async function onSubmit(data: ResetPasswordFormData) {
    setIsLoading(true);
    setError(null);

    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, ...data }),
      });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "RESET_TOKEN_INVALID") {
        setError("Tautan reset tidak valid atau sudah kadaluarsa. Silakan minta tautan baru.");
      } else {
        setError(err instanceof ApiError ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="bg-card rounded-[14px] p-6 shadow-sm border border-border">
            <h1 className="font-heading text-xl font-bold text-foreground mb-2">
              Password Berhasil Diubah
            </h1>
            <p className="text-sm text-muted-foreground font-sans">
              Password kamu sudah diperbarui. Silakan login dengan password baru.
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-block rounded-[10px] bg-primary px-6 py-2.5 text-sm font-semibold font-sans text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              Masuk Sekarang
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-extrabold text-foreground">
            Atur Ulang Password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-sans">
            Masukkan password baru kamu
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-card rounded-[14px] p-6 shadow-sm border border-border space-y-4"
        >
          {error && (
            <div role="alert" className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-sm font-medium text-destructive font-sans">{error}</p>
              <p className="mt-2 text-sm">
                <Link href="/forgot-password" className="text-primary font-medium hover:underline">
                  Minta tautan baru
                </Link>
              </p>
            </div>
          )}

          {/* New Password */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium font-sans text-foreground mb-1">
              Password Baru
            </label>
            <div className="relative">
              <input
                {...register("newPassword")}
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 pr-11 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Minimal 8 karakter"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3d6b66] hover:text-primary"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-xs text-destructive font-sans">{errors.newPassword.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="konfirmasiPassword" className="block text-sm font-medium font-sans text-foreground mb-1">
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <input
                {...register("konfirmasiPassword")}
                id="konfirmasiPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 pr-11 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ulangi password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3d6b66] hover:text-primary"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.konfirmasiPassword && (
              <p className="mt-1 text-xs text-destructive font-sans">{errors.konfirmasiPassword.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-[10px] bg-primary px-4 py-2.5 text-sm font-semibold font-sans text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Menyimpan..." : "Simpan Password Baru"}
          </button>
        </form>
      </div>
    </main>
  );
}
