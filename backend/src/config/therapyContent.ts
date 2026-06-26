// Therapy content for onboarding — single source of truth for UI rendering
// DESIGN_SYSTEM therapy identity colors

export interface TherapyContent {
  id: "CAPD" | "HD" | "Transplantasi";
  nama: string;
  namaPanjang: string;
  penjelasan: string;
  warna: string;       // primary brand color
  warnaBg: string;     // background tint
}

export const therapyList: TherapyContent[] = [
  {
    id: "CAPD",
    nama: "CAPD",
    namaPanjang: "Continuous Ambulatory Peritoneal Dialysis",
    penjelasan:
      "CAPD adalah cuci darah mandiri di rumah pakai cairan khusus, dilakukan 3–5 kali sehari. Banyak pasien menjalaninya dengan nyaman setelah terbiasa.",
    warna: "#2a9d8f",
    warnaBg: "#f0faf9",
  },
  {
    id: "HD",
    nama: "HD",
    namaPanjang: "Hemodialisis",
    penjelasan:
      "Hemodialisis (HD) adalah cuci darah di rumah sakit atau klinik, biasanya 2–3 kali seminggu selama 4–5 jam per sesi. Anda akan dibantu oleh perawat selama prosesnya.",
    warna: "#ef9f27",
    warnaBg: "#fdf3e3",
  },
  {
    id: "Transplantasi",
    nama: "Transplantasi",
    namaPanjang: "Transplantasi Ginjal",
    penjelasan:
      "Transplantasi ginjal adalah operasi penggantian ginjal yang rusak dengan ginjal sehat dari donor. Setelahnya Anda tetap perlu kontrol rutin dan minum obat anti-tolak secara teratur.",
    warna: "#6b5ca5",
    warnaBg: "#f1eef9",
  },
];
