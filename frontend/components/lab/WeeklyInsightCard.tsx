"use client";

/**
 * WeeklyInsightCard.tsx — Weekly trend insight card (AI-02, D-11)
 *
 * Renders on the Lab tab (/catatan), above <LabTrendChart>. Cache-only read
 * of GET /api/ai/weekly-insight — this surface has no manual regenerate
 * button (triggers are the Sunday 19:00 WIB cron job only, D-13 simplicity).
 *
 * Per 05-UI-SPEC.md Screen Contract 4.
 */

import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import { authFetch, ApiError } from "@/lib/api";
import { splitAiText } from "@/lib/aiDisclaimer";

interface WeeklyInsightResponse {
  pekan: string;
  wawasanText: string;
}

type CardState = "loading" | "empty" | "generated" | "error";

interface WeeklyInsightCardProps {
  accessToken: string;
}

export default function WeeklyInsightCard({ accessToken }: WeeklyInsightCardProps) {
  const [state, setState] = useState<CardState>("loading");
  const [narrative, setNarrative] = useState("");
  const [disclaimer, setDisclaimer] = useState("");

  useEffect(() => {
    let cancelled = false;
    authFetch<WeeklyInsightResponse>("/api/ai/weekly-insight", accessToken)
      .then((data) => {
        if (cancelled) return;
        const split = splitAiText(data.wawasanText);
        setNarrative(split.narrative);
        setDisclaimer(split.disclaimer);
        setState("generated");
      })
      .catch((err) => {
        if (cancelled) return;
        // 404 = belum ada wawasan minggu ini (D-16 cache-miss); any other
        // error (network, unexpected 5xx) falls back to the same generic
        // "tidak tersedia" copy — there's no manual retry action on this
        // card (D-13), so both paths just render informational text.
        if (err instanceof ApiError && err.status === 404) {
          setState("empty");
        } else {
          setState("error");
        }
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
              Wawasan baru dibuat otomatis setiap Minggu pukul 19:00, atau
              saat ada data lab baru yang signifikan.
            </p>
          </>
        )}

        {state === "error" && (
          <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>
            Wawasan tidak tersedia saat ini.
          </p>
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
