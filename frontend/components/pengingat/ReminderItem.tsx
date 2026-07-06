"use client";

/**
 * ReminderItem.tsx — Single reminder card in the Pengingat list
 *
 * Per UI-SPEC ReminderItem spec:
 * - Background: white, border 0.5px solid #f0faf9, radius 13px, padding 9px 11px
 * - Time badge: PJS 700 14px #2a9d8f, bg #f0faf9, radius 8px
 * - Name: DMS 500 12px #1a2e2c
 * - Timing note: DMS 500 10px #7a8c8a
 * - Active day chips: solid per-jenis (obat/capd=#2a9d8f bg + white text, hd=#ef9f27 bg + #7a4c0a text), inactive=#f3f3f5/#a8b8b6
 * - Type badge: Obat/CAPD/HD with therapy identity colors
 * - Active toggle: shadcn Switch
 */

import { useState } from "react";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import DeleteReminderConfirm from "./DeleteReminderConfirm";
import { authFetch } from "@/lib/api";
import ReminderDetailOverlay from "./ReminderDetailOverlay";
import EditReminderSheet from "./EditReminderSheet";

export interface Reminder {
  id: string;
  jenis: "obat" | "capd" | "hd";
  nama: string;
  jamPengingat: string;
  hariAktif: string[];
  catatanWaktu?: string | null;
  aktif: boolean;
  dosis?: string | null;
  jenisObat?: string | null;
  fotoObat?: string | null;
  konsentrasiCapd?: string | null;
}

interface ReminderItemProps {
  reminder: Reminder;
  accessToken: string;
  onDeleted?: (id: string) => void;
  onUpdated?: (updated: Reminder) => void;
  /**
   * Called after a successful EDIT (not the aktif-toggle path). Should
   * trigger a genuine server refetch in the parent — quick-260706-8zc
   * item 3(a): the stale pre-edit `reminder` prop must never be re-merged
   * into list state after an edit, since it still holds e.g. the OLD
   * fotoObat even after the backend has nulled it.
   */
  onEdited?: () => void;
}

const HARI_SHORT: Record<string, string> = {
  senin: "Sen",
  selasa: "Sel",
  rabu: "Rab",
  kamis: "Kam",
  jumat: "Jum",
  sabtu: "Sab",
  minggu: "Min",
};
const ALL_HARI = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"];

const TYPE_BADGE_STYLE: Record<string, { bg: string; text: string }> = {
  obat: { bg: "#f0faf9", text: "#2a9d8f" },
  capd: { bg: "#f0faf9", text: "#2a9d8f" },
  hd: { bg: "#fdf3e3", text: "#7a4c0a" },
};

// Day-chip SELECTED state only — deliberately separate from TYPE_BADGE_STYLE
// (which stays subtle for the time-badge + TYPE_LABELS badge). "Terpilih =
// solid" makes the active-day chip clearly distinguishable from the pale
// inactive chip (#f3f3f5/#a8b8b6) for all 3 jenis, incl. obat/capd whose
// TYPE_BADGE_STYLE bg (#f0faf9) was nearly indistinguishable from inactive.
const CHIP_SELECTED_STYLE: Record<string, { bg: string; text: string }> = {
  obat: { bg: "#2a9d8f", text: "#ffffff" },
  capd: { bg: "#2a9d8f", text: "#ffffff" },
  hd: { bg: "#ef9f27", text: "#7a4c0a" },
};

const TYPE_LABELS: Record<string, string> = {
  obat: "Obat",
  capd: "CAPD",
  hd: "HD",
};

