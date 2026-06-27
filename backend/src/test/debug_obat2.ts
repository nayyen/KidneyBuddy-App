// Debug: register, create reminder, then check medication-log/today
const BASE = "http://localhost:4000";
const h = { "Content-Type": "application/json" };

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);
  const email = `obattest_${rand}@test.com`;
  const pw = "Test1234!";

  // 1. Register
  console.log("1. Register user");
  let r = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      email,
      namaLengkap: "Obat Test",
      password: pw,
      konfirmasiPassword: pw,
      nomorTelepon: "08123456789",
      tanggalLahir: "1990-01-01",
      informedConsent: true,
    }),
  });
  let regData = await r.json();
  console.log("   Registered, token:", regData.accessToken ? "yes" : "no");

  // 2. Complete onboarding
  console.log("2. Set therapy via onboarding");
  let token = regData.accessToken;
  await fetch(`${BASE}/api/onboarding/therapy`, {
    method: "POST",
    headers: { ...h, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ therapy: "CAPD" }),
  });

  // 3. Complete onboarding (skip reminder)
  await fetch(`${BASE}/api/onboarding/skip-reminder`, {
    method: "POST",
    headers: { ...h, Authorization: `Bearer ${token}` },
  });

  // 4. Create a medication reminder for today
  console.log("3. Create obat reminder for today");
  // Current day in WIB
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const jakartaNow = new Date(Date.now() + 7 * 3600 * 1000);
  const todayName = days[jakartaNow.getUTCDay()];
  const currentHH = String(jakartaNow.getUTCHours()).padStart(2, "0");
  const currentMM = String(jakartaNow.getUTCMinutes()).padStart(2, "0");

  r = await fetch(`${BASE}/api/reminders`, {
    method: "POST",
    headers: { ...h, Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      jenis: "obat",
      nama: "Obat Test",
      dosis: "1 tablet",
      jenisObat: "minum",
      jamPengingat: `${currentHH}:${currentMM}`,
      hariAktif: [todayName.toLowerCase()],
      catatanWaktu: "Sesudah makan",
    }),
  });
  let reminderData = await r.json();
  console.log("   Created:", r.status, reminderData.nama || JSON.stringify(reminderData));

  // 5. Check medication-log/today
  console.log("4. GET /api/medication-log/today");
  r = await fetch(`${BASE}/api/medication-log/today`, {
    headers: { ...h, Authorization: `Bearer ${token}` },
  });
  let logs = await r.json();
  console.log("   Status:", r.status);
  console.log("   Count:", Array.isArray(logs) ? logs.length : typeof logs);
  if (Array.isArray(logs) && logs.length > 0) {
    console.log("   First item:", JSON.stringify(logs[0], null, 2));
  } else {
    console.log("   Raw:", JSON.stringify(logs, null, 2));
  }

  // 6. Also check /api/reminders list
  console.log("5. GET /api/reminders");
  r = await fetch(`${BASE}/api/reminders`, {
    headers: { ...h, Authorization: `Bearer ${token}` },
  });
  let rems = await r.json();
  console.log("   Count:", Array.isArray(rems) ? rems.length : typeof rems);
  if (Array.isArray(rems) && rems.length > 0) {
    console.log("   First:", JSON.stringify(rems[0], null, 2));
  }

  process.exit(0);
}
main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
