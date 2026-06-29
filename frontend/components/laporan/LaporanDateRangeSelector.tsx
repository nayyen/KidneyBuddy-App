"use client";

/**
 * LaporanDateRangeSelector — Date range selector for doctor visit reports
 *
 * Three preset pills (7 Hari / 30 Hari / 3 Bulan) plus a "Pilih Tanggal"
 * custom toggle that reveals two `<input type="date">` fields.
 *
 * Presets compute startDate/endDate relative to today.
 * Custom range validates inline: end >= start, max 90 days, max = today.
 */
import { useState, useCallback, useEffect } from "react";

const PRESETS = [
  { label: "7 Hari", days: 7 },
  { label: "30 Hari", days: 30 },
  { label: "3 Bulan", days: 90 },
] as const;

interface Props {
  onChange: (startDate: string, endDate: string) => void;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const today = new Date();

export default function LaporanDateRangeSelector({ onChange }: Props) {
  const [activePreset, setActivePreset] = useState<string>("30 Hari");
  const [isCustom, setIsCustom] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Initialize with 30-day preset
  useEffect(() => {
    const end = new Date(today);
    const start = new Date(today);
    start.setDate(start.getDate() - 30);
    onChange(formatDate(start), formatDate(end));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePreset = useCallback(
    (label: string, days: number) => {
      setActivePreset(label);
      setIsCustom(false);
      setError(null);

      const end = new Date(today);
      const start = new Date(today);
      start.setDate(start.getDate() - days);
      onChange(formatDate(start), formatDate(end));
    },
    [onChange],
  );

  const handleCustomToggle = useCallback(() => {
    setIsCustom(true);
    setActivePreset("Pilih Tanggal");
    setError(null);
  }, []);

  const validateCustom = useCallback(
    (start: string, end: string) => {
      if (start && end) {
        if (end < start) {
          setError("Tanggal akhir harus setelah tanggal mulai");
          return;
        }
        const diffDays =
          (new Date(end).getTime() - new Date(start).getTime()) /
          (1000 * 60 * 60 * 24);
        if (diffDays > 90) {
          setError("Rentang maksimum adalah 90 hari");
          return;
        }
      }
      setError(null);
    },
    [],
  );

  const handleCustomStart = useCallback(
    (val: string) => {
      setCustomStart(val);
      if (val && customEnd) {
        validateCustom(val, customEnd);
        onChange(val, customEnd);
      }
    },
    [customEnd, onChange, validateCustom],
  );

  const handleCustomEnd = useCallback(
    (val: string) => {
      setCustomEnd(val);
      if (customStart && val) {
        validateCustom(customStart, val);
        onChange(customStart, val);
      }
    },
    [customStart, onChange, validateCustom],
  );

  // Compute display text
  const getPeriodDisplay = () => {
    if (isCustom && customStart && customEnd && !error) {
      return `Periode: ${formatDisplay(new Date(customStart))} — ${formatDisplay(new Date(customEnd))}`;
    }
    if (!isCustom) {
      const end = new Date(today);
      const start = new Date(today);
      const days =
        PRESETS.find((p) => p.label === activePreset)?.days ?? 30;
      start.setDate(start.getDate() - days);
      return `Periode: ${formatDisplay(start)} — ${formatDisplay(end)}`;
    }
    return null;
  };

  return (
    <div>
      {/* Section label */}
      <p className="mb-2 text-xs font-medium text-[#1a2e2c]">
        Periode Laporan
      </p>

      {/* Preset pills row */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => handlePreset(p.label, p.days)}
            className={`h-9 rounded-full px-4 text-xs font-medium transition-all duration-150 ${
              !isCustom && activePreset === p.label
                ? "bg-[#2a9d8f] text-white border-none"
                : "bg-[#f0faf9] text-[#1a2e2c] border-[0.5px] border-[#cfe8e4]"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={handleCustomToggle}
          className={`h-9 rounded-full px-4 text-xs font-medium transition-all duration-150 ${
            isCustom
              ? "bg-[#f3ede5] text-[#1a2e2c] border-[0.5px] border-[#ef9f27]"
              : "bg-[#f0faf9] text-[#1a2e2c] border-[0.5px] border-[#cfe8e4]"
          }`}
        >
          Pilih Tanggal
        </button>
      </div>

      {/* Custom date picker area */}
      {isCustom && (
        <div className="mt-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-[#7a8c8a]">
                Dari:
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => handleCustomStart(e.target.value)}
                max={formatDate(today)}
                className="w-full h-10 rounded-xl border-[0.5px] border-[#cfe8e4] bg-white px-3 text-xs font-medium text-[#1a2e2c] focus:border-[#2a9d8f] focus:shadow-[0_0_0_3px_rgba(42,157,143,0.15)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-[#7a8c8a]">
                Sampai:
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => handleCustomEnd(e.target.value)}
                min={customStart || undefined}
                max={formatDate(today)}
                className="w-full h-10 rounded-xl border-[0.5px] border-[#cfe8e4] bg-white px-3 text-xs font-medium text-[#1a2e2c] focus:border-[#2a9d8f] focus:shadow-[0_0_0_3px_rgba(42,157,143,0.15)] focus:outline-none"
              />
            </div>
          </div>
          {error && (
            <p className="mt-1 text-[10px] font-medium text-[#d4183d]">
              {error}
            </p>
          )}
        </div>
      )}

      {/* Period display */}
      {getPeriodDisplay() && !error && (
        <p className="mt-2 text-[10px] font-medium text-[#7a8c8a]">
          {getPeriodDisplay()}
        </p>
      )}
    </div>
  );
}
