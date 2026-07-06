/**
 * seed-demo.ts — Demo Seed Script for KidneyBuddy
 *
 * Creates realistic demo data for presentation purposes.
 * Pasien: Lukman Hakim, 46 tahun, pasien CAPD.
 *
 * Data generated (last 14 days):
 * - User with therapy history (HD → CAPD) & onboarding complete
 * - 4 medication reminders + medication logs (~85% adherence)
 * - CAPD fluid logs (3-4 exchanges/day)
 * - 2 lab result entries (6 weeks ago, 2 weeks ago)
 * - Daily activity logs (7 days)
 *
 * Run: npm run seed:demo
 * Requires: DATABASE_URL, ENCRYPTION_KEY env vars
 */

import "dotenv/config";
import { db, pool } from "../lib/db.js";
import * as schema from "../db/schema/index.js";
import { encrypt } from "../lib/encryption.js";
import { hashPassword } from "../utils/passwordHash.js";
import { sql } from "drizzle-orm";

// ─── Timezone helpers (WIB = UTC+7) ────────────────────────────────────────

/** Get "today" in WIB timezone as a Date object set to WIB 00:00:00 */
function todayWIB(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utc + 7 * 3_600_000);
}

/** Format a WIB date as YYYY-MM-DD string */
function fmtDate(wib: Date, daysAgo: number): string {
  const d = new Date(wib);
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Create a JS Date representing a specific WIB time on a given day.
 * The returned Date's UTC time is adjusted so that when displayed
 * in WIB (UTC+7), it shows the requested hour:minute.
 */
function wibToDate(wib: Date, daysAgo: number, hour: number, minute: number): Date {
  const [y, m, d] = fmtDate(wib, daysAgo).split("-").map(Number);
  // WIB = UTC+7, so WIB 07:00 = UTC 00:00. Subtract 7h.
  return new Date(Date.UTC(y, m - 1, d, hour - 7, minute, 0, 0));
}

// ─── Seed data ─────────────────────────────────────────────────────────────

const WIB_TODAY = todayWIB();

async function main() {
  console.log("🌱 Seeding demo data...");

  // ── 1. USER ──────────────────────────────────────────────────────────────
  console.log("  Creating user Lukman Hakim...");
  const passwordHash = await hashPassword("Demo1234!");
  const userId = crypto.randomUUID();

  await db.insert(schema.users).values({
    userId,
    namaLengkap: "Lukman Hakim",
    email: "lukman@kidneybuddy.demo",
    passwordHash,
    informedConsent: true,
    metodeTerapiAktif: "CAPD",
    tanggalMulaiTerapi: "2024-08-01",
    role: "Pasien",
    riwayatTerapi: ["Hemodialisis"],
  });

  // ── 2. THERAPY HISTORY ───────────────────────────────────────────────────
  console.log("  Creating therapy history...");
  await db.insert(schema.therapyHistory).values({
    userId,
    metodeSebelum: "Hemodialisis",
    metodeBaru: "CAPD",
    changedAt: new Date("2024-08-01T00:00:00.000Z"),
  });

  // ── 3. ONBOARDING PROGRESS ───────────────────────────────────────────────
  console.log("  Creating onboarding progress...");
  await db.insert(schema.onboardingProgress).values({
    userId,
    lastCompletedStep: 5,
    reminderConfigured: true,
    completedAt: wibToDate(WIB_TODAY, 14, 10, 30),
  });

  // ── 4. MEDICATION REMINDERS ──────────────────────────────────────────────
  console.log("  Creating medication reminders...");
  const remTacrolimus = crypto.randomUUID();
  const remMycoPagi = crypto.randomUUID();
  const remMycoMalam = crypto.randomUUID();
  const remAmlodipine = crypto.randomUUID();

  await db.insert(schema.reminderSchedule).values([
    {
      id: remTacrolimus,
      userId,
      jenis: "obat",
      nama: "Tacrolimus",
      jamPengingat: "07:00",
      hariAktif: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"],
      catatanWaktu: "1 jam sebelum makan",
      aktif: true,
      dosis: "1 mg",
      jenisObat: "minum",
    },
    {
      id: remMycoPagi,
      userId,
      jenis: "obat",
      nama: "Mycophenolate Mofetil",
      jamPengingat: "08:00",
      hariAktif: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"],
      catatanWaktu: "Sesudah makan pagi",
      aktif: true,
      dosis: "500 mg",
      jenisObat: "minum",
    },
    {
      id: remMycoMalam,
      userId,
      jenis: "obat",
      nama: "Mycophenolate Mofetil",
      jamPengingat: "20:00",
      hariAktif: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"],
      catatanWaktu: "Sesudah makan malam",
      aktif: true,
      dosis: "500 mg",
      jenisObat: "minum",
    },
    {
      id: remAmlodipine,
      userId,
      jenis: "obat",
      nama: "Amlodipine",
      jamPengingat: "21:00",
      hariAktif: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"],
      catatanWaktu: "Sebelum tidur",
      aktif: true,
      dosis: "5 mg",
      jenisObat: "minum",
    },
  ]);

  // ── 5. MEDICATION LOGS (14 days, ~85% adherence) ─────────────────────────
  console.log("  Creating medication logs (14 days)...");
  const medicationLogs: (typeof schema.medicationLog.$inferInsert)[] = [];

  // Define which (daysAgo, medicationIndex) pairs are "terlewat" (8 misses ≈ 85% adherence)
  const misses: Set<string> = new Set([
    "5:2", // Day 5 — Mycophenolate sore terlewat
    "5:3", // Day 5 — Amlodipine terlewat
    "11:0", // Day 11 — Tacrolimus pagi terlewat
    "11:1", // Day 11 — Mycophenolate pagi terlewat
    "8:3", // Day 8 — Amlodipine terlewat (lupa minum)
    "3:2", // Day 3 — Mycophenolate sore terlewat
    "1:0", // Yesterday — Tacrolimus terlewat
    "1:3", // Yesterday — Amlodipine terlewat
  ]);

  const meds = [
    { reminderId: remTacrolimus, nama: "Tacrolimus", dosis: "1 mg", jam: 7, menit: 0 },
    { reminderId: remMycoPagi, nama: "Mycophenolate Mofetil", dosis: "500 mg", jam: 8, menit: 0 },
    { reminderId: remMycoMalam, nama: "Mycophenolate Mofetil", dosis: "500 mg", jam: 20, menit: 0 },
    { reminderId: remAmlodipine, nama: "Amlodipine", dosis: "5 mg", jam: 21, menit: 0 },
  ];

  for (let day = 0; day < 14; day++) {
    for (let m = 0; m < meds.length; m++) {
      const isMissed = misses.has(`${day}:${m}`);
      const waktuPengingat = wibToDate(WIB_TODAY, day, meds[m].jam, meds[m].menit);
      medicationLogs.push({
        userId,
        reminderId: meds[m].reminderId,
        namaObat: meds[m].nama,
        dosis: meds[m].dosis,
        jenisObat: "minum",
        status: isMissed ? "terlewat" : "dikonfirmasi",
        waktuPengingat,
        waktuKonfirmasi: isMissed
          ? undefined
          : new Date(waktuPengingat.getTime() + (5 + Math.floor(Math.random() * 15)) * 60_000), // 5-20 min after
      });
    }
  }
  // Insert in batches of 28 to avoid oversized queries
  for (let i = 0; i < medicationLogs.length; i += 28) {
    await db.insert(schema.medicationLog).values(medicationLogs.slice(i, i + 28));
  }

  // ── 6. FLUID LOGS (14 days, 3-4 CAPD exchanges/day) ─────────────────────
  console.log("  Creating fluid logs (14 days of CAPD)...");

  // CAPD exchange schedule — 4 exchanges/day
  const exchanges = [
    { label: "pagi", jam: 6, menit: 0, volume: 1500, konsentrasi: "1.5%" },
    { label: "siang", jam: 12, menit: 0, volume: 1500, konsentrasi: "2.5%" },
    { label: "sore", jam: 18, menit: 0, volume: 1500, konsentrasi: "1.5%" },
    { label: "malam", jam: 22, menit: 15, volume: 2000, konsentrasi: "2.5%" },
  ];

  // Day 10 (counting from oldest = day 13) = day 3 counting from newest = day 0
  const keruhDay = 3; // 3 days ago — the "hari ke-10" keruh event

  for (let day = 0; day < 14; day++) {
    // Skip 1-2 random exchanges per day for variety (not all days have 4)
    const skipCount = day % 5 === 0 ? 1 : 0; // skip 1 exchange every 5 days
    const skippedIdx = skipCount > 0 ? (day * 3) % exchanges.length : -1;

    for (let e = 0; e < exchanges.length; e++) {
      if (e === skippedIdx) continue;

      const exchange = exchanges[e];
      const drainTime = exchange.jam;
      const infuseTime = exchange.jam + 0; // ~15 min later

      const isKeruh = day === keruhDay && e === 1; // Day 10, siang exchange
      const kondisi = isKeruh ? "keruh" : "jernih";
      const drainVolume = isKeruh
        ? (exchange.volume * 0.85).toFixed(0) // less output when keruh
        : (exchange.volume * (0.95 + Math.random() * 0.1)).toFixed(0); // 95-105% of input

      // Drain (keluar)
      await db.insert(schema.fluidLog).values({
        userId,
        tanggal: fmtDate(WIB_TODAY, day),
        waktu: `${String(drainTime).padStart(2, "0")}:00`,
        tipe: "keluar",
        sumber: null,
        konsentrasiCapd: null,
        volume: drainVolume,
        satuan: "ml",
        kondisiKeluar: kondisi,
        catatan: isKeruh
          ? encrypt(`Drainase siang — cairan keruh, hubungi dokter. Output: ${drainVolume}ml`)
          : encrypt(`Drainase ${exchange.label} — ${kondisi}, volume ${drainVolume}ml`),
      });

      // Infuse (masuk)
      await db.insert(schema.fluidLog).values({
        userId,
        tanggal: fmtDate(WIB_TODAY, day),
        waktu: `${String(infuseTime).padStart(2, "0")}:15`,
        tipe: "masuk",
        sumber: "capd",
        konsentrasiCapd: exchange.konsentrasi,
        volume: String(exchange.volume),
        satuan: "ml",
        kondisiKeluar: null,
        catatan: encrypt(`Infus ${exchange.konsentrasi} ${exchange.volume}ml — ${exchange.label}`),
      });
    }

    // Occasional drink entries for variety (day 2, 7, 12)
    if (day === 2 || day === 7 || day === 12) {
      await db.insert(schema.fluidLog).values({
        userId,
        tanggal: fmtDate(WIB_TODAY, day),
        waktu: "09:00",
        tipe: "masuk",
        sumber: "minuman",
        volume: "200",
        satuan: "ml",
        catatan: encrypt("Air putih 200ml"),
      });
      await db.insert(schema.fluidLog).values({
        userId,
        tanggal: fmtDate(WIB_TODAY, day),
        waktu: "15:30",
        tipe: "masuk",
        sumber: "minuman",
        volume: "250",
        satuan: "ml",
        catatan: encrypt("Teh tawar hangat 250ml"),
      });
    }
  }

  // ── 7. LAB RESULTS (2 entries) ───────────────────────────────────────────
  console.log("  Creating lab results...");

  // 6 weeks ago
  const lab6w = fmtDate(WIB_TODAY, 42);
  await db.insert(schema.labResults).values([
    {
      userId,
      tanggalPemeriksaan: lab6w,
      kategori: "Fungsi Ginjal",
      namaParameter: "Kreatinin",
      nilai: "3.2",
      satuan: "mg/dL",
      nilaiRujukan: "0.6-1.2",
      sumber: "manual",
    },
    {
      userId,
      tanggalPemeriksaan: lab6w,
      kategori: "Fungsi Ginjal",
      namaParameter: "Ureum",
      nilai: "85",
      satuan: "mg/dL",
      nilaiRujukan: "10-50",
      sumber: "manual",
    },
    {
      userId,
      tanggalPemeriksaan: lab6w,
      kategori: "Darah Lengkap",
      namaParameter: "Hemoglobin",
      nilai: "10.5",
      satuan: "g/dL",
      nilaiRujukan: "13.0-17.0",
      sumber: "manual",
    },
    {
      userId,
      tanggalPemeriksaan: lab6w,
      kategori: "Elektrolit",
      namaParameter: "Kalium",
      nilai: "5.0",
      satuan: "mEq/L",
      nilaiRujukan: "3.5-5.0",
      sumber: "manual",
    },
    {
      userId,
      tanggalPemeriksaan: lab6w,
      kategori: "Elektrolit",
      namaParameter: "Natrium",
      nilai: "138",
      satuan: "mEq/L",
      nilaiRujukan: "136-145",
      sumber: "manual",
    },
  ]);

  // 2 weeks ago
  const lab2w = fmtDate(WIB_TODAY, 14);
  await db.insert(schema.labResults).values([
    {
      userId,
      tanggalPemeriksaan: lab2w,
      kategori: "Fungsi Ginjal",
      namaParameter: "Kreatinin",
      nilai: "2.9",
      satuan: "mg/dL",
      nilaiRujukan: "0.6-1.2",
      sumber: "manual",
      catatan: encrypt("Ada perbaikan dari 3.2 — masih dalam target untuk pasien CAPD"),
    },
    {
      userId,
      tanggalPemeriksaan: lab2w,
      kategori: "Fungsi Ginjal",
      namaParameter: "Ureum",
      nilai: "72",
      satuan: "mg/dL",
      nilaiRujukan: "10-50",
      sumber: "manual",
    },
    {
      userId,
      tanggalPemeriksaan: lab2w,
      kategori: "Darah Lengkap",
      namaParameter: "Hemoglobin",
      nilai: "11.2",
      satuan: "g/dL",
      nilaiRujukan: "13.0-17.0",
      sumber: "manual",
      catatan: encrypt("Hb masih rendah, lanjutkan terapi ESA"),
    },
    {
      userId,
      tanggalPemeriksaan: lab2w,
      kategori: "Elektrolit",
      namaParameter: "Kalium",
      nilai: "4.8",
      satuan: "mEq/L",
      nilaiRujukan: "3.5-5.0",
      sumber: "manual",
    },
    {
      userId,
      tanggalPemeriksaan: lab2w,
      kategori: "Elektrolit",
      namaParameter: "Natrium",
      nilai: "140",
      satuan: "mEq/L",
      nilaiRujukan: "136-145",
      sumber: "manual",
    },
  ]);

  // ── 8. DAILY ACTIVITIES (7 days, ~1-2 per day) ──────────────────────────
  console.log("  Creating daily activities (7 days)...");

  const activityData = [
    { day: 7, nama: "Jalan pagi di komplek", jamMulai: 6, menitMulai: 0, estimasi: 45, perasaan: "nyaman", catatan: "Cuaca cerah, jalan 30 menit keliling komplek" },
    { day: 7, nama: "Membaca buku", jamMulai: 19, menitMulai: 30, estimasi: 60, perasaan: "biasa", catatan: "Baca novel ringan sebelum tidur" },
    { day: 6, nama: "Senam CAPD ringan", jamMulai: 7, menitMulai: 0, estimasi: 30, perasaan: "nyaman", catatan: "Senam peregangan sesuai panduan CAPD" },
    { day: 5, nama: "Memasak sarapan", jamMulai: 8, menitMulai: 0, estimasi: 45, perasaan: "nyaman", catatan: "Memasak bubur ayam untuk keluarga" },
    { day: 4, nama: "Kontrol ke poliklinik ginjal", jamMulai: 9, menitMulai: 0, estimasi: 120, perasaan: "lelah", catatan: "Antrean panjang, tapi hasil lab membaik" },
    { day: 3, nama: "Berkebun di halaman", jamMulai: 16, menitMulai: 0, estimasi: 60, perasaan: "nyaman", catatan: "Menyiram tanaman dan membersihkan daun kering" },
    { day: 2, nama: "Jalan santai sore", jamMulai: 17, menitMulai: 0, estimasi: 30, perasaan: "biasa", catatan: "Jalan kaki 15 menit saja, sedikit capek" },
    { day: 1, nama: "Terapi CAPD mandiri", jamMulai: 6, menitMulai: 0, estimasi: 30, perasaan: "nyaman", catatan: "Exchange pagi berjalan lancar, cairan jernih" },
    { day: 1, nama: "Menonton TV", jamMulai: 20, menitMulai: 0, estimasi: 90, perasaan: "biasa", catatan: "Nonton berita dan acara kuis" },
    { day: 0, nama: "Jalan pagi", jamMulai: 6, menitMulai: 30, estimasi: 30, perasaan: null, catatan: null }, // Today, still active or just completed
  ];

  for (const act of activityData) {
    const waktuMulai = wibToDate(WIB_TODAY, act.day, act.jamMulai, act.menitMulai);
    const estimasiSelesai = new Date(waktuMulai.getTime() + act.estimasi * 60_000);

    await db.insert(schema.dailyActivities).values({
      userId,
      namaKegiatan: act.nama,
      waktuMulai,
      estimasiSelesai,
      status: "selesai",
      waktuSelesai: new Date(estimasiSelesai.getTime() + Math.floor(Math.random() * 10) * 60_000),
      perasaan: act.perasaan,
      catatanPerasaan: act.catatan ? encrypt(act.catatan) : undefined,
    });
  }

  // ── 9. ADD DOCTOR VISIT NOTE (as a daily activity note) ──────────────────
  // Include a special activity for the kontrol hari with doctor visit details
  console.log("  Adding doctor visit note...");

  await db.insert(schema.dailyActivities).values({
    userId,
    namaKegiatan: "Konsultasi dokter — laporan hasil lab",
    waktuMulai: wibToDate(WIB_TODAY, 4, 11, 30),
    estimasiSelesai: wibToDate(WIB_TODAY, 4, 12, 0),
    status: "selesai",
    waktuSelesai: wibToDate(WIB_TODAY, 4, 12, 15),
    perasaan: "biasa",
    catatanPerasaan: encrypt(
      "Dokter mengatakan kreatinin membaik dari 3.2 ke 2.9. Hb masih 11.2, " +
      "dosis ESA dinaikkan. Cairan CAPD tetap 4x/hari. Kontrol ulang 4 minggu lagi. " +
      "Tidak ada tanda infeksi."
    ),
  });

  console.log("✅ Demo seed completed successfully!");
  console.log("   Login: lukman@kidneybuddy.demo / Demo1234!");
}

// ─── Run ────────────────────────────────────────────────────────────────────
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
