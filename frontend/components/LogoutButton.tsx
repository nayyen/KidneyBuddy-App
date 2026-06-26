"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

export default function LogoutButton() {
  const router = useRouter();
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-[10px] border border-border bg-card px-4 py-2 text-sm font-medium font-sans text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
    >
      Keluar
    </button>
  );
}
