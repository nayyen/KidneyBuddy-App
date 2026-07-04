"use client";

/**
 * PostDetail.tsx — full post view + reply composer + archive dialog
 * (COMMUNITY-02, COMMUNITY-03).
 *
 * Fetches GET /api/community/:id (server-derived isMine flag from 06-04),
 * renders the full body as a plain JSX text child with whitespace-pre-wrap
 * (no raw-HTML injection API — T-06-18), then the reply list + composer.
 * When isMine is true, an Archive affordance opens an AlertDialog that
 * PATCHes /api/community/:id/archive and returns to the feed on success
 * (T-06-19 — archive UI is gated on the server-derived flag, never a
 * client-supplied one; the server still enforces the IDOR-safe compound
 * WHERE regardless of what the client renders).
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { authFetch, ApiError } from "@/lib/api";
import ReplyList from "@/components/komunitas/ReplyList";
import type { PostItem } from "@/components/komunitas/PostCard";

interface PostDetailData extends PostItem {
  isMine: boolean;
}

const KATEGORI_LABEL: Record<PostItem["kategori"], string> = {
  pertanyaan: "Pertanyaan",
  berbagi_pengalaman: "Berbagi Pengalaman",
  informasi: "Informasi",
};

const THERAPY_BADGE: Record<
  PostItem["metodeTerapi"],
  { label: string; color: string; bg: string }
> = {
  CAPD: { label: "CAPD", color: "#2a9d8f", bg: "#f0faf9" },
  HD: { label: "Hemodialisis", color: "#ef9f27", bg: "#fdf3e3" },
  Transplantasi: { label: "Transplantasi", color: "#6b5ca5", bg: "#f1eef9" },
  Umum: { label: "Umum", color: "#7a8c8a", bg: "#f3ede5" },
};

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

interface PostDetailProps {
  postId: string;
  accessToken: string;
}

export default function PostDetail({ postId, accessToken }: PostDetailProps) {
  const router = useRouter();
  const [post, setPost] = useState<PostDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);

  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyRefreshKey, setReplyRefreshKey] = useState(0);

  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const fetchPost = useCallback(async () => {
    if (!accessToken || !postId) return;
    setIsLoading(true);
    setHasError(false);
    setIsNotFound(false);
    try {
      const row = await authFetch<PostDetailData>(
        `/api/community/${postId}`,
        accessToken,
      );
      setPost(row);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setIsNotFound(true);
      } else {
        setHasError(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleSubmitReply = async () => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    setIsSubmittingReply(true);
    try {
      await authFetch(`/api/community/${postId}/replies`, accessToken, {
        method: "POST",
        body: JSON.stringify({ isi: trimmed }),
      });
      setReplyText("");
      setReplyRefreshKey((prev) => prev + 1);
    } catch {
      toast.error("Gagal mengirim. Periksa koneksi internet Anda dan coba lagi.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      await authFetch(`/api/community/${postId}/archive`, accessToken, {
        method: "PATCH",
      });
      setIsArchiveDialogOpen(false);
      router.push("/edukasi/komunitas");
    } catch {
      toast.error("Gagal mengirim. Periksa koneksi internet Anda dan coba lagi.");
    } finally {
      setIsArchiving(false);
    }
  };

  if (isLoading) {
    return (
      <p className="font-sans text-center py-8" style={{ fontSize: 14, color: "#3d6b66" }}>
        Memuat...
      </p>
    );
  }

  if (isNotFound) {
    return (
      <div className="flex flex-col items-center text-center py-16">
        <p className="font-heading font-bold" style={{ fontSize: 14, color: "#1a2e2c" }}>
          Postingan tidak ditemukan
        </p>
        <button
          type="button"
          onClick={() => router.push("/edukasi/komunitas")}
          className="mt-3 font-sans font-bold inline-flex items-center gap-1"
          style={{ fontSize: 13, color: "#2a9d8f" }}
        >
          <ArrowLeft size={16} />
          Kembali ke Komunitas
        </button>
      </div>
    );
  }

  if (hasError || !post) {
    return (
      <div className="flex flex-col items-center text-center py-8">
        <p className="font-sans" style={{ fontSize: 14, color: "#d4183d" }}>
          Gagal memuat konten. Periksa koneksi internet Anda, lalu coba lagi.
        </p>
        <button
          type="button"
          onClick={fetchPost}
          className="mt-2 font-sans font-bold"
          style={{ fontSize: 13, color: "#2a9d8f", textDecoration: "underline" }}
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  const authorName = post.authorName ?? "Anggota Komunitas";
  const kategoriBadge = KATEGORI_LABEL[post.kategori];
  const therapyBadge = THERAPY_BADGE[post.metodeTerapi];

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => router.push("/edukasi/komunitas")}
        className="font-sans font-bold inline-flex items-center gap-1"
        style={{ fontSize: 13, color: "#2a9d8f" }}
      >
        <ArrowLeft size={16} />
        Kembali
      </button>

      {/* Post card */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "0.5px solid #f0faf9",
          borderRadius: 14,
          padding: 14,
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              <AvatarFallback style={{ backgroundColor: "#f0faf9", color: "#2a9d8f" }}>
                {initials(authorName)}
              </AvatarFallback>
            </Avatar>
            <span className="font-sans font-bold" style={{ fontSize: 12, color: "#1a2e2c" }}>
              {authorName}
            </span>
            <span className="font-sans" style={{ fontSize: 12, color: "#7a8c8a" }}>
              &middot; {formatRelativeTime(post.createdAt)}
            </span>
          </div>

          {/* Archive affordance — owner-only (isMine server-derived, T-06-19) */}
          {post.isMine && (
            <button
              type="button"
              onClick={() => setIsArchiveDialogOpen(true)}
              aria-label="Arsipkan postingan"
              className="shrink-0 inline-flex items-center justify-center transition-colors"
              style={{ width: 32, height: 32, borderRadius: 8, color: "#7a8c8a", border: "none", background: "none", cursor: "pointer" }}
            >
              <Archive size={18} />
            </button>
          )}
        </div>

        <h1 className="font-heading font-bold" style={{ fontSize: 18, color: "#1a2e2c" }}>
          {post.judul}
        </h1>

        {/* Full body — plain JSX text child, no raw-HTML injection API */}
        <p
          className="font-sans mt-2 whitespace-pre-wrap"
          style={{ fontSize: 13, color: "#1a2e2c", lineHeight: 1.5 }}
        >
          {post.isi}
        </p>

        <div className="flex items-center gap-2 flex-wrap mt-3">
          <Badge
            className="font-sans font-bold border-transparent"
            style={{ fontSize: 12, color: "#3d6b66", backgroundColor: "#f3ede5" }}
          >
            {kategoriBadge}
          </Badge>
          <Badge
            className="font-sans font-bold border-transparent"
            style={{ fontSize: 12, color: therapyBadge.color, backgroundColor: therapyBadge.bg }}
          >
            {therapyBadge.label}
          </Badge>
        </div>
      </div>

      {/* Reply composer */}
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "0.5px solid #f0faf9",
          borderRadius: 14,
          padding: 14,
        }}
      >
        <Textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Tulis balasan Anda..."
          className="font-sans"
          style={{ fontSize: 13, color: "#1a2e2c" }}
        />
        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={handleSubmitReply}
            disabled={isSubmittingReply || !replyText.trim()}
            className="font-sans font-bold transition-colors disabled:opacity-50"
            style={{
              height: 44,
              borderRadius: 20,
              fontSize: 14,
              paddingLeft: 24,
              paddingRight: 24,
              backgroundColor: "#2a9d8f",
              color: "#ffffff",
              border: "none",
              cursor: isSubmittingReply ? "not-allowed" : "pointer",
            }}
          >
            {isSubmittingReply ? "Mengirim..." : "Kirim Balasan"}
          </button>
        </div>
      </div>

      {/* Reply list */}
      <ReplyList postId={postId} accessToken={accessToken} refreshKey={replyRefreshKey} />

      {/* Archive confirmation — owner-only, archive-not-delete (COMMUNITY-03) */}
      <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading font-bold" style={{ fontSize: 14, color: "#1a2e2c" }}>
              Arsipkan Postingan?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans" style={{ fontSize: 12, color: "#3d6b66" }}>
              Postingan ini akan disembunyikan dari feed komunitas dan tidak dapat dipulihkan
              sendiri. Balasan yang sudah ada akan tetap tersimpan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="font-sans font-medium"
              style={{ fontSize: 12, borderRadius: 20, height: 36 }}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isArchiving}
              className="font-sans font-medium disabled:opacity-50"
              style={{
                fontSize: 12,
                borderRadius: 20,
                height: 36,
                backgroundColor: "#d4183d",
                color: "#ffffff",
                border: "none",
              }}
            >
              {isArchiving ? "Mengarsipkan..." : "Arsipkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
