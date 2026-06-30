"use client";

import { Droplets } from "lucide-react";

interface FABProps {
  onClick?: () => void;
}

export default function FAB({ onClick }: FABProps) {
  return (
    <>
      <button
        onClick={onClick}
        aria-label="Catat Cairan"
        className="lg:hidden flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #7a8c8a, #2a9d8f)",
          border: "3px solid #ffffff",
          boxShadow: "0 4px 14px rgba(82, 163, 214, 0.35)",
        }}
      >
        <Droplets size={20} color="#ffffff" />
      </button>
    </>
  );
}
