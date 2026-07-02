"use client";

/**
 * UploadFileForm.tsx — Lab file upload form
 *
 * Accepts: PDF, JPG, PNG (max 10MB)
 * Fields: file input + tanggalPemeriksaan
 * Submits: POST /api/lab/upload (multipart/form-data)
 *
 * Pattern: follows InputManualForm.tsx — minimal form, single-purpose.
 */

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, FileText, ImageIcon, File, X } from "lucide-react";
import { authFetch } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const ACCEPTED_TYPES = "application/pdf,image/jpeg,image/png";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

interface UploadFileFormProps {
  accessToken: string;
  onSuccess?: () => void;
}

type FilePreview = {
  file: File;
  preview: string; // URL.createObjectURL
};

export default function UploadFileForm({
  accessToken,
  onSuccess,
}: UploadFileFormProps) {
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [namaFile, setNamaFile] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size
    if (file.size > MAX_SIZE) {
      toast.error("Ukuran file tidak boleh melebihi 10MB");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Clean up previous preview
    if (filePreview) {
      URL.revokeObjectURL(filePreview.preview);
    }

    setFilePreview({
      file,
      preview: URL.createObjectURL(file),
    });
  };

  const removeFile = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview.preview);
    }
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!filePreview) {
      toast.error("Pilih file terlebih dahulu");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", filePreview.file);
      formData.append("tanggalPemeriksaan", tanggal);
      if (namaFile.trim()) {
        formData.append("namaFile", namaFile.trim());
      }

      const res = await fetch(`${API_BASE}/api/lab/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? body?.message ?? "Gagal mengupload file");
      }

      toast.success("File berhasil diupload");
      removeFile();
      onSuccess?.();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gagal mengupload file";
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
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

  return (
    <div className="space-y-4">
      {/* Tanggal Pemeriksaan */}
      <div>
        <label
          htmlFor="upload-tanggal"
          className="block text-sm font-medium font-sans text-foreground mb-1"
        >
          Tanggal Pemeriksaan <span className="text-destructive">*</span>
        </label>
        <input
          type="date"
          id="upload-tanggal"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

        {/* Nama Dokumen — shown in lab list instead of "(file)" */}
        <div>
          <label
            htmlFor="upload-nama"
            className="block text-sm font-medium font-sans text-foreground mb-1"
          >
            Nama Dokumen <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            id="upload-nama"
            value={namaFile}
            onChange={(e) => setNamaFile(e.target.value)}
            placeholder="contoh: Hasil Lab Kreatinin 02 Jul 2026"
            className="w-full rounded-[10px] border border-border bg-input px-4 py-2.5 text-sm font-sans text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs font-sans text-muted-foreground mt-1">
            Nama ini akan tampil di daftar lab sebagai judul dokumen
          </p>
        </div>

      {/* File drop zone */}
      {!filePreview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-sans font-medium text-foreground">
            Klik untuk upload file
          </p>
          <p className="text-xs font-sans text-muted-foreground mt-1">
            PDF, JPG, atau PNG (maks. 10 MB)
          </p>
        </div>
      ) : (
        /* File preview card */
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isUploading || !filePreview}
        style={{
          width: "100%",
          height: 44,
          borderRadius: 22,
          fontSize: 14,
          fontWeight: 600,
          backgroundColor: filePreview ? "#2a9d8f" : "#cfe8e4",
          color: "#ffffff",
          border: "none",
          cursor: isUploading || !filePreview ? "not-allowed" : "pointer",
          opacity: isUploading ? 0.7 : 1,
        }}
        className="font-sans transition-opacity"
      >
        {isUploading ? "Mengupload..." : "Upload File"}
      </button>
    </div>
  );
}
