/**
 * reminders.service.test.ts — TDD tests for reminder + medication-log business logic
 *
 * Covers:
 *  - createReminder schema validation per jenis (obat/capd/hd)
 *  - hariAktif empty rejection ("Pilih minimal satu hari aktif")
 *  - Reminder ownership enforcement in confirm()
 *  - medicationLog confirm sets status dikonfirmasi
 *
 * Run: cd backend && node --import tsx --test src/test/reminders.service.test.ts
 *
 * Design: injects in-memory fakes so no live Postgres connection is needed.
 * Follows fluid.service.test.ts injectable pattern.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ─── Import schemas (pure validation, no DB) ─────────────────────────────────
const {
  createObatSchema,
  createCapdSchema,
  createHdSchema,
  _createReminderCore,
  _confirmCore,
} = await import("../services/reminders.service.js");

// ─── In-memory fakes ──────────────────────────────────────────────────────────

type StoredReminder = {
  id: string;
  userId: string;
  jenis: string;
  nama: string;
  jamPengingat: string;
  hariAktif: unknown[];
  catatanWaktu: string | null;
  dosis: string | null;
  jenisObat: string | null;
  fotoObat: string | null;
  konsentrasiCapd: string | null;
  aktif: boolean;
  followUpSent: boolean;
  lastNotificationSentAt: Date | null;
  createdAt: Date;
};

type StoredMedicationLog = {
  id: string;
  userId: string;
  reminderId: string;
  namaObat: string;
  dosis: string | null;
  jenisObat: string | null;
  status: string;
  waktuPengingat: Date;
  waktuKonfirmasi: Date | null;
  createdAt: Date;
};

function createInMemoryReminderStore() {
  const reminders: StoredReminder[] = [];
  let counter = 0;

  const insert = async (data: Omit<StoredReminder, "id" | "createdAt" | "aktif" | "followUpSent" | "lastNotificationSentAt">): Promise<StoredReminder> => {
    const row: StoredReminder = {
      ...data,
      id: `reminder-id-${++counter}`,
      aktif: true,
      followUpSent: false,
      lastNotificationSentAt: null,
      createdAt: new Date(),
    };
    reminders.push(row);
    return row;
  };

  const findById = async (id: string): Promise<StoredReminder | undefined> => {
    return reminders.find((r) => r.id === id);
  };

  return { insert, findById, reminders };
}

function createInMemoryMedicationLogStore() {
  const logs: StoredMedicationLog[] = [];
  let counter = 0;

  const insertLog = async (data: Omit<StoredMedicationLog, "id" | "createdAt">): Promise<StoredMedicationLog> => {
    const row: StoredMedicationLog = {
      ...data,
      id: `log-id-${++counter}`,
      createdAt: new Date(),
    };
    logs.push(row);
    return row;
  };

  const findByReminderAndUser = async (reminderId: string, userId: string): Promise<StoredMedicationLog | undefined> => {
    return logs.find((l) => l.reminderId === reminderId && l.userId === userId);
  };

  const markConfirmed = async (id: string): Promise<void> => {
    const log = logs.find((l) => l.id === id);
    if (log) {
      log.status = "dikonfirmasi";
      log.waktuKonfirmasi = new Date();
    }
  };

  return { insertLog, findByReminderAndUser, markConfirmed, logs };
}

// ─── Schema validation tests (pure, no DB) ───────────────────────────────────

describe("reminders.service — createObatSchema", () => {
  it("should accept valid obat reminder with all required fields", () => {
    const result = createObatSchema.parse({
      nama: "Amlodipine",
      dosis: "5mg",
      jenisObat: "minum",
      hariAktif: ["senin", "selasa"],
      jamPengingat: "08:00",
    });
    assert.strictEqual(result.nama, "Amlodipine");
    assert.strictEqual(result.jenis, "obat");
    assert.strictEqual(result.jenisObat, "minum");
  });

  it("should accept optional catatanWaktu and fotoObat", () => {
    const result = createObatSchema.parse({
      nama: "Suntik Insulin",
      dosis: "10 IU",
      jenisObat: "suntik",
      hariAktif: ["senin"],
      jamPengingat: "07:30",
      catatanWaktu: "Sebelum makan",
      fotoObat: "/uploads/insulin.jpg",
    });
    assert.strictEqual(result.catatanWaktu, "Sebelum makan");
    assert.strictEqual(result.fotoObat, "/uploads/insulin.jpg");
  });

  it("should reject obat without nama", () => {
    assert.throws(() =>
      createObatSchema.parse({
        nama: "",
        dosis: "5mg",
        jenisObat: "minum",
        hariAktif: ["senin"],
        jamPengingat: "08:00",
      }),
    );
  });

  it("should reject obat without dosis", () => {
    assert.throws(() =>
      createObatSchema.parse({
        nama: "Amlodipine",
        dosis: "",
        jenisObat: "minum",
        hariAktif: ["senin"],
        jamPengingat: "08:00",
      }),
    );
  });

  it("should reject invalid jenisObat value", () => {
    assert.throws(() =>
      createObatSchema.parse({
        nama: "Amlodipine",
        dosis: "5mg",
        jenisObat: "infus",  // invalid
        hariAktif: ["senin"],
        jamPengingat: "08:00",
      }),
    );
  });

  it("should reject empty hariAktif with 'Pilih minimal satu hari aktif'", () => {
    try {
      createObatSchema.parse({
        nama: "Amlodipine",
        dosis: "5mg",
        jenisObat: "minum",
        hariAktif: [],  // empty!
        jamPengingat: "08:00",
      });
      assert.fail("Should have thrown");
    } catch (err: any) {
      const msg = err.errors?.[0]?.message ?? err.message;
      assert.ok(
        msg.includes("satu hari aktif") || msg.includes("minimal"),
        `Expected 'satu hari aktif' in error, got: ${msg}`,
      );
    }
  });
});

describe("reminders.service — createCapdSchema", () => {
  it("should accept valid CAPD reminder", () => {
    const result = createCapdSchema.parse({
      nama: "Exchange CAPD Pagi",
      konsentrasiCapd: "1.5%",
      jamPengingat: "06:00",
      hariAktif: ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"],
    });
    assert.strictEqual(result.jenis, "capd");
    assert.strictEqual(result.konsentrasiCapd, "1.5%");
  });

  it("should reject CAPD without konsentrasiCapd", () => {
    assert.throws(() =>
      createCapdSchema.parse({
        nama: "Exchange CAPD Pagi",
        konsentrasiCapd: "",
        jamPengingat: "06:00",
        hariAktif: ["senin"],
      }),
    );
  });

  it("should reject CAPD with empty hariAktif", () => {
    assert.throws(() =>
      createCapdSchema.parse({
        nama: "Exchange CAPD Pagi",
        konsentrasiCapd: "1.5%",
        jamPengingat: "06:00",
        hariAktif: [],
      }),
    );
  });
});

describe("reminders.service — createHdSchema", () => {
  it("should accept valid HD reminder", () => {
    const result = createHdSchema.parse({
      nama: "Jadwal HD Rumah Sakit Pondok Indah",
      jamPengingat: "07:00",
      hariAktif: ["senin", "rabu", "jumat"],
    });
    assert.strictEqual(result.jenis, "hd");
    assert.ok(result.hariAktif.includes("senin"));
  });

  it("should reject HD with empty hariAktif", () => {
    assert.throws(() =>
      createHdSchema.parse({
        nama: "Jadwal HD",
        jamPengingat: "07:00",
        hariAktif: [],
      }),
    );
  });
});

// ─── Business logic tests (injectable core) ───────────────────────────────────

describe("reminders.service — _createReminderCore", () => {
  it("should insert an obat reminder and return the created row", async () => {
    const store = createInMemoryReminderStore();
    const result = await _createReminderCore(
      {
        userId: "user-001",
        jenis: "obat",
        nama: "Amlodipine",
        dosis: "5mg",
        jenisObat: "minum",
        hariAktif: ["senin"],
        jamPengingat: "08:00",
        catatanWaktu: null,
        fotoObat: null,
        konsentrasiCapd: null,
      },
      store.insert,
    );
    assert.strictEqual(result.nama, "Amlodipine");
    assert.strictEqual(result.jenis, "obat");
    assert.strictEqual(store.reminders.length, 1);
  });
});

// ─── Confirm ownership tests ──────────────────────────────────────────────────

describe("reminders.service — _confirmCore (medication log confirm)", () => {
  it("should confirm a medication log row owned by the caller", async () => {
    const reminderStore = createInMemoryReminderStore();
    const logStore = createInMemoryMedicationLogStore();

    // Pre-seed a reminder owned by user-001
    const reminder = await reminderStore.insert({
      userId: "user-001",
      jenis: "obat",
      nama: "Amlodipine",
      dosis: "5mg",
      jenisObat: "minum",
      hariAktif: ["senin"],
      jamPengingat: "08:00",
      catatanWaktu: null,
      fotoObat: null,
      konsentrasiCapd: null,
    });

    // Pre-seed a pending log entry
    await logStore.insertLog({
      userId: "user-001",
      reminderId: reminder.id,
      namaObat: "Amlodipine",
      dosis: "5mg",
      jenisObat: "minum",
      status: "tertunda",
      waktuPengingat: new Date(),
      waktuKonfirmasi: null,
    });

    await _confirmCore(
      "user-001",
      reminder.id,
      reminderStore.findById,
      logStore.findByReminderAndUser,
      logStore.markConfirmed,
      logStore.insertLog,
    );

    const log = logStore.logs.find((l) => l.reminderId === reminder.id);
    assert.strictEqual(log?.status, "dikonfirmasi");
    assert.ok(log?.waktuKonfirmasi instanceof Date);
  });

  it("should reject confirmation when reminder is owned by a different user", async () => {
    const reminderStore = createInMemoryReminderStore();
    const logStore = createInMemoryMedicationLogStore();

    // Reminder owned by user-001
    const reminder = await reminderStore.insert({
      userId: "user-001",
      jenis: "obat",
      nama: "Amlodipine",
      dosis: "5mg",
      jenisObat: "minum",
      hariAktif: ["senin"],
      jamPengingat: "08:00",
      catatanWaktu: null,
      fotoObat: null,
      konsentrasiCapd: null,
    });

    // user-002 tries to confirm
    await assert.rejects(
      () =>
        _confirmCore(
          "user-002",  // different user!
          reminder.id,
          reminderStore.findById,
          logStore.findByReminderAndUser,
          logStore.markConfirmed,
          logStore.insertLog,
        ),
      (err: any) => {
        return err.statusCode === 403 || err.message?.includes("tidak ditemukan") || err.message?.includes("izin");
      },
    );
  });

  it("should create a new log row (dikonfirmasi) when no pending row exists", async () => {
    const reminderStore = createInMemoryReminderStore();
    const logStore = createInMemoryMedicationLogStore();

    const reminder = await reminderStore.insert({
      userId: "user-001",
      jenis: "obat",
      nama: "Metformin",
      dosis: "500mg",
      jenisObat: "minum",
      hariAktif: ["senin"],
      jamPengingat: "08:00",
      catatanWaktu: null,
      fotoObat: null,
      konsentrasiCapd: null,
    });

    // No existing log row
    await _confirmCore(
      "user-001",
      reminder.id,
      reminderStore.findById,
      logStore.findByReminderAndUser,
      logStore.markConfirmed,
      logStore.insertLog,
    );

    assert.strictEqual(logStore.logs.length, 1);
    assert.strictEqual(logStore.logs[0].status, "dikonfirmasi");
  });
});
