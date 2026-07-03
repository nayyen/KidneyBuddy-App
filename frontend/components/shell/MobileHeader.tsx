"use client";

import { Bell } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUnreadAnomalyCount } from "@/lib/hooks/useUnreadAnomalyCount";

interface MobileHeaderProps {
  onNotificationClick?: () => void;
}

export default function MobileHeader({ onNotificationClick }: MobileHeaderProps = {}) {
  const { accessToken } = useAuth();
  const unreadCount = useUnreadAnomalyCount(accessToken);

  return (
    <header
      data-print-hidden="true"
      className="flex lg:hidden items-center justify-between w-full bg-white shrink-0"
      style={{
        height: 56,
        paddingLeft: 16,
        paddingRight: 16,
        borderBottom: "0.5px solid #f0faf9",
      }}
    >
      {/* App name */}
      <span
        className="font-heading font-bold"
        style={{ fontSize: 16, color: "#2a9d8f" }}
      >
        KidneyBuddy
      </span>

      {/* Notification bell — parity with TopBar, for mobile/tablet access
          to /notifikasi (D-09) */}
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
    </header>
  );
}
