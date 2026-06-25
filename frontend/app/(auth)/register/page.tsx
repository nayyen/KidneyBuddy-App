"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormData } from "@/lib/validators/auth.schema";
import { apiFetch } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterFormData) {
    try {
      const result = await apiFetch<{ email: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
      router.push(`/dashboard?email=${encodeURIComponent(result.email)}`);
    } catch (err: any) {
      if (err?.code === "EMAIL_EXISTS") {
        setError("email", { message: "Email sudah terdaftar" });
      } else {
        setError("root", {
          message: err?.message ?? "Terjadi kesalahan. Silakan coba lagi.",
        });
      }
    }
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-extrabold text-foreground">
            Daftar Akun
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-sans">
            Mulai pantau kesehatan ginjal Anda
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-card rounded-[14px] p-6 shadow-sm border border-border space-y-4"
        >
          {/* Nama Lengkap */}
          <div>
            <label className="block text-sm font-medium font-sans text-foreground mb-1">
              Nama Lengkap
            </label>
            <input
              {...register("namaLengkap")}
              className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Masukkan nama lengkap"
            />
            {errors.namaLengkap && (
              <p className="mt-1 text-xs text-destructive font-sans">
                {errors.namaLengkap.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium font-sans text-foreground mb-1">
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Masukkan email"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive font-sans">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium font-sans text-foreground mb-1">
              Password
            </label>
            <input
              {...register("password")}
              type="password"
              className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Minimal 8 karakter"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive font-sans">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Konfirmasi Password */}
          <div>
            <label className="block text-sm font-medium font-sans text-foreground mb-1">
              Konfirmasi Password
            </label>
            <input
              {...register("konfirmasiPassword")}
              type="password"
              className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ulangi password"
            />
            {errors.konfirmasiPassword && (
              <p className="mt-1 text-xs text-destructive font-sans">
                {errors.konfirmasiPassword.message}
              </p>
            )}
          </div>

          {/* Nomor Telepon */}
          <div>
            <label className="block text-sm font-medium font-sans text-foreground mb-1">
              Nomor Telepon
            </label>
            <input
              {...register("nomorTelepon")}
              type="tel"
              className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="08xxxxxxxxxx"
            />
            {errors.nomorTelepon && (
              <p className="mt-1 text-xs text-destructive font-sans">
                {errors.nomorTelepon.message}
              </p>
            )}
          </div>

          {/* Tanggal Lahir */}
          <div>
            <label className="block text-sm font-medium font-sans text-foreground mb-1">
              Tanggal Lahir
            </label>
            <input
              {...register("tanggalLahir")}
              type="date"
              className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.tanggalLahir && (
              <p className="mt-1 text-xs text-destructive font-sans">
                {errors.tanggalLahir.message}
              </p>
            )}
          </div>

          {/* Root error */}
          {errors.root && (
            <div className="rounded-[10px] bg-destructive/10 p-3">
              <p className="text-xs text-destructive font-sans">
                {errors.root.message}
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-primary py-3 text-sm font-semibold font-sans text-primary-foreground hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Mendaftarkan..." : "Daftar"}
          </button>

          {/* Login link */}
          <p className="text-center text-xs text-muted-foreground font-sans">
            Sudah punya akun?{" "}
            <a href="/login" className="text-primary font-medium hover:underline">
              Masuk
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}
