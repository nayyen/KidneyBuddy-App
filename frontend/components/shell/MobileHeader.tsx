"use client";

import { Bell } from "lucide-react";

interface MobileHeaderProps {
  onNotificationClick?: () => void;
}

export default function MobileHeader({ onNotificationClick }: MobileHeaderProps) {
  return (
    <header
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

      {/* Bell notification button */}
      <button
        onClick={onNotificationClick}
        aria-label="Notifikasi"
        className="flex items-center justify-center cursor-pointer rounded-full hover:bg-secondary transition-colors"
        style={{ width: 44, height: 44 }}
      >
        <Bell size={20} color="#1a2e2c" strokeWidth={1.5} />
      </button>
    </header>
  );
}
