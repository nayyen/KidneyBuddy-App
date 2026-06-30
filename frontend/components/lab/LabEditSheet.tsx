"use client";

/**
 * LabEditSheet.tsx — Edit an existing manual lab result entry
 *
 * Opens a Sheet pre-filled with current entry data.
 * Supports editing: tanggalPemeriksaan, kategori, namaParameter, nilai, satuan, nilaiRujukan, catatan.
 * Does NOT support changing file uploads.
 */

import { useState } from "react";
import { toast } from "sonner";
import { authFetch } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";

interface LabResult {
  id: string;
  tanggalPemeriksaan: string;
  kategori: string | null;
  namaParameter: string;
  nilai: string;
  satuan: string | null;
  nilaiRujukan: string | null;
  catatan: string | null;
  sumber: string;
  fileId: string | null;
  diarsipkan?: boolean;
}

interface LabEditSheetProps {
  entry: LabResult;
  accessToken: string;
  onSaved?: () => void;
}

export default function LabEditSheet({
  entry,
  accessToken,
  onSaved,
}: LabEditSheetProps) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState("");

  const isUpload = entry.sumber === "upload";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 transition-colors"
        aria-label="Edit hasil lab"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Edit Hasil Lab</SheetTitle>
            <SheetDescription>
              {entry.namaParameter} — {entry.tanggalPemeriksaan}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto pr-2">
                      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 overflow-y-auto pr-2">
            {/* Tanggal Pemeriksaan */}
            <div>
              <label htmlFor="lab-edit-tanggal" className="block text-sm font-medium font-sans text-foreground mb-1">Tanggal Pemeriksaan <span className="text-destructive">*</span></label>
              <input {...register("tanggalPemeriksaan")} type="date" id="lab-edit-tanggal" className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              {errors.tanggalPemeriksaan && <p className="mt-1 text-xs text-destructive">{errors.tanggalPemeriksaan.message}</p>}
            </div>

              {serverError && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-[10px] p-3 text-sm text-destructive font-sans">{serverError}</div>
              )}
              {/* Tanggal Pemeriksaan */}
            {/* Kategori */}
            <div>
              <label htmlFor="lab-edit-kategori" className="block text-sm font-medium font-sans text-foreground mb-1">Kategori <span className="text-muted-foreground font-normal">(opsional)</span></label>
              <input {...register("kategori")} type="text" id="lab-edit-kategori" placeholder="Mis: Fungsi Ginjal, Elektrolit" className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>

            {/* Parameter */}
            <div>
              <label htmlFor="lab-edit-parameter" className="block text-sm font-medium font-sans text-foreground mb-1">Nama Parameter <span className="text-destructive">*</span></label>
              <input {...register("namaParameter")} type="text" id="lab-edit-parameter" placeholder="Mis: Kreatinin, Hemoglobin" className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              {errors.namaParameter && <p className="mt-1 text-xs text-destructive">{errors.namaParameter.message}</p>}
            </div>

            {/* Nilai + Satuan */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="lab-edit-nilai" className="block text-sm font-medium font-sans text-foreground mb-1">Nilai <span className="text-destructive">*</span></label>
                <input {...register("nilai")} type="text" id="lab-edit-nilai" placeholder="Mis: 1.2" className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                {errors.nilai && <p className="mt-1 text-xs text-destructive">{errors.nilai.message}</p>}
              </div>
              <div>
                <label htmlFor="lab-edit-satuan" className="block text-sm font-medium font-sans text-foreground mb-1">Satuan <span className="text-muted-foreground font-normal">(opsional)</span></label>
                <input {...register("satuan")} type="text" id="lab-edit-satuan" placeholder="Mis: mg/dL" className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            {/* Nilai Rujukan */}
            <div>
              <label htmlFor="lab-edit-rujukan" className="block text-sm font-medium font-sans text-foreground mb-1">Nilai Rujukan <span className="text-muted-foreground font-normal">(opsional)</span></label>
              <input {...register("nilaiRujukan")} type="text" id="lab-edit-rujukan" placeholder="Cth: 0.6 - 1.2" className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>

            {/* Catatan */}
            <div>
              <label htmlFor="lab-edit-catatan" className="block text-sm font-medium font-sans text-foreground mb-1">Catatan <span className="text-muted-foreground font-normal">(opsional)</span></label>
              <textarea {...register("catatan")} id="lab-edit-catatan" rows={3} className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Catatan tambahan" />
            </div>

            {isUpload && (
              <p className="text-xs text-muted-foreground italic">
                File yang diunggah tidak dapat diubah. Untuk mengganti file, arsipkan dan unggah ulang.
              </p>
            )}

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

                          <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
