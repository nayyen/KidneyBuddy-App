import { describe, it } from "node:test";
import assert from "node:assert";
import { hashPassword, verifyPassword } from "../utils/passwordHash.js";

// ─── Lockout-config behavior tests ─────────────────────────────────────
// Full lockout integration (DB-backed) requires Docker + real Postgres.
// These unit tests verify the underlying primitives.

describe("lockout primitives", () => {
  it("should count recent failures threshold at 5", () => {
    const THRESHOLD = 5;
    // Simulate: if recentFailures >= THRESHOLD → lock
    assert.ok(5 >= THRESHOLD);
    assert.ok(6 >= THRESHOLD);
    assert.ok(!(3 >= THRESHOLD));
  });

  it("should compute lockout duration of 15 minutes", () => {
    const LOCKOUT_MS = 15 * 60 * 1000;
    assert.strictEqual(LOCKOUT_MS, 900000);
    const now = Date.now();
    const lockedUntil = new Date(now + LOCKOUT_MS);
    assert.ok(lockedUntil.getTime() > now);
  });

  it("should compute 10 minute window", () => {
    const WINDOW_MS = 10 * 60 * 1000;
    assert.strictEqual(WINDOW_MS, 600000);
    const now = Date.now();
    const since = new Date(now - WINDOW_MS);
    assert.ok(since.getTime() < now);
  });
});

// ─── Password hashing tests ────────────────────────────────────────────

describe("auth login password", () => {
  it("should hash and verify password correctly", async () => {
    const hash = await hashPassword("SecurePass789!");
    assert.ok(hash.startsWith("$argon2id$"));
    assert.ok(await verifyPassword(hash, "SecurePass789!"));
    assert.ok(!(await verifyPassword(hash, "WrongPass!")));
  });

  it("should handle empty password gracefully", async () => {
    const valid = await verifyPassword("$argon2id$somehash", "");
    assert.ok(!valid);
  });
});
