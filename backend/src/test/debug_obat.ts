// Debug: check medication-log/today response
const BASE = "http://localhost:4000";
const h = { "Content-Type": "application/json" };

async function main() {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ email: "mama@gmail.com", password: "Test1234!" }),
  });
  const d = await r.json();
  console.log("Login OK, token:", d.accessToken ? "yes" : "no");

  const r2 = await fetch(`${BASE}/api/medication-log/today`, {
    headers: { ...h, Authorization: `Bearer ${d.accessToken}` },
  });
  const d2 = await r2.json();
  console.log("Status:", r2.status);
  console.log("Count:", Array.isArray(d2) ? d2.length : typeof d2);
  if (Array.isArray(d2) && d2.length > 0) {
    console.log("First item:", JSON.stringify(d2[0], null, 2));
  } else {
    console.log("Raw response:", JSON.stringify(d2, null, 2));
  }
  process.exit(0);
}
main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
