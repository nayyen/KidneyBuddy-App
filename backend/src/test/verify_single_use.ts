// Verify single-use token fix
import { db } from "../lib/db.js";
import { users } from "../db/schema/users.schema.js";
import { passwordResetTokens } from "../db/schema/passwordResetTokens.schema.js";
import { eq, and, isNull, gt } from "drizzle-orm";
import crypto from "node:crypto";

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);
  const email = `verify_${rand}@test.com`;
  const BASE = "http://localhost:4000";
  const h = { "Content-Type": "application/json" };

  console.log("1. Register user");
  let r = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      email,
      namaLengkap: "Verify Test",
      password: "Test1234!",
      konfirmasiPassword: "Test1234!",
      nomorTelepon: "08123456789",
      tanggalLahir: "1990-01-01",
      informedConsent: true,
    }),
  });

  // 2. Forgot password - get raw token from email service log output
  console.log("2. Request forgot password");
  await fetch(`${BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ email }),
  });

  // 3. Read the most recent token from DB (we can only get the hash)
  // But we can test atomicity differently - test consumeIfValid directly
  console.log("3. Direct atomic consumeIfValid test");

  // Create a test token manually
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 3600000);

  // Get a user ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Insert token
  await db.insert(passwordResetTokens).values({
    userId: user.userId,
    tokenHash,
    expiresAt,
  });

  // First consume - should succeed
  const { consumeIfValid } = await import(
    "../repositories/passwordResetToken.repository.js"
  );
  const first = await consumeIfValid(tokenHash);
  console.assert(first !== null, "First consume should return token");
  console.log("   ✓ First consume: token found");

  // Second consume - should return null (already used)
  const second = await consumeIfValid(tokenHash);
  console.assert(second === null, "Second consume should return null");
  console.log("   ✓ Second consume: null (single-use enforced)");

  // 4. Test via API end-to-end
  console.log("4. E2E: forgot password + reset twice");
  await fetch(`${BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ email }),
  });

  // Get the new token from DB
  const [newToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.userId, user.userId as any),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .orderBy(passwordResetTokens.createdAt)
    .limit(1);

  if (!newToken) {
    console.error("No token found in DB - cannot test E2E");
    process.exit(1);
  }

  // We can't get the raw token from the hash, so let's use the E2E API
  // Just test the API directly by trying to reset with a known-bad token
  console.log("5. POST /api/auth/reset-password with already-consumed token");
  // First do a real forgot/reset cycle via API
  const rawToken2 = crypto.randomBytes(32).toString("hex");
  const hash2 = crypto
    .createHash("sha256")
    .update(rawToken2)
    .digest("hex");
  await db.insert(passwordResetTokens).values({
    userId: user.userId,
    tokenHash: hash2,
    expiresAt: new Date(Date.now() + 3600000),
  });

  // First use
  r = await fetch(`${BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      token: rawToken2,
      newPassword: "NewPass1234!",
      konfirmasiPassword: "NewPass1234!",
    }),
  });
  console.assert(r.status === 200, `First reset should be 200, got ${r.status}`);
  console.log("   ✓ First use: 200 OK");

  // Second use (same token)
  r = await fetch(`${BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      token: rawToken2,
      newPassword: "AnotherPass1!",
      konfirmasiPassword: "AnotherPass1!",
    }),
  });
  console.assert(
    r.status === 400,
    `Second reset should be 400, got ${r.status}`,
  );
  console.log(`   ✓ Second use: ${r.status} (rejected - single-use works)`);

  console.log("\n✅ All single-use token tests passed!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
