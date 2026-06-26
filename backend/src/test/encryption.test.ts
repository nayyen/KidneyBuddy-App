/**
 * encryption.test.ts — TDD tests for AES-256-GCM encrypt/decrypt helpers
 * (backend/src/lib/encryption.ts)
 *
 * Run: cd backend && npm test -- --test-name-pattern encrypt
 *
 * Design: sets ENCRYPTION_KEY env var BEFORE importing the module
 * (module validates the key at load time).
 */
import { describe, it } from "node:test";
import assert from "node:assert";

// Set a fixed 64-hex test key (32 bytes) BEFORE importing the encryption module.
// Key validation happens at module initialisation — must be set first.
const TEST_KEY = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
process.env.ENCRYPTION_KEY = TEST_KEY;

// Dynamic import after env is set so the module sees the key on load
const { encrypt, decrypt } = await import("../lib/encryption.js");

describe("encrypt helpers", () => {
  it("encrypt returns three colon-separated hex parts (iv:authTag:cipher)", () => {
    const ciphertext = encrypt("Cairan keruh sejak pagi");
    const parts = ciphertext.split(":");
    assert.strictEqual(parts.length, 3, "Expected 3 colon-separated parts");
    for (const part of parts) {
      assert.ok(part.length > 0, "Each part must be non-empty");
      assert.ok(/^[0-9a-f]+$/i.test(part), `Part must be hex: got ${part.slice(0, 20)}...`);
    }
  });

  it("decrypt(encrypt(s)) === s for ASCII string", () => {
    const plaintext = "Hello KidneyBuddy";
    assert.strictEqual(decrypt(encrypt(plaintext)), plaintext);
  });

  it("decrypt(encrypt(s)) === s for Indonesian UTF-8 string", () => {
    const plaintext =
      "Cairan keruh, ada gumpalan kecil berwarna kekuningan \u2014 segera hubungi dokter";
    assert.strictEqual(decrypt(encrypt(plaintext)), plaintext);
  });

  it("two encrypt calls on same plaintext produce different ciphertext (random IV)", () => {
    const plaintext = "Minum obat pagi";
    const c1 = encrypt(plaintext);
    const c2 = encrypt(plaintext);
    assert.notStrictEqual(c1, c2, "Repeated encrypt should produce different ciphertext");
    // Both must still decrypt correctly
    assert.strictEqual(decrypt(c1), plaintext);
    assert.strictEqual(decrypt(c2), plaintext);
  });

  it("decrypt on tampered authTag (flipped first byte) throws", () => {
    const ciphertext = encrypt("Data sensitif pasien");
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
    // Flip the first byte of the authTag to simulate tampering
    const firstByte = parseInt(authTagHex.slice(0, 2), 16) ^ 0xff;
    const tamperedAuthTag = firstByte.toString(16).padStart(2, "0") + authTagHex.slice(2);
    const tampered = `${ivHex}:${tamperedAuthTag}:${encryptedHex}`;
    assert.throws(
      () => decrypt(tampered),
      (err: unknown) => {
        // OpenSSL 3.x surfaces "Unsupported state or unable to authenticate data"
        // Older OpenSSL: "bad decrypt" or "Invalid authentication tag"
        const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
        return (
          msg.includes("unsupported state") ||
          msg.includes("bad decrypt") ||
          msg.includes("invalid authentication tag") ||
          msg.includes("bad tag") ||
          // Node.js error code
          (err instanceof Error && "code" in err &&
            typeof (err as NodeJS.ErrnoException).code === "string" &&
            ((err as NodeJS.ErrnoException).code?.includes("ERR_OSSL") ?? false))
        );
      },
      "decrypt on tampered authTag must throw",
    );
  });
});
