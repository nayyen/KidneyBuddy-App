"use client";

/**
 * AddReminderSheet.tsx — Type-aware reminder creation sheet
 *
 * Offers:
 *   - "Obat" — always
 *   - "CAPD" — only when user.metodeTerapiAktif === "CAPD"
 *   - "HD" — only when user.metodeTerapiAktif === "HD"
 *
 * On selection, renders the matching form (MedicationReminderForm /
 * CAPDReminderForm / HDReminderForm). On success, closes the sheet and
 * calls onSuccess (so parent can refresh the reminder list).
 */

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import MedicationReminderForm from "./MedicationReminderForm";
import CAPDReminderForm from "./CAPDReminderForm";
import HDReminderForm from "./HDReminderForm";

type ReminderType = "obat" | "capd" | "hd";

interface AddReminderSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string;
  metodeTerapiAktif: string | null;
  onSuccess?: () => void;
}

const TYPE_LABELS: Record<ReminderType, string> = {
  obat: "Obat",
  capd: "CAPD",
  hd: "HD",
};

export default function AddReminderSheet({
  isOpen,
  onOpenChange,
  accessToken,
  metodeTerapiAktif,
  onSuccess,
}: AddReminderSheetProps) {
  const [selectedType, setSelectedType] = useState<ReminderType | null>(null);

  // Which types to show depends on therapy method
  const availableTypes: ReminderType[] = ["obat"];
  if (metodeTerapiAktif === "CAPD") availableTypes.push("capd");
  if (metodeTerapiAktif === "HD") availableTypes.push("hd");

  const handleClose = () => {
    setSelectedType(null);
    onOpenChange(false);
  };

  const handleSuccess = () => {
    setSelectedType(null);
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedType(null);
        }
        onOpenChange(open);
      }}
    >
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] rounded-t-2xl sm:max-w-md sm:rounded-2xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[85dvh]"
      >
        <SheetHeader className="pb-3 sm:px-6 sm:pt-5 sm:pb-3 shrink-0">
          <SheetTitle className="font-heading text-base font-bold text-foreground text-left">
            {selectedType
              ? `Pengingat ${TYPE_LABELS[selectedType]}`
              : "Tambah Pengingat"}
          </SheetTitle>
        </SheetHeader>

        <div className="pl-4 pb-4 pr-2 sm:pl-6 sm:pb-6 sm:pr-4 overflow-y-auto flex-1 min-h-0">
          {/* Type selection — shown when no type chosen yet */}
          {!selectedType && (
            <div className="space-y-2">
              <p
                className="font-sans font-medium mb-4"
                style={{ fontSize: 12, color: "#3d6b66" }}
              >
                Pilih jenis pengingat yang ingin ditambahkan:
              </p>
              {availableTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className="w-full flex items-center gap-3 rounded-[13px] transition-colors"
                  style={{
                    padding: "12px 14px",
                    border: "0.5px solid #f0faf9",
                    backgroundColor: "#ffffff",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {/* Type badge */}
                  <span
                    className="font-sans font-medium shrink-0"
                    style={{
                      fontSize: 13,
                      paddingLeft: 8,
                      paddingRight: 8,
                      paddingTop: 3,
                      paddingBottom: 3,
                      borderRadius: 6,
                      backgroundColor:
                        type === "obat"
                          ? "#f0faf9"
                          : type === "capd"
                          ? "#f0faf9"
                          : "#fdf3e3",
                      color:
                        type === "obat"
                          ? "#2a9d8f"
                          : type === "capd"
                          ? "#2a9d8f"
                          : "#7a4c0a",
                    }}
                  >
                    {TYPE_LABELS[type]}
                  </span>
                  <div>
                    <p
                      className="font-sans font-medium"
                      style={{ fontSize: 12, color: "#1a2e2c" }}
                    >
                      {type === "obat"
                        ? "Pengingat Obat"
                        : type === "capd"
                        ? "Exchange CAPD"
                        : "Jadwal Hemodialisis"}
                    </p>
                    <p
                      className="font-sans"
                      style={{ fontSize: 13, color: "#3d6b66", marginTop: 2 }}
                    >
                      {type === "obat"
                        ? "Atur dosis, cara minum, dan jadwal harian"
                        : type === "capd"
                        ? "Atur jadwal penggantian cairan CAPD"
                        : "Atur jadwal sesi dialisis mingguan"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Forms — shown after type selected */}
          {selectedType === "obat" && (
            <MedicationReminderForm
              accessToken={accessToken}
              onSuccess={handleSuccess}
              onCancel={() => setSelectedType(null)}
            />
          )}

          {selectedType === "capd" && (
            <CAPDReminderForm
              accessToken={accessToken}
              onSuccess={handleSuccess}
              onCancel={() => setSelectedType(null)}
            />
          )}

          {selectedType === "hd" && (
            <HDReminderForm
              accessToken={accessToken}
              onSuccess={handleSuccess}
              onCancel={() => setSelectedType(null)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
