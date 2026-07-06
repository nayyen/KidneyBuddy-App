// Debug: check medication-log/today error
const BASE = "http://localhost:4000";
const h = { "Content-Type": "application/json" };

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);
  const email = `err_${rand}@test.com`;
  const pw = "Test1234!";

  // Register
  let r = await fetch(`${BASE}/api/auth/register`, {
    method: "POST", headers: h,
    body: JSON.stringify({ email, namaLengkap: "Err Test", password: pw,
      konfirmasiPassword: pw, informedConsent: true }),
  });
  let reg = await r.json();
  let token = reg.accessToken;

  // Onboard
  await fetch(`${BASE}/api/onboarding/therapy`, {
    method: "POST", headers: { ...h, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ therapy: "CAPD" }),
  });
  await fetch(`${BASE}/api/onboarding/skip-reminder`, {
    method: "POST", headers: { ...h, Authorization: `Bearer ${token}` },
  });

  // Create reminder for today
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const jakartaNow = new Date(Date.now() + 7 * 3600 * 1000);
  const todayName = days[jakartaNow.getUTCDay()];
  const hh = String(jakartaNow.getUTCHours()).padStart(2, "0");
  const mm = String(jakartaNow.getUTCMinutes()).padStart(2, "0");

  await fetch(`${BASE}/api/reminders`, {
    method: "POST", headers: { ...h, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ jenis: "obat", nama: "Test", dosis: "1x",
      jenisObat: "minum", jamPengingat: `${hh}:${mm}`,
      hariAktif: [todayName.toLowerCase()] }),
  });

  // Test medication-log/today
  r = await fetch(`${BASE}/api/medication-log/today`, {
    headers: { ...h, Authorization: `Bearer ${token}` },
  });
  console.log("Status:", r.status);
  const body = await r.text();
  console.log("Body:", body);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
