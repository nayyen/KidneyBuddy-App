"use client";

/**
 * LifestyleSuggestionCard.tsx — Personalized lifestyle suggestion card
 * (AI-04, D-12)
 *
 * Renders at the top of /edukasi, above the existing "Konten Segera Hadir"
 * empty state (Phase 6 scope, stays as-is). Single GET /api/ai/lifestyle —
 * gate-checked server-side (<3 days tracking -> gated marker, no Groq call);
 * no manual regenerate button for this surface (D-13 simplicity).
 *
 * Per 05-UI-SPEC.md Screen Contract 5.
 */

import { useEffect, useState } from "react";
import { Leaf } from "lucide-react";
import { authFetch, ApiError } from "@/lib/api";
import { splitAiText } from "@/lib/aiDisclaimer";

interface LifestyleGatedResponse {
  gated: true;
  trackingDays: number;
  minTrackingDays: number;
}

interface LifestyleSuggestionResponse {
  gated: false;
  tanggal: string;
  saranText: string;
}

type LifestyleResponse = LifestyleGatedResponse | LifestyleSuggestionResponse;

type CardState = "loading" | "gated" | "generated" | "error";

interface LifestyleSuggestionCardProps {
  accessToken: string;
}

export default function LifestyleSuggestionCard({
  accessToken,
}: LifestyleSuggestionCardProps) {
  const [state, setState] = useState<CardState>("loading");
  const [narrative, setNarrative] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const [errorMessage, setErrorMessage] = useState(
    "Saran tidak tersedia saat ini. Silakan coba lagi nanti.",
  );

  useEffect(() => {
    let cancelled = false;
    authFetch<LifestyleResponse>("/api/ai/lifestyle", accessToken)
      .then((data) => {
        if (cancelled) return;
        if (data.gated) {
          setState("gated");
          return;
        }
        const split = splitAiText(data.saranText);
        setNarrative(split.narrative);
        setDisclaimer(split.disclaimer);
        setState("generated");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.message) {
          setErrorMessage(err.message);
        }
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <div
      className="w-full"
      style={{
        background: "linear-gradient(135deg, #f0faf9, #e0f5f2)",
        border: "0.5px solid #cfe8e4",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 30,
              height: 30,
              background: "rgba(255,255,255,.7)",
              borderRadius: 9,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Leaf size={18} style={{ color: "#2a9d8f" }} />
          </div>
          <p
            className="font-heading font-bold"
            style={{ fontSize: 14, color: "#1a2e2c" }}
          >
            Saran Gaya Hidup untuk Anda
          </p>
        </div>
        <span
          className="font-sans font-bold shrink-0"
          style={{
            fontSize: 9,
            color: "#2a9d8f",
            background: "rgba(255,255,255,.7)",
            padding: "2px 8px",
            borderRadius: 9999,
            height: 18,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          AI
        </span>
      </div>

      <div className="mt-3">
        {state === "loading" && (
          <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>
            Memuat...
          </p>
        )}

        {state === "gated" && (
          <div className="flex flex-col items-center text-center py-4">
            <Leaf size={40} color="#cfe8e4" strokeWidth={1.5} />
            <p
              className="font-heading font-bold mt-2"
              style={{ fontSize: 12, color: "#1a2e2c" }}
            >
              Saran Belum Tersedia
            </p>
            <p
              className="font-sans mt-1"
              style={{ fontSize: 12, color: "#3d6b66", lineHeight: 1.6 }}
            >
              Saran personal akan muncul setelah Anda mencatat data selama 3
              hari.
            </p>
          </div>
        )}

        {state === "error" && (
          <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>
            {errorMessage}
          </p>
        )}

        {state === "generated" && (
          <>
            <p
              className="font-sans"
              style={{ fontSize: 12, color: "#1a2e2c", lineHeight: 1.6, whiteSpace: "pre-wrap" }}
            >
              {narrative}
            </p>
            {disclaimer && (
              <p
                className="font-sans italic mt-2"
                style={{ fontSize: 10, color: "#7a8c8a" }}
              >
                {disclaimer}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
