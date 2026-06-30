"use client";

/**
 * FluidEditSheet.tsx — Edit an existing fluid log entry
 *
 * Opens a Sheet pre-filled with the current entry's data.
 * Allows editing: volume, sumber, konsentrasiCapd, kondisiKeluar, catatan.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";

interface FluidEntry {
  id: string;
  waktu: string;
  tipe: "masuk" | "keluar";
  sumber: string | null;
  konsentrasiCapd: string | null;
  volume: number;
  satuan: string;
  kondisiKeluar: string | null;
  catatan: string | null;
}

interface FluidEditSheetProps {
  entry: FluidEntry;
  accessToken: string;
  metodeTerapi: string;
  onSaved?: () => void;
}

export default function FluidEditSheet({
  entry,
  accessToken,
  metodeTerapi,
  onSaved,
}: FluidEditSheetProps) {
  const [open, setOpen] = useState(false);
  const [volume, setVolume] = useState(String(entry.volume));
  const [sumber, setSumber] = useState(entry.sumber ?? "");
  const [konsentrasiCapd, setKonsentrasiCapd] = useState(entry.konsentrasiCapd ?? "");
  const [kondisiKeluar, setKondisiKeluar] = useState(entry.kondisiKeluar ?? "");
  const [catatan, setCatatan] = useState(entry.catatan ?? "");
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  const isCAPD = metodeTerapi === "CAPD";
  const isKeluar = entry.tipe === "keluar";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setServerError("");
    try {
      const body: Record<string, unknown> = {
        volume: volume ? parseFloat(volume) : undefined,
        sumber: sumber || null,
        catatan: catatan || null,
      };
      if (isCAPD && isKeluar) {
        body.konsentrasiCapd = konsentrasiCapd || null;
        body.kondisiKeluar = kondisiKeluar || null;
      }
      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/fluid/${entry.id}`,
        accessToken,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Gagal menyimpan" }));
        throw new Error(err.message ?? "Gagal menyimpan");
      }
      toast.success("Catatan cairan berhasil diperbarui");
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
        aria-label="Edit catatan cairan"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Edit Catatan Cairan</SheetTitle>
            <SheetDescription>
              {entry.tipe === "masuk" ? "Cairan Masuk" : "Cairan Keluar"} —{" "}
              {entry.waktu.slice(0, 5)}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto pr-2">
            {/* Volume */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-volume">Volume</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="edit-volume"
                  type="number"
                  step="0.01"
                  min="0"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  required
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">ml</span>
              </div>
            </div>

            {/* Sumber (masuk) / Sumber (keluar) */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-sumber">Sumber</Label>
              {isKeluar && isCAPD ? (
                <Select value={sumber} onValueChange={setSumber}>
                  <SelectTrigger id="edit-sumber">
                    <SelectValue placeholder="Pilih sumber" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="capd">CAPD</SelectItem>
                    <SelectItem value="lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Select value={sumber} onValueChange={setSumber}>
                  <SelectTrigger id="edit-sumber">
                    <SelectValue placeholder="Pilih sumber" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minuman">Minuman</SelectItem>
                    <SelectItem value="makanan">Makanan</SelectItem>
                    {isCAPD && <SelectItem value="capd">CAPD</SelectItem>}
                    <SelectItem value="lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* CAPD-specific fields */}
            {isCAPD && isKeluar && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-konsentrasi">Konsentrasi Cairan</Label>
                  <Select value={konsentrasiCapd} onValueChange={setKonsentrasiCapd}>
                    <SelectTrigger id="edit-konsentrasi">
                      <SelectValue placeholder="Pilih konsentrasi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.5%">1.5%</SelectItem>
                      <SelectItem value="2.5%">2.5%</SelectItem>
                      <SelectItem value="4.25%">4.25%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-kondisi">Kondisi Cairan Keluar</Label>
                  <Select value={kondisiKeluar} onValueChange={setKondisiKeluar}>
                    <SelectTrigger id="edit-kondisi">
                      <SelectValue placeholder="Pilih kondisi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jernih">Jernih</SelectItem>
                      <SelectItem value="keruh">Keruh</SelectItem>
                      <SelectItem value="keruh_gumpalan">Keruh dengan Gumpalan Putih</SelectItem>
                      <SelectItem value="berdarah">Berdarah</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Catatan */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-catatan">Catatan</Label>
              <textarea
                id="edit-catatan"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Catatan tambahan (opsional)"
              />
            </div>

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
