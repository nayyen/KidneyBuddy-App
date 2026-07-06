/**
 * generate-demo-data.ts — deterministic demo-data generator (DEMO-SEED)
 *
 * Writes committed JSON files under seed/data/*.json modeling 180 days
 * (2026-01-08..2026-07-06) of realistic CKD clinical activity for 3 personas:
 *   - Lukman Hakim (CAPD)
 *   - Sari Wulandari (HD)
 *   - Budi Santoso (Transplantasi)
 *
 * Every stochastic choice routes through a single SeededRng instance (see
 * seed/lib/rng.ts) — no Math.random, no crypto.randomUUID, no Date.now — so
 * re-running this script with the same seed reproduces byte-identical JSON.
 *
 * This script does NOT touch the database and does NOT hash passwords or
 * encrypt any text — it writes PLAINTEXT JSON. The loader (seed-demo.ts)
 * owns hashPassword()/encrypt() at insert time, per contracts_verified.
 *
 * Run: npm run seed:demo:generate
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { SeededRng } from "./lib/rng.js";
import { appendDisclaimer } from "../lib/aiDisclaimer.js";
import { INDONESIAN_DAYS } from "../utils/wib.js";
import { educationArticles } from "./content/education.js";
import { ANCHORED_POSTS, POST_TEMPLATES, REPLY_TEMPLATES } from "./content/community.js";
import {
  buildDailySummary,
  buildWeeklyInsight,
  buildLifestyleSuggestion,
  buildLabAnalysis,
} from "./content/aiText.js";

const rng = new SeededRng();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
mkdirSync(DATA_DIR, { recursive: true });

function writeJSON(filename: string, data: unknown): void {
  writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`  wrote ${filename} (${Array.isArray(data) ? data.length : Object.keys(data as object).length} entries)`);
}

// ─── Date / time helpers (mirror utils/wib.ts math, offline-safe) ─────────

const START_DATE = "2026-01-08";
const END_DATE = "2026-07-06";
const WIB_OFFSET_MS = 7 * 3600 * 1000;

function addDaysStr(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function dayNameLower(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const idx = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return INDONESIAN_DAYS[idx].toLowerCase();
}

/** Mirrors wibDateFromHHmm() exactly, but for an arbitrary date, not "today". */
function wibTimestampISO(dateStr: string, hhmm: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  const ms = Date.UTC(y, m - 1, d) - WIB_OFFSET_MS + h * 3600 * 1000 + min * 60 * 1000;
  return new Date(ms).toISOString();
}

function addMinutesISO(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString();
}

