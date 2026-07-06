"use client";

/**
 * LabAnalysisCard.tsx — Per-lab-result AI analysis card (AI-03, D-11, D-14)
 *
 * Renders on the Lab tab (/catatan) for a single newly-saved manual lab
 * result. Generation is fire-and-forget server-side (labResult.service.ts's
 * createEntry never awaits it) — this card polls GET
 * /api/ai/lab-analysis/:labResultId until `ready: true` since there's no
 * push/websocket channel, showing "Menganalisis hasil lab..." meanwhile.
 * The lab save itself already completed before this card even mounts.
 *
 * Out-of-range highlighting (informational, not diagnostic — UI-SPEC):
 * the backend only returns free-form Groq prose (analisisText), with no
 * structured "this figure is out of range" marker. This card determines
 * out-of-range status itself from the lab result's own `nilai`/
 * `nilaiRujukan` (already known — no diagnosis performed here, just a
 * numeric range comparison) and, if out of range, highlights literal
 * occurrences of that exact value string within the narrative. If the
 * value never appears verbatim in the Groq text (the model paraphrased),
 * no highlight is applied — never fabricates a highlight that isn't
 * actually present in the backend's text.
 */

import { useEffect, useRef, useState } from "react";
import { FlaskConical } from "lucide-react";
import { authFetch } from "@/lib/api";
import { splitAiText } from "@/lib/aiDisclaimer";

interface LabAnalysisResponse {
  ready: boolean;
  analisisText?: string;
}

type CardState = "polling" | "ready" | "timeout";

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 20; // ~60s of polling before giving up

interface LabAnalysisCardProps {
  accessToken: string;
  labResultId: string;
  namaParameter: string;
  nilai: string;
  nilaiRujukan: string | null;
  // Item 5(a): optional trend-range (days) so the analysis follows the
  // same window currently shown in LabTrendChart; undefined/0 = all data.
  days?: number;
}

/** Parses a reference-range string like "0.6-1.2", "<5", ">10" into bounds. */
function parseReferenceRange(
  raw: string,
): { min?: number; max?: number } | null {
  const trimmed = raw.trim();
  const rangeMatch = trimmed.match(/^(-?\d+(?:[.,]\d+)?)\s*-\s*(-?\d+(?:[.,]\d+)?)$/);
  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1].replace(",", ".")),
      max: parseFloat(rangeMatch[2].replace(",", ".")),
    };
  }
  const upperOnly = trimmed.match(/^[<≤]\s*(-?\d+(?:[.,]\d+)?)$/);
  if (upperOnly) return { max: parseFloat(upperOnly[1].replace(",", ".")) };
  const lowerOnly = trimmed.match(/^[>≥]\s*(-?\d+(?:[.,]\d+)?)$/);
  if (lowerOnly) return { min: parseFloat(lowerOnly[1].replace(",", ".")) };
  return null;
}

function isOutOfRange(nilai: string, nilaiRujukan: string | null): boolean {
  if (!nilaiRujukan) return false;
  const value = parseFloat(nilai.replace(",", "."));
  if (isNaN(value)) return false;
  const range = parseReferenceRange(nilaiRujukan);
  if (!range) return false;
  if (range.min !== undefined && value < range.min) return true;
  if (range.max !== undefined && value > range.max) return true;
  return false;
}

/** Splits narrative into React nodes, wrapping literal occurrences of
 * `value` in a red inline span — never assumes a match exists. */
function renderNarrativeWithHighlight(narrative: string, value: string) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "g");
  const parts = narrative.split(re);
  if (parts.length === 1) return narrative; // value never appears verbatim
  return parts.map((part, i) =>
    part === value ? (
      <span key={i} style={{ color: "#d4183d", fontWeight: 700 }}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export default function LabAnalysisCard({
  accessToken,
  labResultId,
  namaParameter,
  nilai,
  nilaiRujukan,
  days,
}: LabAnalysisCardProps) {
  const [state, setState] = useState<CardState>("polling");
  const [narrative, setNarrative] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const attemptsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    attemptsRef.current = 0;
    setState("polling");

    const poll = async () => {
      try {
        const query = days ? `?days=${days}` : "";
        const data = await authFetch<LabAnalysisResponse>(
          `/api/ai/lab-analysis/${labResultId}${query}`,
          accessToken,
        );
        if (cancelled) return;
        if (data.ready && data.analisisText) {
          const split = splitAiText(data.analisisText);
          setNarrative(split.narrative);
          setDisclaimer(split.disclaimer);
          setState("ready");
          return;
        }
      } catch {
        // Treat as not-ready-yet; keep polling until MAX_ATTEMPTS.
      }
      if (cancelled) return;
      attemptsRef.current += 1;
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setState("timeout");
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [accessToken, labResultId, days]);

  const outOfRange = isOutOfRange(nilai, nilaiRujukan);

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
            <FlaskConical size={18} style={{ color: "#2a9d8f" }} />
          </div>
          <div>
            <p
              className="font-heading font-bold"
              style={{ fontSize: 14, color: "#1a2e2c" }}
            >
              Analisis Hasil Lab
            </p>
            <p className="font-sans" style={{ fontSize: 10, color: "#7a8c8a" }}>
              {namaParameter}
            </p>
          </div>
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
        {state === "polling" && (
          <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>
            Menganalisis hasil lab...
          </p>
        )}

        {state === "timeout" && (
          <p className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>
            Analisis tidak tersedia saat ini.
          </p>
        )}

        {state === "ready" && (
          <>
            <p
              className="font-sans"
              style={{ fontSize: 15, color: "#1a2e2c", lineHeight: 1.6, whiteSpace: "pre-wrap" }}
            >
              {outOfRange ? renderNarrativeWithHighlight(narrative, nilai) : narrative}
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
