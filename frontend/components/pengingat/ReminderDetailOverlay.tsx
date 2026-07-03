"use client";

import { X } from "lucide-react";
import type { Reminder } from "./ReminderItem";
import Image from "next/image";

interface Props {
  reminder: Reminder;
  onClose: () => void;
}

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) =>
  value ? (
    <div className="py-2">
      <p className="text-[10px] font-bold text-[#7a8c8a] uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-[#1a2e2c] whitespace-pre-wrap">{value}</p>
    </div>
  ) : null;

export default function ReminderDetailOverlay({ reminder, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-[90vw] max-w-md relative animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          aria-label="Tutup detail"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-[#1a2e2c] mb-4">Detail Pengingat</h2>

        <div className="divide-y divide-gray-200">
          <DetailRow label="Nama" value={reminder.nama} />
          <DetailRow label="Jenis" value={reminder.jenis.toUpperCase()} />
          <DetailRow label="Jam Pengingat" value={reminder.jamPengingat} />
          <DetailRow label="Hari Aktif" value={reminder.hariAktif.join(", ")} />
          {reminder.jenis === "obat" && (
            <>
              <DetailRow label="Dosis" value={reminder.dosis} />
              <DetailRow label="Jenis Obat" value={reminder.jenisObat} />
              {reminder.fotoObat && (
                <div className="py-2">
                  <p className="text-[10px] font-bold text-[#7a8c8a] uppercase tracking-wider">
                    Foto Obat
                  </p>
                  <div className="mt-2 relative w-full h-48 rounded-lg overflow-hidden">
                    <Image
                      src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}${reminder.fotoObat}`}
                      alt={`Foto obat untuk ${reminder.nama}`}
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>
                </div>
              )}
            </>
          )}
          {reminder.jenis === "capd" && (
            <DetailRow label="Konsentrasi CAPD" value={reminder.konsentrasiCapd} />
          )}
          <DetailRow label="Catatan Waktu" value={reminder.catatanWaktu} />
        </div>
      </div>
    </div>
  );
}
