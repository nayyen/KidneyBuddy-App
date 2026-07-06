/**
 * reminderSchedule.findNextUpcoming.test.ts — targeted regression test for
 * quick-260706-8zc item 1 verification.
 *
 * Confirms _computeNextUpcomingCore (the pure, DB-free core extracted from
 * reminderSchedule.repository.ts#findNextUpcoming) applies therapy-scoping
 * BEFORE picking the earliest cuci-darah slot, not after. Without this,
 * an off-therapy reminder (e.g. a leftover HD reminder while the user's
 * current metodeTerapiAktif is CAPD) with an earlier jam_pengingat could
 * "win" the earliest-slot computation and silently swallow the user's real
 * next CAPD reminder — even though the CAPD reminder is legitimately
 * upcoming today.
 *
 * Run: cd backend && node --import tsx --test src/test/reminderSchedule.findNextUpcoming.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { _computeNextUpcomingCore } from "../repositories/reminderSchedule.repository.js";

function makeReminder(overrides: Record<string, unknown>) {
  return {
    id: "id",
    userId: "user-1",
    jenis: "capd",
    nama: "Reminder",
    jamPengingat: "12:00",
    hariAktif: ["senin"],
    catatanWaktu: null,
    aktif: true,
    dosis: null,
    jenisObat: null,
    fotoObat: null,
    konsentrasiCapd: null,
    followUpSent: false,
    lastNotificationSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as any;
}

describe("_computeNextUpcomingCore — item 1 (quick-260706-8zc)", () => {
  it("surfaces the CAPD reminder as next for a CAPD-therapy user even when an earlier-slot HD reminder exists", () => {
    const hdReminder = makeReminder({
      id: "hd-1",
      jenis: "hd",
      nama: "Sesi HD RS",
      jamPengingat: "10:00", // earlier slot
      hariAktif: ["senin"],
    });
    const capdReminder = makeReminder({
      id: "capd-1",
      jenis: "capd",
      nama: "Exchange Malam",
      jamPengingat: "12:00", // later slot, but the user's ACTUAL therapy
      hariAktif: ["senin"],
    });

    const result = _computeNextUpcomingCore(
      [hdReminder, capdReminder],
      "CAPD",
      { currentTime: "08:00", todayDay: "senin", tomorrowDay: "selasa" },
    );

    // Pre-fix behavior: findNext() would pick the earliest slot (10:00, HD)
    // across BOTH jenis before therapy filtering ever ran, then the
    // caller's therapy filter would strip the HD item out, leaving
    // cuciDarah completely empty and silently dropping the CAPD reminder.
    assert.equal(result.cuciDarah.length, 1, "CAPD reminder must surface as next");
    assert.equal(result.cuciDarah[0].id, "capd-1");
    assert.equal(result.cuciDarah[0].jenis, "capd");
  });

  it("surfaces the HD reminder as next for an HD-therapy user, ignoring an earlier-slot CAPD reminder", () => {
    const hdReminder = makeReminder({
      id: "hd-1",
      jenis: "hd",
      jamPengingat: "14:00",
      hariAktif: ["senin"],
    });
    const capdReminder = makeReminder({
      id: "capd-1",
      jenis: "capd",
      jamPengingat: "09:00", // earlier slot, but wrong therapy
      hariAktif: ["senin"],
    });

    const result = _computeNextUpcomingCore(
      [hdReminder, capdReminder],
      "HD",
      { currentTime: "08:00", todayDay: "senin", tomorrowDay: "selasa" },
    );

    assert.equal(result.cuciDarah.length, 1);
    assert.equal(result.cuciDarah[0].id, "hd-1");
  });

  it("cuciDarah is empty for a Transplantasi user even when capd/hd reminders exist", () => {
    const hdReminder = makeReminder({ id: "hd-1", jenis: "hd", jamPengingat: "10:00", hariAktif: ["senin"] });
    const capdReminder = makeReminder({ id: "capd-1", jenis: "capd", jamPengingat: "11:00", hariAktif: ["senin"] });

    const result = _computeNextUpcomingCore(
      [hdReminder, capdReminder],
      "Transplantasi",
      { currentTime: "08:00", todayDay: "senin", tomorrowDay: "selasa" },
    );

    assert.equal(result.cuciDarah.length, 0);
  });

  it("obat reminders are never therapy-filtered", () => {
    const obatReminder = makeReminder({ id: "obat-1", jenis: "obat", jamPengingat: "09:00", hariAktif: ["senin"] });

    const result = _computeNextUpcomingCore(
      [obatReminder],
      null, // no active therapy at all
      { currentTime: "08:00", todayDay: "senin", tomorrowDay: "selasa" },
    );

    assert.equal(result.obat.length, 1);
    assert.equal(result.obat[0].id, "obat-1");
  });
});

describe("_computeNextUpcomingCore — today-only filtering (quick-260706-epn)", () => {
  // The tomorrow-fallback branch inside findNext() must not surface
  // not-active-today reminders (quick-260706-epn). On a given weekday, the
  // beranda "Pengingat Berikutnya" card must only ever show reminders whose
  // hariAktif includes TODAY's day-of-week — never a reminder that merely
  // happens to be active tomorrow.

  it("Test A (obat): a reminder active only Selasa+Sabtu must NOT surface on Senin", () => {
    const obatTue = makeReminder({
      id: "obat-tue",
      jenis: "obat",
      jamPengingat: "09:00",
      hariAktif: ["selasa", "sabtu"],
    });

    const result = _computeNextUpcomingCore(
      [obatTue],
      null,
      { currentTime: "08:00", todayDay: "senin", tomorrowDay: "selasa" },
    );

    assert.equal(result.obat.length, 0);
  });

  it("Test B (capd): a reminder active only Selasa+Sabtu must NOT surface on Senin", () => {
    const capdTue = makeReminder({
      id: "capd-tue",
      jenis: "capd",
      jamPengingat: "10:00",
      hariAktif: ["selasa", "sabtu"],
    });

    const result = _computeNextUpcomingCore(
      [capdTue],
      "capd",
      { currentTime: "08:00", todayDay: "senin", tomorrowDay: "selasa" },
    );

    assert.equal(result.cuciDarah.length, 0);
  });

  it("Test C (hd): a reminder active only Selasa+Sabtu must NOT surface on Senin", () => {
    const hdTue = makeReminder({
      id: "hd-tue",
      jenis: "hd",
      jamPengingat: "10:00",
      hariAktif: ["selasa", "sabtu"],
    });

    const result = _computeNextUpcomingCore(
      [hdTue],
      "hd",
      { currentTime: "08:00", todayDay: "senin", tomorrowDay: "selasa" },
    );

    assert.equal(result.cuciDarah.length, 0);
  });

  it("Test D (positive control): a reminder active TODAY still surfaces", () => {
    const obatMon = makeReminder({
      id: "obat-mon",
      jenis: "obat",
      jamPengingat: "09:00",
      hariAktif: ["senin"],
    });

    const result = _computeNextUpcomingCore(
      [obatMon],
      null,
      { currentTime: "08:00", todayDay: "senin", tomorrowDay: "selasa" },
    );

    assert.equal(result.obat.length, 1);
    assert.equal(result.obat[0].id, "obat-mon");
  });
});
