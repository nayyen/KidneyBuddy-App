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
          className="max-h-[92dvh] rounded-t-2xl sm:max-w-md sm:rounded-2xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[85dvh]"
        >
          <SheetHeader className="pb-2 sm:px-6 sm:pt-5 sm:pb-3 shrink-0">
            <SheetTitle className="font-heading text-base font-bold text-foreground text-left">
              Catat Cairan
            </SheetTitle>
          </SheetHeader>

          <div className="pl-4 pb-4 pr-2 sm:pl-6 sm:pb-6 sm:pr-4 overflow-y-auto flex-1 min-h-0">
            <CatatCairanForm
              accessToken={accessToken}
              metodeTerapiAktif={metodeTerapiAktif}
              onSuccess={() => {
                onOpenChange(false);
                onSaved?.();
              }}
              onClose={() => onOpenChange(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
