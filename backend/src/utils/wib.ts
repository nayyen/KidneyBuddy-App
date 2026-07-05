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

/**
 * WIB date string `days` ago, "YYYY-MM-DD" — builds 7-30 day lookback window
 * starts for the weekly insight aggregation (AI-02).
 */
export function wibDaysAgoStr(days: number): string {
  const wib = wibShifted();
  const past = new Date(wib.getTime() - days * 24 * 3600 * 1000);
  return past.toISOString().slice(0, 10);
}

/**
 * ISO 8601 week key for the current WIB week, e.g. "2026-W27" — used as the
 * ai_weekly_insights cache key (one row per user+week, D-16).
 */
export function wibIsoWeekKey(): string {
  const wib = wibShifted();
  const date = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // shift to nearest Thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const weekNum =
    1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export { INDONESIAN_DAYS };

// ─── Per-user device-timezone helpers (quick-260705-9n4 task 2) ──────────
//
// The wibXxx() helpers above hardcode a +7h (WIB/Asia-Jakarta) offset. They
// are KEPT UNCHANGED and still used by the fixed-time batch jobs (anomaly
// scan, daily summary, weekly insight) that are intentionally Jakarta-
// anchored per prior product decisions — those are backend-scheduled batch
// windows, not a per-user displayed time.
//
// The functions below instead take an explicit IANA timezone (e.g.
// "Asia/Jakarta", "Asia/Makassar") — the value the client reports once per
// session (see profile.service.ts#updateTimezone) — and use them to compute
// reminder due-ness and "today" bounds for THAT user, so a patient outside
// Jakarta sees correct local times instead of silently-wrong WIB times.
// Implemented with Node's built-in Intl (no new dependency needed).

const ENGLISH_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * Offset (ms) to ADD to a UTC instant to get that instant's wall-clock time
 * in `timeZone`, e.g. Asia/Jakarta at any date is 7*3600*1000 (Indonesia has
 * no DST, so this is a constant per-zone in practice, but computed live from
 * Intl rather than hardcoded so any IANA zone works, not just WIB/WITA/WIT).
 */
function getTzOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const { type, value } of dtf.formatToParts(date)) {
    map[type] = value;
  }
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24, // formatToParts can yield "24" for midnight
    Number(map.minute),
    Number(map.second),
  );
  return asUTC - date.getTime();
}

/** Current "HH:mm" wall-clock time in the given IANA timezone. */
export function localHHmm(timeZone: string, date: Date = new Date()): string {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const { type, value } of dtf.formatToParts(date)) {
    map[type] = value;
  }
  const hour = String(Number(map.hour) % 24).padStart(2, "0");
  return `${hour}:${map.minute}`;
}

/** Today's Indonesian day name (lowercase) in the given IANA timezone, e.g. "senin". */
export function localDayNameLower(timeZone: string, date: Date = new Date()): string {
  const englishDay = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
  }).format(date);
  const idx = ENGLISH_DAYS.indexOf(englishDay as (typeof ENGLISH_DAYS)[number]);
  const dayName = idx === -1 ? englishDay : INDONESIAN_DAYS[idx];
  return dayName.toLowerCase();
}

/** Today's calendar date "YYYY-MM-DD" in the given IANA timezone. */
export function localDateStr(timeZone: string, date: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, matching the wibDateStr() convention.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * UTC Date bounds for a calendar day local to `timeZone` (mirrors wibDayBounds()).
 * Two-pass offset resolution to stay correct across a DST boundary, though
 * Indonesian zones (the primary target) have none.
 */
export function localDayBounds(
  timeZone: string,
  dateStr?: string,
): { start: Date; end: Date } {
  const ds = dateStr ?? localDateStr(timeZone);
  const [y, m, d] = ds.split("-").map(Number);
  const guessUtc = Date.UTC(y, m - 1, d);
  const offset1 = getTzOffsetMs(timeZone, new Date(guessUtc));
  let startMs = guessUtc - offset1;
  const offset2 = getTzOffsetMs(timeZone, new Date(startMs));
  if (offset2 !== offset1) {
    startMs = guessUtc - offset2;
  }
  return {
    start: new Date(startMs),
    end: new Date(startMs + 24 * 3600 * 1000 - 1),
  };
}

/**
 * Build a UTC Date representing "today at HH:mm local time" in `timeZone`
 * (mirrors wibDateFromHHmm(), but timezone-parameterized).
 */
export function localDateFromHHmm(
  timeZone: string,
  hhmm: string,
  dateStr?: string,
): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const ds = dateStr ?? localDateStr(timeZone);
  const [y, mo, d] = ds.split("-").map(Number);
  const guessMidnightUtc = Date.UTC(y, mo - 1, d);
  const offset = getTzOffsetMs(timeZone, new Date(guessMidnightUtc));
  const localMidnightUtc = guessMidnightUtc - offset;
  return new Date(localMidnightUtc + h * 3600 * 1000 + m * 60 * 1000);
}