/** Mirrors wibIsoWeekKey() exactly, but for an arbitrary date, not "now". */
function isoWeekKey(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const weekNum = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

const DATE_LIST: string[] = [];
for (let i = 0; i < 180; i++) DATE_LIST.push(addDaysStr(START_DATE, i));
if (DATE_LIST[DATE_LIST.length - 1] !== END_DATE) {
  throw new Error(
    `[generate-demo-data] date range mismatch: expected last date ${END_DATE}, got ${DATE_LIST[DATE_LIST.length - 1]}`,
  );
}

const RAMADAN_START = "2026-02-17";
const RAMADAN_END = "2026-03-19";
const LEBARAN_START = "2026-03-20";
const LEBARAN_END = "2026-03-21";
const LEBARAN_AFTERMATH_END = addDaysStr(LEBARAN_END, 10);
function isLebaranAftermath(d: string): boolean {
  return d >= LEBARAN_START && d <= LEBARAN_AFTERMATH_END;
}

const ALL_DAYS = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"];
const HD_DAYS = ["senin", "rabu", "jumat"];

// ─── Personas ──────────────────────────────────────────────────────────────

const LUKMAN_ID = "11111111-1111-4111-8111-111111111111";
const SARI_ID = "22222222-2222-4222-8222-222222222222";
const BUDI_ID = "33333333-3333-4333-8333-333333333333";

// Overwritten by the loader via hashPassword("Demo1234!") before insert —
// the generator never hashes anything (contracts_verified).
const PLACEHOLDER_PASSWORD_HASH = "__PLACEHOLDER_HASH_REPLACED_BY_LOADER__";

type UserSeed = {
  userId: string;
  namaLengkap: string;
  email: string;
  passwordHash: string;
  informedConsent: boolean;
  metodeTerapiAktif: "CAPD" | "HD" | "Transplantasi";
  tanggalMulaiTerapi: string;
  role: string;
  riwayatTerapi: string[];
  timezone: string;
  onboardingProgress: { lastCompletedStep: number; reminderConfigured: boolean; completedAt: string };
  therapyHistory: Array<{ metodeSebelum: string | null; metodeBaru: string; changedAt: string }>;
};

const users: UserSeed[] = [
  {
    userId: LUKMAN_ID,
    namaLengkap: "Lukman Hakim",
    email: "lukman@demo.kidneybuddy.id",
    passwordHash: PLACEHOLDER_PASSWORD_HASH,
    informedConsent: true,
    metodeTerapiAktif: "CAPD",
    tanggalMulaiTerapi: "2024-08-01",
    role: "Pasien",
    riwayatTerapi: ["Hemodialisis"],
    timezone: "Asia/Jakarta",
    onboardingProgress: {
      lastCompletedStep: 3,
      reminderConfigured: true,
      completedAt: wibTimestampISO("2026-01-05", "10:30"),
    },
    therapyHistory: [
      { metodeSebelum: null, metodeBaru: "Hemodialisis", changedAt: wibTimestampISO("2022-01-15", "09:00") },
      { metodeSebelum: "Hemodialisis", metodeBaru: "CAPD", changedAt: wibTimestampISO("2024-08-01", "09:00") },
    ],
  },
  {
    userId: SARI_ID,
    namaLengkap: "Sari Wulandari",
    email: "sari@demo.kidneybuddy.id",
    passwordHash: PLACEHOLDER_PASSWORD_HASH,
    informedConsent: true,
    metodeTerapiAktif: "HD",
    tanggalMulaiTerapi: "2023-03-10",
    role: "Pasien",
    riwayatTerapi: [],
    timezone: "Asia/Jakarta",
    onboardingProgress: {
      lastCompletedStep: 3,
      reminderConfigured: true,
      completedAt: wibTimestampISO("2026-01-06", "14:00"),
    },
    therapyHistory: [
      { metodeSebelum: null, metodeBaru: "Hemodialisis", changedAt: wibTimestampISO("2023-03-10", "08:00") },
    ],
  },
  {
    userId: BUDI_ID,
    namaLengkap: "Budi Santoso",
    email: "budi@demo.kidneybuddy.id",
    passwordHash: PLACEHOLDER_PASSWORD_HASH,
    informedConsent: true,
    metodeTerapiAktif: "Transplantasi",
    tanggalMulaiTerapi: "2025-09-15",
    role: "Pasien",
    riwayatTerapi: ["Hemodialisis"],
    timezone: "Asia/Jakarta",
    onboardingProgress: {
      lastCompletedStep: 3,
      reminderConfigured: true,
      completedAt: wibTimestampISO("2026-01-07", "11:00"),
    },
    therapyHistory: [
      { metodeSebelum: null, metodeBaru: "Hemodialisis", changedAt: wibTimestampISO("2023-05-01", "08:00") },
      { metodeSebelum: "Hemodialisis", metodeBaru: "Transplantasi", changedAt: wibTimestampISO("2025-09-15", "07:00") },
    ],
  },
];

// ─── Reminder schedule ─────────────────────────────────────────────────────

type ReminderSeed = {
  id: string;
  userId: string;
  jenis: "obat" | "capd" | "hd";
  nama: string;
  jamPengingat: string;
  hariAktif: string[];
  catatanWaktu: string | null;
  aktif: boolean;
  dosis: string | null;
  jenisObat: "minum" | "suntik" | null;
  fotoObat: null;
  konsentrasiCapd: string | null;
};

const reminders: ReminderSeed[] = [];

function addReminder(r: Omit<ReminderSeed, "id" | "fotoObat">): string {
  const id = rng.uuid();
  reminders.push({ id, fotoObat: null, ...r });
  return id;
}

// ── Lukman (CAPD): 8 obat meds, all daily ──────────────────────────────────
const lukmanMedsSpec = [
  { nama: "Kalsium Karbonat", jam: "08:00", dosis: "500 mg", catatan: "Diminum bersama sarapan" },
  { nama: "Kalsium Karbonat", jam: "13:00", dosis: "500 mg", catatan: "Diminum bersama makan siang" },
  { nama: "Kalsium Karbonat", jam: "19:00", dosis: "500 mg", catatan: "Diminum bersama makan malam" },
  { nama: "Amlodipine", jam: "07:00", dosis: "10 mg", catatan: "Untuk tekanan darah" },
  { nama: "Bisoprolol", jam: "07:30", dosis: "5 mg", catatan: null },
  { nama: "Asam Folat", jam: "08:00", dosis: "5 mg", catatan: null },
  { nama: "Kalsitriol", jam: "20:00", dosis: "0.25 mcg", catatan: "Vitamin D aktif" },
  { nama: "Sulfas Ferosus", jam: "12:00", dosis: "300 mg", catatan: "Suplemen zat besi" },
];
const lukmanMedReminders = lukmanMedsSpec.map((m) => ({
  id: addReminder({
    userId: LUKMAN_ID,
    jenis: "obat",
    nama: m.nama,
    jamPengingat: m.jam,
    hariAktif: ALL_DAYS,
    catatanWaktu: m.catatan,
    aktif: true,
    dosis: m.dosis,
    jenisObat: "minum",
    konsentrasiCapd: null,
  }),
  ...m,
}));

// ── Lukman (CAPD): 4 exchange reminders ─────────────────────────────────────
const lukmanCapdSpec = [
  { jam: "06:00", konsentrasi: "1.5%", label: "pagi" },
  { jam: "12:00", konsentrasi: "2.5%", label: "siang" },
  { jam: "18:00", konsentrasi: "1.5%", label: "sore" },
  { jam: "22:00", konsentrasi: "2.5%", label: "malam" },
];
const lukmanCapdReminders = lukmanCapdSpec.map((ex) => ({
  id: addReminder({
    userId: LUKMAN_ID,
    jenis: "capd",
    nama: "Exchange CAPD",
    jamPengingat: ex.jam,
    hariAktif: ALL_DAYS,
    catatanWaktu: "Cuci tangan sebelum dan sesudah exchange",
    aktif: true,
    dosis: null,
    jenisObat: null,
    konsentrasiCapd: ex.konsentrasi,
  }),
  ...ex,
}));

// ── Sari (HD): 9 obat meds daily + EPO 3x/week + HD reminder 3x/week ───────
const sariMedsSpec = [
  { nama: "Amlodipine", jam: "07:00", dosis: "10 mg", catatan: "Untuk tekanan darah" },
  { nama: "Valsartan", jam: "07:00", dosis: "80 mg", catatan: null },
  { nama: "Kalsium Asetat", jam: "08:00", dosis: "667 mg", catatan: "Diminum bersama sarapan" },
  { nama: "Kalsium Asetat", jam: "13:00", dosis: "667 mg", catatan: "Diminum bersama makan siang" },
  { nama: "Kalsium Asetat", jam: "19:00", dosis: "667 mg", catatan: "Diminum bersama makan malam" },
  { nama: "Asam Folat", jam: "08:00", dosis: "5 mg", catatan: null },
  { nama: "Vitamin B Complex", jam: "08:00", dosis: "1 tablet", catatan: null },
  { nama: "Allopurinol", jam: "20:00", dosis: "100 mg", catatan: null },
  { nama: "Clonidine", jam: "21:00", dosis: "0.15 mg", catatan: "Sebelum tidur" },
];
const sariMedReminders = sariMedsSpec.map((m) => ({
  id: addReminder({
    userId: SARI_ID,
    jenis: "obat",
    nama: m.nama,
    jamPengingat: m.jam,
    hariAktif: ALL_DAYS,
    catatanWaktu: m.catatan,
    aktif: true,
    dosis: m.dosis,
    jenisObat: "minum",
    konsentrasiCapd: null,
  }),
  ...m,
  hariAktif: ALL_DAYS,
}));
const sariEpoReminderId = addReminder({
  userId: SARI_ID,
  jenis: "obat",
  nama: "EPO (Eritropoietin)",
  jamPengingat: "09:00",
  hariAktif: HD_DAYS,
  catatanWaktu: "Injeksi subkutan, sesuai jadwal HD",
  aktif: true,
  dosis: "4000 IU",
  jenisObat: "suntik",
  konsentrasiCapd: null,
});
const sariHdReminderId = addReminder({
  userId: SARI_ID,
  jenis: "hd",
  nama: "Sesi Hemodialisis",
  jamPengingat: "08:00",
  hariAktif: HD_DAYS,
  catatanWaktu: "Durasi sesi sekitar 4 jam",
  aktif: true,
  dosis: null,
  jenisObat: null,
  konsentrasiCapd: null,
});

// ── Budi (Transplantasi): 7 obat meds daily, incl. takrolimus 12-jam ───────
const budiMedsSpec = [
  { nama: "Takrolimus", jam: "08:00", dosis: "2 mg", catatan: "Tiap 12 jam, jangan telat" },
  { nama: "Takrolimus", jam: "20:00", dosis: "2 mg", catatan: "Tiap 12 jam, jangan telat" },
  { nama: "Mycophenolate Mofetil", jam: "08:00", dosis: "500 mg", catatan: "Sesudah makan pagi" },
  { nama: "Mycophenolate Mofetil", jam: "20:00", dosis: "500 mg", catatan: "Sesudah makan malam" },
  { nama: "Prednison", jam: "08:00", dosis: "5 mg", catatan: "Sesudah makan pagi" },
  { nama: "Amlodipine", jam: "07:00", dosis: "5 mg", catatan: "Untuk tekanan darah" },
  { nama: "Omeprazole", jam: "07:30", dosis: "20 mg", catatan: "Sebelum makan pagi" },
];
const budiMedReminders = budiMedsSpec.map((m) => ({
  id: addReminder({
    userId: BUDI_ID,
    jenis: "obat",
    nama: m.nama,
    jamPengingat: m.jam,
    hariAktif: ALL_DAYS,
    catatanWaktu: m.catatan,
    aktif: true,
    dosis: m.dosis,
    jenisObat: "minum",
    konsentrasiCapd: null,
  }),
  ...m,
}));

writeJSON("reminder-schedule.json", reminders);

// ─── medication_log + dialysis_log ─────────────────────────────────────────

type MedLogSeed = {
  userId: string;
  reminderId: string;
  namaObat: string;
  dosis: string | null;
  jenisObat: string | null;
  status: "tertunda" | "dikonfirmasi" | "terlewat";
  waktuPengingat: string;
  waktuKonfirmasi: string | null;
};

type DialysisLogSeed = {
  userId: string;
  reminderId: string;
  jenis: "capd" | "hd";
  nama: string;
  konsentrasiCapd: string | null;
  status: "tertunda" | "dikonfirmasi" | "terlewat";
  waktuPengingat: string;
  waktuKonfirmasi: string | null;
};

function decideLogStatus(dateStr: string, hhmm: string): "tertunda" | "dikonfirmasi" | "terlewat" {
  if (dateStr === END_DATE) {
    const [h] = hhmm.split(":").map(Number);
    if (h >= 12) return "tertunda"; // future slot relative to assumed "now" (midday of the final day)
  }
  return rng.chance(0.9) ? "dikonfirmasi" : "terlewat"; // ~90% adherence, within 85-95% spec range
}

const medicationLogsByUser: Record<string, MedLogSeed[]> = { [LUKMAN_ID]: [], [SARI_ID]: [], [BUDI_ID]: [] };
const dialysisLogsByUser: Record<string, DialysisLogSeed[]> = { [LUKMAN_ID]: [], [SARI_ID]: [] };

function generateMedLogs(
  userId: string,
  reminderId: string,
  nama: string,
  dosis: string | null,
  jenisObat: string | null,
  jamPengingat: string,
  hariAktif: string[],
): void {
  for (const date of DATE_LIST) {
    if (!hariAktif.includes(dayNameLower(date))) continue;
    const status = decideLogStatus(date, jamPengingat);
    const waktuPengingat = wibTimestampISO(date, jamPengingat);
    const waktuKonfirmasi = status === "dikonfirmasi" ? addMinutesISO(waktuPengingat, rng.randInt(0, 45)) : null;
    medicationLogsByUser[userId].push({
      userId,
      reminderId,
      namaObat: nama,
      dosis,
      jenisObat,
      status,
      waktuPengingat,
      waktuKonfirmasi,
    });
  }
}

function generateDialysisLogs(
  userId: string,
  reminderId: string,
  jenis: "capd" | "hd",
  nama: string,
  konsentrasiCapd: string | null,
  jamPengingat: string,
  hariAktif: string[],
): void {
  for (const date of DATE_LIST) {
    if (!hariAktif.includes(dayNameLower(date))) continue;
    const status = decideLogStatus(date, jamPengingat);
    const waktuPengingat = wibTimestampISO(date, jamPengingat);
    const waktuKonfirmasi = status === "dikonfirmasi" ? addMinutesISO(waktuPengingat, rng.randInt(0, 30)) : null;
    dialysisLogsByUser[userId].push({
      userId,
      reminderId,
      jenis,
      nama,
      konsentrasiCapd,
      status,
      waktuPengingat,
      waktuKonfirmasi,
    });
  }
}

for (const m of lukmanMedReminders) {
  generateMedLogs(LUKMAN_ID, m.id, m.nama, m.dosis, "minum", m.jam, ALL_DAYS);
}
for (const ex of lukmanCapdReminders) {
  generateDialysisLogs(LUKMAN_ID, ex.id, "capd", "Exchange CAPD", ex.konsentrasi, ex.jam, ALL_DAYS);
}
for (const m of sariMedReminders) {
  generateMedLogs(SARI_ID, m.id, m.nama, m.dosis, "minum", m.jam, ALL_DAYS);
}
generateMedLogs(SARI_ID, sariEpoReminderId, "EPO (Eritropoietin)", "4000 IU", "suntik", "09:00", HD_DAYS);
generateDialysisLogs(SARI_ID, sariHdReminderId, "hd", "Sesi Hemodialisis", null, "08:00", HD_DAYS);
for (const m of budiMedReminders) {
  generateMedLogs(BUDI_ID, m.id, m.nama, m.dosis, "minum", m.jam, ALL_DAYS);
}

writeJSON("medication-log.lukman.json", medicationLogsByUser[LUKMAN_ID]);
writeJSON("medication-log.sari.json", medicationLogsByUser[SARI_ID]);
writeJSON("medication-log.budi.json", medicationLogsByUser[BUDI_ID]);
writeJSON("dialysis-log.lukman.json", dialysisLogsByUser[LUKMAN_ID]);
writeJSON("dialysis-log.sari.json", dialysisLogsByUser[SARI_ID]);

// ─── fluid_log ──────────────────────────────────────────────────────────────

type FluidLogSeed = {
  userId: string;
  tanggal: string;
  waktu: string;
  tipe: "masuk" | "keluar";
  sumber: string | null;
  konsentrasiCapd: string | null;
  volume: string;
  satuan: string;
  kondisiKeluar: string | null;
  catatan: string | null;
  isLateEntry: boolean;
};

const KERUH_DATE = "2026-04-14"; // matches ANCHORED_POSTS Lukman post + anomaly

const lukmanFluid: FluidLogSeed[] = [];
{
  const exchanges = [
    { drain: "06:00", infuse: "06:15", konsentrasi: "1.5%", label: "pagi", baseVol: 1500 },
    { drain: "12:00", infuse: "12:15", konsentrasi: "2.5%", label: "siang", baseVol: 1500 },
    { drain: "18:00", infuse: "18:15", konsentrasi: "1.5%", label: "sore", baseVol: 1500 },
    { drain: "22:00", infuse: "22:15", konsentrasi: "2.5%", label: "malam", baseVol: 2000 },
  ];
  DATE_LIST.forEach((date, dayIdx) => {
    const skipIdx = dayIdx % 5 === 0 ? rng.randInt(0, 3) : -1;
    exchanges.forEach((ex, i) => {
      if (i === skipIdx) return;
      const isKeruh = date === KERUH_DATE && ex.label === "siang";
      const kondisi = isKeruh ? "keruh" : "jernih";
      const drainVolume = isKeruh
        ? Math.round(ex.baseVol * 0.82)
        : Math.round(ex.baseVol * (0.95 + rng.rand() * 0.1));
      lukmanFluid.push({
        userId: LUKMAN_ID,
        tanggal: date,
        waktu: ex.drain,
        tipe: "keluar",
        sumber: null,
        konsentrasiCapd: null,
        volume: String(drainVolume),
        satuan: "ml",
        kondisiKeluar: kondisi,
        catatan: isKeruh
          ? `Drainase siang — cairan keruh, sedikit khawatir. Output ${drainVolume}ml.`
          : `Drainase ${ex.label} — ${kondisi}, volume ${drainVolume}ml`,
        isLateEntry: false,
      });
      lukmanFluid.push({
        userId: LUKMAN_ID,
        tanggal: date,
        waktu: ex.infuse,
        tipe: "masuk",
        sumber: "capd",
        konsentrasiCapd: ex.konsentrasi,
        volume: String(ex.baseVol),
        satuan: "ml",
        kondisiKeluar: null,
        catatan: `Infus ${ex.konsentrasi} ${ex.baseVol}ml — ${ex.label}`,
        isLateEntry: false,
      });
    });
    const lukmanDrinkTimes = ["09:30", "15:00", "21:00"];
    for (const drinkTime of lukmanDrinkTimes) {
      if (rng.chance(0.55)) {
        lukmanFluid.push({
          userId: LUKMAN_ID,
          tanggal: date,
          waktu: drinkTime,
          tipe: "masuk",
          sumber: "minuman",
          konsentrasiCapd: null,
          volume: String(rng.randInt(150, 250)),
          satuan: "ml",
          kondisiKeluar: null,
          catatan: null,
          isLateEntry: false,
        });
      }
    }
  });
}

const sariFluid: FluidLogSeed[] = [];
{
  const times = ["07:00", "10:00", "13:00", "16:00", "19:00"];
  for (const date of DATE_LIST) {
    const drinkCount = rng.randInt(4, 6);
    for (let i = 0; i < drinkCount; i++) {
      const vol = isLebaranAftermath(date) ? rng.randInt(300, 450) : rng.randInt(150, 300);
      const sumber = rng.chance(0.7) ? "minuman" : "makanan";
      sariFluid.push({
        userId: SARI_ID,
        tanggal: date,
        waktu: times[i] ?? `${String(rng.randInt(6, 21)).padStart(2, "0")}:00`,
        tipe: "masuk",
        sumber,
        konsentrasiCapd: null,
        volume: String(vol),
        satuan: "ml",
        kondisiKeluar: null,
        catatan: null,
        isLateEntry: false,
      });
    }
    if (rng.chance(0.4)) {
      sariFluid.push({
        userId: SARI_ID,
        tanggal: date,
        waktu: "08:00",
        tipe: "keluar",
        sumber: "urine",
        konsentrasiCapd: null,
        volume: String(rng.randInt(100, 300)),
        satuan: "ml",
        kondisiKeluar: null,
        catatan: null,
        isLateEntry: false,
      });
    }
  }
}

const budiFluid: FluidLogSeed[] = [];
{
  const times = ["07:30", "12:00", "15:30", "20:00"];
  for (const date of DATE_LIST) {
    const drinkCount = rng.randInt(3, 5);
    for (let i = 0; i < drinkCount; i++) {
      const vol = rng.randInt(200, 350);
      const sumber = rng.chance(0.6) ? "minuman" : "makanan";
      budiFluid.push({
        userId: BUDI_ID,
        tanggal: date,
        waktu: times[i] ?? `${String(rng.randInt(6, 21)).padStart(2, "0")}:00`,
        tipe: "masuk",
        sumber,
        konsentrasiCapd: null,
        volume: String(vol),
        satuan: "ml",
        kondisiKeluar: null,
        catatan: null,
        isLateEntry: false,
      });
    }
    if (rng.chance(0.5)) {
      budiFluid.push({
        userId: BUDI_ID,
        tanggal: date,
        waktu: "09:00",
        tipe: "keluar",
        sumber: "urine",
        konsentrasiCapd: null,
        volume: String(rng.randInt(800, 1500)),
        satuan: "ml",
        kondisiKeluar: null,
        catatan: null,
        isLateEntry: false,
      });
    }
  }
}

writeJSON("fluid-log.lukman.json", lukmanFluid);
writeJSON("fluid-log.sari.json", sariFluid);
writeJSON("fluid-log.budi.json", budiFluid);

// ─── daily_activities ───────────────────────────────────────────────────────

type ActivitySeed = {
  userId: string;
  namaKegiatan: string;
  waktuMulai: string;
  estimasiSelesai: string;
  status: "berlangsung" | "selesai";
  waktuSelesai: string | null;
  perasaan: string | null;
  catatanPerasaan: string | null;
};

const ACTIVITY_POOL = [
  { nama: "Jalan pagi santai", jam: "06:00", menit: 30, perasaan: "nyaman", catatan: "Jalan santai keliling komplek, cuaca cerah." },
  { nama: "Senam ringan", jam: "07:00", menit: 20, perasaan: "nyaman", catatan: "Peregangan ringan sesuai panduan." },
  { nama: "Memasak", jam: "08:00", menit: 45, perasaan: "biasa", catatan: "Menyiapkan sarapan untuk keluarga." },
  { nama: "Membaca buku", jam: "19:30", menit: 60, perasaan: "biasa", catatan: "Membaca buku ringan sebelum tidur." },
  { nama: "Berkebun", jam: "16:00", menit: 40, perasaan: "nyaman", catatan: "Menyiram tanaman di halaman." },
  { nama: "Menonton TV", jam: "20:00", menit: 90, perasaan: "biasa", catatan: "Menonton berita malam." },
  { nama: "Jalan sore", jam: "17:00", menit: 30, perasaan: "biasa", catatan: "Jalan santai sore hari, sedikit capek." },
  { nama: "Istirahat siang", jam: "13:30", menit: 45, perasaan: "lelah", catatan: "Merasa agak lelah, memutuskan istirahat sebentar." },
];
const DOCTOR_VISIT_NAMA = "Kontrol ke poliklinik ginjal";

function generateActivities(userId: string): ActivitySeed[] {
  const acts: ActivitySeed[] = [];
  DATE_LIST.forEach((date, dayIdx) => {
    const r = rng.rand();
    const numActs = r < 0.05 ? 0 : r < 0.5 ? 1 : 2;
    for (let i = 0; i < numActs; i++) {
      const pick = rng.pick(ACTIVITY_POOL);
      const waktuMulai = wibTimestampISO(date, pick.jam);
      const estimasiSelesai = addMinutesISO(waktuMulai, pick.menit);
      const isLastActToday = date === END_DATE && i === numActs - 1;
      if (isLastActToday && rng.chance(0.5)) {
        acts.push({
          userId,
          namaKegiatan: pick.nama,
          waktuMulai,
          estimasiSelesai,
          status: "berlangsung",
          waktuSelesai: null,
          perasaan: null,
          catatanPerasaan: null,
        });
      } else {
        acts.push({
          userId,
          namaKegiatan: pick.nama,
          waktuMulai,
          estimasiSelesai,
          status: "selesai",
          waktuSelesai: addMinutesISO(estimasiSelesai, rng.randInt(0, 10)),
          perasaan: pick.perasaan,
          catatanPerasaan: pick.catatan,
        });
      }
    }
    // Doctor visit roughly once a month (day 15 of each ~30-day block)
    if (dayIdx % 30 === 15) {
      acts.push({
        userId,
        namaKegiatan: DOCTOR_VISIT_NAMA,
        waktuMulai: wibTimestampISO(date, "10:00"),
        estimasiSelesai: wibTimestampISO(date, "11:00"),
        status: "selesai",
        waktuSelesai: wibTimestampISO(date, "11:15"),
        perasaan: "biasa",
        catatanPerasaan: "Kontrol rutin, hasil evaluasi didiskusikan dengan dokter.",
      });
    }
  });
  return acts;
}

writeJSON("daily-activities.lukman.json", generateActivities(LUKMAN_ID));
writeJSON("daily-activities.sari.json", generateActivities(SARI_ID));
writeJSON("daily-activities.budi.json", generateActivities(BUDI_ID));

// ─── lab_results ────────────────────────────────────────────────────────────

type LabResultSeed = {
  id: string;
  userId: string;
  tanggalPemeriksaan: string;
  kategori: string | null;
  namaParameter: string;
  nilai: string;
  satuan: string | null;
  nilaiRujukan: string | null;
  catatan: string | null;
  sumber: string;
  fileId: null;
  diarsipkan: boolean;
};

const labResults: LabResultSeed[] = [];
const labResultIdsByUser: Record<string, string[]> = { [LUKMAN_ID]: [], [SARI_ID]: [], [BUDI_ID]: [] };

function addLabPanel(
  userId: string,
  tanggal: string,
  params: Array<{
    kategori: string;
    namaParameter: string;
    nilai: string;
    satuan: string;
    nilaiRujukan: string;
    catatan?: string;
  }>,
): void {
  for (const p of params) {
    const id = rng.uuid();
    labResultIdsByUser[userId].push(id);
    labResults.push({
      id,
      userId,
      tanggalPemeriksaan: tanggal,
      kategori: p.kategori,
      namaParameter: p.namaParameter,
      nilai: p.nilai,
      satuan: p.satuan,
      nilaiRujukan: p.nilaiRujukan,
      catatan: p.catatan ?? null,
      sumber: "manual",
      fileId: null,
      diarsipkan: false,
    });
  }
}

// Lukman (CAPD) — improving trend over 6 months
const lukmanLabDates = ["2026-01-20", "2026-02-25", "2026-04-05", "2026-05-15", "2026-06-25"];
const lukmanCreatinine = ["3.4", "3.1", "2.9", "2.7", "2.6"];
const lukmanUreum = ["92", "85", "76", "68", "62"];
const lukmanHb = ["10.0", "10.4", "10.9", "11.2", "11.5"];
lukmanLabDates.forEach((tgl, i) => {
  addLabPanel(LUKMAN_ID, tgl, [
    { kategori: "Fungsi Ginjal", namaParameter: "Kreatinin", nilai: lukmanCreatinine[i], satuan: "mg/dL", nilaiRujukan: "0.6-1.2" },
    { kategori: "Fungsi Ginjal", namaParameter: "Ureum", nilai: lukmanUreum[i], satuan: "mg/dL", nilaiRujukan: "10-50" },
    {
      kategori: "Darah Lengkap",
      namaParameter: "Hemoglobin",
      nilai: lukmanHb[i],
      satuan: "g/dL",
      nilaiRujukan: "13.0-17.0",
      catatan: i === lukmanLabDates.length - 1 ? "Hb membaik dibanding pemeriksaan sebelumnya, lanjutkan terapi ESA." : undefined,
    },
    { kategori: "Elektrolit", namaParameter: "Kalium", nilai: (4.6 + i * 0.05).toFixed(1), satuan: "mEq/L", nilaiRujukan: "3.5-5.0" },
    { kategori: "Elektrolit", namaParameter: "Natrium", nilai: String(137 + i), satuan: "mEq/L", nilaiRujukan: "136-145" },
  ]);
});

// Sari (HD) — kalium spike right after Lebaran
const sariLabDates = ["2026-01-25", "2026-03-05", "2026-03-27", "2026-05-10", "2026-06-20"];
const sariKalium = ["4.8", "5.1", "6.2", "5.0", "4.7"];
const sariHb = ["10.2", "10.5", "10.3", "10.8", "11.0"];
sariLabDates.forEach((tgl, i) => {
  const isSpike = tgl === "2026-03-27";
  addLabPanel(SARI_ID, tgl, [
    { kategori: "Fungsi Ginjal", namaParameter: "Kreatinin", nilai: (8.5 - i * 0.1).toFixed(1), satuan: "mg/dL", nilaiRujukan: "0.6-1.2" },
    { kategori: "Fungsi Ginjal", namaParameter: "Ureum", nilai: String(78 - i * 2), satuan: "mg/dL", nilaiRujukan: "10-50" },
    { kategori: "Darah Lengkap", namaParameter: "Hemoglobin", nilai: sariHb[i], satuan: "g/dL", nilaiRujukan: "13.0-17.0" },
    {
      kategori: "Elektrolit",
      namaParameter: "Kalium",
      nilai: sariKalium[i],
      satuan: "mEq/L",
      nilaiRujukan: "3.5-5.0",
      catatan: isSpike
        ? "Kalium tinggi, kemungkinan besar terkait pola makan buah dan santan berlebih pasca-lebaran. Perlu evaluasi pola makan."
        : undefined,
    },
    { kategori: "Elektrolit", namaParameter: "Natrium", nilai: String(137 + i), satuan: "mEq/L", nilaiRujukan: "136-145" },
  ]);
});

// Budi (Transplantasi) — stabilizing post-transplant trend
const budiLabDates = ["2026-01-15", "2026-02-20", "2026-03-30", "2026-05-08", "2026-06-18"];
const budiCreatinine = ["1.8", "1.6", "1.4", "1.3", "1.2"];
budiLabDates.forEach((tgl, i) => {
  addLabPanel(BUDI_ID, tgl, [
    {
      kategori: "Fungsi Ginjal",
      namaParameter: "Kreatinin",
      nilai: budiCreatinine[i],
      satuan: "mg/dL",
      nilaiRujukan: "0.6-1.2",
      catatan: i === budiCreatinine.length - 1 ? "Fungsi ginjal cangkokan stabil dan membaik." : undefined,
    },
    { kategori: "Fungsi Ginjal", namaParameter: "Ureum", nilai: String(45 - i * 2), satuan: "mg/dL", nilaiRujukan: "10-50" },
    { kategori: "Darah Lengkap", namaParameter: "Hemoglobin", nilai: (11.0 + i * 0.3).toFixed(1), satuan: "g/dL", nilaiRujukan: "13.0-17.0" },
    { kategori: "Elektrolit", namaParameter: "Kalium", nilai: (4.3 + i * 0.02).toFixed(1), satuan: "mEq/L", nilaiRujukan: "3.5-5.0" },
    { kategori: "Elektrolit", namaParameter: "Natrium", nilai: String(138 + i), satuan: "mEq/L", nilaiRujukan: "136-145" },
  ]);
});

writeJSON("lab-results.json", labResults);

// ─── anomaly_alerts (~6 total) ──────────────────────────────────────────────
// D-02: severity is FIXED per tipeAnomali by the rule engine, never chosen
// per-alert — kondisi_cairan_abnormal/jadwal_terlewat are always "tinggi";
// penurunan_volume_keluar/pola_asupan_menyimpang are always "normal". Some
// of this plan's narrative descriptions ("Sari kalium-tinggi") don't map to
// a rule type that is fixed-tinggi, so the narrative is preserved in
// `deskripsi` while `severity` follows the type's fixed mapping (documented
// as a deviation in SUMMARY.md).

type AnomalyAlertSeed = {
  userId: string;
  tipeAnomali: string;
  severity: "normal" | "tinggi";
  confidenceScore: number;
  deskripsi: string;
  status: "aktif" | "dibaca" | "ditindaklanjuti";
  feedbackPengguna: null;
  tipePasien: string;
  ruleData: Record<string, unknown>;
  isFallback: boolean;
  createdAt: string;
};

const anomalyAlerts: AnomalyAlertSeed[] = [
  {
    userId: LUKMAN_ID,
    tipeAnomali: "kondisi_cairan_abnormal",
    severity: "tinggi",
    confidenceScore: 88,
    deskripsi: appendDisclaimer(
      "Cairan hasil drainase CAPD siang ini tercatat keruh, berbeda dari kondisi biasanya yang jernih. " +
        "Kondisi ini sebaiknya tidak ditunggu — segera hubungi tim medis atau perawat dialisis Anda untuk pemeriksaan lebih lanjut.",
    ),
    status: "ditindaklanjuti",
    feedbackPengguna: null,
    tipePasien: "capd",
    ruleData: { kondisiKeluar: "keruh", tanggal: KERUH_DATE },
    isFallback: false,
    createdAt: wibTimestampISO(KERUH_DATE, "12:30"),
  },
  {
    userId: LUKMAN_ID,
    tipeAnomali: "penurunan_volume_keluar",
    severity: "normal",
    confidenceScore: 62,
    deskripsi: appendDisclaimer(
      "Rata-rata volume cairan keluar 3 hari terakhir sedikit menurun dibandingkan hari-hari sebelumnya. " +
        "Ini bisa menjadi hal yang wajar, namun tetap perhatikan pola cairan Anda beberapa hari ke depan.",
    ),
    status: "dibaca",
    feedbackPengguna: null,
    tipePasien: "capd",
    ruleData: { declinePercent: 34, thresholdPercent: 30 },
    isFallback: false,
    createdAt: wibTimestampISO("2026-05-20", "09:00"),
  },
  {
    userId: SARI_ID,
    tipeAnomali: "pola_asupan_menyimpang",
    severity: "normal",
    confidenceScore: 70,
    deskripsi: appendDisclaimer(
      "Pola asupan cairan dan makanan Anda pekan ini menyimpang dari kebiasaan, kemungkinan besar terkait momen open house lebaran. " +
        "Hasil lab kalium terbaru juga menunjukkan sedikit peningkatan — sebaiknya kembali perhatikan porsi buah dan makanan bersantan.",
    ),
    status: "ditindaklanjuti",
    feedbackPengguna: null,
    tipePasien: "hd",
    ruleData: { deviationPercent: 42, konteks: "pasca_lebaran" },
    isFallback: false,
    createdAt: wibTimestampISO("2026-03-27", "10:00"),
  },
  {
    userId: SARI_ID,
    tipeAnomali: "penurunan_volume_keluar",
    severity: "normal",
    confidenceScore: 55,
    deskripsi: appendDisclaimer(
      "Volume urine yang tercatat beberapa hari terakhir sedikit lebih rendah dari rata-rata biasanya. " +
        "Tetap lanjutkan pencatatan harian agar pola ini bisa dipantau bersama tim medis.",
    ),
    status: "aktif",
    feedbackPengguna: null,
    tipePasien: "hd",
    ruleData: { declinePercent: 31, thresholdPercent: 30 },
    isFallback: false,
    createdAt: wibTimestampISO("2026-06-02", "08:30"),
  },
  {
    userId: BUDI_ID,
    tipeAnomali: "jadwal_terlewat",
    severity: "tinggi",
    confidenceScore: 80,
    deskripsi: appendDisclaimer(
      "Dosis Takrolimus pagi belum terkonfirmasi pada jam yang dijadwalkan. Karena obat ini perlu diminum tepat waktu " +
        "setiap 12 jam pasca-transplantasi, segera konfirmasi atau minum dosis ini sesegera mungkin bila belum.",
    ),
    status: "ditindaklanjuti",
    feedbackPengguna: null,
    tipePasien: "transplantasi",
    ruleData: { reminderNama: "Takrolimus pagi", jamPengingat: "08:00" },
    isFallback: false,
    createdAt: wibTimestampISO("2026-02-10", "08:15"),
  },
  {
    userId: BUDI_ID,
    tipeAnomali: "penurunan_volume_keluar",
    severity: "normal",
    confidenceScore: 50,
    deskripsi: appendDisclaimer(
      "Volume urine 3 hari terakhir tercatat sedikit lebih rendah dari kebiasaan Anda. Perhatikan asupan cairan harian dan " +
        "catat bila muncul gejala lain seperti bengkak atau penurunan berat badan mendadak.",
    ),
    status: "aktif",
    feedbackPengguna: null,
    tipePasien: "transplantasi",
    ruleData: { declinePercent: 32, thresholdPercent: 30 },
    isFallback: false,
    createdAt: wibTimestampISO("2026-06-15", "09:00"),
  },
];

writeJSON("anomaly-alerts.json", anomalyAlerts);

// ─── AI caches: daily summaries, weekly insights, lifestyle, lab analyses ──

type AiDailySummarySeed = { userId: string; tanggal: string; ringkasanText: string; isFallback: boolean };
type AiWeeklyInsightSeed = { userId: string; pekan: string; wawasanText: string; isFallback: boolean };
type AiLifestyleSeed = { userId: string; tanggal: string; saranText: string; isFallback: boolean };
type AiLabAnalysisSeed = { labResultId: string; analisisText: string; isFallback: boolean };

const PERSONAS = [
  { id: LUKMAN_ID, nama: "Lukman Hakim", metode: "CAPD" },
  { id: SARI_ID, nama: "Sari Wulandari", metode: "HD" },
  { id: BUDI_ID, nama: "Budi Santoso", metode: "Transplantasi" },
];

const aiDailySummaries: AiDailySummarySeed[] = [];
const aiWeeklyInsights: AiWeeklyInsightSeed[] = [];
const aiLifestyleSuggestions: AiLifestyleSeed[] = [];
const aiLabAnalyses: AiLabAnalysisSeed[] = [];

const RECENT_14_DATES = DATE_LIST.slice(-14);
const RECENT_7_DATES = DATE_LIST.slice(-7);
const FOCUS_AREAS = ["cairan", "aktivitas", "obat", "istirahat"] as const;

for (const persona of PERSONAS) {
  for (const tanggal of RECENT_14_DATES) {
    aiDailySummaries.push({
      userId: persona.id,
      tanggal,
      ringkasanText: buildDailySummary(rng, {
        namaLengkap: persona.nama,
        metodeTerapi: persona.metode,
        tanggal,
        fluidBalanceMl: rng.randInt(-400, 400),
        medAdherencePercent: rng.randInt(75, 98),
      }),
      isFallback: false,
    });
  }

  const recentWeekKeys = Array.from(new Set(RECENT_14_DATES.map((d) => isoWeekKey(d))));
  // pad to ~8 distinct recent weeks by walking further back if needed
  let cursor = -14;
  while (recentWeekKeys.length < 8 && Math.abs(cursor) < 180) {
    const d = DATE_LIST[DATE_LIST.length + cursor] ?? DATE_LIST[0];
    const key = isoWeekKey(d);
    if (!recentWeekKeys.includes(key)) recentWeekKeys.push(key);
    cursor -= 7;
  }
  for (const pekan of recentWeekKeys.slice(0, 8)) {
    aiWeeklyInsights.push({
      userId: persona.id,
      pekan,
      wawasanText: buildWeeklyInsight(rng, {
        namaLengkap: persona.nama,
        metodeTerapi: persona.metode,
        pekan,
        avgFluidBalanceMl: rng.randInt(-300, 300),
        adherenceTrend: rng.pick(["membaik", "stabil", "menurun"] as const),
      }),
      isFallback: false,
    });
  }

  for (const tanggal of RECENT_7_DATES) {
    aiLifestyleSuggestions.push({
      userId: persona.id,
      tanggal,
      saranText: buildLifestyleSuggestion(rng, {
        namaLengkap: persona.nama,
        metodeTerapi: persona.metode,
        tanggal,
        focusArea: rng.pick(FOCUS_AREAS),
      }),
      isFallback: false,
    });
  }

  // 1 analysis per each of the 2 most recent lab panels' Kreatinin row
  const ids = labResultIdsByUser[persona.id];
  const recentPanelStride = 5; // 5 params/panel
  const lastPanelStart = ids.length - recentPanelStride;
  const secondLastPanelStart = ids.length - recentPanelStride * 2;
  for (const panelStart of [secondLastPanelStart, lastPanelStart]) {
    if (panelStart < 0) continue;
    const labResultId = ids[panelStart]; // Kreatinin is always param[0] per addLabPanel() call order
    const row = labResults.find((l) => l.id === labResultId)!;
    aiLabAnalyses.push({
      labResultId,
      analisisText: buildLabAnalysis(rng, {
        namaLengkap: persona.nama,
        metodeTerapi: persona.metode,
        tanggalPemeriksaan: row.tanggalPemeriksaan,
        namaParameter: row.namaParameter,
        nilai: row.nilai,
        satuan: row.satuan,
        nilaiRujukan: row.nilaiRujukan,
        statusDesc: rng.pick(["dalam rentang normal", "sedikit di luar rentang normal"] as const),
      }),
      isFallback: false,
    });
  }
}

writeJSON("ai-daily-summaries.json", aiDailySummaries);
writeJSON("ai-weekly-insights.json", aiWeeklyInsights);
writeJSON("ai-lifestyle-suggestions.json", aiLifestyleSuggestions);
writeJSON("ai-lab-analyses.json", aiLabAnalyses);

// ─── Community ──────────────────────────────────────────────────────────────

type CommunityPostSeed = {
  id: string;
  userId: string;
  judul: string;
  isi: string;
  kategori: string;
  metodeTerapi: string;
  diarsipkan: boolean;
  createdAt: string;
};
type CommunityReplySeed = {
  id: string;
  postId: string;
  userId: string;
  isi: string;
  createdAt: string;
};
type CommunityHelpfulSeed = { replyId: string; userId: string; createdAt: string };

const communityPosts: CommunityPostSeed[] = [];
const communityReplies: CommunityReplySeed[] = [];
const communityReplyHelpful: CommunityHelpfulSeed[] = [];
const helpfulSeen = new Set<string>();

const PERSONA_BY_KEY: Record<"lukman" | "sari" | "budi", { id: string; nama: string }> = {
  lukman: { id: LUKMAN_ID, nama: "Lukman Hakim" },
  sari: { id: SARI_ID, nama: "Sari Wulandari" },
  budi: { id: BUDI_ID, nama: "Budi Santoso" },
};
const PERSONA_KEYS: Array<"lukman" | "sari" | "budi"> = ["lukman", "sari", "budi"];

function addReplies(postId: string, entries: Array<{ authorKey: "lukman" | "sari" | "budi"; isi: string; createdAt: string }>): void {
  for (const entry of entries) {
    const replyId = rng.uuid();
    communityReplies.push({
      id: replyId,
      postId,
      userId: PERSONA_BY_KEY[entry.authorKey].id,
      isi: entry.isi,
      createdAt: entry.createdAt,
    });
    // helpful marks from the other two personas
    for (const key of PERSONA_KEYS) {
      if (key === entry.authorKey) continue;
      if (rng.chance(0.4)) {
        const dedupeKey = `${replyId}:${PERSONA_BY_KEY[key].id}`;
        if (!helpfulSeen.has(dedupeKey)) {
          helpfulSeen.add(dedupeKey);
          communityReplyHelpful.push({
            replyId,
            userId: PERSONA_BY_KEY[key].id,
            createdAt: addMinutesISO(entry.createdAt, rng.randInt(10, 600)),
          });
        }
      }
    }
  }
}

// Anchored narrative posts
for (const anchored of ANCHORED_POSTS) {
  const postId = rng.uuid();
  const createdAt = wibTimestampISO(anchored.tanggal, "10:00");
  communityPosts.push({
    id: postId,
    userId: PERSONA_BY_KEY[anchored.authorKey].id,
    judul: anchored.judul,
    isi: anchored.isi,
    kategori: anchored.kategori,
    metodeTerapi: anchored.metodeTerapi,
    diarsipkan: false,
    createdAt,
  });
  addReplies(
    postId,
    anchored.replies.map((r, i) => ({ ...r, createdAt: addMinutesISO(createdAt, 60 * (i + 1)) })),
  );
}

// Templated posts spread across the 180-day window
const TARGET_GENERATED_POSTS = 37;
for (let i = 0; i < TARGET_GENERATED_POSTS; i++) {
  const template = POST_TEMPLATES[i % POST_TEMPLATES.length];
  const authorKey = rng.pick(PERSONA_KEYS);
  const dayOffset = rng.randInt(0, 179);
  const tanggal = DATE_LIST[dayOffset];
  const angka = rng.randInt(5, 175);
  const judul = template.judulTemplate.replace("{angka}", String(angka));
  const isi = template.isiTemplate.replace("{angka}", String(angka));
  const postId = rng.uuid();
  const createdAt = wibTimestampISO(tanggal, `${String(rng.randInt(7, 21)).padStart(2, "0")}:${rng.chance(0.5) ? "00" : "30"}`);

  communityPosts.push({
    id: postId,
    userId: PERSONA_BY_KEY[authorKey].id,
    judul,
    isi,
    kategori: template.kategori,
    metodeTerapi: template.metodeTerapi,
    diarsipkan: false,
    createdAt,
  });

  const replyCount = rng.randInt(1, 4);
  const otherKeys = PERSONA_KEYS.filter((k) => k !== authorKey);
  const replyEntries = [];
  for (let r = 0; r < replyCount; r++) {
    const replyAuthor = otherKeys.length > 0 ? rng.pick(otherKeys.concat(rng.chance(0.3) ? [authorKey] : [])) : authorKey;
    replyEntries.push({
      authorKey: replyAuthor,
      isi: rng.pick(REPLY_TEMPLATES),
      createdAt: addMinutesISO(createdAt, 30 * (r + 1)),
    });
  }
  addReplies(postId, replyEntries);
}

writeJSON("community-posts.json", communityPosts);
writeJSON("community-replies.json", communityReplies);
writeJSON("community-reply-helpful.json", communityReplyHelpful);

// ─── education_content ─────────────────────────────────────────────────────

const educationContent = educationArticles.map((a) => ({ id: rng.uuid(), ...a }));
writeJSON("education-content.json", educationContent);

// ─── users.json (written last, after all cross-references resolved) ───────

writeJSON("users.json", users);

console.log("\n✅ Demo data generation complete.");
console.log(`   Date range: ${START_DATE} .. ${END_DATE} (${DATE_LIST.length} days)`);
console.log(`   Users: ${users.length}`);
console.log(`   Reminders: ${reminders.length}`);
console.log(
  `   Medication logs: ${Object.values(medicationLogsByUser).reduce((s, a) => s + a.length, 0)}`,
);
console.log(
  `   Dialysis logs: ${Object.values(dialysisLogsByUser).reduce((s, a) => s + a.length, 0)}`,
);
console.log(`   Fluid logs: ${lukmanFluid.length + sariFluid.length + budiFluid.length}`);
console.log(`   Lab results: ${labResults.length}`);
console.log(`   Anomaly alerts: ${anomalyAlerts.length}`);
console.log(`   Community posts: ${communityPosts.length}, replies: ${communityReplies.length}, helpful marks: ${communityReplyHelpful.length}`);
console.log(`   Education articles: ${educationContent.length}`);
