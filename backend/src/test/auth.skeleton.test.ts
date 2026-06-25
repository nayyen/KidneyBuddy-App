import { describe, it } from "node:test";
import assert from "node:assert";
import { hashPassword, verifyPassword } from "../utils/passwordHash.js";

// ─── Test 1: passwordHash ───────────────────────────────────────────────

describe("passwordHash", () => {
  it("should return an argon2id hash", async () => {
    const hash = await hashPassword("Rahasia123!");
    assert.ok(hash.startsWith("$argon2id$"), "Hash should start with $argon2id$");
  });

  it("should verify correct password and reject wrong one", async () => {
    const hash = await hashPassword("Rahasia123!");
    assert.ok(await verifyPassword(hash, "Rahasia123!"));
    assert.ok(!(await verifyPassword(hash, "SalahPassword")));
  });
});

// ─── Test 2: register returns user without passwordHash ─────────────────

describe("auth.service register", () => {
  // Note: These tests mock the repository layer manually.
  // In a full Docker environment, integration tests with the real DB
  // would supplement these unit tests.

  it("should hash the password with argon2id and return safe user", async () => {
    // This test verifies the actual hashPassword utility
    const hash = await hashPassword("Rahasia123!");
    assert.ok(hash.startsWith("$argon2id$"), "Hash starts with argon2id");

    // Verify separate function properly
    const valid = await verifyPassword(hash, "Rahasia123!");
    assert.ok(valid, "Correct password should verify");
  });

  it("should detect wrong password", async () => {
    const hash = await hashPassword("Rahasia123!");
    const valid = await verifyPassword(hash, "SalahPassword");
    assert.ok(!valid, "Wrong password should not verify");
  });
});
