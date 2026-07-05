"use client";

/**
 * FirstReminderStep.tsx — onboarding "Atur Pengingat Pertama" step
 *
 * Jenis is the FIRST field, constrained by the therapy chosen in step 1
 * (mirrors AddReminderSheet.tsx's therapy-scoping exactly):
 *   - Obat — always available
 *   - Exchange CAPD — only when metodeTerapiAktif === "CAPD"
 *   - Jadwal HD — only when metodeTerapiAktif === "HD"
 *
 * Once a jenis is chosen, the IDENTICAL per-jenis reminder form used on
 * /pengingat is rendered (imported directly, never reimplemented), so the
 * two forms can never drift out of sync. Those forms own their own
 * validation and POST directly to /api/reminders.
 */

import { useState } from "react";
import { reminderJenisLabels } from "@/lib/validators/onboarding.schema";
import MedicationReminderForm from "@/components/pengingat/MedicationReminderForm";
import CAPDReminderForm from "@/components/pengingat/CAPDReminderForm";
import HDReminderForm from "@/components/pengingat/HDReminderForm";

type ReminderJenis = "obat" | "capd" | "hd";

interface FirstReminderStepProps {
  metodeTerapiAktif: string | null;
  accessToken: string;
  onReminderCreated: () => void | Promise<void>;
  onSkip: () => Promise<void>;
  isSkipping: boolean;
  onBack: () => void;
}

export default function FirstReminderStep({
  metodeTerapiAktif,
  accessToken,
  onReminderCreated,
  onSkip,
  isSkipping,
  onBack,
}: FirstReminderStepProps) {
  // Which jenis to offer depends on the therapy chosen in step 1 —
  // identical scoping to AddReminderSheet.tsx used on /pengingat.
  const availableTypes: ReminderJenis[] = ["obat"];
  if (metodeTerapiAktif === "CAPD") availableTypes.push("capd");
  if (metodeTerapiAktif === "HD") availableTypes.push("hd");

  const [selectedJenis, setSelectedJenis] = useState<ReminderJenis>("obat");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-lg font-bold text-foreground mb-1">
          Atur Pengingat Pertama
        </h2>
        <p className="text-sm text-muted-foreground font-sans">
          Kami akan bantu ingatkan jadwal terapi kamu. Isi minimal satu pengingat untuk memulai.
        </p>
      </div>

      {/* Jenis — always the first field */}
      <div>
        <label htmlFor="jenis" className="block text-sm font-medium font-sans text-foreground mb-1">
          Jenis
        </label>
        <select
          id="jenis"
          value={selectedJenis}
          onChange={(e) => setSelectedJenis(e.target.value as ReminderJenis)}
          className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {availableTypes.map((type) => (
            <option key={type} value={type}>
              {reminderJenisLabels[type]}
            </option>
          ))}
        </select>
      </div>

      {/* Reused canonical per-jenis form from /pengingat */}
      {selectedJenis === "obat" && (
        <MedicationReminderForm
          accessToken={accessToken}
          onSuccess={onReminderCreated}
          onCancel={() => setSelectedJenis("obat")}
        />
      )}
      {selectedJenis === "capd" && (
        <CAPDReminderForm
          accessToken={accessToken}
          onSuccess={onReminderCreated}
          onCancel={() => setSelectedJenis("obat")}
        />
      )}
      {selectedJenis === "hd" && (
        <HDReminderForm
          accessToken={accessToken}
          onSuccess={onReminderCreated}
          onCancel={() => setSelectedJenis("obat")}
        />
      )}

      {/* Skip */}
      <button
        type="button"
        onClick={onSkip}
        disabled={isSkipping}
        className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground font-sans transition-colors disabled:opacity-50"
      >
        {isSkipping ? "..." : "Lewati untuk sekarang"}
      </button>

      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-sans text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Kembali
      </button>
    </div>
  );
}
