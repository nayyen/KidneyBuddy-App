"use client";

/**
 * CatatCairanSheet.tsx — Slide-up sheet (mobile) or Dialog (desktop) for fluid logging
 *
 * On mobile/tablet: renders as a bottom sheet (shadcn Sheet with side="bottom")
 * On desktop (lg+): the same Sheet still works fine as a bottom sheet
 *
 * Receives isOpen/setIsOpen from AppShell so FAB and Sidebar can both control it.
 */

import { Toaster } from "@/components/ui/sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import CatatCairanForm from "./CatatCairanForm";

interface CatatCairanSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string | null;
  metodeTerapiAktif: string | null;
  /** Called after a successful save — parent refreshes the daily balance */
  onSaved?: () => void;
}

export default function CatatCairanSheet({
  isOpen,
  onOpenChange,
  accessToken,
  metodeTerapiAktif,
  onSaved,
}: CatatCairanSheetProps) {
  if (!accessToken) return null;

  return (
    <>
      <Toaster position="bottom-center" />
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:max-w-md sm:mx-auto sm:rounded-2xl"
        >
          <SheetHeader className="pb-2">
            <SheetTitle className="font-heading text-base font-bold text-foreground text-left">
              Catat Cairan
            </SheetTitle>
          </SheetHeader>

          <CatatCairanForm
            accessToken={accessToken}
            metodeTerapiAktif={metodeTerapiAktif}
            onSuccess={() => {
              onOpenChange(false);
              onSaved?.();
            }}
            onClose={() => onOpenChange(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
