"use client";

/**
 * WeeklyInsightCard.tsx — Weekly trend insight card (AI-02, D-11)
 *
 * Renders on the Lab tab (/catatan), above <LabTrendChart>. Reads GET
 * /api/ai/weekly-insight (cache-only), with a manual "Buat Wawasan" /
 * "Buat Ulang Wawasan" trigger via POST /api/ai/weekly-insight/regenerate
 * (code review WR-01, 2026-07-04) — the automatic Sunday 19:00 Jakarta-time cron
 * remains the primary trigger, but a missed/failed batch no longer leaves
 * the user stuck for a full week with no way to generate one.
 *
 * Per 05-UI-SPEC.md Screen Contract 4.
 */

import { useCallback, useEffect, useState } from "react";
import { Lightbulb, RefreshCw, Sparkles, Loader2 } from "lucide-react";
import { authFetch, ApiError } from "@/lib/api";
import { splitAiText } from "@/lib/aiDisclaimer";

interface WeeklyInsightResponse {
  pekan: string;
  wawasanText: string;
}

type CardState = "loading" | "empty" | "generating" | "generated" | "error";

interface WeeklyInsightCardProps {
  accessToken: string;
}

export default function WeeklyInsightCard({ accessToken }: WeeklyInsightCardProps) {
  const [state, setState] = useState<CardState>("loading");
  const [narrative, setNarrative] = useState("");
  const [disclaimer, setDisclaimer] = useState("");

  const fetchInsight = useCallback(async () => {
    try {
      const data = await authFetch<WeeklyInsightResponse>(
        "/api/ai/weekly-insight",
        accessToken,
      );
      const split = splitAiText(data.wawasanText);
      setNarrative(split.narrative);
      setDisclaimer(split.disclaimer);
      setState("generated");
    } catch (err) {
      // 404 = belum ada wawasan minggu ini (D-16 cache-miss); any other
      // error (network, unexpected 5xx) falls back to the same generic
      // "tidak tersedia" copy.
      if (err instanceof ApiError && err.status === 404) {
        setState("empty");
      } else {
        setState("error");
      }
    }
  }, [accessToken]);

  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);

  const handleGenerate = async () => {
    setState("generating");
    try {
      const data = await authFetch<WeeklyInsightResponse>(
        "/api/ai/weekly-insight/regenerate",
        accessToken,
        { method: "POST" },
      );
      const split = splitAiText(data.wawasanText);
      setNarrative(split.narrative);
      setDisclaimer(split.disclaimer);
      setState("generated");
    } catch {
      // D-18: Groq call failed — surface the error copy + retry button,
      // don't clear any previously-shown insight state.
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
            <Lightbulb size={18} style={{ color: "#2a9d8f" }} />
          </div>
          <p
            className="font-heading font-bold"
            style={{ fontSize: 14, color: "#1a2e2c" }}
          >
            Wawasan Tren Mingguan
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

        {state === "empty" && (
          <>
            <p
              className="font-heading font-bold"
              style={{ fontSize: 12, color: "#1a2e2c" }}
            >
              Belum Ada Wawasan Minggu Ini
            </p>
            <p
              className="font-sans mt-1"
              style={{ fontSize: 12, color: "#3d6b66", lineHeight: 1.6 }}
            >
              Wawasan baru dibuat otomatis setiap Minggu pukul 19:00. Anda
              juga bisa membuatnya sekarang secara manual.
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
              <Sparkles size={14} /> Buat Wawasan
            </button>
          </>
        )}

        {state === "generating" && (
          <>
            <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>
              Membuat wawasan...
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
              <Loader2 size={14} className="animate-spin" /> Membuat wawasan...
            </button>
          </>
        )}

        {state === "error" && (
          <>
            <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>
              Wawasan tidak tersedia saat ini. Coba lagi nanti.
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
              <Sparkles size={14} /> Buat Wawasan
            </button>
          </>
        )}

        {state === "generated" && (
          <>
            <p
              className="font-sans"
              style={{ fontSize: 15, color: "#1a2e2c", lineHeight: 1.6, whiteSpace: "pre-wrap" }}
            >
              {narrative}
            </p>
            <p className="font-sans mt-1.5" style={{ fontSize: 11, color: "#7a8c8a" }}>
              Berdasarkan data 7-30 hari terakhir
            </p>
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
              <RefreshCw size={12} /> Buat Ulang Wawasan
            </button>
            {disclaimer && (
              <p
                className="font-sans italic mt-2"
                style={{ fontSize: 12, color: "#7a8c8a" }}
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
