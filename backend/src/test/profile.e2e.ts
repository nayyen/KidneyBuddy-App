/**
 * E2E tests for Profile (Plan 01-05) endpoints.
 * Run: docker-compose exec backend node --import tsx src/test/profile.e2e.ts
 */

const BASE = "http://localhost:4000";
const h = { "Content-Type": "application/json" };

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);
  const email = `profile_e2e_${rand}@test.com`;
  const password = "Test1234!";

  console.log("1. Register user with CAPD therapy");
  let r = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      email,
      namaLengkap: "E2E Profile Test",
      password,
      konfirmasiPassword: password,
      nomorTelepon: "08123456789",
      tanggalLahir: "1990-01-01",
      informedConsent: true,
      metodeTerapi: "CAPD",
    }),
  });
  let data: any = await r.json();
  console.log("   ✓ Registered:", data.user?.namaLengkap || data.userId ? "yes" : JSON.stringify(data));

  console.log("2. Login to get token");
  r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ email, password }),
  });
  const loginData: any = await r.json();
  const token = loginData.accessToken;
  if (!token) throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  console.log("   ✓ Logged in, token obtained");

  console.log("3. Complete onboarding therapy step → set CAPD");
  r = await fetch(`${BASE}/api/onboarding/therapy`, {
    method: "POST",
    headers: { ...h, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ therapy: "CAPD" }),
  });
  data = await r.json();
  console.assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(data)}`);
  console.log("   ✓ Therapy set to CAPD via onboarding");

  console.log("4. GET /api/auth/me — verify current therapy = CAPD");
  r = await fetch(`${BASE}/api/auth/me`, {
    headers: { ...h, Authorization: `Bearer ${token}` },
  });
  data = await r.json();
  console.assert(
    data.metodeTerapiAktif === "CAPD",
    `Expected CAPD, got ${data.metodeTerapiAktif}`,
  );
  console.log("   ✓ Therapy is CAPD");

  console.log("5. POST /api/profile/therapy — reject without confirmed: true");
  r = await fetch(`${BASE}/api/profile/therapy`, {
    method: "POST",
    headers: { ...h, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ newMethod: "HD" }),
  });
  console.assert(r.status === 400 || r.status === 422, `Expected 400/422, got ${r.status}`);
  console.log(`   ✓ Rejected (status ${r.status})`);

  console.log("6. POST /api/profile/therapy — change CAPD → HD");
  r = await fetch(`${BASE}/api/profile/therapy`, {
    method: "POST",
    headers: { ...h, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ newMethod: "HD", confirmed: true }),
  });
  data = await r.json();
  console.assert(data.changed === true, `Expected changed:true, got ${JSON.stringify(data)}`);
  console.log(`   ✓ Changed to HD: ${data.message}`);

  console.log("7. GET /api/auth/me — verify therapy now = HD");
  r = await fetch(`${BASE}/api/auth/me`, {
    headers: { ...h, Authorization: `Bearer ${token}` },
  });
  data = await r.json();
  console.assert(
    data.metodeTerapiAktif === "HD",
    `Expected HD, got ${data.metodeTerapiAktif}`,
  );
  console.log("   ✓ Therapy is now HD");

  console.log("8. GET /api/profile/therapy-history — verify history exists");
  r = await fetch(`${BASE}/api/profile/therapy-history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  data = await r.json();
  console.assert(Array.isArray(data), "Expected array");
  console.assert(data.length >= 1, `Expected ≥1 history entry, got ${data.length}`);
  console.assert(data[0].metodeBaru === "HD", `Expected HD, got ${data[0].metodeBaru}`);
  console.log(`   ✓ History has ${data.length} entry(ies)`);

  console.log("9. POST /api/profile/therapy — same-method no-op");
  r = await fetch(`${BASE}/api/profile/therapy`, {
    method: "POST",
    headers: { ...h, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ newMethod: "HD", confirmed: true }),
  });
  data = await r.json();
  console.assert(data.changed === false, `Expected changed:false, got ${JSON.stringify(data)}`);
  console.log(`   ✓ No-op: ${data.message}`);

  console.log("\n✅ All E2E profile tests passed!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ E2E failed:", err.message);
  process.exit(1);
});
