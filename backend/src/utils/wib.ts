/**
 * wib.ts — Shared WIB (Waktu Indonesia Barat, UTC+7) time helpers.
 *
 * Docker containers run in UTC. User-facing times (jamPengingat, fluid waktu,
 * confirmation times, "today" date bounds) must be WIB-correct so a 7am WIB
 * entry doesn't show as 00:xx and "today" queries match the patient's local day.
 *
 * Convention: WIB-shifted Date objects use getUTC* methods to read WIB components.
 */

const WIB_OFFSET_MS = 7 * 3600 * 1000;

const INDONESIAN_DAYS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

/** Current instant shifted so getUTC* yields WIB components. */
export function wibShifted(): Date {
  return new Date(Date.now() + WIB_OFFSET_MS);
}

/** Today's WIB date as "YYYY-MM-DD". */
export function wibDateStr(): string {
  return wibShifted().toISOString().slice(0, 10);
}

/** Current WIB time as "HH:mm". */
export function wibHHmm(): string {
  const wib = wibShifted();
  return (
    String(wib.getUTCHours()).padStart(2, "0") +
    ":" +
    String(wib.getUTCMinutes()).padStart(2, "0")
  );
}

/** Today's Indonesian day name in WIB (e.g. "Senin"). */
export function wibDayName(): string {
  return INDONESIAN_DAYS[wibShifted().getUTCDay()];
}

/** Lowercase day name for hariAktif matching (e.g. "senin"). */
export function wibDayNameLower(): string {
  return wibDayName().toLowerCase();
}

/** Tomorrow's Indonesian day name in WIB, lowercase (e.g. "selasa"). */
export function wibTomorrowDayNameLower(): string {
  const tomorrow = new Date(Date.now() + WIB_OFFSET_MS + 24 * 3600 * 1000);
  return INDONESIAN_DAYS[tomorrow.getUTCDay()].toLowerCase();
}

/**
 * Build a UTC Date representing "today at HH:mm WIB".
 *
 * Stored in timestamp columns; a WIB browser's toLocaleTimeString shows the
 * original HH:mm because WIB = UTC+7 (e.g. "07:00" WIB → stored as 00:00 UTC →
 * displayed as 07:00 in a UTC+7 browser).
 */
export function wibDateFromHHmm(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const wib = wibShifted();
  const wibMidnightUtc = Date.UTC(
    wib.getUTCFullYear(),
    wib.getUTCMonth(),
    wib.getUTCDate(),
  );
  return new Date(wibMidnightUtc - WIB_OFFSET_MS + h * 3600 * 1000 + m * 60 * 1000);
}

/**
 * UTC Date bounds for a WIB calendar day.
 *
 * A WIB day "2026-07-02" spans 2026-07-02T00:00:00+07:00 → 2026-07-02T23:59:59+07:00,
 * which in UTC is 2026-07-01T17:00:00Z → 2026-07-02T16:59:59Z.
 *
 * Use these for `gte`/`lte` queries on timestamp columns so entries stored as
 * WIB-correct UTC instants match the patient's local day.
 */
export function wibDayBounds(dateStr?: string): { start: Date; end: Date } {
  const ds = dateStr ?? wibDateStr();
  const [y, m, d] = ds.split("-").map(Number);
  const wibMidnightUtc = Date.UTC(y, m - 1, d) - WIB_OFFSET_MS;
  return {
    start: new Date(wibMidnightUtc),
    end: new Date(wibMidnightUtc + 24 * 3600 * 1000 - 1),
  };
}

export { INDONESIAN_DAYS };
