"use client";

import { useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import MedicationReminderForm from "./MedicationReminderForm";
import CAPDReminderForm from "./CAPDReminderForm";
import HDReminderForm from "./HDReminderForm";
import type { Reminder } from "./ReminderItem";

interface EditReminderSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string;
  reminder: Reminder | null;
  onSuccess?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  obat: "Obat",
  capd: "CAPD",
  hd: "HD",
};

export default function EditReminderSheet({
  isOpen,
  onOpenChange,
  accessToken,
  reminder,
  onSuccess,
}: EditReminderSheetProps) {
  
  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  // Guards Radix Sheet dismissal against the native file-picker focus round
  // trip: when the OS file picker opens/closes, focus moves away from and
  // back to the document, which Radix's DismissableLayer treats as an
  // outside interaction and closes the Sheet — losing the in-progress edit
  // (quick-260706-dfx, replacing the fragile tagName-only guard from
  // quick-260706-arp, which missed the focus-return dismissal entirely).
  const filePickerOpenRef = useRef(false);

  useEffect(() => {
    const handleWindowFocus = () => {
      // Runs after Radix's synchronous focusOutside handler on the same
      // tick, so the guard still sees `true` when it needs to, then clears
      // it so a later genuine outside click/focus can still dismiss.
      setTimeout(() => {
        filePickerOpenRef.current = false;
      }, 0);
    };
    window.addEventListener("focus", handleWindowFocus);
    return () => window.removeEventListener("focus", handleWindowFocus);
  }, []);

  if (!reminder) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] rounded-t-2xl sm:max-w-md sm:rounded-2xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[85dvh]"
          onClickCapture={(e) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('input[type="file"]')) {
              filePickerOpenRef.current = true;
            }
          }}
          onPointerDownOutside={(e) => {
            if (filePickerOpenRef.current) {
              e.preventDefault();
            }
          }}
          onFocusOutside={(e) => {
            if (filePickerOpenRef.current) {
              e.preventDefault();
              filePickerOpenRef.current = false;
            }
          }}
          onInteractOutside={(e) => {
            if (filePickerOpenRef.current) {
              e.preventDefault();
            }
          }}
      >
        <SheetHeader className="pb-3 sm:px-6 sm:pt-5 sm:pb-3 shrink-0">
          <SheetTitle className="font-heading text-base font-bold text-foreground text-left">
            Edit Pengingat {TYPE_LABELS[reminder.jenis]}
          </SheetTitle>
        </SheetHeader>

        <div className="pl-4 pb-4 pr-2 sm:pl-6 sm:pb-6 sm:pr-4 overflow-y-auto flex-1 min-h-0">
          {reminder.jenis === "obat" && (
            <MedicationReminderForm
              accessToken={accessToken}
              onSuccess={handleSuccess}
              onCancel={() => onOpenChange(false)}
              initialData={reminder}
            />
          )}

          {reminder.jenis === "capd" && (
            <CAPDReminderForm
              accessToken={accessToken}
              onSuccess={handleSuccess}
              onCancel={() => onOpenChange(false)}
              initialData={reminder}
            />
          )}

          {reminder.jenis === "hd" && (
            <HDReminderForm
              accessToken={accessToken}
              onSuccess={handleSuccess}
              onCancel={() => onOpenChange(false)}
              initialData={reminder}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
