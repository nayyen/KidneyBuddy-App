"use client";

/**
 * RangeFilterSelect.tsx — shared range-filter dropdown (quick-260707-1la
 * items 10/12/13)
 *
 * Single preset dropdown reused identically across the Lab (trend + list),
 * Aktivitas, and Cairan tabs so the labels and `days` mapping never drift
 * between tabs — see the PLAN.md objective's "Range-filter design decision".
 *
 * `days` semantics: 0 = "Semua data" (no lower bound / all data). Callers
 * decide how to apply that sentinel against their own endpoint's contract
 * (e.g. lab endpoints omit the `days` query param entirely on 0 to mean
 * true "all"; endpoints without a native "all" concept substitute a large
 * practical value instead — see FluidLogList.tsx).
 */

export const RANGE_OPTIONS = [
  { label: "Semua data", days: 0 },
  { label: "30 hari terakhir", days: 30 },
  { label: "90 hari terakhir", days: 90 },
  { label: "6 bulan terakhir", days: 180 },
  { label: "1 tahun terakhir", days: 365 },
] as const;

export type RangeLabel = (typeof RANGE_OPTIONS)[number]["label"];

export function rangeDaysFor(label: RangeLabel): number {
  return RANGE_OPTIONS.find((o) => o.label === label)?.days ?? 0;
}

interface RangeFilterSelectProps {
  value: RangeLabel;
  onChange: (value: RangeLabel) => void;
  /** Options in this list render disabled — used for the Lab tab's
   * list-range-constrains-trend-range interlink (item 10). */
  disabledLabels?: RangeLabel[];
  className?: string;
  "aria-label"?: string;
}

const DEFAULT_CLASSNAME =
  "w-full rounded-[10px] border border-border bg-input px-3 py-2 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary";

export default function RangeFilterSelect({
  value,
  onChange,
  disabledLabels = [],
  className,
  "aria-label": ariaLabel,
}: RangeFilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as RangeLabel)}
      className={className ?? DEFAULT_CLASSNAME}
      aria-label={ariaLabel ?? "Filter rentang waktu"}
    >
      {RANGE_OPTIONS.map((opt) => (
        <option key={opt.label} value={opt.label} disabled={disabledLabels.includes(opt.label)}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
