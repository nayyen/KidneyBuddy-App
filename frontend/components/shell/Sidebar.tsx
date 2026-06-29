"use client";

import { usePathname, useRouter } from "next/navigation";
import { Droplets, Play } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onCatatCairan?: () => void;
}

export default function Sidebar({ onCatatCairan }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside
      data-print-hidden="true"
      className="hidden lg:flex flex-col bg-white"
      style={{
        width: 256,
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        borderRight: "0.5px solid #f0faf9",
        zIndex: 30,
      }}
    >
      {/* Logo area */}
      <div
        className="flex items-center gap-2 shrink-0"
        style={{ height: 56, paddingLeft: 24, paddingRight: 24 }}
      >
        <Droplets size={20} color="#2a9d8f" />
        <span
          className="font-heading font-bold"
          style={{ fontSize: 16, color: "#2a9d8f" }}
        >
          KidneyBuddy
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col flex-1 py-2" style={{ paddingLeft: 16, paddingRight: 16 }}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 w-full cursor-pointer transition-colors rounded-lg px-3",
                isActive
                  ? "border-l-[3px] border-primary bg-[#f0faf9] text-primary"
                  : "border-l-[3px] border-transparent"
              )}
              style={{ height: 48 }}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2 : 1.5}
                color={isActive ? "#2a9d8f" : "#7a8c8a"}
              />
              <span
                className="font-sans font-medium"
                style={{
                  fontSize: 14,
                  color: isActive ? "#2a9d8f" : "#1a2e2c",
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Action buttons — bottom-anchored */}
      <div style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("activity:start"))}
          className="flex items-center justify-center gap-2 w-full font-sans font-medium cursor-pointer transition-colors hover:opacity-90 active:opacity-75 mb-2"
          style={{
            height: 44,
            borderRadius: 20,
            backgroundColor: "#fff8e6",
            color: "#1a2e2c",
            border: "1px solid #ef9f27",
            fontSize: 14,
          }}
          aria-label="Mulai Kegiatan"
        >
          <Play size={16} color="#ef9f27" />
          Mulai Kegiatan
        </button>
        <button
          onClick={onCatatCairan}
          className="flex items-center justify-center gap-2 w-full font-sans font-medium cursor-pointer transition-colors hover:opacity-90 active:opacity-75"
          style={{
            height: 44,
            borderRadius: 20,
            backgroundColor: "#2a9d8f",
            color: "#ffffff",
            fontSize: 14,
          }}
          aria-label="Catat Cairan"
        >
          <Droplets size={16} color="#ffffff" />
          Catat Cairan
        </button>
      </div>
    </aside>
  );
}
