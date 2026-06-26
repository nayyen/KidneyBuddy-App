import { useState } from "react";
import {
  Home,
  Droplets,
  Bell,
  Users,
  Plus,
  ChevronRight,
  Check,
  Brain,
  Clock,
  Pill,
  Activity,
  Heart,
  ArrowLeft,
  MoreHorizontal,
  X,
} from "lucide-react";

type Screen = "dashboard" | "catat" | "pengingat" | "onboarding";

const TEAL = "#2a9d8f";
const AMBER = "#ef9f27";
const CREAM = "#fdf9f3";

// --- Fluid Ring SVG ---
function FluidRing({ value = 0.3 }: { value?: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const progress = Math.min(Math.abs(value) / 2, 1);
  const offset = circ * (1 - progress);

  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg
        width="144"
        height="144"
        viewBox="0 0 144 144"
        className="absolute inset-0 -rotate-90"
      >
        <circle
          cx="72"
          cy="72"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="10"
        />
        <circle
          cx="72"
          cy="72"
          r={r}
          fill="none"
          stroke="white"
          strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className="text-white text-xs font-semibold opacity-80 mb-0.5">
          Keseimbangan
        </span>
        <span className="text-white text-3xl font-extrabold leading-none">
          {value > 0 ? "+" : "-"}
          {Math.abs(value).toFixed(1)} L
        </span>
        <span className="text-white text-xs opacity-70 mt-0.5">
          {value > 0 ? "Kelebihan" : "Seimbang"}
        </span>
      </div>
    </div>
  );
}

