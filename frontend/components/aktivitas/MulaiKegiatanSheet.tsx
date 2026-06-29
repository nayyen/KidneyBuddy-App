"use client";

/**
 * MulaiKegiatanSheet.tsx — Bottom sheet to start a new daily activity
 *
 * Pattern: follows CatatCairanSheet.tsx — shadcn Sheet with side="bottom",
 * receiving isOpen/onOpenChange from AppShell.
 */

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import MulaiKegiatanForm from "./MulaiKegiatanForm";

interface MulaiKegiatanSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string | null;
  onSaved?: () => void;
}

export default function MulaiKegiatanSheet({
  isOpen,
  onOpenChange,
  accessToken,
  onSaved,
}: MulaiKegiatanSheetProps) {
  if (!accessToken) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] rounded-t-2xl sm:max-w-md sm:rounded-2xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[85dvh]"
      >
        <SheetHeader className="pb-2 sm:px-6 sm:pt-5 sm:pb-3 shrink-0">
          <SheetTitle className="font-heading text-base font-bold text-foreground text-left">
            Mulai Kegiatan
          </SheetTitle>
        </SheetHeader>

        <div className="pl-4 pb-4 pr-2 sm:pl-6 sm:pb-6 sm:pr-4 overflow-y-auto flex-1 min-h-0">
          <MulaiKegiatanForm
            accessToken={accessToken}
            onSuccess={() => {
              onOpenChange(false);
              onSaved?.();
            }}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
