"use client";

/**
 * EmergencyAnomalyModal.tsx — Full-screen, non-dismissable emergency modal
 * for `tinggi`-severity anomalies (D-05, D-07, D-08).
 *
 * Per UI-SPEC Screen Contract 1 ("Alert Darurat" spec):
 * - `open` is derived ONLY from `alert` — a server-fetched active tinggi
 *   alert owned by AppShell (GET /api/anomaly/active-high-severity on every
 *   mount, D-07) — never a client-persisted flag.
 * - `onOpenChange` is a no-op — Radix's own internal close attempts (Escape/
 *   Action click) are ignored; only a successful acknowledge POST calls
 *   `onAcknowledged`, which clears AppShell's state and closes the modal.
 * - No AlertDialogCancel anywhere — the single acknowledge button is the
 *   only interactive element. Radix's AlertDialogContent already hard-codes
 *   preventDefault on pointer-down-outside/interact-outside internally (by
 *   design, for every AlertDialog) — its own types omit those props entirely.
 */
import { useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { authFetch } from "@/lib/api";

export interface AnomalyAlertRow {
  id: string;
  tipeAnomali: string;
  severity: string;
  deskripsi: string;
  status: string;
  createdAt: string;
}

interface EmergencyAnomalyModalProps {
  alert: AnomalyAlertRow | null;
  accessToken: string | null;
  onAcknowledged: () => void;
}

export default function EmergencyAnomalyModal({
  alert,
  accessToken,
  onAcknowledged,
}: EmergencyAnomalyModalProps) {
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [ackFailed, setAckFailed] = useState(false);

  const handleAcknowledge = useCallback(async () => {
    if (!alert || !accessToken) return;
    setIsAcknowledging(true);
    setAckFailed(false);
    try {
      await authFetch(`/api/anomaly/${alert.id}/acknowledge`, accessToken, {
        method: "POST",
      });
      // Only close after the server confirms the status transition
      // (T-05-09) — never dismiss on a client-only assumption.
      onAcknowledged();
    } catch {
      setAckFailed(true);
    } finally {
      setIsAcknowledging(false);
    }
  }, [alert, accessToken, onAcknowledged]);

  const open = !!alert;

  return (
    <AlertDialog open={open} onOpenChange={() => {}}>
      <AlertDialogContent
        onEscapeKeyDown={(e) => e.preventDefault()}
        overlayClassName="bg-[rgba(212,24,61,0.15)]"
        className="p-0 gap-0 border-0 bg-transparent shadow-none rounded-none"
        style={{ maxWidth: 420 }}
      >
        <div
          style={{
            background: "#fdecee",
            borderLeft: "3px solid #d4183d",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 8px 32px rgba(212,24,61,.25)",
          }}
        >
          <div className="flex flex-col items-center">
            <div
              style={{
                width: 48,
                height: 48,
                background: "#fbd9dd",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={28} style={{ color: "#d4183d" }} />
            </div>

            <AlertDialogTitle asChild>
              <p
                className="font-heading font-bold text-center"
                style={{ fontSize: 18, color: "#d4183d", marginTop: 16 }}
              >
                Peringatan Kesehatan Penting
              </p>
            </AlertDialogTitle>

            <AlertDialogDescription asChild>
              <p
                className="font-sans w-full"
                style={{
                  fontSize: 12,
                  color: "#9c1530",
                  lineHeight: 1.6,
                  marginTop: 12,
                  textAlign: "left",
                }}
              >
                {alert?.deskripsi}
              </p>
            </AlertDialogDescription>

            {ackFailed && (
              <p
                className="font-sans w-full"
                style={{ fontSize: 12, color: "#d4183d", marginTop: 8 }}
              >
                Gagal memproses. Coba lagi.
              </p>
            )}
          </div>

          {/* ONLY AlertDialogAction — never render AlertDialogCancel here */}
          <AlertDialogFooter style={{ marginTop: 20 }}>
            <AlertDialogAction
              variant="destructive"
              onClick={handleAcknowledge}
              disabled={isAcknowledging}
              className="w-full rounded-[20px] font-sans font-semibold text-sm"
              style={{ height: 48 }}
            >
              {isAcknowledging
                ? "Memproses..."
                : "Saya Mengerti, Hubungi Dokter Segera"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
