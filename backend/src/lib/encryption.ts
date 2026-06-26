/**
 * lib/encryption.ts — Application-layer AES-256-GCM encryption helpers
 *
 * Used to encrypt sensitive health free-text columns (fluid_log.catatan,
 * medication_log notes, etc.) BEFORE INSERT and decrypt AFTER SELECT.
 *
 * The ENCRYPTION_KEY never transits SQL queries or logs — it stays in the
 * Node.js process memory only. This implements NFR-02 (data at-rest encryption)
 * per CLAUDE.md and RESEARCH Pattern 4.
 *
 * Key format: 64 hex characters = 32 bytes (256 bits).
 * Generate once: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Ciphertext format: iv:authTag:ciphertext (all hex-encoded, colon-separated)
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm" as const;

// Validate ENCRYPTION_KEY at module load — throws a clear error at startup
// rather than silently producing broken ciphertext at runtime.
// SECURITY: key value is NEVER logged — only its length is checked.
function loadKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "[encryption] ENCRYPTION_KEY env var is missing. " +
        "Generate one with: node -e \"console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))\""
    );
  }
  if (raw.length !== 64) {
    throw new Error(
      `[encryption] ENCRYPTION_KEY must be exactly 64 hex chars (32 bytes), got ${raw.length} chars`
    );
  }
  return Buffer.from(raw, "hex");
}

const KEY = loadKey();

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns: "<ivHex>:<authTagHex>:<ciphertextHex>"
 * Each call uses a fresh random 12-byte IV, so the same plaintext
 * always produces different ciphertext.
 */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12); // 96-bit nonce — GCM recommended length
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag(); // 16-byte GCM authentication tag
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt ciphertext produced by encrypt().
 * Throws if the auth tag doesn't match (tampered ciphertext or wrong key).
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("[encryption] Invalid ciphertext format — expected iv:authTag:ciphertext");
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
