"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validators/auth.schema";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordFormData) {
    setIsLoading(true);
    setError(null);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setSubmitted(true);
    } catch (err: any) {
      // Always show generic success — no enumeration leak
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="bg-card rounded-[14px] p-6 shadow-sm border border-border">
            <h1 className="font-heading text-xl font-bold text-foreground mb-2">
              Cek Email Kamu
            </h1>
            <p className="text-sm text-muted-foreground font-sans">
              Jika email terdaftar, tautan reset password sudah dikirim. Silakan cek kotak masuk email kamu.
            </p>
          </div>
          <p className="mt-6 text-sm text-muted-foreground font-sans">
            <Link href="/login" className="text-primary font-medium hover:underline">
              Kembali ke halaman masuk
            </Link>
          </p>
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
            Lupa Password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-sans">
            Masukkan email kamu, kami akan kirim tautan untuk atur ulang password
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
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium font-sans text-foreground mb-1">
              Email
            </label>
            <input
              {...register("email")}
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Masukkan email"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive font-sans">{errors.email.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-[10px] bg-primary px-4 py-2.5 text-sm font-semibold font-sans text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Mengirim..." : "Kirim Tautan Reset"}
          </button>

          <p className="text-center text-sm text-muted-foreground font-sans">
            <Link href="/login" className="text-primary font-medium hover:underline">
              Kembali ke halaman masuk
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