export default function ReminderItem({
  reminder,
  accessToken,
  onDeleted,
  onUpdated,
  onEdited,
}: ReminderItemProps) {
  const [aktif, setAktif] = useState(reminder.aktif);
  const [isToggling, setIsToggling] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const handleToggleAktif = async (newAktif: boolean) => {
    setIsToggling(true);
    setAktif(newAktif);
    try {
      const updated = await authFetch<Reminder>(
        `/api/reminders/${reminder.id}`,
        accessToken,
        {
          method: "PATCH",
          body: JSON.stringify({ aktif: newAktif }),
        },
      );
      onUpdated?.(updated);
    } catch (err) {
      // Revert on error
      setAktif(!newAktif);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await authFetch(`/api/reminders/${reminder.id}`, accessToken, {
        method: "DELETE",
      });
      setShowDeleteConfirm(false);
      onDeleted?.(reminder.id);
    } catch {
      // error toast?
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSuccess = () => {
    setShowEdit(false);
    // quick-260706-8zc item 3(a): DO NOT call onUpdated?.(reminder) here —
    // `reminder` is the STALE pre-edit prop (still holding e.g. the OLD
    // fotoObat). Force a genuine server refetch instead so the parent's
    // list state reflects what was actually persisted (e.g. a deleted
    // photo staying gone). onUpdated(updated) is still used by the
    // aktif-toggle path above, which passes the REAL PATCH response.
    onEdited?.();
  }

  const { bg, text } = TYPE_BADGE_STYLE[reminder.jenis] ?? TYPE_BADGE_STYLE.obat;
  const chipSel = CHIP_SELECTED_STYLE[reminder.jenis] ?? CHIP_SELECTED_STYLE.obat;

  return (
    <>
      <div className="bg-white rounded-xl border border-[#f0faf9] p-2.5 shadow-sm">
        <div className="flex gap-3">
          {/* Time badge */}
          <div
            className="flex items-center justify-center rounded-lg shrink-0"
            style={{
              width: 52,
              height: 52,
              backgroundColor: bg,
            }}
          >
            <span
              className="font-bold font-heading"
              style={{ fontSize: 14, color: text }}
            >
              {reminder.jamPengingat}
            </span>
          </div>

          {/* Main content area */}
          <button type="button" className="flex-1 text-left" onClick={() => setShowDetail(true)}>
            <div className="flex flex-col justify-center h-full">
              <p className="font-sans font-medium text-xs text-[#1a2e2c] leading-tight">
                {reminder.nama}
              </p>
              {reminder.jenis === "obat" && reminder.dosis && (
                <p className="font-sans text-xs text-[#7a8c8a] mt-0.5">
                  Dosis {reminder.dosis}
                </p>
              )}
              {reminder.jenis === "capd" && reminder.konsentrasiCapd && (
                <p className="font-sans text-xs text-[#7a8c8a] mt-0.5">
                  Konsentrasi {reminder.konsentrasiCapd}
                </p>
              )}
              {reminder.catatanWaktu && (
                <p className="font-sans text-xs text-[#7a8c8a] mt-0.5">
                  {reminder.catatanWaktu}
                </p>
              )}
            </div>
          </button>

          {/* Action buttons */}
          <div className="flex flex-col items-center justify-between shrink-0">
            <Switch
              checked={aktif}
              onCheckedChange={handleToggleAktif}
              disabled={isToggling}
              className="data-[state=checked]:bg-[#2a9d8f] data-[state=unchecked]:bg-[#cfe8e4]"
            />
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setShowEdit(true)} className="p-1 text-[#3d6b66] hover:text-[#1a2e2c]">
                <Pencil className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setShowDeleteConfirm(true)} className="p-1 text-[#d4183d] hover:text-red-700">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Day chips */}
        <div className="mt-2.5 flex justify-between items-center">
            <div className="flex gap-1.5">
                {ALL_HARI.map((day) => (
                    <div
                        key={day}
                        className="rounded font-sans font-medium text-center"
                        style={{
                            width: 28,
                            height: 22,
                            lineHeight: "22px",
                            fontSize: 11,
                            backgroundColor: reminder.hariAktif.includes(day) ? chipSel.bg : "#f3f3f5",
                            color: reminder.hariAktif.includes(day) ? chipSel.text : "#a8b8b6",
                        }}
                    >
                        {HARI_SHORT[day]}
                    </div>
                ))}
            </div>
            <div
                className="rounded px-2 py-0.5 font-sans font-medium"
                style={{
                    fontSize: 11,
                    backgroundColor: bg,
                    color: text,
                }}
            >
                {TYPE_LABELS[reminder.jenis]}
            </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <DeleteReminderConfirm
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          reminderName={reminder.nama}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
        />
      )}

      {showDetail && (
        <ReminderDetailOverlay reminder={reminder} onClose={() => setShowDetail(false)} />
      )}

      {showEdit && (
        <EditReminderSheet
          isOpen={showEdit}
          onOpenChange={setShowEdit}
          accessToken={accessToken}
          reminder={reminder}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
