"use client";

/**
 * DeleteReminderConfirm.tsx — AlertDialog to confirm reminder deletion
 *
 * UI-SPEC Destructive Confirmation:
 *   Title: "Hapus Pengingat?"
 *   Body: "Pengingat '{nama}' akan dihapus dan tidak akan dikirimkan lagi.
 *          Tindakan ini tidak dapat dibatalkan."
 *   Cancel: "Batal"
 *   Confirm: "Hapus Pengingat" (destructive #d4183d)
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteReminderConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminderName: string;
  onConfirm: () => Promise<void> | void;
  isDeleting?: boolean;
}

export default function DeleteReminderConfirm({
  open,
  onOpenChange,
  reminderName,
  onConfirm,
  isDeleting = false,
}: DeleteReminderConfirmProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading font-bold" style={{ fontSize: 14, color: "#1a2e2c" }}>
            Hapus Pengingat?
          </AlertDialogTitle>
          <AlertDialogDescription className="font-sans" style={{ fontSize: 12, color: "#7a8c8a" }}>
            Pengingat &apos;{reminderName}&apos; akan dihapus dan tidak akan dikirimkan lagi.
            Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="font-sans font-medium"
            style={{
              fontSize: 12,
              borderRadius: 20,
              height: 36,
            }}
          >
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="font-sans font-medium disabled:opacity-50"
            style={{
              fontSize: 12,
              borderRadius: 20,
              height: 36,
              backgroundColor: "#d4183d",
              color: "#ffffff",
              border: "none",
            }}
          >
            {isDeleting ? "Menghapus..." : "Hapus Pengingat"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