// -------- SCREEN 1: DASHBOARD --------
function Dashboard({ onNav }: { onNav: (s: Screen) => void }) {
  const reminders = [
    { time: "08:00", name: "Furosemide 40mg", done: true },
    { time: "12:00", name: "Calcitriol", done: false },
    { time: "18:00", name: "Sesi CAPD", done: false },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24" style={{ background: CREAM }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: TEAL }}>
            Selamat pagi, 👋
          </p>
          <h1 className="text-2xl font-extrabold text-gray-800 leading-tight">
            Ra Ratna
          </h1>
        </div>
        <button
          className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
          style={{ background: "white" }}
        >
          <Bell size={18} className="text-gray-500" />
        </button>
      </div>

      <div className="px-5 space-y-4">
        {/* Fluid Balance Card */}
        <div
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${TEAL} 0%, #1e8578 100%)` }}
        >
          {/* Decorative circles */}
          <div
            className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10"
            style={{ background: "white" }}
          />
          <div
            className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10"
            style={{ background: "white" }}
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white text-sm font-semibold opacity-80">
                  Keseimbangan Cairan
                </p>
                <p className="text-white text-xs opacity-60">Hari ini, 19 Juni 2026</p>
              </div>
              <button className="text-white opacity-70">
                <MoreHorizontal size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <FluidRing value={0.3} />
              <div className="flex flex-col gap-3 flex-1 pl-5">
                <div
                  className="rounded-2xl p-3"
                  style={{ background: "rgba(255,255,255,0.15)" }}
                >
                  <p className="text-white text-xs opacity-70">Masuk</p>
                  <p className="text-white font-bold text-lg leading-none">1.5 L</p>
                </div>
                <div
                  className="rounded-2xl p-3"
                  style={{ background: "rgba(255,255,255,0.15)" }}
                >
                  <p className="text-white text-xs opacity-70">Keluar</p>
                  <p className="text-white font-bold text-lg leading-none">1.2 L</p>
                </div>
              </div>
            </div>

            <button
              className="mt-4 w-full py-2.5 rounded-2xl text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
              onClick={() => onNav("catat")}
            >
              + Catat Cairan Sekarang
            </button>
          </div>
        </div>

        {/* AI Summary Card */}
        <div
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${AMBER} 0%, #e8901a 100%)` }}
        >
          <div
            className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10"
            style={{ background: "white" }}
          />
          <div className="relative z-10 flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: "rgba(255,255,255,0.25)" }}
            >
              <Brain size={18} color="white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm mb-1">Ringkasan AI Hari Ini</p>
              <p className="text-white text-xs opacity-85 leading-relaxed">
                Asupan cairanmu sudah cukup baik. Ingat batas harian 1.8L. Konsumsi
                buah tinggi kalium perlu dikurangi. Selamat menjaga kesehatan!
              </p>
            </div>
          </div>
        </div>

        {/* Next Reminder */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">Pengingat Berikutnya</h3>
            <button
              className="text-xs font-semibold"
              style={{ color: TEAL }}
              onClick={() => onNav("pengingat")}
            >
              Lihat semua
            </button>
          </div>

          <div className="space-y-2.5">
            {reminders.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 rounded-2xl shadow-sm"
                style={{
                  background: r.done ? "#f0faf9" : "white",
                  border: r.done ? `1.5px solid ${TEAL}20` : "1.5px solid #f0f0f0",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: r.done ? `${TEAL}20` : "#fdf3e3" }}
                >
                  {i === 2 ? (
                    <Activity size={16} style={{ color: AMBER }} />
                  ) : (
                    <Pill size={16} style={{ color: r.done ? TEAL : AMBER }} />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: r.done ? "#7a8c8a" : "#1a2e2c", textDecoration: r.done ? "line-through" : "none" }}
                  >
                    {r.name}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Clock size={11} />
                    {r.time}
                  </p>
                </div>
                {r.done && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: TEAL }}
                  >
                    <Check size={12} color="white" />
                  </div>
                )}
                {!r.done && (
                  <div
                    className="w-6 h-6 rounded-full border-2"
                    style={{ borderColor: "#e0e0e0" }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div>
          <h3 className="font-bold text-gray-800 mb-3">Statistik Minggu Ini</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Kepatuhan", value: "87%", icon: Heart, color: "#e74c7c" },
              { label: "Sesi CAPD", value: "14/14", icon: Activity, color: TEAL },
              { label: "Berat Badan", value: "58 kg", icon: Droplets, color: AMBER },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl p-3 text-center bg-white shadow-sm">
                <div
                  className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center"
                  style={{ background: `${s.color}18` }}
                >
                  <s.icon size={14} style={{ color: s.color }} />
                </div>
                <p className="font-bold text-sm text-gray-800">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// -------- SCREEN 2: CATAT CAIRAN --------
function CatatCairan({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<"masuk" | "keluar">("masuk");
  const [volume, setVolume] = useState("250");
  const [selected, setSelected] = useState<string | null>("air-putih");

  const jenisMasuk = [
    { id: "air-putih", label: "Air Putih", icon: "💧" },
    { id: "susu", label: "Susu", icon: "🥛" },
    { id: "jus", label: "Jus Buah", icon: "🧃" },
    { id: "teh", label: "Teh / Kopi", icon: "☕" },
    { id: "sup", label: "Sup / Kuah", icon: "🍲" },
    { id: "lainnya", label: "Lainnya", icon: "+" },
  ];

  const jenisKeluar = [
    { id: "urin", label: "Urin", icon: "🫙" },
    { id: "keringat", label: "Keringat", icon: "💦" },
    { id: "dialisis", label: "Dialisis", icon: "🩺" },
    { id: "lainnya-k", label: "Lainnya", icon: "+" },
  ];

  const jenis = mode === "masuk" ? jenisMasuk : jenisKeluar;

  return (
    <div className="flex flex-col h-full" style={{ background: CREAM }}>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-6 rounded-b-3xl"
        style={{ background: `linear-gradient(135deg, ${TEAL} 0%, #1e8578 100%)` }}
      >
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            <ArrowLeft size={18} color="white" />
          </button>
          <h2 className="text-white font-bold text-xl">Catat Cairan</h2>
        </div>

        {/* Toggle Masuk/Keluar */}
        <div
          className="flex p-1 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.2)" }}
        >
          {(["masuk", "keluar"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setSelected(null); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all duration-200"
              style={{
                background: mode === m ? "white" : "transparent",
                color: mode === m ? TEAL : "rgba(255,255,255,0.8)",
              }}
            >
              {m === "masuk" ? "⬇ Masuk" : "⬆ Keluar"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-24 space-y-5">
        {/* Volume Input */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-500 mb-3">Volume Cairan</p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setVolume((v) => String(Math.max(0, Number(v) - 50)))}
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold"
              style={{ background: "#f3ede5", color: TEAL }}
            >
              −
            </button>
            <div className="flex-1 text-center">
              <input
                type="number"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="text-5xl font-extrabold text-center w-full outline-none bg-transparent"
                style={{ color: TEAL }}
              />
              <p className="text-gray-400 text-sm font-medium -mt-1">mL</p>
            </div>
            <button
              onClick={() => setVolume((v) => String(Number(v) + 50))}
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold"
              style={{ background: "#f3ede5", color: TEAL }}
            >
              +
            </button>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {[100, 150, 200, 250, 350, 500].map((ml) => (
              <button
                key={ml}
                onClick={() => setVolume(String(ml))}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: volume === String(ml) ? TEAL : "#f3ede5",
                  color: volume === String(ml) ? "white" : "#7a8c8a",
                }}
              >
                {ml} mL
              </button>
            ))}
          </div>
        </div>

        {/* Jenis Cairan */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-500 mb-3">
            Jenis Cairan {mode === "masuk" ? "Masuk" : "Keluar"}
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {jenis.map((j) => (
              <button
                key={j.id}
                onClick={() => setSelected(j.id)}
                className="flex flex-col items-center justify-center py-3 px-2 rounded-2xl border-2 transition-all"
                style={{
                  background: selected === j.id ? `${TEAL}10` : "#fafafa",
                  borderColor: selected === j.id ? TEAL : "#f0f0f0",
                }}
              >
                <span className="text-2xl mb-1">{j.icon}</span>
                <span
                  className="text-xs font-semibold text-center leading-tight"
                  style={{ color: selected === j.id ? TEAL : "#555" }}
                >
                  {j.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Catatan */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-500 mb-3">Catatan (opsional)</p>
          <textarea
            rows={3}
            placeholder="Tambah catatan..."
            className="w-full text-sm rounded-2xl p-3 outline-none resize-none"
            style={{ background: "#f8f8f8", color: "#333" }}
          />
        </div>

        {/* Submit */}
        <button
          className="w-full py-4 rounded-3xl text-white font-bold text-base shadow-lg"
          style={{ background: `linear-gradient(135deg, ${TEAL}, #1e8578)` }}
        >
          Simpan Catatan
        </button>
      </div>
    </div>
  );
}

// -------- SCREEN 3: PENGINGAT --------
function Pengingat() {
  const [done, setDone] = useState<Set<number>>(new Set([0]));

  const reminders = [
    {
      category: "Obat Pagi",
      icon: "💊",
      color: TEAL,
      items: [
        { id: 0, name: "Furosemide 40mg", detail: "1 tablet — 08:00", time: "08:00" },
        { id: 1, name: "Calcitriol 0.25mcg", detail: "1 kapsul — 08:00", time: "08:00" },
        { id: 2, name: "Sevelamer 800mg", detail: "2 tablet bersama makan — 08:00", time: "08:00" },
      ],
    },
    {
      category: "Terapi & Prosedur",
      icon: "🩺",
      color: AMBER,
      items: [
        { id: 3, name: "Sesi CAPD Pagi", detail: "Exchange pertama — 07:00", time: "07:00" },
        { id: 4, name: "Sesi CAPD Siang", detail: "Exchange kedua — 13:00", time: "13:00" },
        { id: 5, name: "Cek Tekanan Darah", detail: "Ukur dan catat — 12:00", time: "12:00" },
      ],
    },
    {
      category: "Obat Malam",
      icon: "🌙",
      color: "#6b5ce7",
      items: [
        { id: 6, name: "Amlodipine 5mg", detail: "1 tablet — 20:00", time: "20:00" },
        { id: 7, name: "Erythropoietin", detail: "Injeksi subkutan — 20:00", time: "20:00" },
      ],
    },
  ];

  const toggle = (id: number) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allIds = reminders.flatMap((g) => g.items.map((i) => i.id));
  const doneCount = done.size;

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24" style={{ background: CREAM }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-extrabold text-gray-800">Pengingat</h1>
        <p className="text-sm text-gray-400 mt-0.5">Kamis, 19 Juni 2026</p>
      </div>

      {/* Progress Bar */}
      <div className="mx-5 mb-5">
        <div
          className="rounded-2xl p-4"
          style={{ background: `linear-gradient(135deg, ${TEAL}15, ${TEAL}08)`, border: `1.5px solid ${TEAL}25` }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold" style={{ color: TEAL }}>
              Progress Hari Ini
            </p>
            <p className="text-sm font-bold" style={{ color: TEAL }}>
              {doneCount}/{allIds.length}
            </p>
          </div>
          <div className="w-full h-2.5 rounded-full bg-white overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(doneCount / allIds.length) * 100}%`,
                background: `linear-gradient(90deg, ${TEAL}, #1e8578)`,
              }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {allIds.length - doneCount} item tersisa hari ini
          </p>
        </div>
      </div>

      <div className="px-5 space-y-4">
        {reminders.map((group) => (
          <div key={group.category}>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-base">{group.icon}</span>
              <h3 className="font-bold text-gray-700 text-sm">{group.category}</h3>
            </div>
            <div className="space-y-2">
              {group.items.map((item) => {
                const isDone = done.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl shadow-sm text-left transition-all"
                    style={{
                      background: isDone ? `${group.color}10` : "white",
                      border: isDone ? `1.5px solid ${group.color}30` : "1.5px solid #f0f0f0",
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 border-2 transition-all"
                      style={{
                        background: isDone ? group.color : "transparent",
                        borderColor: isDone ? group.color : "#d0d0d0",
                      }}
                    >
                      {isDone && <Check size={13} color="white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1">
                      <p
                        className="text-sm font-semibold"
                        style={{
                          color: isDone ? "#aaa" : "#1a2e2c",
                          textDecoration: isDone ? "line-through" : "none",
                        }}
                      >
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
                    </div>
                    <div
                      className="px-2.5 py-1 rounded-xl"
                      style={{ background: isDone ? "transparent" : `${group.color}15` }}
                    >
                      <p className="text-xs font-bold" style={{ color: isDone ? "#aaa" : group.color }}>
                        {item.time}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------- SCREEN 4: ONBOARDING - PILIH TERAPI --------
function Onboarding({ onDone }: { onDone: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  const therapies = [
    {
      id: "capd",
      name: "CAPD",
      full: "Continuous Ambulatory Peritoneal Dialysis",
      icon: "🫀",
      desc: "Dialisis peritoneal mandiri di rumah, 4x exchange per hari",
      color: TEAL,
    },
    {
      id: "hemo",
      name: "Hemodialisis",
      full: "HD — Cuci Darah",
      icon: "🩸",
      desc: "Kunjungan rutin ke pusat dialisis, biasanya 3x per minggu",
      color: "#e74c7c",
    },
    {
      id: "transplant",
      name: "Transplantasi",
      full: "Pasca Cangkok Ginjal",
      icon: "💚",
      desc: "Pemantauan pascatransplantasi dan manajemen obat imunosupresan",
      color: AMBER,
    },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: CREAM }}>
      {/* Decorative top */}
      <div
        className="px-5 pt-14 pb-8 rounded-b-[40px]"
        style={{ background: `linear-gradient(160deg, ${TEAL} 0%, #1e8578 100%)` }}
      >
        <div className="flex justify-center mb-5">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            <Heart size={30} color="white" />
          </div>
        </div>
        <h1 className="text-white text-2xl font-extrabold text-center leading-tight">
          Terapi apa yang<br />kamu jalani?
        </h1>
        <p className="text-white text-sm text-center mt-2 opacity-75">
          Pilih metode terapi ginjal yang sedang kamu jalani
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-10 space-y-3">
        {therapies.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className="w-full rounded-3xl p-5 text-left transition-all duration-200 shadow-sm"
            style={{
              background: selected === t.id ? `${t.color}12` : "white",
              border: `2px solid ${selected === t.id ? t.color : "#f0f0f0"}`,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: `${t.color}18` }}
              >
                {t.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-800 text-base">{t.name}</p>
                  <div
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{
                      borderColor: selected === t.id ? t.color : "#d0d0d0",
                      background: selected === t.id ? t.color : "transparent",
                    }}
                  >
                    {selected === t.id && <Check size={13} color="white" strokeWidth={3} />}
                  </div>
                </div>
                <p className="text-xs font-medium mt-0.5" style={{ color: t.color }}>
                  {t.full}
                </p>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{t.desc}</p>
              </div>
            </div>
          </button>
        ))}

        <button
          onClick={onDone}
          disabled={!selected}
          className="w-full mt-2 py-4 rounded-3xl text-white font-bold text-base transition-all duration-200 shadow-lg"
          style={{
            background: selected
              ? `linear-gradient(135deg, ${TEAL}, #1e8578)`
              : "#d0d0d0",
          }}
        >
          Lanjutkan
        </button>

        <p className="text-center text-xs text-gray-400 pb-4">
          Kamu bisa mengubah pilihan ini kapan saja di Pengaturan
        </p>
      </div>
    </div>
  );
}

// -------- BOTTOM NAV --------
function BottomNav({
  active,
  onNav,
}: {
  active: Screen;
  onNav: (s: Screen) => void;
}) {
  const tabs = [
    { id: "dashboard" as Screen, icon: Home, label: "Beranda" },
    { id: "pengingat" as Screen, icon: Bell, label: "Pengingat" },
    { id: "__add__" as Screen, icon: Plus, label: "" },
    { id: "catat" as Screen, icon: Droplets, label: "Cairan" },
    { id: "onboarding" as Screen, icon: Users, label: "Terapi" },
  ];

  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
      style={{ background: "white", borderTop: "1px solid rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-end justify-around px-4 pb-6 pt-2">
        {tabs.map((tab) => {
          if (tab.id === "__add__") {
            return (
              <button
                key="add"
                onClick={() => onNav("catat")}
                className="flex flex-col items-center -mt-5"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${TEAL}, #1e8578)` }}
                >
                  <Plus size={26} color="white" strokeWidth={2.5} />
                </div>
              </button>
            );
          }
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNav(tab.id)}
              className="flex flex-col items-center gap-1 py-1 px-3"
            >
              <div
                className="w-6 h-6 flex items-center justify-center"
                style={{ color: isActive ? TEAL : "#b0b8b6" }}
              >
                <tab.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span
                className="text-[10px] font-semibold"
                style={{ color: isActive ? TEAL : "#b0b8b6" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// -------- ROOT --------
export default function App() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [showOnboarding, setShowOnboarding] = useState(true);

  if (showOnboarding) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: "#1a1a2e" }}
      >
        <div
          className="relative w-full max-w-[430px] h-screen overflow-hidden flex flex-col"
          style={{ background: CREAM }}
        >
          <Onboarding onDone={() => setShowOnboarding(false)} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ background: "#1a1a2e" }}
    >
      <div
        className="relative w-full max-w-[430px] h-screen overflow-hidden flex flex-col"
        style={{ background: CREAM }}
      >
        <div className="flex-1 overflow-hidden relative">
          {screen === "dashboard" && <Dashboard onNav={setScreen} />}
          {screen === "catat" && <CatatCairan onBack={() => setScreen("dashboard")} />}
          {screen === "pengingat" && <Pengingat />}
          {screen === "onboarding" && <Onboarding onDone={() => setScreen("dashboard")} />}
        </div>
        <BottomNav active={screen} onNav={setScreen} />
      </div>
    </div>
  );
}
