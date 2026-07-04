"use client";

/**
 * AiDailySummaryCard.tsx — Real daily AI summary card (AI-01, D-10)
 *
 * Replaces AiPlaceholderCard.tsx in beranda/page.tsx's render tree (that file
 * stays untouched, just no longer imported — per 05-UI-SPEC.md Screen
 * Contract 2).
 *
 * Fetches GET /api/ai/daily-summary (cache-only, never calls Groq) on mount.
 * "Buat Ringkasan" / "Buat Ulang Ringkasan" POSTs
 * /api/ai/daily-summary/regenerate, which forces a fresh Groq call — a
 * failure there surfaces the D-18 error copy, the button remains available
 * for manual retry.
 *
 * The backend always appends the fixed medical disclaimer to ringkasanText
 * (AI-05/D-19) — splitAiText() locates that verbatim substring so it can be
 * styled separately (10px italic muted) without ever paraphrasing/shortening
 * it.
 */

import { useCallback, useEffect, useState } from "react";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/api";
import { splitAiText } from "@/lib/aiDisclaimer";

interface DailySummaryResponse {
  tanggal: string;
  ringkasanText: string;
  createdAt: string;
}

type CardState = "loading" | "empty" | "generating" | "generated" | "error";

/** WIB display for an ISO timestamp, e.g. "14:05" — mirrors backend wib.ts's UTC+7 shift convention. */
function formatWibTime(iso: string): string {
  const wib = new Date(new Date(iso).getTime() + 7 * 3600 * 1000);
  const hh = String(wib.getUTCHours()).padStart(2, "0");
  const mm = String(wib.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

interface AiDailySummaryCardProps {
  accessToken: string;
}

export default function AiDailySummaryCard({ accessToken }: AiDailySummaryCardProps) {
  const [state, setState] = useState<CardState>("loading");
  const [narrative, setNarrative] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await authFetch<DailySummaryResponse>(
        "/api/ai/daily-summary",
        accessToken,
      );
      const split = splitAiText(data.ringkasanText);
      setNarrative(split.narrative);
      setDisclaimer(split.disclaimer);
      setCreatedAt(data.createdAt);
      setState("generated");
    } catch {
      // 404 = belum ada ringkasan hari ini; jaringan/error lain juga jatuh
      // ke state kosong (tombol "Buat Ringkasan" tetap tersedia untuk retry).
      setState("empty");
    }
  }, [accessToken]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleGenerate = async () => {
    setState("generating");
    try {
      const data = await authFetch<DailySummaryResponse>(
        "/api/ai/daily-summary/regenerate",
        accessToken,
        { method: "POST" },
      );
      const split = splitAiText(data.ringkasanText);
      setNarrative(split.narrative);
      setDisclaimer(split.disclaimer);
      setCreatedAt(data.createdAt);
      setState("generated");
    } catch {
      // D-18: Groq call failed — do not clear any previously-shown summary
      // state variables, just surface the error copy + retry button.
      setState("error");
    }
  };

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
      {/* Header row */}
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
            <Sparkles size={18} style={{ color: "#2a9d8f" }} />
          </div>
          <p
            className="font-heading font-bold"
            style={{ fontSize: 14, color: "#1a2e2c" }}
          >
            Ringkasan AI Hari Ini
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

      {/* Body */}
      <div className="mt-3">
        {state === "loading" && (
          <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>
            Memuat...
          </p>
        )}

        {state === "empty" && (
          <>
            <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>
              Belum ada ringkasan untuk hari ini.
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              className="mt-3 font-sans font-semibold transition-opacity hover:opacity-90"
              style={{
                background: "#2a9d8f",
                color: "#ffffff",
                border: "none",
                borderRadius: 9999,
                height: 36,
                padding: "0 16px",
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              <Sparkles size={14} /> Buat Ringkasan
            </button>
          </>
        )}

        {state === "generating" && (
          <>
            <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>
              Membuat ringkasan...
            </p>
            <button
              type="button"
              disabled
              className="mt-3 font-sans font-semibold"
              style={{
                background: "#2a9d8f",
                color: "#ffffff",
                border: "none",
                borderRadius: 9999,
                height: 36,
                padding: "0 16px",
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                opacity: 0.7,
                cursor: "not-allowed",
              }}
            >
              <Loader2 size={14} className="animate-spin" /> Membuat ringkasan...
            </button>
          </>
        )}

        {state === "generated" && (
          <>
            <p
              className="font-sans"
              style={{ fontSize: 12, color: "#1a2e2c", lineHeight: 1.6, whiteSpace: "pre-wrap" }}
            >
              {narrative}
            </p>
            {createdAt && (
              <p className="font-sans mt-1.5" style={{ fontSize: 10, color: "#7a8c8a" }}>
                Dibuat pukul {formatWibTime(createdAt)}
              </p>
            )}
            <button
              type="button"
              onClick={handleGenerate}
              className="mt-3 font-sans font-semibold transition-colors"
              style={{
                background: "transparent",
                color: "#2a9d8f",
                border: "1px solid #2a9d8f",
                borderRadius: 20,
                height: 32,
                padding: "0 14px",
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              <RefreshCw size={12} /> Buat Ulang Ringkasan
            </button>
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

        {state === "error" && (
          <>
            <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>
              Ringkasan tidak tersedia saat ini. Coba lagi nanti.
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              className="mt-3 font-sans font-semibold transition-opacity hover:opacity-90"
              style={{
                background: "#2a9d8f",
                color: "#ffffff",
                border: "none",
                borderRadius: 9999,
                height: 36,
                padding: "0 16px",
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              <Sparkles size={14} /> Buat Ringkasan
            </button>
          </>
        )}
      </div>
    </div>
  );
}
