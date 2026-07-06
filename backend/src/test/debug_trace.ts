// Debug: full trace of getTodayLogs for a specific user
const BASE = "http://localhost:4000";
const h = { "Content-Type": "application/json" };

async function main() {
  const rand = Math.random().toString(36).slice(2, 8);
  const email = `trace_${rand}@test.com`;
  const pw = "Test1234!";
  
  // Register
  let r = await fetch(`${BASE}/api/auth/register`, {
    method: "POST", headers: h,
    body: JSON.stringify({ email, namaLengkap: "Trace", password: pw,
      konfirmasiPassword: pw, informedConsent: true }),
  });
  let reg = await r.json();
  let token = reg.accessToken;
  console.log("1. Registered, user ID:", reg.user?.userId || "(unknown)");

  // Onboard
  await fetch(`${BASE}/api/onboarding/therapy`, {
    method: "POST", headers: { ...h, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ therapy: "CAPD" }),
  });
  await fetch(`${BASE}/api/onboarding/skip-reminder`, {
    method: "POST", headers: { ...h, Authorization: `Bearer ${token}` },
  });

  // Create reminder
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const jakartaNow = new Date(Date.now() + 7 * 3600 * 1000);
  const todayName = days[jakartaNow.getUTCDay()].toLowerCase();
  const hh = String(jakartaNow.getUTCHours()).padStart(2, "0");
  const mm = String(jakartaNow.getUTCMinutes()).padStart(2, "0");

  r = await fetch(`${BASE}/api/reminders`, {
    method: "POST", headers: { ...h, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ jenis: "obat", nama: "TraceMed", dosis: "1x",
      jenisObat: "minum", jamPengingat: `${hh}:${mm}`,
      hariAktif: [todayName] }),
  });
  let rem = await r.json();
  console.log("2. Reminder created:", rem.id ? "yes" : JSON.stringify(rem));

  // Check reminders API
  r = await fetch(`${BASE}/api/reminders`, {
    headers: { ...h, Authorization: `Bearer ${token}` },
  });
  let rems = await r.json();
  console.log("3. Reminders for user:", Array.isArray(rems) ? rems.length : 0);

  // Check medication-log/today
  r = await fetch(`${BASE}/api/medication-log/today`, {
    headers: { ...h, Authorization: `Bearer ${token}` },
  });
  let logs = await r.json();
  console.log("4. medication-log/today status:", r.status);
  console.log("   Count:", Array.isArray(logs) ? logs.length : typeof logs);
  if (Array.isArray(logs)) {
    console.log("   Data:", JSON.stringify(logs));
  } else {
    console.log("   Raw:", JSON.stringify(logs));
  }

  // Check medication-log/today endpoint for 'mama' user too
  r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: h,
    body: JSON.stringify({ email: "mama@gmail.com", password: "Test1234!" }),
  });
  let mama = await r.json();
  if (mama.accessToken) {
    r = await fetch(`${BASE}/api/medication-log/today`, {
      headers: { ...h, Authorization: `Bearer ${mama.accessToken}` },
    });
    let mamaLogs = await r.json();
    console.log("5. mama's medication-log/today:", Array.isArray(mamaLogs) ? mamaLogs.length : JSON.stringify(mamaLogs));
  }

  process.exit(0);
}
main().catch(e => { console.error("Error:", e); process.exit(1); });
