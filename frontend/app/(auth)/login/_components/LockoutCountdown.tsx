"use client";

import { useState, useEffect, useCallback } from "react";

interface Props {
  lockedUntil: Date;
}

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function LockoutCountdown({ lockedUntil }: Props) {
  const calcRemaining = useCallback(
    () => lockedUntil.getTime() - Date.now(),
    [lockedUntil],
  );

  const [remaining, setRemaining] = useState(calcRemaining);

  useEffect(() => {
    if (remaining <= 0) return;

    const id = setInterval(() => {
      const r = calcRemaining();
      setRemaining(r);
      if (r <= 0) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [calcRemaining, remaining]);

  if (remaining <= 0) return null;

  return (
    <div
      role="alert"
      className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-center"
    >
      <p className="text-sm font-medium text-amber-800">
        Akun Anda terkunci sementara karena terlalu banyak percobaan gagal.
      </p>
      <p className="mt-1 text-lg font-bold text-amber-900 font-mono tracking-wider">
        {formatRemaining(remaining)}
      </p>
      <p className="text-xs text-amber-600 mt-0.5">
        Silakan coba lagi setelah waktu habis.
      </p>
    </div>
  );
}
