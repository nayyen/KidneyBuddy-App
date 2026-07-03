"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUnreadAnomalyCount } from "@/lib/hooks/useUnreadAnomalyCount";

interface TopBarProps {
  onNotificationClick?: () => void;
}

export default function TopBar({ onNotificationClick }: TopBarProps) {
  const pathname = usePathname();
  const { user, accessToken } = useAuth();
  const unreadCount = useUnreadAnomalyCount(accessToken);

  // Derive page title from NAV_ITEMS based on current pathname
  const currentNav = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  const pageTitle = currentNav?.label ?? "KidneyBuddy";

  // Get initials from user name
  const initials = user?.namaLengkap
    ? user.namaLengkap
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase() ?? "")
        .join("")
    : "?";

  return (
    <header
      data-print-hidden="true"
      className="hidden lg:flex items-center justify-between w-full bg-white/80 backdrop-blur-sm shrink-0"
      style={{
        height: 56,
        paddingLeft: 24,
        paddingRight: 24,
        borderBottom: "0.5px solid #f0faf9",
        position: "fixed",
        top: 0,
        left: 256,
        right: 0,
        zIndex: 20,
      }}
    >
      {/* Page title */}
      <h1
        className="font-heading font-bold"
        style={{ fontSize: 14, color: "#1a2e2c" }}
      >
        {pageTitle}
      </h1>

      {/* Right controls: Bell + Avatar */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNotificationClick}
          aria-label="Notifikasi"
          className="relative flex items-center justify-center cursor-pointer rounded-full hover:bg-secondary transition-colors"
          style={{ width: 32, height: 32 }}
        >
          <Bell size={18} color="#1a2e2c" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#ef9f27",
                transform: "translate(25%, -25%)",
              }}
            />
          )}
        </button>

        {/* User avatar with initials fallback */}
        <div
          className="flex items-center justify-center rounded-full font-sans font-medium text-white"
          style={{
            width: 32,
            height: 32,
            backgroundColor: "#2a9d8f",
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
