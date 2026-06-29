"use client";

import { usePathname, useRouter } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      className="flex w-full bg-white"
      style={{
        height: "calc(60px + env(safe-area-inset-bottom))",
        borderTop: "0.5px solid #f0faf9",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 cursor-pointer"
            style={{ height: "60px", minWidth: "44px" }}
          >
            <Icon
              size={22}
              strokeWidth={isActive ? 2.5 : 1.5}
              color={isActive ? "#2a9d8f" : "#cfe8e4"}
            />
            <span
              className="font-sans text-[10px] font-medium"
              style={{ color: isActive ? "#2a9d8f" : "#cfe8e4" }}
            >
              {item.label}
            </span>
            {/* Active indicator dot */}
            {isActive && (
              <span
                className="rounded-full"
                style={{
                  width: 4,
                  height: 4,
                  backgroundColor: "#2a9d8f",
                  marginTop: 2,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
