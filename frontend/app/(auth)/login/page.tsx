"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validators/auth.schema";
import { useAuth } from "@/lib/hooks/useAuth";
import { ApiError } from "@/lib/api";
import LockoutCountdown from "./_components/LockoutCountdown";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoginLoading, loginError, lockedUntil, setLockoutFromResponse } = useAuth();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    try {
      const result = await login(data);
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 423 && err.extra?.lockedUntil) {
          setLockoutFromResponse(err.extra.lockedUntil as string);
        } else if (err.code === "INVALID_CREDENTIALS") {
          setError("root", { message: err.message });
        } else {
          setError("root", {
            message: err.message ?? "Terjadi kesalahan. Silakan coba lagi.",
          });
        }
      }
    }
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-extrabold text-foreground">
            Masuk
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-sans">
            Selamat datang kembali! Masuk ke akun Anda
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-card rounded-[14px] p-6 shadow-sm border border-border space-y-4"
        >
          {/* Root error */}
          {errors.root && (
            <div
              role="alert"
              className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3"
            >
              <p className="text-sm font-medium text-destructive font-sans">
                {errors.root.message}
              </p>
            </div>
          )}

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium font-sans text-foreground mb-1"
            >
              Email
            </label>
            <input
              {...register("email")}
              id="email"
              type="email"
              autoComplete="email"
              disabled={!!lockedUntil && lockedUntil.getTime() > Date.now()}
              className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
            <label
              htmlFor="password"
              className="block text-sm font-medium font-sans text-foreground mb-1"
            >
              Password
            </label>
            <input
              {...register("password")}
              id="password"
              type="password"
              autoComplete="current-password"
              disabled={!!lockedUntil && lockedUntil.getTime() > Date.now()}
              className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Masukkan password"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive font-sans">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Lupa password */}
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline font-sans"
            >
              Lupa password?
            </Link>
          </div>

          {/* Lockout countdown */}
          {lockedUntil && lockedUntil.getTime() > Date.now() && (
            <LockoutCountdown lockedUntil={lockedUntil} />
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoginLoading || (!!lockedUntil && lockedUntil.getTime() > Date.now())}
            className="w-full rounded-[10px] bg-primary px-4 py-2.5 text-sm font-semibold font-sans text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoginLoading ? "Memproses..." : "Masuk"}
          </button>

          {/* Register link */}
          <p className="text-center text-sm text-muted-foreground font-sans">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="text-primary font-medium hover:underline"
            >
              Daftar di sini
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
