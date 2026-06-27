"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingSuccess() {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Stagger entrance animation
    const t1 = setTimeout(() => setShow(true), 100);
    // Auto-redirect after 2.5s
    const t2 = setTimeout(() => router.replace("/beranda"), 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [router]);

  return (
    <div
      className={`flex flex-col items-center justify-center text-center transition-all duration-500 ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {/* Success icon */}
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h2 className="font-heading text-2xl font-extrabold text-foreground mb-2">
        Selamat Datang!
      </h2>
      <p className="text-base text-muted-foreground font-sans leading-relaxed max-w-xs">
        KidneyBuddy siap mendampingi kamu dalam menjalani terapi!
      </p>
      <p className="mt-6 text-xs text-muted-foreground font-sans">
        Mengarahkan ke dashboard...
      </p>
    </div>
  );
}
