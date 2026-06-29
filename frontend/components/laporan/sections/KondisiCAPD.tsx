"use client";

/**
 * KondisiCAPD — Report section 3: CAPD condition frequency
 *
 * Shows counts for jernih/keruh/keruh_gumpalan/berdarah.
 * Renders ONLY when user's metodeTerapiAktif === 'CAPD'.
 * Returns null for non-CAPD users (no card, no placeholder).
 *
 * Berdarah row turns #d4183d when count > 0.
 */

export interface CAPDFrequencyData {
  jernih: number;
  keruh: number;
  keruh_gumpalan: number;
  berdarah: number;
}

interface Props {
  capdFrequency: CAPDFrequencyData;
}

const CONDITIONS = [
  { key: "jernih" as const, label: "Jernih" },
  { key: "keruh" as const, label: "Keruh" },
  { key: "keruh_gumpalan" as const, label: "Keruh dengan gumpalan putih" },
  { key: "berdarah" as const, label: "Berdarah" },
];

export default function KondisiCAPD({ capdFrequency }: Props) {
  const hasData = Object.values(capdFrequency).some((v) => v > 0);

  return (
    <div className="laporan-section-card">
      {/* Section header with teal accent */}
      <div className="border-l-[3px] border-[#2a9d8f] pl-3 mb-4">
        <h2 className="text-sm font-bold text-[#1a2e2c]">Kondisi CAPD</h2>
      </div>

      {!hasData ? (
        <p className="text-xs font-medium text-[#7a8c8a] text-center py-4">
          Tidak ada data kondisi CAPD dalam periode yang dipilih.
        </p>
      ) : (
        <div className="space-y-2">
          {CONDITIONS.map(({ key, label }) => {
            const count = capdFrequency[key];
            const isBerdarah = key === "berdarah" && count > 0;
            return (
              <div
                key={key}
                className={`flex justify-between items-center py-1.5 border-b border-[#f0faf9] last:border-b-0 ${
                  isBerdarah ? "text-[#d4183d]" : "text-[#1a2e2c]"
                }`}
              >
                <span className="text-xs font-medium">{label}</span>
                <span className="text-xs font-bold">{count}x</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
