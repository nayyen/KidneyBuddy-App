"use client";

/**
 * ReplyList.tsx — fetches and renders a post's replies (COMMUNITY-02).
 *
 * Refetches whenever `refreshKey` changes — PostDetail's reply composer
 * increments this after a successful POST so the new reply appears without
 * a full page reload, without ReplyList needing to expose an imperative ref.
 */
import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { authFetch } from "@/lib/api";
import ReplyItem, { type ReplyItemData } from "@/components/komunitas/ReplyItem";

interface ReplyListProps {
  postId: string;
  accessToken: string;
  refreshKey: number;
}

export default function ReplyList({ postId, accessToken, refreshKey }: ReplyListProps) {
  const [replies, setReplies] = useState<ReplyItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchReplies = useCallback(async () => {
    if (!accessToken || !postId) return;
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await authFetch<{ replies: ReplyItemData[] }>(
        `/api/community/${postId}/replies`,
        accessToken,
      );
      setReplies(res.replies ?? []);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, postId]);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies, refreshKey]);

  if (isLoading) {
    return (
      <p className="font-sans text-center py-8" style={{ fontSize: 14, color: "#3d6b66" }}>
        Memuat...
      </p>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center text-center py-8">
        <p className="font-sans" style={{ fontSize: 14, color: "#d4183d" }}>
          Gagal memuat konten. Periksa koneksi internet Anda, lalu coba lagi.
        </p>
        <button
          type="button"
          onClick={fetchReplies}
          className="mt-2 font-sans font-bold"
          style={{ fontSize: 13, color: "#2a9d8f", textDecoration: "underline" }}
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (replies.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-16">
        <MessageCircle size={48} style={{ color: "#cfe8e4" }} className="mb-3" />
        <p className="font-heading font-bold" style={{ fontSize: 14, color: "#1a2e2c" }}>
          Belum Ada Balasan
        </p>
        <p
          className="font-sans mt-1"
          style={{ fontSize: 12, color: "#7a8c8a", maxWidth: 280 }}
        >
          Jadilah yang pertama membalas postingan ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {replies.map((reply) => (
        <ReplyItem key={reply.id} reply={reply} accessToken={accessToken} />
      ))}
    </div>
  );
}
