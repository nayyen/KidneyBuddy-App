import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { hashPassword, verifyPassword } from "../utils/passwordHash.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

// ─── JWT Tests ─────────────────────────────────────────────────────────

describe("jwt utils", () => {
  const userId = "00000000-0000-0000-0000-000000000001";

  it("should sign and verify an access token", () => {
    const token = signAccessToken(userId);
    const payload = verifyAccessToken(token);
    assert.strictEqual(payload.sub, userId);
  });

  it("should sign and verify a refresh token", () => {
    const token = signRefreshToken(userId);
    const payload = verifyRefreshToken(token);
    assert.strictEqual(payload.sub, userId);
  });

  it("should reject an invalid access token", () => {
    assert.throws(() => verifyAccessToken("invalid-token"), /JsonWebTokenError/);
  });

  it("should reject an invalid refresh token", () => {
    assert.throws(() => verifyRefreshToken("invalid-token"), /JsonWebTokenError/);
  });
});

// ─── login service unit tests (mocked dependencies) ────────────────────

describe("auth.service login", () => {
  it("should hash passwords correctly", async () => {
    const hash = await hashPassword("Test1234!");
    assert.ok(hash.startsWith("$argon2id$"));
  });

  it("should verify correct passwords and reject wrong ones", async () => {
    const hash = await hashPassword("Test1234!");
    assert.ok(await verifyPassword(hash, "Test1234!"));
    assert.ok(!(await verifyPassword(hash, "WrongPass1")));
  });

  it("should reject a tampered token", () => {
    const token = signAccessToken("user-1");
    const tampered = token.slice(0, -5) + "XXXXX";
    assert.throws(() => verifyAccessToken(tampered), /JsonWebTokenError/);
  });
});
