"use client";

/**
 * ReminderItem.tsx — Single reminder card in the Pengingat list
 *
 * Per UI-SPEC ReminderItem spec:
 * - Background: white, border 0.5px solid #f0faf9, radius 13px, padding 9px 11px
 * - Time badge: PJS 700 14px #2a9d8f, bg #f0faf9, radius 8px
 * - Name: DMS 500 12px #1a2e2c
 * - Timing note: DMS 500 10px #7a8c8a
 * - Active day chips: active=#f0faf9/#2a9d8f, inactive=#f3f3f5/#cfe8e4
 * - Type badge: Obat/CAPD/HD with therapy identity colors
 * - Active toggle: shadcn Switch
 */

import { useState } from "react";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import DeleteReminderConfirm from "./DeleteReminderConfirm";
import { authFetch } from "@/lib/api";

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
  konsentrasiCapd?: string | null;
}

interface ReminderItemProps {
  reminder: Reminder;
  accessToken: string;
  onDeleted?: (id: string) => void;
  onUpdated?: (updated: Reminder) => void;
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
}: ReminderItemProps) {
  const [aktif, setAktif] = useState(reminder.aktif);
  const [isToggling, setIsToggling] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editNama, setEditNama] = useState(reminder.nama);
  const [editDosis, setEditDosis] = useState(reminder.dosis ?? "");
  const [savingEdit, setSavingEdit] = useState(false);

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const body: Record<string, unknown> = { nama: editNama };
      if (reminder.jenis === "obat") {
        body.dosis = editDosis || null;
      }
      const updated = await authFetch<Reminder>(
        `/api/reminders/${reminder.id}`,
        accessToken,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      onUpdated?.(updated);
      setEditing(false);
    } catch {
      // Revert on error
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditNama(reminder.nama);
    setEditDosis(reminder.dosis ?? "");
    setEditing(false);
  };


  const handleToggle = async (checked: boolean) => {
    if (isToggling) return;
    setIsToggling(true);
    const previous = aktif;
    setAktif(checked); // optimistic
    try {
      const updated = await authFetch<Reminder>(
        `/api/reminders/${reminder.id}`,
        accessToken,
        {
          method: "PATCH",
          body: JSON.stringify({ aktif: checked }),
        },
      );
      onUpdated?.(updated);
    } catch {
      setAktif(previous); // revert on error
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await authFetch(`/api/reminders/${reminder.id}`, accessToken, {
        method: "DELETE",
      });
      setShowDeleteConfirm(false);
      onDeleted?.(reminder.id);
    } catch {
      // Keep dialog open on failure
    } finally {
      setIsDeleting(false);
    }
  };

  const badgeStyle = TYPE_BADGE_STYLE[reminder.jenis] ?? TYPE_BADGE_STYLE.obat;

  return (
    <>
      <div
        className="flex items-start gap-3"
        style={{
          backgroundColor: "#ffffff",
          border: "0.5px solid #f0faf9",
          borderRadius: 13,
          padding: "9px 11px",
          opacity: aktif ? 1 : 0.55,
          transition: "opacity 0.2s",
        }}
      >
        {/* Time badge */}
        <span
          className="font-heading font-bold shrink-0"
          style={{
            fontSize: 14,
            color: "#0d4a44",
            backgroundColor: "#f0faf9",
            borderRadius: 8,
            padding: "4px 8px",
            lineHeight: 1.25,
          }}
        >
          {reminder.jamPengingat}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <Input
                value={editNama}
                onChange={(e) => setEditNama(e.target.value)}
                className="h-8 text-sm"
                placeholder="Nama pengingat"
              />
              {reminder.jenis === "obat" && (
                <Input
                  value={editDosis}
                  onChange={(e) => setEditDosis(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="Dosis (opsional)"
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit || !editNama.trim()}
                  className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800"
                >
                  <Check className="h-3.5 w-3.5" /> Simpan
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" /> Batal
                </button>
              </div>
            </div>
          ) : (
            <>
          {/* Name + type badge row */}
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="font-sans font-medium"
              style={{ fontSize: 14, color: "#1a2e2c" }}
            >
              {reminder.nama}
            </p>
            <span
              className="font-sans font-medium"
              style={{
                fontSize: 13,
                paddingLeft: 12,
                paddingRight: 12,
                paddingTop: 6,
                paddingBottom: 6,
                borderRadius: 8,
                backgroundColor: badgeStyle.bg,
                color: badgeStyle.text,
              }}
            >
              {TYPE_LABELS[reminder.jenis] ?? reminder.jenis}
            </span>
          </div>

          {/* Timing note */}
          {reminder.catatanWaktu && (
            <p
              className="font-sans mt-0.5"
              style={{ fontSize: 13, color: "#3d6b66" }}
            >
              {reminder.catatanWaktu}
            </p>
          )}

          {/* Dose / concentration sub-info */}
          {reminder.jenis === "obat" && reminder.dosis && (
            <p
              className="font-sans mt-0.5"
              style={{ fontSize: 13, color: "#3d6b66" }}
            >
              {reminder.dosis}
              {reminder.jenisObat
                ? ` · ${reminder.jenisObat === "minum" ? "Minum" : "Suntik"}`
                : ""}
            </p>
          )}
          {reminder.jenis === "capd" && reminder.konsentrasiCapd && (
            <p
              className="font-sans mt-0.5"
              style={{ fontSize: 13, color: "#3d6b66" }}
            >
              {reminder.konsentrasiCapd}
            </p>
          )}

          {/* Active day chips */}
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {ALL_HARI.map((hari) => {
              const isActive = reminder.hariAktif.includes(hari);
              return (
                <span
                  key={hari}
                  className="font-sans font-medium"
                  style={{
                    fontSize: 13,
                    paddingLeft: 8,
                    paddingRight: 8,
                    paddingTop: 4,
                    paddingBottom: 4,
                    borderRadius: 6,
                    backgroundColor: isActive ? "#f0faf9" : "#f3f3f5",
                    color: isActive ? "#2a9d8f" : "#3d6b66",
                  }}
                >
                  {HARI_SHORT[hari] ?? hari}
                </span>
              );
            })}
          </div>
            </>
          )}
        </div>

        {/* Right controls */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* Active toggle */}
          <Switch
            checked={aktif}
            onCheckedChange={handleToggle}
            disabled={isToggling}
            aria-label={aktif ? "Nonaktifkan pengingat" : "Aktifkan pengingat"}
          />
          {/* Delete button */}
                    {/* Edit button */}
                    {!editing && (
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                          className="rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                        aria-label="Edit pengingat"
                          style={{ width: 40, height: 40, border: "none", background: "transparent", cursor: "pointer" }}
                      >
                          <Pencil className="h-5 w-5 text-muted-foreground" />
                      </button>
                    )}
                    {/* Delete button */}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Hapus pengingat"
              className="transition-colors flex items-center justify-center rounded-lg hover:bg-red-50"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
                width: 40,
                height: 40,
                padding: 0,
            }}
          >
              <Trash2 className="h-5 w-5" style={{ color: "#d4183d" }} />
          </button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <DeleteReminderConfirm
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        reminderName={reminder.nama}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}
