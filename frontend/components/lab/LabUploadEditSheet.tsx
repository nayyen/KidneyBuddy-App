"use client";

/**
 * LabUploadEditSheet.tsx — Edit an existing file-upload lab result entry
 * (quick-260707-1la item 11)
 *
 * Unlike LabEditSheet.tsx (manual entries only), upload entries can now be
 * edited too: nama (display name), tanggal, and the document itself. A
 * replacement file is REQUIRED on every submit (enforced here client-side,
 * mirrored server-side by labResult.controller.ts::updateUpload) — there is
 * no "keep the old file" path, matching the plan's "min 1 file" rule.
 *
 * Submits multipart/form-data to PUT /api/lab/:id/upload.
 * Field set mirrors UploadFileForm.tsx (tanggal, namaFile, file).
 */

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, FileText, ImageIcon, File, X, Pencil } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const ACCEPTED_TYPES = "application/pdf,image/jpeg,image/png";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface LabResult {
  id: string;
  tanggalPemeriksaan: string;
  namaParameter: string;
  sumber: string;
  fileId: string | null;
}

interface LabUploadEditSheetProps {
  entry: LabResult;
  accessToken: string;
  onSaved?: () => void;
}

type FilePreview = {
  file: File;
  preview: string;
};

export default function LabUploadEditSheet({
  entry,
  accessToken,
  onSaved,
}: LabUploadEditSheetProps) {
  const [open, setOpen] = useState(false);
  const [tanggal, setTanggal] = useState(entry.tanggalPemeriksaan);
  const [namaFile, setNamaFile] = useState(entry.namaParameter);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTanggal(entry.tanggalPemeriksaan);
    setNamaFile(entry.namaParameter);
    if (filePreview) URL.revokeObjectURL(filePreview.preview);
    setFilePreview(null);
    setServerError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetForm();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE) {
      toast.error("Ukuran file tidak boleh melebihi 10MB");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (filePreview) URL.revokeObjectURL(filePreview.preview);
    setFilePreview({ file, preview: URL.createObjectURL(file) });
  };

  const removeFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview.preview);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/pdf") return <FileText className="w-8 h-8 text-destructive" />;
    if (mimeType.startsWith("image/")) return <ImageIcon className="w-8 h-8 text-primary" />;
    return <File className="w-8 h-8 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async () => {
    setServerError("");
    // min 1 file required — no "keep existing" path for edits.
    if (!filePreview) {
      toast.error("Pilih file pengganti terlebih dahulu");
      return;
    }
    if (!namaFile.trim()) {
      toast.error("Nama dokumen wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", filePreview.file);
      formData.append("tanggalPemeriksaan", tanggal);
      formData.append("namaFile", namaFile.trim());

      const res = await fetch(`${API_BASE}/api/lab/${entry.id}/upload`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? body?.message ?? "Gagal memperbarui hasil lab");
      }

      toast.success("Hasil lab berhasil diperbarui");
      setOpen(false);
      resetForm();
      onSaved?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 transition-colors"
        aria-label="Edit hasil lab (file)"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Edit Dokumen Lab</SheetTitle>
            <SheetDescription>
              {entry.namaParameter} — {entry.tanggalPemeriksaan}. Unggah file
              pengganti untuk menyimpan perubahan.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-6 pb-6">
            {serverError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-[10px] p-3 text-sm text-destructive font-sans">
                {serverError}
              </div>
            )}

            <div>
              <label
                htmlFor="lab-upload-edit-tanggal"
                className="block text-sm font-medium font-sans text-foreground mb-1"
              >
                Tanggal Pemeriksaan <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                id="lab-upload-edit-tanggal"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label
                htmlFor="lab-upload-edit-nama"
                className="block text-sm font-medium font-sans text-foreground mb-1"
              >
                Nama Dokumen <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                id="lab-upload-edit-nama"
                value={namaFile}
                onChange={(e) => setNamaFile(e.target.value)}
                className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <span className="block text-sm font-medium font-sans text-foreground mb-1">
                File Pengganti <span className="text-destructive">*</span>
              </span>
              <p className="text-xs font-sans text-muted-foreground mb-2">
                Wajib unggah file baru untuk menyimpan perubahan.
              </p>
              {!filePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-sans font-medium text-foreground">
                    Klik untuk upload file pengganti
                  </p>
                  <p className="text-xs font-sans text-muted-foreground mt-1">
                    PDF, JPG, atau PNG (maks. 10 MB)
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    {getFileIcon(filePreview.file.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-sans font-medium text-foreground truncate">
                        {filePreview.file.name}
                      </p>
                      <p className="text-xs font-sans text-muted-foreground">
                        {formatFileSize(filePreview.file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="p-1 rounded-full hover:bg-muted transition-colors"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !filePreview}
              className="w-full"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
