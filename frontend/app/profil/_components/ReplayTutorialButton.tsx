"use client";

import { useRouter } from "next/navigation";

export default function ReplayTutorialButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/onboarding?mode=tutorial")}
      className="w-full text-left rounded-[14px] border border-border p-4 hover:bg-muted/50 transition-colors font-sans"
    >
      <div className="flex items-center gap-3">
        <svg
          className="w-5 h-5 text-primary shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="text-left">
          <div className="font-heading font-semibold text-foreground text-sm">
            Lihat Tutorial
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pelajari kembali cara menggunakan fitur KidneyBuddy
          </p>
        </div>
      </div>
    </button>
  );
}
