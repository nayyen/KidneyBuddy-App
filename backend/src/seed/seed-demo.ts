/**
 * seed-demo.ts — Demo Seed Loader (DEMO-SEED)
 *
 * Reads the committed, deterministically-generated JSON under seed/data/
 * (see generate-demo-data.ts) and loads it into Postgres:
 *   1. TRUNCATE all user-data tables (CASCADE, RESTART IDENTITY) — a full
 *      run always starts from zero old-seed rows.
 *   2. Insert every section in FK-dependency order, in batches of <=500
 *      rows, hashing the demo password and encrypting the 8 sensitive
 *      columns exactly as the running app does (contracts_verified).
 *
 * Run (full): npm run seed:demo
 * Run (single section, for iterative debugging — assumes parents already
 * loaded; NOT the supported full-reseed path): npm run seed:demo -- fluid
 *
 * Requires: DATABASE_URL, ENCRYPTION_KEY env vars (same ones the API uses —
 * a mismatched ENCRYPTION_KEY silently breaks decryption at read time).
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db, pool } from "../lib/db.js";
import { encrypt } from "../lib/encryption.js";
import { hashPassword } from "../utils/passwordHash.js";
import * as schema from "../db/schema/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const DEMO_PASSWORD = "Demo1234!";
const BATCH_SIZE = 500;

function readJSON<T>(filename: string): T {
  return JSON.parse(readFileSync(path.join(DATA_DIR, filename), "utf8")) as T;
}

function toDate(v: string | null | undefined): Date | null {
  return v == null ? null : new Date(v);
}

async function insertInBatches<T extends Record<string, unknown>>(
  table: Parameters<typeof db.insert>[0],
  rows: T[],
  label: string,
): Promise<void> {
  if (rows.length === 0) {
    console.log(`  (skip) ${label}: 0 rows`);
    return;
  }
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(table).values(batch as never);
  }
  console.log(`  ✓ ${label}: ${rows.length} rows`);
}

// ─── Section loaders ────────────────────────────────────────────────────────

type UserJson = {
  userId: string;
  namaLengkap: string;
  email: string;
  passwordHash: string;
  informedConsent: boolean;
  metodeTerapiAktif: string;
  tanggalMulaiTerapi: string;
  role: string;
  riwayatTerapi: string[];
  timezone: string;
  onboardingProgress: { lastCompletedStep: number; reminderConfigured: boolean; completedAt: string };
  therapyHistory: Array<{ metodeSebelum: string | null; metodeBaru: string; changedAt: string }>;
};

async function loadUsers(): Promise<void> {
  const users = readJSON<UserJson[]>("users.json");

  const realHash = await hashPassword(DEMO_PASSWORD);
  const userRows = users.map((u) => ({
    userId: u.userId,
    namaLengkap: u.namaLengkap,
    email: u.email,
    passwordHash: realHash, // loader owns hashing — never trust the generator's placeholder
    informedConsent: u.informedConsent,
    metodeTerapiAktif: u.metodeTerapiAktif,
    tanggalMulaiTerapi: u.tanggalMulaiTerapi,
    role: u.role,
    riwayatTerapi: u.riwayatTerapi,
    timezone: u.timezone,
  }));
  await insertInBatches(schema.users, userRows, "users");

  const onboardingRows = users.map((u) => ({
    userId: u.userId,
    lastCompletedStep: u.onboardingProgress.lastCompletedStep,
    reminderConfigured: u.onboardingProgress.reminderConfigured,
    completedAt: toDate(u.onboardingProgress.completedAt),
  }));
  await insertInBatches(schema.onboardingProgress, onboardingRows, "onboarding_progress");

  const therapyHistoryRows = users.flatMap((u) =>
    u.therapyHistory.map((h) => ({
      userId: u.userId,
      metodeSebelum: h.metodeSebelum,
      metodeBaru: h.metodeBaru,
      changedAt: toDate(h.changedAt)!,
    })),
  );
  await insertInBatches(schema.therapyHistory, therapyHistoryRows, "therapy_history");
}

type ReminderJson = {
  id: string;
  userId: string;
  jenis: string;
  nama: string;
  jamPengingat: string;
  hariAktif: string[];
  catatanWaktu: string | null;
  aktif: boolean;
  dosis: string | null;
  jenisObat: string | null;
  fotoObat: string | null;
  konsentrasiCapd: string | null;
};

async function loadReminders(): Promise<void> {
  const reminders = readJSON<ReminderJson[]>("reminder-schedule.json");
  await insertInBatches(schema.reminderSchedule, reminders, "reminder_schedule");
}

type FluidLogJson = {
  userId: string;
  tanggal: string;
  waktu: string;
  tipe: string;
  sumber: string | null;
  konsentrasiCapd: string | null;
  volume: string;
  satuan: string;
  kondisiKeluar: string | null;
  catatan: string | null;
  isLateEntry: boolean;
};

async function loadFluid(): Promise<void> {
  for (const persona of ["lukman", "sari", "budi"]) {
    const rows = readJSON<FluidLogJson[]>(`fluid-log.${persona}.json`);
    const encrypted = rows.map((r) => ({ ...r, catatan: r.catatan ? encrypt(r.catatan) : null }));
    await insertInBatches(schema.fluidLog, encrypted, `fluid_log (${persona})`);
  }
}

type MedLogJson = {
  userId: string;
  reminderId: string;
  namaObat: string;
  dosis: string | null;
  jenisObat: string | null;
  status: string;
  waktuPengingat: string;
  waktuKonfirmasi: string | null;
};

async function loadMedicationLogs(): Promise<void> {
  for (const persona of ["lukman", "sari", "budi"]) {
    const rows = readJSON<MedLogJson[]>(`medication-log.${persona}.json`);
    const converted = rows.map((r) => ({
      ...r,
      waktuPengingat: toDate(r.waktuPengingat)!,
      waktuKonfirmasi: toDate(r.waktuKonfirmasi),
    }));
    await insertInBatches(schema.medicationLog, converted, `medication_log (${persona})`);
  }
}

type DialysisLogJson = {
  userId: string;
  reminderId: string;
  jenis: string;
  nama: string;
  konsentrasiCapd: string | null;
  status: string;
  waktuPengingat: string;
  waktuKonfirmasi: string | null;
};

async function loadDialysisLogs(): Promise<void> {
  for (const persona of ["lukman", "sari"]) {
    const rows = readJSON<DialysisLogJson[]>(`dialysis-log.${persona}.json`);
    const converted = rows.map((r) => ({
      ...r,
      waktuPengingat: toDate(r.waktuPengingat)!,
      waktuKonfirmasi: toDate(r.waktuKonfirmasi),
    }));
    await insertInBatches(schema.dialysisLog, converted, `dialysis_log (${persona})`);
  }
}

type ActivityJson = {
  userId: string;
  namaKegiatan: string;
  waktuMulai: string;
  estimasiSelesai: string;
  status: string;
  waktuSelesai: string | null;
  perasaan: string | null;
  catatanPerasaan: string | null;
};

async function loadActivities(): Promise<void> {
  for (const persona of ["lukman", "sari", "budi"]) {
    const rows = readJSON<ActivityJson[]>(`daily-activities.${persona}.json`);
    const converted = rows.map((r) => ({
      ...r,
      waktuMulai: toDate(r.waktuMulai)!,
      estimasiSelesai: toDate(r.estimasiSelesai)!,
      waktuSelesai: toDate(r.waktuSelesai),
      catatanPerasaan: r.catatanPerasaan ? encrypt(r.catatanPerasaan) : null,
    }));
    await insertInBatches(schema.dailyActivities, converted, `daily_activities (${persona})`);
  }
}

type LabResultJson = {
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
  fileId: string | null;
  diarsipkan: boolean;
};

async function loadLabResults(): Promise<void> {
  const rows = readJSON<LabResultJson[]>("lab-results.json");
  const encrypted = rows.map((r) => ({ ...r, catatan: r.catatan ? encrypt(r.catatan) : null }));
  await insertInBatches(schema.labResults, encrypted, "lab_results");
}

type AnomalyAlertJson = {
  userId: string;
  tipeAnomali: string;
  severity: string;
  confidenceScore: number;
  deskripsi: string;
  status: string;
  feedbackPengguna: string | null;
  tipePasien: string;
  ruleData: Record<string, unknown>;
  isFallback: boolean;
  createdAt: string;
};

async function loadAnomalyAlerts(): Promise<void> {
  const rows = readJSON<AnomalyAlertJson[]>("anomaly-alerts.json");
  const converted = rows.map((r) => ({ ...r, deskripsi: encrypt(r.deskripsi), createdAt: toDate(r.createdAt)! }));
  await insertInBatches(schema.anomalyAlerts, converted, "anomaly_alerts");
}

type AiDailySummaryJson = { userId: string; tanggal: string; ringkasanText: string; isFallback: boolean };
type AiWeeklyInsightJson = { userId: string; pekan: string; wawasanText: string; isFallback: boolean };
type AiLifestyleJson = { userId: string; tanggal: string; saranText: string; isFallback: boolean };
type AiLabAnalysisJson = { labResultId: string; analisisText: string; isFallback: boolean };

async function loadAiCaches(): Promise<void> {
  const dailySummaries = readJSON<AiDailySummaryJson[]>("ai-daily-summaries.json").map((r) => ({
    ...r,
    ringkasanText: encrypt(r.ringkasanText),
  }));
  await insertInBatches(schema.aiDailySummaries, dailySummaries, "ai_daily_summaries");

  const weeklyInsights = readJSON<AiWeeklyInsightJson[]>("ai-weekly-insights.json").map((r) => ({
    ...r,
    wawasanText: encrypt(r.wawasanText),
  }));
  await insertInBatches(schema.aiWeeklyInsights, weeklyInsights, "ai_weekly_insights");

  const lifestyleSuggestions = readJSON<AiLifestyleJson[]>("ai-lifestyle-suggestions.json").map((r) => ({
    ...r,
    saranText: encrypt(r.saranText),
  }));
  await insertInBatches(schema.aiLifestyleSuggestions, lifestyleSuggestions, "ai_lifestyle_suggestions");

  const labAnalyses = readJSON<AiLabAnalysisJson[]>("ai-lab-analyses.json").map((r) => ({
    ...r,
    analisisText: encrypt(r.analisisText),
  }));
  await insertInBatches(schema.aiLabAnalyses, labAnalyses, "ai_lab_analyses");
}

type CommunityPostJson = {
  id: string;
  userId: string;
  judul: string;
  isi: string;
  kategori: string;
  metodeTerapi: string;
  diarsipkan: boolean;
  createdAt: string;
};
type CommunityReplyJson = { id: string; postId: string; userId: string; isi: string; createdAt: string };
type CommunityHelpfulJson = { replyId: string; userId: string; createdAt: string };

async function loadCommunity(): Promise<void> {
  const posts = readJSON<CommunityPostJson[]>("community-posts.json").map((r) => ({
    ...r,
    createdAt: toDate(r.createdAt)!,
  }));
  await insertInBatches(schema.communityPosts, posts, "community_posts");

  const replies = readJSON<CommunityReplyJson[]>("community-replies.json").map((r) => ({
    ...r,
    createdAt: toDate(r.createdAt)!,
  }));
  await insertInBatches(schema.communityReplies, replies, "community_replies");

  const helpful = readJSON<CommunityHelpfulJson[]>("community-reply-helpful.json").map((r) => ({
    ...r,
    createdAt: toDate(r.createdAt)!,
  }));
  await insertInBatches(schema.communityReplyHelpful, helpful, "community_reply_helpful");
}

type EducationJson = {
  id: string;
  judul: string;
  ringkasan: string;
  isi: string;
  tipeKonten: string;
  metodeTerapi: string;
  gambarUrl: string | null;
};

async function loadEducation(): Promise<void> {
  const rows = readJSON<EducationJson[]>("education-content.json");
  await insertInBatches(schema.educationContent, rows, "education_content");
}

// ─── Section registry (also usable for single-section iterative runs) ─────

const SECTION_LOADERS: Record<string, () => Promise<void>> = {
  users: loadUsers,
  reminders: loadReminders,
  fluid: loadFluid,
  medication: loadMedicationLogs,
  dialysis: loadDialysisLogs,
  activities: loadActivities,
  lab: loadLabResults,
  anomaly: loadAnomalyAlerts,
  ai: loadAiCaches,
  community: loadCommunity,
  education: loadEducation,
};

const FULL_RUN_ORDER = [
  "users",
  "reminders",
  "fluid",
  "medication",
  "dialysis",
  "activities",
  "lab",
  "anomaly",
  "ai",
  "community",
  "education",
];

// Tables truncated on a full run — CASCADE handles FK order automatically,
// RESTART IDENTITY resets any serial sequences. Listed explicitly (not just
// `TRUNCATE users CASCADE`) because education_content and login_attempts
// have no FK path back to users and would otherwise survive a "cascade from
// users" truncate.
const TRUNCATE_TABLES = [
  "users",
  "refresh_tokens",
  "login_attempts",
  "password_reset_tokens",
  "onboarding_progress",
  "reminder_schedule",
  "therapy_history",
  "push_subscriptions",
  "fluid_log",
  "medication_log",
  "dialysis_log",
  "daily_activities",
  "lab_results",
  "anomaly_alerts",
  "ai_daily_summaries",
  "ai_weekly_insights",
  "ai_lab_analyses",
  "ai_lifestyle_suggestions",
  "community_posts",
  "community_replies",
  "community_reply_helpful",
  "education_content",
];

async function truncateAll(): Promise<void> {
  console.log(`Truncating ${TRUNCATE_TABLES.length} tables (CASCADE, RESTART IDENTITY)...`);
  await db.execute(sql.raw(`TRUNCATE TABLE ${TRUNCATE_TABLES.join(", ")} RESTART IDENTITY CASCADE`));
}

async function main(): Promise<void> {
  const sectionArg = process.argv[2];

  if (sectionArg) {
    const loader = SECTION_LOADERS[sectionArg];
    if (!loader) {
      throw new Error(
        `Unknown section "${sectionArg}". Valid sections: ${Object.keys(SECTION_LOADERS).join(", ")}\n` +
          "Note: single-section runs are for iterative debugging and assume parent rows are already loaded — a full run (no arg) is the supported path.",
      );
    }
    console.log(`Loading single section: ${sectionArg} (assumes parents already loaded)`);
    await loader();
    console.log(`✅ Section "${sectionArg}" loaded.`);
    return;
  }

  await truncateAll();
  for (const section of FULL_RUN_ORDER) {
    console.log(`\nLoading section: ${section}`);
    await SECTION_LOADERS[section]();
  }
  console.log("\n✅ Full demo seed loaded successfully!");
  console.log("   Login: lukman@demo.kidneybuddy.id / sari@demo.kidneybuddy.id / budi@demo.kidneybuddy.id");
  console.log(`   Password (all 3): ${DEMO_PASSWORD}`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => {
    pool.end().catch(() => {});
  });
