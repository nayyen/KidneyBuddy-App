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
  const [tanggal, setTanggal] = useState(entry.tanggalPemeriksaan);
  const [kategori, setKategori] = useState(entry.kategori ?? "");
  const [parameter, setParameter] = useState(entry.namaParameter);
  const [nilai, setNilai] = useState(entry.nilai);
  const [satuan, setSatuan] = useState(entry.satuan ?? "");
  const [rujukan, setRujukan] = useState(entry.nilaiRujukan ?? "");
  const [catatan, setCatatan] = useState(entry.catatan ?? "");
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  const isUpload = entry.sumber === "upload";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setServerError("");
    try {
      const body: Record<string, unknown> = {
        tanggalPemeriksaan: tanggal,
        namaParameter: parameter,
        nilai,
        satuan: satuan || null,
        nilaiRujukan: rujukan || null,
        catatan: catatan || null,
      };
      if (kategori) body.kategori = kategori;

      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/lab/${entry.id}`,
        accessToken,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Gagal menyimpan" }));
        throw new Error(err.message ?? "Gagal menyimpan");
      }
      toast.success("Hasil lab berhasil diperbarui");
      setOpen(false);
      onSaved?.();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

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
            {/* Tanggal Pemeriksaan */}
            <div className="space-y-1.5">
              <Label htmlFor="lab-edit-tanggal">Tanggal Pemeriksaan</Label>
              <Input
                id="lab-edit-tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
              />
            </div>

            {/* Kategori */}
            <div className="space-y-1.5">
              <Label htmlFor="lab-edit-kategori">Kategori (opsional)</Label>
              <Input
                id="lab-edit-kategori"
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                placeholder="Cth: Darah, Urine"
              />
            </div>

            {/* Parameter */}
            <div className="space-y-1.5">
              <Label htmlFor="lab-edit-parameter">Nama Parameter</Label>
              <Input
                id="lab-edit-parameter"
                value={parameter}
                onChange={(e) => setParameter(e.target.value)}
                required
                placeholder="Cth: Kreatinin"
              />
            </div>

            {/* Nilai + Satuan */}
            <div className="flex gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="lab-edit-nilai">Nilai</Label>
                <Input
                  id="lab-edit-nilai"
                  value={nilai}
                  onChange={(e) => setNilai(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="lab-edit-satuan">Satuan</Label>
                <Input
                  id="lab-edit-satuan"
                  value={satuan}
                  onChange={(e) => setSatuan(e.target.value)}
                  placeholder="Cth: mg/dL"
                />
              </div>
            </div>

            {/* Nilai Rujukan */}
            <div className="space-y-1.5">
              <Label htmlFor="lab-edit-rujukan">Nilai Rujukan (opsional)</Label>
              <Input
                id="lab-edit-rujukan"
                value={rujukan}
                onChange={(e) => setRujukan(e.target.value)}
                placeholder="Cth: 0.6 - 1.2"
              />
            </div>

            {/* Catatan */}
            <div className="space-y-1.5">
              <Label htmlFor="lab-edit-catatan">Catatan (opsional)</Label>
              <textarea
                id="lab-edit-catatan"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                placeholder="Catatan tambahan"
              />
            </div>

            {isUpload && (
              <p className="text-xs text-muted-foreground italic">
                File yang diunggah tidak dapat diubah. Untuk mengganti file, arsipkan dan unggah ulang.
              </p>
            )}

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
