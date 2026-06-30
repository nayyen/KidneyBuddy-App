"use client";

/**
 * FluidEditSheet.tsx — Edit an existing fluid log entry
 *
 * Opens a Sheet pre-filled with the current entry's data.
 * Uses react-hook-form + zod validation matching CatatCairanForm styling.
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Pencil, AlertTriangle } from "lucide-react";
import { SUMBER_LABELS, CAPD_KONSENTRASI_LABELS, KONDISI_KELUAR_LABELS, ABNORMAL_KONDISI } from "@/lib/validators/fluid.schema";

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
  const [serverError, setServerError] = useState("");


  const editSchema = z.object({
    sumber: z.string().optional().nullable(),
    konsentrasiCapd: z.string().optional().nullable(),
    volume: z.number({ required_error: "Volume wajib diisi", invalid_type_error: "Volume harus angka" }).positive("Volume harus > 0"),
    satuan: z.string().default("ml"),
    kondisiKeluar: z.string().optional().nullable(),
    catatan: z.string().max(2000).optional().nullable(),
  });
  type EditFormData = z.infer<typeof editSchema>;

  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } = useForm<EditFormData>({
    resolver: zodResolver(editSchema) as any,
    defaultValues: {
      volume: entry.volume,
      satuan: entry.satuan ?? "ml",
      sumber: entry.sumber ?? null,
      konsentrasiCapd: entry.konsentrasiCapd ?? null,
      kondisiKeluar: entry.kondisiKeluar ?? null,
      catatan: entry.catatan ?? null,
    },
  });

  useEffect(() => {
    reset({
      volume: entry.volume,
      satuan: entry.satuan ?? "ml",
      sumber: entry.sumber ?? null,
      konsentrasiCapd: entry.konsentrasiCapd ?? null,
      kondisiKeluar: entry.kondisiKeluar ?? null,
      catatan: entry.catatan ?? null,
    });
  }, [entry, reset]);

  const watchedKondisiKeluar = watch("kondisiKeluar");
  const isAbnormal = watchedKondisiKeluar ? ABNORMAL_KONDISI.has(watchedKondisiKeluar) : false;

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
  const onSubmit = async (data: EditFormData) => {
    setServerError("");
    const body: Record<string, unknown> = {
      volume: data.volume,
      sumber: data.sumber || null,
      catatan: data.catatan || null,
    };
    if (isCAPD && isKeluar) {
      body.konsentrasiCapd = data.konsentrasiCapd || null;
      body.kondisiKeluar = data.kondisiKeluar || null;
    }
    try {
      await authFetch(`/api/fluid/${entry.id}`, accessToken, { method: "PATCH", body: JSON.stringify(body) });
      toast.success("Catatan cairan berhasil diperbarui");
      setOpen(false);
      onSaved?.();
    } catch (err: any) { setServerError(err?.message ?? "Gagal"); }
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
                {isAbnormal && (
                  <div className="flex items-start gap-2 p-3 rounded-[10px]" style={{ background: "#fdecee", border: "1px solid #d4183d40" }}>
                    <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: "#d4183d" }} />
                    <p className="text-xs font-sans" style={{ color: "#9c1530" }}>Kondisi cairan tidak normal. Segera hubungi dokter.</p>
                  </div>
                )}
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
